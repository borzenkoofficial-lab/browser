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
  if (item.tags !== undefined) {
    if (!Array.isArray(item.tags) || item.tags.length > 20) throw new Error("Некорректное поле: tags");
    item.tags.forEach((tag, index) => requireString(tag, `tags[${index}]`, 100));
  }
  if (item.activity !== undefined) {
    if (!Array.isArray(item.activity) || item.activity.length > 100) throw new Error("Некорректное поле: activity");
    item.activity.forEach((entry, index) => {
      const activity = requireRecord(entry, `activity[${index}]`);
      for (const field of ["id", "date", "type", "note"]) requireString(activity[field], `activity[${index}].${field}`, field === "note" ? 5000 : 200);
    });
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


export function validateEstimate(value: unknown): JsonRecord {
  const item = requireRecord(value, "Смета");
  const id = requireString(item.id, "id", 200).trim();
  const title = requireString(item.title, "title", 500).trim();
  if (!id || !title) throw new Error("У сметы должны быть id и название");
  for (const field of ["customer", "object", "status", "notes", "createdAt", "updatedAt"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  if (!Array.isArray(item.items) || item.items.length > 200) throw new Error("В смете должно быть не более 200 позиций");
  item.items.forEach((entry, index) => {
    const line = requireRecord(entry, `items[${index}]`);
    for (const field of ["id", "name", "unit"]) requireString(line[field], `items[${index}].${field}`, 500);
    for (const field of ["quantity", "price", "cost"]) {
      const number = line[field];
      if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 1_000_000_000) {
        throw new Error(`Некорректное поле: items[${index}].${field}`);
      }
    }
  });
  return { ...item, id, title };
}

export function validateDocument(value: unknown): JsonRecord {
  const item = requireRecord(value, "Документ");
  const estimate = validateEstimate(item);
  for (const field of ["number", "template", "supplier", "validUntil", "terms", "estimateId"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  if (item.template !== undefined && !["premium", "classic", "minimal"].includes(String(item.template))) {
    throw new Error("Неизвестный шаблон документа");
  }
  return { ...estimate, ...item };
}
