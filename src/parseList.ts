import { normalizeText } from "./normalize";

export type ParsedName = {
  raw: string;
  normalized: string;
};

function isHeaderLine(rawLine: string): boolean {
  const raw = rawLine.trim();
  const candidate = normalizeText(raw.replace(/:$/, ""));
  const withColon = raw.endsWith(":");
  const headers = new Set([
    "lista",
    "lista hoy",
    "lista de hoy",
    "hoy",
    "asistentes",
    "asistencia",
    "presentes"
  ]);

  if (headers.has(candidate)) {
    return true;
  }

  const hasTime = /\d{1,2}\s*h(?:s)?/i.test(candidate);
  const looksLikeVenueHeader =
    /\b(complejo|cancha|entrenamiento|partido|hoy)\b/i.test(raw) &&
    candidate.split(" ").length >= 2;

  if ((hasTime && looksLikeVenueHeader) || (withColon && looksLikeVenueHeader)) {
    return true;
  }

  return false;
}

export function parseList(rawText: string): ParsedName[] {
  const result: ParsedName[] = [];
  const seen = new Set<string>();
  let nonEmptyIndex = 0;

  for (const line of rawText.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    nonEmptyIndex += 1;

    if (nonEmptyIndex === 1) {
      continue;
    }
    if (isHeaderLine(line)) {
      continue;
    }

    const normalized = normalizeText(line);
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push({ raw: line.trim(), normalized });
  }

  return result;
}
