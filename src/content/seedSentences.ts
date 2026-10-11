/**
 * Banque de phrases de départ (niveau CE2, 6 à 12 mots).
 * Elles arrivent dans la file de validation du mode parent : rien n'est montré à l'enfant sans validation.
 */
export interface SeedSentence {
  text: string;
  notionIds: string[];
}

export const SEED_SENTENCES_VERSION = 1;

export const SEED_SENTENCES: SeedSentence[] = [
  // Groupe nominal : genre et nombre, présent
  { text: 'Les petites filles jouent dans la cour.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Ma grande sœur prépare une tarte aux pommes.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'] },
  { text: 'Les chiens noirs courent derrière le ballon.', notionIds: ['gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Une petite souris grise se cache sous le lit.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'] },
  { text: 'La maîtresse lit une belle histoire aux élèves.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Ma meilleure amie porte une robe verte.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'] },
  { text: 'Les feuilles mortes tombent des arbres en automne.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Les nuages gris cachent le soleil depuis ce matin.', notionIds: ['gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Nous regardons les étoiles brillantes dans le ciel.', notionIds: ['gn-genre', 'gn-nombre', 'sv-pronom', 'conj-present'] },
  { text: 'Tu ranges tes crayons de couleur dans ta trousse.', notionIds: ['gn-nombre', 'sv-pronom', 'conj-present'] },
  { text: 'Vous finissez vos devoirs avant le dîner.', notionIds: ['sv-pronom', 'conj-present'] },

  // Pluriels en -x
  { text: 'La vieille dame donne du pain aux oiseaux.', notionIds: ['gn-genre', 'gn-pluriel-x', 'sv-proche', 'conj-present'] },
  { text: 'Les bateaux du port rentrent avant la nuit.', notionIds: ['gn-pluriel-x', 'sv-eloigne', 'conj-present'] },
  { text: 'Mes neveux adorent les jeux de société.', notionIds: ['gn-pluriel-x', 'sv-proche', 'conj-present'] },
  { text: 'Les cheveux de ma cousine sont longs et bouclés.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-eloigne', 'conj-present'] },
  { text: 'Ils mangent des gâteaux au chocolat pour l’anniversaire.', notionIds: ['gn-pluriel-x', 'sv-pronom', 'conj-present'] },
  { text: 'Le petit garçon a mal aux genoux.', notionIds: ['gn-pluriel-x', 'homo-a', 'conj-present'] },

  // Sujet éloigné, sujet inversé
  { text: 'Les enfants de la classe chantent une chanson.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'] },
  { text: 'Les chats de ma voisine dorment sur le canapé.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'] },
  { text: 'Le facteur de notre village apporte les lettres.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'] },
  { text: 'Dans la forêt vivent des renards et des hiboux.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-inverse', 'conj-present'] },
  { text: 'Sur la branche chantent deux petits oiseaux.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-inverse', 'conj-present'] },

  // Imparfait
  { text: 'Autrefois, les enfants allaient à l’école à pied.', notionIds: ['gn-nombre', 'sv-proche', 'conj-imparfait', 'homo-a'] },
  { text: 'Hier soir, nous regardions un film avec nos parents.', notionIds: ['gn-nombre', 'sv-pronom', 'conj-imparfait'] },
  { text: 'Quand il pleuvait, mon grand-père racontait des histoires.', notionIds: ['gn-nombre', 'sv-proche', 'conj-imparfait'] },
  { text: 'Les oiseaux chantaient dans les arbres du jardin.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-proche', 'conj-imparfait'] },
  { text: 'Tu jouais souvent avec ton chat dans le grenier.', notionIds: ['sv-pronom', 'conj-imparfait'] },

  // Futur
  { text: 'Demain, nous irons à la piscine avec la classe.', notionIds: ['sv-pronom', 'conj-futur', 'homo-a'] },
  { text: 'Les élèves chanteront une chanson pour la fête.', notionIds: ['gn-nombre', 'sv-proche', 'conj-futur'] },
  { text: 'L’été prochain, tu verras la mer pour la première fois.', notionIds: ['gn-genre', 'sv-pronom', 'conj-futur'] },
  { text: 'Mes amies arriveront à la maison vers midi.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-futur', 'homo-a'] },
  { text: 'Mes parents et moi partirons en vacances à la montagne.', notionIds: ['conj-futur', 'homo-et', 'homo-a'] },

  // Passé composé avec avoir, -er / -é
  { text: 'Hier, Léa a mangé une grosse pomme rouge.', notionIds: ['gn-genre', 'conj-passe-compose', 'inf-pp', 'homo-a'] },
  { text: 'Les garçons ont joué au football toute la journée.', notionIds: ['gn-nombre', 'conj-passe-compose', 'inf-pp', 'homo-on'] },
  { text: 'Nous avons trouvé un trésor au fond du jardin.', notionIds: ['sv-pronom', 'conj-passe-compose', 'inf-pp'] },
  { text: 'Tu as dessiné une jolie maison bleue.', notionIds: ['gn-genre', 'sv-pronom', 'conj-passe-compose', 'inf-pp'] },
  { text: 'Maman va acheter du pain pour le goûter.', notionIds: ['inf-pp'] },
  { text: 'Il faut arroser les fleurs tous les jours.', notionIds: ['gn-nombre', 'inf-pp'] },
  { text: 'J’ai fermé la porte pour ne pas laisser entrer le froid.', notionIds: ['conj-passe-compose', 'inf-pp'] },

  // Homophones grammaticaux
  { text: 'Mon frère est grand et il court très vite.', notionIds: ['homo-et', 'conj-present'] },
  { text: 'Le ciel est gris et le vent souffle fort.', notionIds: ['homo-et', 'conj-present'] },
  { text: 'Ses lunettes sont sur la table de la cuisine.', notionIds: ['homo-son', 'homo-ces', 'conj-present'] },
  { text: 'Son vélo et sa trottinette sont dans le garage.', notionIds: ['homo-son', 'homo-et', 'conj-present'] },
  { text: 'On a vu des écureuils qui ont grimpé dans l’arbre.', notionIds: ['homo-on', 'homo-a', 'conj-passe-compose', 'inf-pp'] },
  { text: 'Les voisins ont un grand jardin avec un potager.', notionIds: ['homo-on', 'conj-present'] },
  { text: 'Ces fleurs jaunes poussent dans le jardin de ma tante.', notionIds: ['homo-ces', 'gn-nombre', 'sv-proche', 'conj-present'] },
  { text: 'Elle range ses livres sur l’étagère de sa chambre.', notionIds: ['homo-ces', 'gn-nombre', 'sv-pronom', 'conj-present'] },
  { text: 'Où as-tu caché le cadeau, dans le salon ou dans la cuisine ?', notionIds: ['homo-ou', 'sv-inverse', 'conj-passe-compose', 'inf-pp'] },
  { text: 'Veux-tu du jus d’orange ou du lait ?', notionIds: ['homo-ou', 'sv-inverse', 'conj-present'] },
  { text: 'Je ne sais pas où mon chat se cache.', notionIds: ['homo-ou', 'sv-pronom', 'conj-present'] },
];
