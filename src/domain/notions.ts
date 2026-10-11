import type { Notion } from './model';

type NotionSeed = Pick<Notion, 'id' | 'group' | 'label'>;

/** Catalogue des notions (spec 5.1). Toutes « pas encore » au départ. */
export const NOTION_CATALOG: NotionSeed[] = [
  { id: 'gn-genre', group: 'Groupe nominal', label: 'Accord en genre (féminin)' },
  { id: 'gn-nombre', group: 'Groupe nominal', label: 'Accord en nombre (pluriel)' },
  { id: 'gn-pluriel-x', group: 'Groupe nominal', label: 'Pluriels en -x (eau, au, eu, ou et exceptions)' },
  { id: 'sv-proche', group: 'Sujet-verbe', label: 'Sujet proche du verbe' },
  { id: 'sv-eloigne', group: 'Sujet-verbe', label: 'Sujet éloigné du verbe' },
  { id: 'sv-inverse', group: 'Sujet-verbe', label: 'Sujet inversé' },
  { id: 'sv-pronom', group: 'Sujet-verbe', label: 'Sujet pronom' },
  { id: 'conj-present', group: 'Conjugaison', label: 'Présent' },
  { id: 'conj-imparfait', group: 'Conjugaison', label: 'Imparfait' },
  { id: 'conj-futur', group: 'Conjugaison', label: 'Futur' },
  { id: 'conj-passe-compose', group: 'Conjugaison', label: 'Passé composé' },
  { id: 'inf-pp', group: 'Infinitif / participe', label: 'Infinitif ou participe passé (-er / -é)' },
  { id: 'homo-a', group: 'Homophones', label: 'a / à' },
  { id: 'homo-et', group: 'Homophones', label: 'et / est' },
  { id: 'homo-son', group: 'Homophones', label: 'son / sont' },
  { id: 'homo-on', group: 'Homophones', label: 'on / ont' },
  { id: 'homo-ces', group: 'Homophones', label: 'ces / ses' },
  { id: 'homo-ou', group: 'Homophones', label: 'ou / où' },
  { id: 'pp-etre', group: 'CM1', label: 'Accord du participe passé avec être' },
];

export function seedNotions(): Notion[] {
  return NOTION_CATALOG.map((n, i) => ({
    ...n,
    status: 'not_yet',
    guidanceLevel: 1,
    streakOk: 0,
    streakFail: 0,
    order: i,
  }));
}
