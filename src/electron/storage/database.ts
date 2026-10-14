import Database from "better-sqlite3";
import fs from "node:fs/promises";
import path from "node:path";
import { validateBookmark, validateHistoryItem, validateProspect, requireArray } from "./validation";

export type StoredRecord = Record<string, unknown>;
type DataKind = "prospects" | "bookmarks" | "history";

const MIGRATION_VERSION = 1;
let connection: Database.Database | null = null;
let activePath = "";

const LEGACY_FILES: Record<DataKind, string> = {
  prospects: "prospects.json",
  bookmarks: "bookmarks.json",
  history: "history.json"
};

export function getDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, "nexus.sqlite");
}

function db(): Database.Database {
  if (!connection) throw new Error("Локальная база ещё не инициализирована");
  return connection;
}

function readLegacyRecords(filePath: string, kind: DataKind): StoredRecord[] {
  // Kept synchronous to run inside the startup migration transaction.
  const fsSync = require("node:fs") as typeof import("node:fs");
  if (!fsSync.existsSync(filePath)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(fsSync.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`Не удалось прочитать старые данные: ${path.basename(filePath)}. Исходный файл сохранён; миграция остановлена.`);
  }
  const records = requireArray(parsed, path.basename(filePath));
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : validateHistoryItem;
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

function createSchema(database: Database.Database): void {
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
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
  `);
  database.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(MIGRATION_VERSION, new Date().toISOString());
}

function saveRows(database: Database.Database, kind: DataKind, records: StoredRecord[]): void {
  const table = kind;
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : validateHistoryItem;
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
    return {
      id: item.id, title: item.title, url: item.url, visited_at: item.visitedAt ?? "",
      payload_json: JSON.stringify(item)
    };
  });
  const columns = kind === "prospects"
    ? "id,company,website,contact,email,phone,industry,status,source,notes,created_at,payload_json"
    : kind === "bookmarks" ? "id,title,url,created_at,payload_json" : "id,title,url,visited_at,payload_json";
  const placeholders = rows.length ? Object.keys(rows[0]).map(() => "?").join(",") : "";
  const insert = database.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
  for (const row of rows) insert.run(...Object.values(row));
}

function migrateLegacy(database: Database.Database, userDataPath: string): void {
  const fsSync = require("node:fs") as typeof import("node:fs");
  const migration = database.transaction(() => {
    const marker = database.prepare("SELECT value FROM app_metadata WHERE key = ?").get("legacy_json_import_v1");
    if (marker) return;
    const hasData = (database.prepare("SELECT COUNT(*) AS count FROM prospects").get() as { count: number }).count
      + (database.prepare("SELECT COUNT(*) AS count FROM bookmarks").get() as { count: number }).count
      + (database.prepare("SELECT COUNT(*) AS count FROM history").get() as { count: number }).count;
    if (hasData > 0) {
      database.prepare("INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)").run("legacy_json_import_v1", "skipped-existing-sqlite-data");
      return;
    }
    for (const kind of Object.keys(LEGACY_FILES) as DataKind[]) {
      const filePath = path.join(userDataPath, LEGACY_FILES[kind]);
      if (fsSync.existsSync(filePath)) saveRows(database, kind, readLegacyRecords(filePath, kind));
    }
    database.prepare("INSERT INTO app_metadata(key, value) VALUES (?, ?)").run("legacy_json_import_v1", new Date().toISOString());
  });
  migration();
}

export async function initializeDatabase(userDataPath: string): Promise<void> {
  await fs.mkdir(userDataPath, { recursive: true });
  await preserveLegacyFiles(userDataPath);
  const dbPath = getDatabasePath(userDataPath);
  const next = new Database(dbPath);
  try {
    createSchema(next);
    migrateLegacy(next, userDataPath);
    const integrity = next.pragma("integrity_check") as Array<{ integrity_check: string }>;
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
      throw new Error("Проверка целостности SQLite не пройдена");
    }
  } catch (error) {
    next.close();
    throw error;
  }
  connection?.close();
  connection = next;
  activePath = dbPath;
}

export function listRecords(kind: DataKind): StoredRecord[] {
  const rows = db().prepare(`SELECT payload_json FROM ${kind}`).all() as Array<{ payload_json: string }>;
  return rows.map(row => JSON.parse(row.payload_json) as StoredRecord);
}

export function replaceRecords(kind: DataKind, input: unknown): boolean {
  const records = requireArray(input, kind);
  const validator = kind === "prospects" ? validateProspect : kind === "bookmarks" ? validateBookmark : validateHistoryItem;
  const validated = records.map(validator);
  const database = db();
  const replace = database.transaction(() => {
    database.prepare(`DELETE FROM ${kind}`).run();
    saveRows(database, kind, validated);
  });
  replace();
  return true;
}

export async function createBackup(destinationPath: string): Promise<{ path: string; integrity: string }> {
  if (!activePath) throw new Error("Локальная база ещё не инициализирована");
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await db().backup(destinationPath);
  const check = new Database(destinationPath, { readonly: true, fileMustExist: true });
  try {
    const result = check.pragma("integrity_check") as Array<{ integrity_check: string }>;
    if (result.length !== 1 || result[0].integrity_check !== "ok") throw new Error("Резервная копия не прошла проверку целостности");
  } finally { check.close(); }
  return { path: destinationPath, integrity: "ok" };
}

export async function restoreBackup(sourcePath: string): Promise<{ restored: boolean; safetyBackupPath: string }> {
  if (!activePath) throw new Error("Локальная база ещё не инициализирована");
  if (path.resolve(sourcePath) === path.resolve(activePath)) throw new Error("Нельзя восстановить базу из самого рабочего файла");
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const result = source.pragma("integrity_check") as Array<{ integrity_check: string }>;
    if (result.length !== 1 || result[0].integrity_check !== "ok") throw new Error("Выбранная копия повреждена");
    const version = source.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as { version: number | null };
    if (!version.version || version.version > MIGRATION_VERSION) throw new Error("Версия резервной копии несовместима с этой версией приложения");
    for (const table of ["prospects", "bookmarks", "history"]) {
      const exists = source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (!exists) throw new Error("В резервной копии отсутствуют необходимые таблицы");
    }
  } finally { source.close(); }

  const safetyBackupPath = path.join(path.dirname(activePath), "backups", `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
  await createBackup(safetyBackupPath);
  const backupDb = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const current = db();
    const restore = current.transaction(() => {
      for (const table of ["prospects", "bookmarks", "history"]) {
        current.prepare(`DELETE FROM ${table}`).run();
        const rows = backupDb.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
        if (table === "prospects") {
          const stmt = current.prepare("INSERT INTO prospects(id,company,website,contact,email,phone,industry,status,source,notes,created_at,payload_json) VALUES (@id,@company,@website,@contact,@email,@phone,@industry,@status,@source,@notes,@created_at,@payload_json)");
          for (const row of rows) stmt.run(row);
        } else if (table === "bookmarks") {
          const stmt = current.prepare("INSERT INTO bookmarks(id,title,url,created_at,payload_json) VALUES (@id,@title,@url,@created_at,@payload_json)");
          for (const row of rows) stmt.run(row);
        } else {
          const stmt = current.prepare("INSERT INTO history(id,title,url,visited_at,payload_json) VALUES (@id,@title,@url,@visited_at,@payload_json)");
          for (const row of rows) stmt.run(row);
        }
      }
    });
    restore();
  } finally { backupDb.close(); }
  const integrity = db().pragma("integrity_check") as Array<{ integrity_check: string }>;
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") throw new Error("Восстановление завершилось ошибкой проверки целостности");
  return { restored: true, safetyBackupPath };
}

export function closeDatabase(): void {
  connection?.close();
  connection = null;
  activePath = "";
}
