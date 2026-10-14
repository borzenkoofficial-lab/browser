import { describe, expect, it } from "vitest";
import { parseProspectsCsv } from "../../src/renderer/lib/csv";

describe("prospect CSV import", () => {
  it("imports semicolon-delimited Russian headers and quoted delimiters", () => {
    const rows = parseProspectsCsv('Компания;Сайт;Email;Заметки\n"ООО Ромашка";https://example.ru;info@example.ru;"Москва; коммерция"');
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("ООО Ромашка");
    expect(rows[0].notes).toBe("Москва; коммерция");
  });

  it("accepts English headers and commas inside quoted fields", () => {
    const rows = parseProspectsCsv('Company,Website,Notes\n"Acme, Inc.",https://acme.test,"First, second"');
    expect(rows[0].company).toBe("Acme, Inc.");
    expect(rows[0].notes).toBe("First, second");
  });

  it("preserves line breaks inside quoted fields and escaped quotes", () => {
    const rows = parseProspectsCsv('Company,Notes\nAcme,"First line\nSecond ""quoted"" line"');
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe('First line\nSecond "quoted" line');
  });

  it("imports region and follow-up fields from exported Russian CSV", () => {
    const rows = parseProspectsCsv("Компания;Регион;Следующий шаг;Дата контакта\nООО Строй;Москва;Позвонить;2026-10-20");
    expect(rows[0].location).toBe("Москва");
    expect(rows[0].nextAction).toBe("Позвонить");
    expect(rows[0].followUpDate).toBe("2026-10-20");
  });

  it("normalizes Russian date formats and rejects invalid follow-up dates", () => {
    expect(parseProspectsCsv("Компания;Дата контакта\nООО Строй;20.10.2026")[0].followUpDate).toBe("2026-10-20");
    expect(parseProspectsCsv("Компания;Дата контакта\nООО Строй;31/12/2026")[0].followUpDate).toBe("2026-12-31");
    expect(() => parseProspectsCsv("Компания;Дата контакта\nООО Строй;2026-02-30")).toThrow(/несуществующая дата.*строке 2/i);
    expect(() => parseProspectsCsv("Компания;Дата контакта\nООО Строй;в пятницу")).toThrow(/некорректная дата.*строке 2/i);
  });

  it("imports prospect tags from Russian and English CSV headers", () => {
    const rows = parseProspectsCsv('Компания;Метки\nООО Строй;"генподрядчик, тендер"');
    expect(rows[0].tags).toEqual(["генподрядчик", "тендер"]);
    const english = parseProspectsCsv('Company,Tags\nAcme,"priority, contractor"');
    expect(english[0].tags).toEqual(["priority", "contractor"]);
  });

  it("imports source URL and source verification date from CSV", () => {
    const rows = parseProspectsCsv("Компания;URL источника;Дата проверки источника\nООО Строй;https://example.ru/catalog;2026-10-14");
    expect(rows[0].sourceUrl).toBe("https://example.ru/catalog");
    expect(rows[0].sourceCapturedAt).toBe("2026-10-14");
  });

  it("keeps source provenance optional for older CSV exports", () => {
    const rows = parseProspectsCsv("Компания;Сайт\nООО Строй;https://example.ru");
    expect(rows[0].sourceUrl).toBe("");
    expect(rows[0].sourceCapturedAt).toBe("");
  });

  it("rejects malformed unclosed quoted fields", () => {
    expect(() => parseProspectsCsv('Company,Notes\nAcme,"unfinished')).toThrow(/незакрытое поле/);
  });

  it("rejects files without a company column", () => {
    expect(() => parseProspectsCsv("Website;Email\nhttps://example.ru;a@b.com")).toThrow();
  });
});
