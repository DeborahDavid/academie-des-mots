/**
 * Constellations dessinées en étoiles dorées : une par notion de grammaire maîtrisée.
 * Formes originales, définies dans une boîte 100 × 100 (étoiles + traits entre étoiles).
 * Les trois premières ont été choisies par Leyu : un poulet, un chat (Ada), un ballon de foot.
 */
export interface ConstellationShape {
  id: string;
  name: string;
  stars: [number, number][];
  lines: [number, number][];
}

export const SHAPES: ConstellationShape[] = [
  {
    id: 'poulet',
    name: 'le Poulet',
    // crête, bec, tête, dos, queue, ventre, pattes
    stars: [[30, 14], [36, 10], [40, 17], [22, 30], [32, 26], [55, 34], [78, 38], [86, 22], [90, 44], [72, 62], [46, 64], [50, 82], [64, 82]],
    lines: [[0, 1], [1, 2], [2, 4], [0, 4], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [8, 9], [9, 10], [10, 4], [10, 11], [9, 12]],
  },
  {
    id: 'chat',
    name: 'le Chat (Ada)',
    // oreilles, tête, corps assis, queue enroulée
    stars: [[30, 10], [38, 22], [48, 22], [56, 10], [58, 30], [43, 40], [28, 30], [24, 62], [30, 88], [62, 88], [70, 60], [86, 78], [90, 58]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [5, 7], [7, 8], [8, 9], [9, 10], [10, 5], [9, 11], [11, 12]],
  },
  {
    id: 'ballon',
    name: 'le Ballon de foot',
    // cercle extérieur + pentagone central
    stars: [[50, 6], [82, 22], [94, 56], [72, 90], [28, 90], [6, 56], [18, 22], [50, 34], [66, 46], [60, 66], [40, 66], [34, 46]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [7, 8], [8, 9], [9, 10], [10, 11], [11, 7], [0, 7], [2, 8], [3, 9], [4, 10], [5, 11]],
  },
  {
    id: 'etoile',
    name: 'la Grande Étoile',
    stars: [[50, 4], [62, 36], [96, 38], [69, 58], [79, 92], [50, 72], [21, 92], [31, 58], [4, 38], [38, 36]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]],
  },
  {
    id: 'coeur',
    name: 'le Cœur',
    stars: [[50, 30], [34, 12], [12, 18], [6, 40], [24, 66], [50, 92], [76, 66], [94, 40], [88, 18], [66, 12]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]],
  },
  {
    id: 'couronne',
    name: 'la Couronne',
    stars: [[8, 80], [8, 30], [30, 55], [50, 14], [70, 55], [92, 30], [92, 80]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  },
  {
    id: 'papillon',
    name: 'le Papillon',
    stars: [[50, 30], [50, 80], [20, 10], [6, 36], [30, 50], [12, 74], [80, 10], [94, 36], [70, 50], [88, 74], [42, 14], [58, 14]],
    lines: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 0], [4, 5], [5, 1], [0, 6], [6, 7], [7, 8], [8, 0], [8, 9], [9, 1], [0, 10], [0, 11]],
  },
  {
    id: 'grimoire',
    name: 'le Grimoire',
    stars: [[50, 24], [50, 86], [8, 16], [8, 78], [92, 16], [92, 78]],
    lines: [[0, 1], [0, 2], [2, 3], [3, 1], [0, 4], [4, 5], [5, 1]],
  },
];

export const shapeById = (id?: string) => SHAPES.find((s) => s.id === id);

/** Forme attribuée à la n-ième notion maîtrisée (ordre du mode parent, puis formes restantes). */
export function constellationFor(index: number, order: string[]): ConstellationShape {
  const ids = [...order.filter((id) => shapeById(id)), ...SHAPES.map((s) => s.id).filter((id) => !order.includes(id))];
  return shapeById(ids[index % ids.length])!;
}

/** Anciens libellés des réglages (« poulet », « chat », « ballon de foot ») → identifiants de forme. */
export function normalizeShapeIds(names: string[]): string[] {
  const map: Record<string, string> = { poulet: 'poulet', chat: 'chat', 'ballon de foot': 'ballon', ballon: 'ballon' };
  return names.map((n) => map[n.toLowerCase()] ?? n);
}

/**
 * Tracé de la partie éclairée de la lune, centrée en 0,0, rayon r.
 * phase : 0 nouvelle lune … 4 pleine lune … 7 dernier croissant.
 * `mirror` : lune décroissante, à retourner horizontalement (éclairée à gauche).
 */
export function moonLitPath(phase: number, r: number): { d: string; mirror: boolean } {
  const f = (((phase % 8) + 8) % 8) / 8;
  const k = (1 - Math.cos(2 * Math.PI * f)) / 2; // fraction éclairée
  if (k < 0.02) return { d: '', mirror: false };
  const rx = r * Math.abs(1 - 2 * k);
  // Croissant : la limite d'ombre passe du côté éclairé ; gibbeuse : de l'autre côté.
  const sweep = k < 0.5 ? 0 : 1;
  return { d: `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`, mirror: f > 0.5 };
}
