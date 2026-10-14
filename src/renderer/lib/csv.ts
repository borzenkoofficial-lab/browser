export type CsvProspectRow = {
  company: string; website: string; contact: string; email: string; phone: string; location: string; nextAction: string; followUpDate: string;
  industry: string; status: "Новый" | "В работе" | "Приоритет" | "Не подходит";
  source: string; notes: string; tags: string[]; createdAt: string;
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
    notes: index("заметки", "notes", "комментарий"),
    tags: index("метки", "теги", "tags", "labels"),
    createdAt: index("дата", "добавлено", "createdat", "датадобавления")
  };
  if (columns.company < 0) throw new Error("Не найдена обязательная колонка «Компания» или «Company».");

  return records.slice(1).map(values => {
    const get = (key: keyof typeof columns) => columns[key] >= 0 ? (values[columns[key]] ?? "") : "";
    const rawStatus = get("status");
    const status: CsvProspectRow["status"] = ["Новый", "В работе", "Приоритет", "Не подходит"].includes(rawStatus)
      ? rawStatus as CsvProspectRow["status"]
      : "Новый";
    return {
      company: get("company"), website: get("website"), contact: get("contact"), email: get("email"),
      phone: get("phone"), location: get("location"), nextAction: get("nextAction"), followUpDate: get("followUpDate"), industry: get("industry"), status, source: get("source"), notes: get("notes"),
      tags: get("tags").split(/[;,]/).map(tag => tag.trim()).filter(Boolean).slice(0, 20),
      createdAt: get("createdAt") || new Date().toISOString()
    };
  }).filter(row => row.company.length > 0);
}
