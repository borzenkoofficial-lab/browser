export type JsonRecord = Record<string, unknown>;

export function requireRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: ожидается объект`);
  }
  return value as JsonRecord;
}

export function requireString(value: unknown, field: string, maxLength = 100_000): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`Некорректное поле: ${field}`);
  }
  return value;
}

export function requireArray(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label}: ожидается массив`);
  if (value.length > 100_000) throw new Error(`${label}: слишком много записей`);
  return value.map((item, index) => requireRecord(item, `${label}[${index}]`));
}

export function validateProspect(value: unknown): JsonRecord {
  const item = requireRecord(value, "Компания");
  const id = requireString(item.id, "id", 200).trim();
  const company = requireString(item.company, "company", 500).trim();
  if (!id || !company) throw new Error("У компании должны быть id и название");
  for (const field of ["website", "contact", "email", "phone", "location", "nextAction", "followUpDate", "industry", "status", "source", "notes", "createdAt"]) {
    if (item[field] !== undefined) requireString(item[field], field);
  }
  return { ...item, id, company };
}

export function validateBookmark(value: unknown): JsonRecord {
  const item = requireRecord(value, "Закладка");
  const id = requireString(item.id, "id", 200).trim();
  const title = requireString(item.title, "title", 1000);
  const url = requireString(item.url, "url", 10_000);
  if (!id || !url) throw new Error("У закладки должны быть id и URL");
  if (!/^https?:\/\//i.test(url)) throw new Error("В закладке разрешены только HTTP(S) URL");
  if (item.createdAt !== undefined) requireString(item.createdAt, "createdAt");
  return { ...item, id, title, url };
}

export function validateHistoryItem(value: unknown): JsonRecord {
  const item = requireRecord(value, "История");
  const id = requireString(item.id, "id", 200).trim();
  const title = requireString(item.title, "title", 1000);
  const url = requireString(item.url, "url", 10_000);
  if (!id || !url) throw new Error("У записи истории должны быть id и URL");
  if (!/^https?:\/\//i.test(url)) throw new Error("В истории разрешены только HTTP(S) URL");
  if (item.visitedAt !== undefined) requireString(item.visitedAt, "visitedAt");
  return { ...item, id, title, url };
}
