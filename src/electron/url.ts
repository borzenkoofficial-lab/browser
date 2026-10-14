export function normalizeWebUrl(input: string): string {
  const value = input.trim();
  if (!value) return "https://www.google.com";
  if (/^[a-zA-Z][a-zA-Z\\d+.-]*:/.test(value)) {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Разрешены только HTTP и HTTPS");
    }
    return parsed.toString();
  }
  if (value.includes(".") && !value.includes(" ")) return "https://" + value;
  return "https://www.google.com/search?q=" + encodeURIComponent(value);
}
