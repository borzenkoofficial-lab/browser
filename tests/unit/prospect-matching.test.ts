import { describe, expect, it } from "vitest";
import { findProspectByWebsite, normalizeWebsiteHost } from "../../src/renderer/lib/prospect-matching";

describe("normalizeWebsiteHost", () => {
  it("normalizes scheme, path, case, and www", () => {
    expect(normalizeWebsiteHost("HTTPS://WWW.Example.com/about?ref=1")).toBe("example.com");
    expect(normalizeWebsiteHost("example.com/contact")).toBe("example.com");
  });

  it("returns an empty string for invalid or empty values", () => {
    expect(normalizeWebsiteHost("")).toBe("");
    expect(normalizeWebsiteHost("http://")).toBe("");
  });
});

describe("findProspectByWebsite", () => {
  const records = [
    { company: "Example LLC", website: "https://www.example.com/about" },
    { company: "Other LLC", website: "https://other.example" },
  ];

  it("matches a saved company by hostname, not URL path", () => {
    expect(findProspectByWebsite(records, "http://example.com/contact")).toBe(records[0]);
  });

  it("does not match unrelated or missing websites", () => {
    expect(findProspectByWebsite(records, "https://new.example")).toBeUndefined();
    expect(findProspectByWebsite(records, "")).toBeUndefined();
  });
});
