/**
 * Lettres du mot CORRECT à marquer après une erreur (lettre fausse, manquante, ou voisine d'une lettre en trop).
 * La réponse fautive n'est jamais affichée : on marque seulement la forme correcte.
 */
export function markMistakes(answer: string, expected: string): boolean[] {
  const a = [...answer.normalize('NFC').toLocaleLowerCase('fr-FR').replace(/'/g, '’').trim()];
  const e = [...expected.normalize('NFC')];
  const el = e.map((c) => c.toLocaleLowerCase('fr-FR'));
  const n = a.length, m = e.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === el[j - 1] ? 0 : 1));
  const marks = new Array<boolean>(m).fill(false);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === el[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== el[j - 1]) marks[j - 1] = true;
      i--, j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      marks[j - 1] = true; // lettre oubliée
      j--;
    } else {
      // lettre en trop : on marque la lettre correcte voisine
      marks[Math.min(j, m - 1)] = true;
      i--;
    }
  }
  return marks;
}
