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

  it("stores estimate records and preserves them in a verified backup", async () => {
    await setup();
    const estimate = {
      id: "e1", title: "Демонтаж офиса", customer: "ООО Заказчик", object: "Москва",
      status: "Черновик", notes: "", createdAt: "2026-10-14T10:00:00.000Z", updatedAt: "2026-10-14T10:00:00.000Z",
      items: [{ id: "line1", name: "Снятие стяжки", unit: "м²", quantity: 100, price: 450, cost: 280 }]
    };
    replaceRecords("estimates", [estimate]);
    expect(listRecords("estimates")).toEqual([estimate]);
    const backupPath = path.join(tempDir, "backups", "estimates.sqlite");
    expect((await createBackup(backupPath)).integrity).toBe("ok");
    replaceRecords("estimates", []);
    await restoreBackup(backupPath);
    expect(listRecords("estimates")).toEqual([estimate]);
  });

  it("rejects estimates with negative quantity or invalid costs", async () => {
    await setup();
    expect(() => replaceRecords("estimates", [{
      id: "e2", title: "Некорректная смета", items: [{ id: "l1", name: "Работа", unit: "м²", quantity: -1, price: 100, cost: 50 }]
    }])).toThrow(/quantity/);
    expect(listRecords("estimates")).toEqual([]);
  });

  it("stores commercial proposal documents and includes them in backups", async () => {
    await setup();
    const document = {
      id: "d1", number: "КП-2026-0001", title: "КП на демонтаж", template: "premium",
      customer: "ООО Заказчик", supplier: "ИП Исполнитель", object: "Москва",
      date: "2026-10-14", validUntil: "2026-10-21", terms: "Условия согласуются отдельно.",
      status: "Черновик", notes: "", estimateId: "", createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      items: [{ id: "l1", name: "Демонтаж перегородок", unit: "м²", quantity: 25, price: 700, cost: 430 }]
    };
    replaceRecords("documents", [document]);
    expect(listRecords("documents")).toEqual([document]);
    const backupPath = path.join(tempDir, "backups", "documents.sqlite");
    expect((await createBackup(backupPath)).integrity).toBe("ok");
    replaceRecords("documents", []);
    await restoreBackup(backupPath);
    expect(listRecords("documents")).toEqual([document]);
  });

  it("rejects documents with an unknown template", async () => {
    await setup();
    expect(() => replaceRecords("documents", [{
      id: "d2", number: "КП-2", title: "КП", template: "untrusted-html", items: []
    }])).toThrow(/шаблон/);
    expect(listRecords("documents")).toEqual([]);
  });

  it("stores project objects with shift reports and restores them from backup", async () => {
    await setup();
    const project = {
      id: "o1", name: "Демонтаж офиса", customer: "ООО Заказчик", address: "Москва",
      status: "В работе", startDate: "2026-10-14", endDate: "2026-10-30", estimateId: "e1",
      plannedRevenue: 250000, notes: "Ручной вынос", createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-14T10:00:00.000Z",
      shifts: [{ id: "s1", date: "2026-10-14", workers: 4, hours: 8, quantity: 42, revenue: 25000, cost: 16000, notes: "Без лифта" }]
    };
    replaceRecords("objects", [project]);
    expect(listRecords("objects")).toEqual([project]);
    const backupPath = path.join(tempDir, "backups", "objects.sqlite");
    expect((await createBackup(backupPath)).integrity).toBe("ok");
    replaceRecords("objects", []);
    await restoreBackup(backupPath);
    expect(listRecords("objects")).toEqual([project]);
  });

  it("rejects object shift reports with impossible work hours", async () => {
    await setup();
    expect(() => replaceRecords("objects", [{
      id: "o2", name: "Объект", shifts: [{ id: "s1", date: "2026-10-14", workers: 2, hours: 900, quantity: 1, revenue: 1, cost: 1, notes: "" }]
    }])).toThrow(/продолжительность/);
    expect(listRecords("objects")).toEqual([]);
  });

  it("stores suppliers and includes vendor records in backups", async () => {
    await setup();
    const supplier = {
      id: "sup1", name: "ООО Поставка", category: "Материалы", contact: "Иван",
      phone: "+79990000000", email: "sales@example.ru", website: "https://example.ru",
      region: "Москва", paymentTerms: "Отсрочка 7 дней", deliveryDays: 3, rating: 4,
      status: "Активен", notes: "Проверенный поставщик",
      createdAt: "2026-10-14T10:00:00.000Z", updatedAt: "2026-10-14T10:00:00.000Z"
    };
    replaceRecords("suppliers", [supplier]);
    expect(listRecords("suppliers")).toEqual([supplier]);
    const backupPath = path.join(tempDir, "backups", "suppliers.sqlite");
    expect((await createBackup(backupPath)).integrity).toBe("ok");
    replaceRecords("suppliers", []);
    await restoreBackup(backupPath);
    expect(listRecords("suppliers")).toEqual([supplier]);
  });
  it("stores finance entries and restores them from a backup", async () => {
    await setup();
    const entry = {
      id: "f1", type: "Доход", title: "Аванс по договору", category: "Аванс", amount: 85000,
      date: "2026-10-14", status: "Оплачено", counterparty: "ООО Заказчик", objectId: "o1",
      notes: "Поступило на счёт", createdAt: "2026-10-14T10:00:00.000Z", updatedAt: "2026-10-14T10:00:00.000Z"
    };
    replaceRecords("finance", [entry]);
    expect(listRecords("finance")).toEqual([entry]);
    const backupPath = path.join(tempDir, "backups", "finance.sqlite");
    expect((await createBackup(backupPath)).integrity).toBe("ok");
    replaceRecords("finance", []);
    await restoreBackup(backupPath);
    expect(listRecords("finance")).toEqual([entry]);
  });

  it("rejects negative finance amounts and invalid operation types", async () => {
    await setup();
    expect(() => replaceRecords("finance", [{ id: "f2", type: "Кредит", title: "Некорректно", amount: 10, status: "План" }])).toThrow(/Доход|Расход/);
    expect(() => replaceRecords("finance", [{ id: "f3", type: "Расход", title: "Некорректно", amount: -1, status: "План" }])).toThrow(/Сумма операции/);
    expect(listRecords("finance")).toEqual([]);
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
