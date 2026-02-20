export function normalizeText(input: string): string {
  let value = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\uFE0F/gu, "")
    .trim();

  const markerPattern = /^(?:\d+\s*[\)\].:-]\s*|[-*•●▪▫✅☑✔✓]+\s*|\d+\s+)/u;
  while (markerPattern.test(value)) {
    value = value.replace(markerPattern, "").trim();
  }

  value = value.replace(/[^\p{L}\p{N}\s]/gu, " ");
  value = value.replace(/\s+/g, " ").trim();

  return value;
}
