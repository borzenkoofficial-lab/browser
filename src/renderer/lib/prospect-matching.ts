export type WebsiteRecord = { website?: string | null };

export function normalizeWebsiteHost(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function findProspectByWebsite<T extends WebsiteRecord>(records: T[], website: string): T | undefined {
  const host = normalizeWebsiteHost(website);
  if (!host) return undefined;
  return records.find(record => normalizeWebsiteHost(record.website ?? "") === host);
}
