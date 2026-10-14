import { describe, expect, it } from "vitest";
import { normalizeWebUrl } from "../../src/electron/url";

describe("browser address normalization", () => {
  it("uses a safe default for an empty query", () => expect(normalizeWebUrl("  ")).toBe("https://www.google.com"));
  it("adds HTTPS to a domain", () => expect(normalizeWebUrl("example.com")).toBe("https://example.com"));
  it("converts plain text into a search", () => expect(normalizeWebUrl("строительные компании")).toContain("q="));
  it("rejects non-web protocols", () => expect(() => normalizeWebUrl("file:///C:/secret.txt")).toThrow());
});
