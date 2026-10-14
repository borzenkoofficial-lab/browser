import { describe, expect, it } from "vitest";
import { requireArray, validateBookmark, validateHistoryItem, validateProspect } from "../../src/electron/storage/validation";

describe("local storage validation", () => {
  it("rejects non-array payloads", () => {
    expect(() => requireArray({ company: "ООО" }, "prospects")).toThrow(/массив/);
  });

  it("rejects companies without required id or name", () => {
    expect(() => validateProspect({ id: "1", company: " " })).toThrow(/id и название/);
    expect(() => validateProspect({ company: "ООО" })).toThrow();
  });

  it("rejects oversized string fields", () => {
    expect(() => validateProspect({ id: "1", company: "A".repeat(501) })).toThrow(/company/);
  });

  it("accepts real ISO follow-up dates and rejects invalid dates", () => {
    expect(validateProspect({ id: "p1", company: "ООО Тест", followUpDate: "2026-10-20" })).toMatchObject({ followUpDate: "2026-10-20" });
    expect(() => validateProspect({ id: "p1", company: "ООО Тест", followUpDate: "2026-02-30" })).toThrow(/реальной датой/);
    expect(() => validateProspect({ id: "p1", company: "ООО Тест", followUpDate: "20.10.2026" })).toThrow(/ГГГГ-ММ-ДД/);
  });

  it("rejects non-http bookmarks", () => {
    expect(() => validateBookmark({ id: "1", title: "x", url: "file:///secret" })).toThrow(/HTTP/);
  });

  it("rejects non-http history records", () => {
    expect(() => validateHistoryItem({ id: "1", title: "x", url: "javascript:alert(1)" })).toThrow(/HTTP/);
  });

  it("preserves valid optional fields", () => {
    expect(validateProspect({ id: "p1", company: "ООО Тест", notes: "Заметка" })).toMatchObject({
      id: "p1", company: "ООО Тест", notes: "Заметка"
    });
  });
});
