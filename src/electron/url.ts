export function normalizeWebUrl(input: string): string {
  const value = input.trim();
  if (!value) return "https://www.google.com";

  // Local development servers are commonly entered without a protocol.
  if (/^localhost(?::\d+)?(?:\/|$)/i.test(value)) {
    return normalizeHttpUrl(value.startsWith("http://") ? value : "http://" + value);
  }

  if (/^https?:\/\//i.test(value)) return normalizeHttpUrl(value);

  // A hostname followed by a port (example.com:8443) is an address, not a URI scheme.
  const looksLikeHostWithPort = /^(?:[a-z\d-]+\.)+[a-z]{2,}:\d{1,5}(?:[/?#].*)?$/i.test(value);
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
  if (hasScheme && !looksLikeHostWithPort) {
    throw new Error("Разрешены только HTTP и HTTPS");
  }

  if (looksLikeHostWithPort) return normalizeHttpUrl("https://" + value);
  if (value.includes(".") && !/\s/.test(value)) return normalizeHttpUrl("https://" + value);

  return "https://www.google.com/search?q=" + encodeURIComponent(value);
}

function normalizeHttpUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Некорректный адрес сайта");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Разрешены только HTTP и HTTPS");
  }
  if (!parsed.hostname) throw new Error("В адресе отсутствует имя сайта");
  return parsed.toString();
}
