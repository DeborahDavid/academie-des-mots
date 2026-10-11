# L'Académie des Mots

Web app d'orthographe pour une élève de CE2 : dictée de mots, accords, vocabulaire, avec répétition espacée (FSRS).
Toutes les données restent dans le navigateur (IndexedDB). Aucun compte, aucun envoi.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## Structure

- `src/domain/` — logique pure (modèle, parsing des listes, notions, lune, PIN). Testée.
- `src/db/` — IndexedDB (Dexie), opérations, export/import JSON.
- `src/speech/` — synthèse vocale fr-FR, lecture des enregistrements.
- `src/ui/parent/` — mode parent (PIN, listes, notions, voix, sauvegarde).
- `src/ui/child/` — interface enfant.

## Avancement (MVP)

- [x] Étape 0 — test de la voix fr-FR
- [x] Étape 1 — mode parent minimal, modèle de données, export/import JSON
- [x] Étape 2 — dictée de mots + répétition espacée
- [x] Étape 3 — dictée de phrase, double relecture, guidage dégressif
- [ ] Étape 4 — écran principal (tour, ciel, Leyu, Elsa, Ada), arrivée et fin

## Déploiement

Push sur `main` → GitHub Actions → GitHub Pages (`base: /academie-des-mots/`).
