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

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
}

export function validateProspect(value: unknown): JsonRecord {
  const item = requireRecord(value, "Компания");
  const id = requireString(item.id, "id", 200).trim();
  const company = requireString(item.company, "company", 500).trim();
  if (!id || !company) throw new Error("У компании должны быть id и название");
  for (const field of ["website", "contact", "email", "phone", "location", "nextAction", "followUpDate", "industry", "status", "source", "notes", "createdAt"]) {
    if (item[field] !== undefined) requireString(item[field], field);
  }
  if (typeof item.followUpDate === "string" && item.followUpDate && !isValidIsoDate(item.followUpDate)) {
    throw new Error("Дата следующего контакта должна быть реальной датой в формате ГГГГ-ММ-ДД");
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
  for (const field of ["number", "template", "supplier", "date", "validUntil", "terms", "estimateId"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  if (item.template !== undefined && !["premium", "classic", "minimal"].includes(String(item.template))) {
    throw new Error("Неизвестный шаблон документа");
  }
  return { ...estimate, ...item };
}

export function validateObject(value: unknown): JsonRecord {
  const item = requireRecord(value, "Объект");
  const id = requireString(item.id, "id", 200).trim();
  const name = requireString(item.name, "name", 500).trim();
  if (!id || !name) throw new Error("У объекта должны быть id и название");
  for (const field of ["customer", "address", "status", "startDate", "endDate", "estimateId", "notes", "createdAt", "updatedAt"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  const plannedRevenue = item.plannedRevenue ?? 0;
  if (typeof plannedRevenue !== "number" || !Number.isFinite(plannedRevenue) || plannedRevenue < 0 || plannedRevenue > 1_000_000_000_000) {
    throw new Error("Некорректное поле: plannedRevenue");
  }
  if (!Array.isArray(item.shifts) || item.shifts.length > 1000) throw new Error("В объекте должно быть не более 1000 сменных отчётов");
  item.shifts.forEach((entry, index) => {
    const shift = requireRecord(entry, `shifts[${index}]`);
    for (const field of ["id", "date", "notes"]) requireString(shift[field], `shifts[${index}].${field}`, 5000);
    for (const field of ["workers", "hours", "quantity", "revenue", "cost"]) {
      const number = shift[field];
      if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 1_000_000_000) {
        throw new Error(`Некорректное поле: shifts[${index}].${field}`);
      }
    }
    if (Number(shift.workers) > 10000 || Number(shift.hours) > 24 * 31) throw new Error("Некорректная продолжительность смены или число работников");
  });
  return { ...item, id, name, plannedRevenue };
}

export function validateFinanceEntry(value: unknown): JsonRecord {
  const item = requireRecord(value, "Финансовая операция");
  const id = requireString(item.id, "id", 200).trim();
  const title = requireString(item.title, "title", 500).trim();
  if (!id || !title) throw new Error("У финансовой операции должны быть id и название");
  for (const field of ["type", "category", "date", "status", "counterparty", "objectId", "notes", "createdAt", "updatedAt"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  if (!["Доход", "Расход"].includes(String(item.type))) throw new Error("Тип операции должен быть «Доход» или «Расход»");
  if (!["План", "Оплачено"].includes(String(item.status))) throw new Error("Неизвестный статус финансовой операции");
  if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1_000_000_000_000) {
    throw new Error("Сумма операции должна быть неотрицательным числом");
  }
  return { ...item, id, title };
}

export function validateSupplier(value: unknown): JsonRecord {
  const item = requireRecord(value, "Поставщик");
  const id = requireString(item.id, "id", 200).trim();
  const name = requireString(item.name, "name", 500).trim();
  if (!id || !name) throw new Error("У поставщика должны быть id и название");
  for (const field of ["category", "contact", "phone", "email", "website", "region", "paymentTerms", "status", "notes", "createdAt", "updatedAt"]) {
    if (item[field] !== undefined) requireString(item[field], field, 5000);
  }
  if (item.email !== undefined && String(item.email).trim()) {
    const email = String(item.email).trim();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Укажите корректный email поставщика");
    }
    item.email = email;
  }
  if (item.website !== undefined && String(item.website).trim()) {
    const website = String(item.website).trim();
    let parsed: URL;
    try { parsed = new URL(website); }
    catch { throw new Error("Укажите корректный сайт поставщика с HTTP или HTTPS"); }
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) {
      throw new Error("Сайт поставщика должен быть корректным HTTP(S) URL");
    }
    item.website = website;
  }
  const deliveryDays = item.deliveryDays ?? 0;
  if (typeof deliveryDays !== "number" || !Number.isInteger(deliveryDays) || deliveryDays < 0 || deliveryDays > 3650) {
    throw new Error("Срок поставки должен быть целым числом дней от 0 до 3650");
  }
  const rating = item.rating ?? 0;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("Оценка поставщика должна быть от 0 до 5");
  }
  if (item.status !== undefined && !["Активен", "На паузе"].includes(String(item.status))) throw new Error("Некорректный статус поставщика");
  return { ...item, id, name, deliveryDays, rating };
}
