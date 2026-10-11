export interface ParsedEntry {
  text: string;
  hint?: string;
}

/** Espaces normalisés, apostrophe droite → typographique. */
export function cleanWord(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/'/g, '’').trim();
}

/** Clé de comparaison pour détecter les doublons (casse et apostrophes ignorées). */
export function wordKey(s: string): string {
  return cleanWord(s).toLocaleLowerCase('fr-FR');
}

/**
 * Une ligne par mot. Format optionnel : `mot | indice` (l'ancien `mot | phrase | indice` reste accepté, la phrase est ignorée).
 * Les puces et numéros en début de ligne sont retirés. Les doublons sont ignorés.
 */
export function parseWordList(input: string): ParsedEntry[] {
  const seen = new Set<string>();
  const out: ParsedEntry[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '');
    const parts = line.split('|').map((p) => p.replace(/\s+/g, ' ').trim());
    const w = parts[0];
    const hint = parts.length >= 3 ? parts[2] : parts[1];
    const text = cleanWord(w ?? '');
    if (!text) continue;
    const key = wordKey(text);
    if (seen.has(key)) continue;
    seen.add(key);
    const entry: ParsedEntry = { text };
    if (hint) entry.hint = hint.replace(/'/g, '’');
    out.push(entry);
  }
  return out;
}
