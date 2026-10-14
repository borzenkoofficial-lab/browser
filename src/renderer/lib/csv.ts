export type CsvProspectRow = {
  company: string; website: string; contact: string; email: string; phone: string;
  industry: string; status: "Новый" | "В работе" | "Приоритет" | "Не подходит";
  source: string; notes: string; createdAt: string;
};

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      fields.push(value.trim()); value = "";
    } else value += char;
  }
  fields.push(value.trim());
  return fields;
}

export function parseProspectsCsv(text: string): CsvProspectRow[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const lines = normalized.split("\n").filter(line => line.trim().length > 0);
  const delimiter = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ";" : ",";
  const headers = parseLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[\s_]+/g, ""));
  const index = (...aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const columns = {
    company: index("компания", "названиекомпании", "company", "name", "название"),
    website: index("сайт", "website", "url", "ссылка"),
    contact: index("контакт", "контактноелицо", "contact", "person"),
    email: index("email", "почта", "электроннаяпочта", "e-mail"),
    phone: index("телефон", "phone", "mobile"),
    industry: index("отрасль", "industry", "сфера"),
    status: index("статус", "status"),
    source: index("источник", "source"),
    notes: index("заметки", "notes", "комментарий"),
    createdAt: index("дата", "добавлено", "createdat", "дата добавления".replace(/\s/g, ""))
  };
  if (columns.company < 0) throw new Error("Не найдена обязательная колонка «Компания» или «Company».");
  return lines.slice(1).map(line => {
    const values = parseLine(line, delimiter);
    const get = (key: keyof typeof columns) => columns[key] >= 0 ? (values[columns[key]] ?? "") : "";
    const rawStatus = get("status");
    const status: CsvProspectRow["status"] = ["Новый", "В работе", "Приоритет", "Не подходит"].includes(rawStatus) ? rawStatus as CsvProspectRow["status"] : "Новый";
    return {
      company: get("company"), website: get("website"), contact: get("contact"), email: get("email"),
      phone: get("phone"), industry: get("industry"), status, source: get("source"), notes: get("notes"),
      createdAt: get("createdAt") || new Date().toISOString()
    };
  }).filter(row => row.company.length > 0);
}
