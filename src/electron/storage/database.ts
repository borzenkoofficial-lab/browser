import initSqlJs from "sql.js";
import type { Database as SqlDatabase, SqlJsStatic } from "sql.js";
import fs from "node:fs/promises";
import * as fsSync from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { validateBookmark, validateDocument, validateEstimate, validateHistoryItem, validateProspect, requireArray } from "./validation";

export type StoredRecord = Record<string, unknown>;
type DataKind = "prospects" | "bookmarks" | "history" | "estimates" | "documents";
type LegacyDataKind = Exclude<DataKind, "estimates" | "documents">;
type SqlValue = string | number | null | Uint8Array;

const MIGRATION_VERSION = 3;
const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
let connection: SqlDatabase | null = null;
let sqlModule: SqlJsStatic | null = null;
let activePath = "";

const LEGACY_FILES: Record<LegacyDataKind, string> = {
  prospects: "prospects.json",
  bookmarks: "bookmarks.json",
  history: "history.json"
};

export function getDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, "nexus.sqlite");
}

function sameFilePath(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function db(): SqlDatabase {
  if (!connection) throw new Error("Локальная база ещё не инициализирована");
  return connection;
}

function queryRows(database: SqlDatabase, sql: string, values: SqlValue[] = []): Array<Record<string, unknown>> {
  const statement = database.prepare(sql);
  try {
    statement.bind(values);
    const rows: Array<Record<string, unknown>> = [];
    while (statement.step()) rows.push(statement.getAsObject() as Record<string, unknown>);
    return rows;
  } finally {
    statement.free();
  }
}

function run(database: SqlDatabase, sql: string, values: SqlValue[] = []): void {
  database.run(sql, values);
}

function persistDatabase(database: SqlDatabase, destinationPath: string): void {
  const tempPath = `${destinationPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fsSync.writeFileSync(tempPath, Buffer.from(database.export()));
    fsSync.renameSync(tempPath, destinationPath);
  } catch (error) {
    try { fsSync.rmSync(tempPath, { force: true }); } catch { /* best-effort cleanup */ }
    throw error;
  }
}

function integrityCheck(database: SqlDatabase): void {
  const rows = queryRows(database, "PRAGMA integrity_check");
  if (rows.length !== 1 || rows[0].integrity_check !== "ok") {
    throw new Error("Проверка целостности SQLite не пройдена");
  }
}

function readLegacyRecords(filePath: string, kind: DataKind): StoredRecord[] {
  if (!fsSync.existsSync(filePath)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(fsSync.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`Не удалось прочитать старые данные: ${path.basename(filePath)}. Исходный файл сохранён; миграция остановлена.`);
  }
  const records = requireArray(parsed, path.basename(filePath));
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : kind === "history" ? validateHistoryItem : kind === "estimates" ? validateEstimate : validateDocument;
  return records.map(validator);
}

async function preserveLegacyFiles(userDataPath: string): Promise<void> {
  const backupDir = path.join(userDataPath, "backups", "pre-sqlite");
  await fs.mkdir(backupDir, { recursive: true });
  for (const fileName of Object.values(LEGACY_FILES)) {
    const source = path.join(userDataPath, fileName);
    try {
      await fs.access(source);
      const destination = path.join(backupDir, fileName);
      try { await fs.access(destination); }
      catch { await fs.copyFile(source, destination); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

function createSchema(database: SqlDatabase): void {
  database.run("PRAGMA foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Новый',
      source TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(company COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      visited_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
    CREATE INDEX IF NOT EXISTS idx_history_visited_at ON history(visited_at);
    CREATE TABLE IF NOT EXISTS estimates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
  `);
  run(database, "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)", [MIGRATION_VERSION, new Date().toISOString()]);
}

function saveRows(database: SqlDatabase, kind: DataKind, records: StoredRecord[]): void {
  if (records.length === 0) return;
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : kind === "history" ? validateHistoryItem : validateEstimate;
  const rows = records.map(record => {
    const item = validator(record);
    if (kind === "prospects") return {
      id: item.id, company: item.company, website: item.website ?? "", contact: item.contact ?? "",
      email: item.email ?? "", phone: item.phone ?? "", industry: item.industry ?? "",
      status: item.status ?? "Новый", source: item.source ?? "", notes: item.notes ?? "",
      created_at: item.createdAt ?? "", payload_json: JSON.stringify(item)
    };
    if (kind === "bookmarks") return {
      id: item.id, title: item.title, url: item.url, created_at: item.createdAt ?? "",
      payload_json: JSON.stringify(item)
    };
    if (kind === "history") return {
      id: item.id, title: item.title, url: item.url, visited_at: item.visitedAt ?? "",
      payload_json: JSON.stringify(item)
    };
    return { id: item.id, title: item.title, created_at: item.createdAt ?? "", payload_json: JSON.stringify(item) };
  });
  const columns = kind === "prospects"
    ? "id,company,website,contact,email,phone,industry,status,source,notes,created_at,payload_json"
    : kind === "bookmarks" ? "id,title,url,created_at,payload_json" : kind === "history" ? "id,title,url,visited_at,payload_json" : "id,title,created_at,payload_json";
  const placeholders = Object.keys(rows[0]).map(() => "?").join(",");
  const statement = database.prepare(`INSERT INTO ${kind} (${columns}) VALUES (${placeholders})`);
  try {
    for (const row of rows) {
      statement.run(Object.values(row) as SqlValue[]);
      statement.reset();
    }
  } finally {
    statement.free();
  }
}

function migrateLegacy(database: SqlDatabase, userDataPath: string): void {
  run(database, "BEGIN TRANSACTION");
  try {
    const marker = queryRows(database, "SELECT value FROM app_metadata WHERE key = ?", ["legacy_json_import_v1"]);
    if (marker.length) {
      run(database, "COMMIT");
      return;
    }
    const countRows = queryRows(database, "SELECT (SELECT COUNT(*) FROM prospects) + (SELECT COUNT(*) FROM bookmarks) + (SELECT COUNT(*) FROM history) AS count");
    if (Number(countRows[0]?.count ?? 0) > 0) {
      run(database, "INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)", ["legacy_json_import_v1", "skipped-existing-sqlite-data"]);
      run(database, "COMMIT");
      return;
    }
    for (const kind of Object.keys(LEGACY_FILES) as LegacyDataKind[]) {
      const filePath = path.join(userDataPath, LEGACY_FILES[kind]);
      if (fsSync.existsSync(filePath)) saveRows(database, kind, readLegacyRecords(filePath, kind));
    }
    run(database, "INSERT INTO app_metadata(key, value) VALUES (?, ?)", ["legacy_json_import_v1", new Date().toISOString()]);
    run(database, "COMMIT");
  } catch (error) {
    try { run(database, "ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

function validateBackupDatabase(database: SqlDatabase): void {
  integrityCheck(database);
  const versionRows = queryRows(database, "SELECT MAX(version) AS version FROM schema_migrations");
  const version = Number(versionRows[0]?.version ?? 0);
  if (!version || version > MIGRATION_VERSION) throw new Error("Версия резервной копии несовместима с этой версией приложения");
  for (const table of ["prospects", "bookmarks", "history", "estimates", "documents"]) {
    const found = queryRows(database, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table]);
    if (!found.length) {
      if (table === "estimates" || table === "documents") continue;
      throw new Error("В резервной копии отсутствуют необходимые таблицы");
    }
    const payloads = queryRows(database, `SELECT payload_json FROM ${table}`);
    const validator = table === "prospects" ? validateProspect : table === "bookmarks" ? validateBookmark : table === "history" ? validateHistoryItem : table === "estimates" ? validateEstimate : validateDocument;
    for (const row of payloads) {
      let parsed: unknown;
      try { parsed = JSON.parse(String(row.payload_json)); }
      catch { throw new Error(`В резервной копии повреждены данные таблицы ${table}`); }
      validator(parsed);
    }
  }
}

export async function initializeDatabase(userDataPath: string, wasmPath?: string): Promise<void> {
  await fs.mkdir(userDataPath, { recursive: true });
  await preserveLegacyFiles(userDataPath);
  const dbPath = getDatabasePath(userDataPath);
  const wasmFile = wasmPath ?? requireFromProject.resolve("sql.js/dist/sql-wasm.wasm");
  const SQL = await initSqlJs({ locateFile: () => wasmFile });
  let next: SqlDatabase | null = null;
  try {
    if (fsSync.existsSync(dbPath)) {
      next = new SQL.Database(new Uint8Array(fsSync.readFileSync(dbPath)));
    } else {
      next = new SQL.Database();
    }
    createSchema(next);
    migrateLegacy(next, userDataPath);
    integrityCheck(next);
    persistDatabase(next, dbPath);
  } catch (error) {
    next?.close();
    throw error;
  }
  connection?.close();
  sqlModule = SQL;
  connection = next;
  activePath = dbPath;
}

export function listRecords(kind: DataKind): StoredRecord[] {
  return queryRows(db(), `SELECT payload_json FROM ${kind}`).map(row => JSON.parse(String(row.payload_json)) as StoredRecord);
}

export function replaceRecords(kind: DataKind, input: unknown): boolean {
  const records = requireArray(input, kind);
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : kind === "history" ? validateHistoryItem : validateEstimate;
  const validated = records.map(validator);
  const database = db();
  const SQL = sqlModule;
  if (!SQL) throw new Error("SQLite-модуль ещё не инициализирован");
  const snapshot = database.export();
  try {
    run(database, "BEGIN TRANSACTION");
    run(database, `DELETE FROM ${kind}`);
    saveRows(database, kind, validated);
    run(database, "COMMIT");
    persistDatabase(database, activePath);
  } catch (error) {
    try { run(database, "ROLLBACK"); } catch { /* transaction may already be committed */ }
    database.close();
    connection = new SQL.Database(snapshot);
    throw error;
  }
  return true;
}

export async function createBackup(destinationPath: string): Promise<{ path: string; integrity: string }> {
  if (!activePath || !connection || !sqlModule) throw new Error("Локальная база ещё не инициализирована");
  if (sameFilePath(destinationPath, activePath)) throw new Error("Нельзя перезаписать рабочую базу резервной копией");
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  const tempPath = `${destinationPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.copyFile(activePath, tempPath, fsSync.constants.COPYFILE_EXCL);
    const check = new sqlModule.Database(new Uint8Array(await fs.readFile(tempPath)));
    try { validateBackupDatabase(check); }
    finally { check.close(); }
    await fs.rename(tempPath, destinationPath);
    return { path: destinationPath, integrity: "ok" };
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function restoreBackup(sourcePath: string): Promise<{ restored: boolean; safetyBackupPath: string }> {
  if (!activePath || !connection || !sqlModule) throw new Error("Локальная база ещё не инициализирована");
  if (sameFilePath(sourcePath, activePath)) throw new Error("Нельзя восстановить базу из самого рабочего файла");
  const SQL = sqlModule;
  const restoredDb = new SQL.Database(new Uint8Array(await fs.readFile(sourcePath)));
  try { validateBackupDatabase(restoredDb); createSchema(restoredDb); integrityCheck(restoredDb); }
  catch (error) { restoredDb.close(); throw error; }

  const safetyBackupPath = path.join(path.dirname(activePath), "backups", `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
  await createBackup(safetyBackupPath);
  const previousDb = connection;
  try {
    connection = restoredDb;
    persistDatabase(restoredDb, activePath);
    previousDb.close();
  } catch (error) {
    restoredDb.close();
    connection = previousDb;
    throw error;
  }
  return { restored: true, safetyBackupPath };
}

export function closeDatabase(): void {
  connection?.close();
  connection = null;
  sqlModule = null;
  activePath = "";
}
