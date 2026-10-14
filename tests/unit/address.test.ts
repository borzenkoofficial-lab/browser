import { describe, expect, it } from "vitest";
import { normalizeWebUrl } from "../../src/electron/url";

describe("browser address normalization", () => {
  it("uses a safe default for an empty query", () => {
    expect(normalizeWebUrl("  ")).toBe("https://www.google.com");
  });

  it("adds HTTPS to a domain", () => {
    expect(normalizeWebUrl("example.com")).toBe("https://example.com/");
  });

  it("preserves a path and query when a domain is entered", () => {
    expect(normalizeWebUrl("example.com/catalog?q=doors")).toBe("https://example.com/catalog?q=doors");
  });

  it("converts plain text into a search", () => {
    expect(normalizeWebUrl("строительные компании")).toContain("q=");
  });

  it("supports localhost development servers", () => {
    expect(normalizeWebUrl("localhost:5173")).toBe("http://localhost:5173/");
    expect(normalizeWebUrl("localhost:5173/health")).toBe("http://localhost:5173/health");
  });

  it("supports a domain with an explicit port", () => {
    expect(normalizeWebUrl("example.com:8443")).toBe("https://example.com:8443/");
  });

  it.each(["file:///C:/secret.txt", "javascript:alert(1)", "data:text/html,hi", "ftp://example.com"])(
    "rejects non-web protocols: %s",
    (address) => expect(() => normalizeWebUrl(address)).toThrow()
  );

  it("rejects malformed explicit HTTP URLs", () => {
    expect(() => normalizeWebUrl("https://")).toThrow();
  });
});
