/**
 * Banque de phrases de départ (niveau CE2, 6 à 12 mots).
 * Elles arrivent dans la file de validation du mode parent : rien n'est montré à l'enfant sans validation.
 */
export interface SeedSentence {
  text: string;
  notionIds: string[];
  /** Version « chasse aux erreurs » : 1 à 3 erreurs d'accord, jamais d'erreur d'orthographe lexicale. */
  hunt?: string;
}

export const SEED_SENTENCES_VERSION = 3;

export const SEED_SENTENCES: SeedSentence[] = [
  // Groupe nominal : genre et nombre, présent
  { text: 'Les petites filles jouent dans la cour.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Les petite filles joue dans la cour.' },
  { text: 'Ma grande sœur prépare une tarte aux pommes.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'], hunt: 'Ma grand sœur prépare une tarte aux pomme.' },
  { text: 'Les chiens noirs courent derrière le ballon.', notionIds: ['gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Les chiens noir court derrière le ballon.' },
  { text: 'Une petite souris grise se cache sous le lit.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'], hunt: 'Une petit souris gris se cache sous le lit.' },
  { text: 'La maîtresse lit une belle histoire aux élèves.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'], hunt: 'La maîtresse lit une belle histoire aux élève.' },
  { text: 'Ma meilleure amie porte une robe verte.', notionIds: ['gn-genre', 'sv-proche', 'conj-present'], hunt: 'Ma meilleur amie porte une robe vert.' },
  { text: 'Les feuilles mortes tombent des arbres en automne.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Les feuilles morte tombe des arbres en automne.' },
  { text: 'Les nuages gris cachent le soleil depuis ce matin.', notionIds: ['gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Les nuages gris cache le soleil depuis ce matin.' },
  { text: 'Nous regardons les étoiles brillantes dans le ciel.', notionIds: ['gn-genre', 'gn-nombre', 'sv-pronom', 'conj-present'], hunt: 'Nous regardez les étoiles brillante dans le ciel.' },
  { text: 'Tu ranges tes crayons de couleur dans ta trousse.', notionIds: ['gn-nombre', 'sv-pronom', 'conj-present'], hunt: 'Tu range tes crayon de couleur dans ta trousse.' },
  { text: 'Vous finissez vos devoirs avant le dîner.', notionIds: ['sv-pronom', 'conj-present'], hunt: 'Vous finissons vos devoir avant le dîner.' },

  // Pluriels en -x
  { text: 'La vieille dame donne du pain aux oiseaux.', notionIds: ['gn-genre', 'gn-pluriel-x', 'sv-proche', 'conj-present'], hunt: 'La vieille dame donnent du pain aux oiseau.' },
  { text: 'Les bateaux du port rentrent avant la nuit.', notionIds: ['gn-pluriel-x', 'sv-eloigne', 'conj-present'], hunt: 'Les bateau du port rentre avant la nuit.' },
  { text: 'Mes neveux adorent les jeux de société.', notionIds: ['gn-pluriel-x', 'sv-proche', 'conj-present'], hunt: 'Mes neveu adore les jeux de société.' },
  { text: 'Les cheveux de ma cousine sont longs et bouclés.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-eloigne', 'conj-present'], hunt: 'Les cheveux de ma cousine sont long et bouclé.' },
  { text: 'Ils mangent des gâteaux au chocolat pour l’anniversaire.', notionIds: ['gn-pluriel-x', 'sv-pronom', 'conj-present'], hunt: 'Ils mange des gâteau au chocolat pour l’anniversaire.' },
  { text: 'Le petit garçon a mal aux genoux.', notionIds: ['gn-pluriel-x', 'homo-a', 'conj-present'], hunt: 'Le petit garçon à mal aux genou.' },

  // Sujet éloigné, sujet inversé
  { text: 'Les enfants de la classe chantent une chanson.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'], hunt: 'Les enfants de la classe chante une chanson.' },
  { text: 'Les chats de ma voisine dorment sur le canapé.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'], hunt: 'Les chats de ma voisine dort sur le canapé.' },
  { text: 'Le facteur de notre village apporte les lettres.', notionIds: ['gn-nombre', 'sv-eloigne', 'conj-present'], hunt: 'Le facteur de notre village apportent les lettre.' },
  { text: 'Dans la forêt vivent des renards et des hiboux.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-inverse', 'conj-present'], hunt: 'Dans la forêt vivent des renard et des hibou.' },
  { text: 'Sur la branche chantent deux petits oiseaux.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-inverse', 'conj-present'], hunt: 'Sur la branche chante deux petit oiseaux.' },

  // Imparfait
  { text: 'Autrefois, les enfants allaient à l’école à pied.', notionIds: ['gn-nombre', 'sv-proche', 'conj-imparfait', 'homo-a'], hunt: 'Autrefois, les enfants allait a l’école à pied.' },
  { text: 'Hier soir, nous regardions un film avec nos parents.', notionIds: ['gn-nombre', 'sv-pronom', 'conj-imparfait'], hunt: 'Hier soir, nous regardaient un film avec nos parent.' },
  { text: 'Quand il pleuvait, mon grand-père racontait des histoires.', notionIds: ['gn-nombre', 'sv-proche', 'conj-imparfait'], hunt: 'Quand il pleuvait, mon grand-père racontaient des histoire.' },
  { text: 'Les oiseaux chantaient dans les arbres du jardin.', notionIds: ['gn-pluriel-x', 'gn-nombre', 'sv-proche', 'conj-imparfait'], hunt: 'Les oiseaux chantait dans les arbre du jardin.' },
  { text: 'Tu jouais souvent avec ton chat dans le grenier.', notionIds: ['sv-pronom', 'conj-imparfait'], hunt: 'Tu jouait souvent avec ton chat dans le grenier.' },

  // Futur
  { text: 'Demain, nous irons à la piscine avec la classe.', notionIds: ['sv-pronom', 'conj-futur', 'homo-a'], hunt: 'Demain, nous irons a la piscine avec la classe.' },
  { text: 'Les élèves chanteront une chanson pour la fête.', notionIds: ['gn-nombre', 'sv-proche', 'conj-futur'], hunt: 'Les élèves chantera une chanson pour la fête.' },
  { text: 'L’été prochain, tu verras la mer pour la première fois.', notionIds: ['gn-genre', 'sv-pronom', 'conj-futur'], hunt: 'L’été prochain, tu verra la mer pour la premier fois.' },
  { text: 'Mes amies arriveront à la maison vers midi.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-futur', 'homo-a'], hunt: 'Mes amie arrivera à la maison vers midi.' },
  { text: 'Mes parents et moi partirons en vacances à la montagne.', notionIds: ['conj-futur', 'homo-et', 'homo-a'], hunt: 'Mes parents est moi partirons en vacances a la montagne.' },

  // Passé composé avec avoir, -er / -é
  { text: 'Hier, Léa a mangé une grosse pomme rouge.', notionIds: ['gn-genre', 'conj-passe-compose', 'inf-pp', 'homo-a'], hunt: 'Hier, Léa a manger une gros pomme rouge.' },
  { text: 'Les garçons ont joué au football toute la journée.', notionIds: ['gn-nombre', 'conj-passe-compose', 'inf-pp', 'homo-on'], hunt: 'Les garçons on jouer au football toute la journée.' },
  { text: 'Nous avons trouvé un trésor au fond du jardin.', notionIds: ['sv-pronom', 'conj-passe-compose', 'inf-pp'], hunt: 'Nous avons trouver un trésor au fond du jardin.' },
  { text: 'Tu as dessiné une jolie maison bleue.', notionIds: ['gn-genre', 'sv-pronom', 'conj-passe-compose', 'inf-pp'], hunt: 'Tu a dessiner une jolie maison bleu.' },
  { text: 'Maman va acheter du pain pour le goûter.', notionIds: ['inf-pp'], hunt: 'Maman va acheté du pain pour le goûter.' },
  { text: 'Il faut arroser les fleurs tous les jours.', notionIds: ['gn-nombre', 'inf-pp'], hunt: 'Il faut arrosé les fleur tous les jours.' },
  { text: 'J’ai fermé la porte pour ne pas laisser entrer le froid.', notionIds: ['conj-passe-compose', 'inf-pp'], hunt: 'J’ai fermer la porte pour ne pas laissé entrer le froid.' },

  // Homophones grammaticaux
  { text: 'Mon frère est grand et il court très vite.', notionIds: ['homo-et', 'conj-present'], hunt: 'Mon frère et grand est il court très vite.' },
  { text: 'Le ciel est gris et le vent souffle fort.', notionIds: ['homo-et', 'conj-present'], hunt: 'Le ciel et gris est le vent souffle fort.' },
  { text: 'Ses lunettes sont sur la table de la cuisine.', notionIds: ['homo-son', 'homo-ces', 'conj-present'], hunt: 'Ces lunettes son sur la table de la cuisine.' },
  { text: 'Son vélo et sa trottinette sont dans le garage.', notionIds: ['homo-son', 'homo-et', 'conj-present'], hunt: 'Sont vélo est sa trottinette son dans le garage.' },
  { text: 'On a vu des écureuils qui ont grimpé dans l’arbre.', notionIds: ['homo-on', 'homo-a', 'conj-passe-compose', 'inf-pp'], hunt: 'Ont a vu des écureuils qui on grimper dans l’arbre.' },
  { text: 'Les voisins ont un grand jardin avec un potager.', notionIds: ['homo-on', 'conj-present'], hunt: 'Les voisins on un grand jardin avec un potager.' },
  { text: 'Ces fleurs jaunes poussent dans le jardin de ma tante.', notionIds: ['homo-ces', 'gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Ses fleurs jaune pousse dans le jardin de ma tante.' },
  { text: 'Elle range ses livres sur l’étagère de sa chambre.', notionIds: ['homo-ces', 'gn-nombre', 'sv-pronom', 'conj-present'], hunt: 'Elle range ces livre sur l’étagère de sa chambre.' },
  { text: 'Où as-tu caché le cadeau, dans le salon ou dans la cuisine ?', notionIds: ['homo-ou', 'sv-inverse', 'conj-passe-compose', 'inf-pp'], hunt: 'Ou as-tu cacher le cadeau, dans le salon où dans la cuisine ?' },
  { text: 'Veux-tu du jus d’orange ou du lait ?', notionIds: ['homo-ou', 'sv-inverse', 'conj-present'], hunt: 'Veux-tu du jus d’orange où du lait ?' },
  { text: 'Je ne sais pas où mon chat se cache.', notionIds: ['homo-ou', 'sv-pronom', 'conj-present'], hunt: 'Je ne sais pas ou mon chat se cache.' },

  // v3 — accords dans le groupe nominal (nom + adjectif au féminin pluriel) et participe passé avec être (CM1)
  { text: 'Les lignes noires du cahier sont bien droites.', notionIds: ['gn-genre', 'gn-nombre', 'conj-present'], hunt: 'Les ligne noir du cahier sont bien droites.' },
  { text: 'Mes deux tortues vertes dorment au soleil.', notionIds: ['gn-genre', 'gn-nombre', 'sv-proche', 'conj-present'], hunt: 'Mes deux tortue vert dorment au soleil.' },
  { text: 'Les clés perdues ont été découvertes sous le tapis.', notionIds: ['gn-genre', 'gn-nombre', 'pp-etre'], hunt: 'Les clés perdu ont été découvert sous le tapis.' },
  { text: 'Elles sont arrivées en retard à l’école.', notionIds: ['pp-etre', 'sv-pronom'], hunt: 'Elles sont arrivé en retard à l’école.' },
  { text: 'Les fleurs ont été cueillies par les enfants.', notionIds: ['gn-nombre', 'pp-etre'], hunt: 'Les fleurs ont été cueilli par les enfants.' },
];
