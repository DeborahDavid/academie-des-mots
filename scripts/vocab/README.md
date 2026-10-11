# Pipeline lexical — L'Exploratrice des mots

Pipeline reproductible : sources lexicales → corpus prioritaire → lots enrichis → contrôle qualité → validation parentale dans l'application.

## 1. Sources (hors dépôt Git)

Déposer dans `data/sources/` (dossier ignoré par Git : licences non vérifiées pour la redistribution) :

| Fichier | Source | Rôle |
|---|---|---|
| `manulex.xls` | MANULEX — Lété, Sprenger-Charolles & Colé (2004), *Behavior Research Methods, Instruments, & Computers*, 36(1), 156-166 | **Source principale** : fréquences par niveau scolaire (feuille LEMMES) |
| `eduscol-mots-frequents.pdf` | Éduscol, DESCO A1 (2002) — « Mots les plus fréquents de la langue écrite française » | Référence complémentaire (~1 500 lemmes) |

Licences : non indiquées dans les fichiers fournis — **à vérifier avant toute redistribution** des données dérivées. Elles sont recopiées dans chaque sortie (`sources`).

## 2. Construire le corpus

```bash
python3 -m venv .venv && .venv/bin/pip install -r scripts/vocab/requirements.txt
npm run vocab:lexique
```

Sorties dans `data/build/` (ignoré par Git) : `lexique-complet.json`, `corpus-2000.json`, `RAPPORT.md`.

Trois notions distinctes par entrée :
- **fréquence statistique** (`frequency`) : Manulex CE2-CM2 (par million, SFI, dispersion), présence CP-CE1, rang Éduscol ;
- **difficulté estimée** (`difficulty` 1-3) : d'après la rareté et la longueur du mot ;
- **priorité d'apprentissage** (`score`, `priorityRank`) : la « bande des mots riches », présents dans les livres de CE2-CM2 mais rares à l'oral et absents des premiers livres, avec bonus pour adjectifs, verbes, adverbes, noms abstraits et thèmes (`themes/` : émotions, raisonnement, sciences, lecture, caractère).

Exclus (comptés dans le rapport) : noms propres, mots grammaticaux (sauf connecteurs listés), expressions de plusieurs mots, nombres, variantes fléchies redondantes (« haute », participes doublons du verbe), mots probablement déjà connus à 8 ans, liste `exclusions.txt` (avec raison).

## 3. Enrichir par lots

Chaque lot est un fichier `src/content/vocab/lot-XXX.json` au format d'import `academie-vocab` (définition pour 8 ans, exemples, synonymes et contraires, 2-3 épreuves avec explications ; la bonne réponse est toujours la première, l'ordre est mélangé à l'affichage). Les lots sont rédigés dans l'ordre de priorité.

```bash
npm run vocab:check -- src/content/vocab/lot-001.json
```

Erreurs bloquantes (structure, bonne réponse absente, distracteur synonyme, doublons…) et avertissements à relire.

## 4. Publication

Les lots livrés avec l'application sont importés automatiquement **« à valider »** : le parent relit et valide chaque mot (mode parent → Vocabulaire) avant que l'enfant le voie. Un mot déjà présent n'est jamais écrasé (les corrections du parent sont conservées). Un corpus complet peut aussi être importé à la main (même format).
