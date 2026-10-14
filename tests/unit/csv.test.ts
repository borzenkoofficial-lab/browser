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
  it("rejects files without a company column", () => {
    expect(() => parseProspectsCsv("Website;Email\nhttps://example.ru;a@b.com")).toThrow();
  });
});