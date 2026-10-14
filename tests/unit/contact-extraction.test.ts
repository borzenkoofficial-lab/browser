import { describe, expect, it } from "vitest";
import { extractContactCandidates, formatContactCandidatesNote } from "../../src/renderer/lib/contact-extraction";

describe("extractContactCandidates", () => {
  it("collects distinct emails and plausible phone numbers", () => {
    const result = extractContactCandidates("Связь: sales@example.ru, SALES@example.ru; +7 (495) 123-45-67; 8 495 123 45 67; 12345");
    expect(result.emails).toEqual(["sales@example.ru"]);
    expect(result.phones).toEqual(["+7 (495) 123-45-67", "8 495 123 45 67"]);
  });

  it("does not return phone-like strings with too few or too many digits", () => {
    const result = extractContactCandidates("Код 123-45; длинный 12345678901234567890");
    expect(result.phones).toEqual([]);
  });

  it("labels extracted values as unverified and returns empty note when nothing found", () => {
    expect(formatContactCandidatesNote(["info@example.ru"], ["+7 999 123-45-67"])).toContain("не проверены");
    expect(formatContactCandidatesNote([], [])).toBe("");
  });
});
