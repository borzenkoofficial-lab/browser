export type CsvProspectRow = {
  company: string; website: string; contact: string; email: string; phone: string; location: string; nextAction: string; followUpDate: string;
  industry: string; status: "Новый" | "В работе" | "Приоритет" | "Не подходит";
  source: string; sourceUrl: string; sourceCapturedAt: string; notes: string; tags: string[];
};

function parseRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let value = "";
  let quoted = false;

  const pushField = () => { fields.push(value.trim()); value = ""; };
  const pushRecord = () => {
    pushField();
    if (fields.some(field => field.length > 0)) records.push(fields);
    fields = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      pushField();
    } else if (char === "\n" && !quoted) {
      pushRecord();
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error("CSV содержит незакрытое поле в кавычках.");
  if (value.length > 0 || fields.length > 0) pushRecord();
  return records;
}

function normalizeFollowUpDate(value: string, rowNumber: number): string {
  if (!value) return "";
  let iso = value;
  const localized = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (localized) {
    const [, day, month, year] = localized;
    iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`CSV: некорректная дата контакта в строке ${rowNumber}: «${value}». Используйте ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.`);
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    throw new Error(`CSV: несуществующая дата контакта в строке ${rowNumber}: «${value}».`);
  }
  return iso;
}

export function parseProspectsCsv(text: string): CsvProspectRow[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const firstLine = normalized.split("\n", 1)[0];
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ";" : ",";
  const records = parseRecords(normalized, delimiter);
  if (!records.length) return [];

  const headers = records[0].map(h => h.toLowerCase().replace(/[\s_]+/g, ""));
  const index = (...aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const columns = {
    company: index("компания", "названиекомпании", "company", "name", "название"),
    website: index("сайт", "website", "url", "ссылка"),
    contact: index("контакт", "контактноелицо", "contact", "person"),
    email: index("email", "почта", "электроннаяпочта", "e-mail"),
    phone: index("телефон", "phone", "mobile"),
    location: index("регион", "город", "местоположение", "location", "region"),
    nextAction: index("следующийшаг", "следующеедействие", "nextaction", "nextstep"),
    followUpDate: index("датаконтакта", "датаследующегоконтакта", "followupdate", "nextcontactdate"),
    industry: index("отрасль", "industry", "сфера"),
    status: index("статус", "status"),
    source: index("источник", "source"),
    sourceUrl: index("urlисточника", "ссылкаисточника", "sourceurl"),
    sourceCapturedAt: index("датапроверкиисточника", "датасбораисточника", "sourcecapturedat", "sourceverifiedat"),
    notes: index("заметки", "notes", "комментарий"),
    tags: index("метки", "теги", "tags", "labels"),
    createdAt: index("дата", "добавлено", "createdat", "датадобавления")
  };
  if (columns.company < 0) throw new Error("Не найдена обязательная колонка «Компания» или «Company».");

  return records.slice(1).map((values, rowIndex) => {
    const get = (key: keyof typeof columns) => columns[key] >= 0 ? (values[columns[key]] ?? "") : "";
    const rawStatus = get("status");
    const status: CsvProspectRow["status"] = ["Новый", "В работе", "Приоритет", "Не подходит"].includes(rawStatus)
      ? rawStatus as CsvProspectRow["status"]
      : "Новый";
    const followUpDate = normalizeFollowUpDate(get("followUpDate"), rowIndex + 2);
    return {
      company: get("company"), website: get("website"), contact: get("contact"), email: get("email"),
      phone: get("phone"), location: get("location"), nextAction: get("nextAction"), followUpDate, industry: get("industry"), status, source: get("source"), sourceUrl: get("sourceUrl"), sourceCapturedAt: get("sourceCapturedAt"), notes: get("notes"),
      tags: get("tags").split(/[;,]/).map(tag => tag.trim()).filter(Boolean).slice(0, 20),
      createdAt: get("createdAt") || new Date().toISOString()
    };
  }).filter(row => row.company.length > 0);
}
