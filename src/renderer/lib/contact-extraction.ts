export type ExtractedContactCandidates = { emails: string[]; phones: string[] };

export function extractContactCandidates(text: string): ExtractedContactCandidates {
  const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
    .map(value => value.trim().replace(/[),.;]+$/, ""))
    .filter(value => value.length <= 254 && !value.includes(".."))];

  const phoneMatches = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
  const seenPhones = new Set<string>();
  const phones: string[] = [];
  for (const match of phoneMatches) {
    const candidate = match.trim().replace(/[),.;]+$/, "");
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15 || seenPhones.has(digits)) continue;
    seenPhones.add(digits);
    phones.push(candidate);
  }
  return { emails, phones };
}

export function formatContactCandidatesNote(emails: string[], phones: string[]): string {
  if (emails.length === 0 && phones.length === 0) return "";
  const lines = ["Кандидаты контактов со страницы — не проверены, уточните перед использованием:"];
  if (emails.length) lines.push(`Email: ${emails.join(", ")}`);
  if (phones.length) lines.push(`Телефоны: ${phones.join(", ")}`);
  return lines.join("\\n");
}
