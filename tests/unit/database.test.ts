import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeDatabase, createBackup, initializeDatabase, listRecords, restoreBackup, replaceRecords } from "../../src/electron/storage/database";

let tempDir = "";

async function setup() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-storage-test-"));
  await initializeDatabase(tempDir);
  return tempDir;
}

afterEach(async () => {
  closeDatabase();
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  tempDir = "";
});

describe("SQLite repository storage", () => {
  it("stores validated records and reads them back", async () => {
    await setup();
    replaceRecords("prospects", [{ id: "p1", company: "ООО Строй", website: "https://example.ru" }]);
    expect(listRecords("prospects")).toEqual([{ id: "p1", company: "ООО Строй", website: "https://example.ru" }]);
  });

  it("does not replace existing data when validation fails", async () => {
    await setup();
    replaceRecords("prospects", [{ id: "p1", company: "ООО Строй" }]);
    expect(() => replaceRecords("prospects", [{ id: "p2", company: "" }])).toThrow();
    expect(listRecords("prospects")).toHaveLength(1);
    expect(listRecords("prospects")[0].id).toBe("p1");
  });

  it("preserves legacy JSON files and imports them into SQLite", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-storage-test-"));
    await fs.writeFile(path.join(tempDir, "prospects.json"), JSON.stringify([{ id: "legacy1", company: "ООО Наследие" }]));
    await fs.writeFile(path.join(tempDir, "bookmarks.json"), JSON.stringify([{ id: "b1", title: "Сайт", url: "https://example.ru", createdAt: "2026-01-01" }]));
    await initializeDatabase(tempDir);
    expect(listRecords("prospects")).toHaveLength(1);
    expect(listRecords("bookmarks")).toHaveLength(1);
    expect(await fs.readFile(path.join(tempDir, "prospects.json"), "utf8")).toContain("ООО Наследие");
    expect(await fs.readFile(path.join(tempDir, "backups", "pre-sqlite", "prospects.json"), "utf8")).toContain("ООО Наследие");
  });

  it("does not re-import stale JSON after the SQLite data is intentionally emptied", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-storage-test-"));
    await fs.writeFile(path.join(tempDir, "prospects.json"), JSON.stringify([{ id: "old", company: "Старая запись" }]));
    await initializeDatabase(tempDir);
    replaceRecords("prospects", []);
    closeDatabase();
    await initializeDatabase(tempDir);
    expect(listRecords("prospects")).toEqual([]);
  });

  it("stops migration on malformed legacy JSON without changing source", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-storage-test-"));
    const broken = "{ broken";
    await fs.writeFile(path.join(tempDir, "prospects.json"), broken);
    await expect(initializeDatabase(tempDir)).rejects.toThrow(/миграция остановлена/);
    expect(await fs.readFile(path.join(tempDir, "prospects.json"), "utf8")).toBe(broken);
  });

  it("rejects a corrupt backup without changing the active database", async () => {
    await setup();
    replaceRecords("prospects", [{ id: "p1", company: "Данные должны сохраниться" }]);
    const badBackup = path.join(tempDir, "backups", "corrupt.sqlite");
    await fs.mkdir(path.dirname(badBackup), { recursive: true });
    await fs.writeFile(badBackup, "not a SQLite database");
    await expect(restoreBackup(badBackup)).rejects.toThrow();
    expect(listRecords("prospects")).toMatchObject([{ id: "p1", company: "Данные должны сохраниться" }]);
  });

  it("rolls back duplicate record IDs without losing the existing dataset", async () => {
    await setup();
    replaceRecords("prospects", [{ id: "p1", company: "Сохранённая компания" }]);
    expect(() => replaceRecords("prospects", [
      { id: "p2", company: "Первая новая компания" },
      { id: "p2", company: "Дубликат" }
    ])).toThrow();
    expect(listRecords("prospects")).toMatchObject([{ id: "p1", company: "Сохранённая компания" }]);
  });

  it("creates and restores a verified backup", async () => {
    await setup();
    replaceRecords("prospects", [{ id: "p1", company: "Исходная компания" }]);
    const backupPath = path.join(tempDir, "backups", "manual.sqlite");
    const backup = await createBackup(backupPath);
    expect(backup.integrity).toBe("ok");
    replaceRecords("prospects", [{ id: "p2", company: "Новая компания" }]);
    const restored = await restoreBackup(backupPath);
    expect(restored.restored).toBe(true);
    expect(listRecords("prospects")).toMatchObject([{ id: "p1", company: "Исходная компания" }]);
    await fs.access(restored.safetyBackupPath);
  });
});
