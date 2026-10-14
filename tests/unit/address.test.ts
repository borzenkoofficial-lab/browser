import { describe, expect, it } from "vitest";

function normalizeSearch(input: string) {
  const value = input.trim();
  if (!value) return "https://www.google.com";
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Разрешены только HTTP и HTTPS");
    return parsed.toString();
  }
  if (value.includes(".") && !value.includes(" ")) return "https://" + value;
  return "https://www.google.com/search?q=" + encodeURIComponent(value);
}

describe("browser address normalization", () => {
  it("uses a safe default for an empty query", () => expect(normalizeSearch("  ")).toBe("https://www.google.com"));
  it("adds HTTPS to a domain", () => expect(normalizeSearch("example.com")).toBe("https://example.com"));
  it("converts plain text into a search", () => expect(normalizeSearch("строительные компании")).toContain("q="));
  it("rejects non-web protocols", () => expect(() => normalizeSearch("file:///C:/secret.txt")).toThrow());
});
