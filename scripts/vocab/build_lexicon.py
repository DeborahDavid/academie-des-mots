"""Construit le lexique de l'Exploratrice des mots à partir de Manulex (source principale) et d'Éduscol.

Usage (depuis la racine du projet) :
    .venv/bin/python -I scripts/vocab/build_lexicon.py

Entrées  : data/sources/manulex.xls, data/sources/eduscol-mots-frequents.pdf
Sorties  : data/build/lexique-complet.json   (toutes les entrées retenues, avec statistiques)
           data/build/corpus-2000.json       (les 2 000 entrées prioritaires, ordonnées)
           data/build/RAPPORT.md             (comptes, exclusions, provenance)

Reproductible : mêmes sources + mêmes listes (themes/, exclusions.txt) → même résultat.
Les sorties contiennent des données dérivées des sources : elles restent hors du dépôt Git
(data/build/ est ignoré) tant que les licences n'ont pas été vérifiées.
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from sources import read_eduscol, read_manulex  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'data', 'sources')
OUT = os.path.join(ROOT, 'data', 'build')
HERE = os.path.dirname(__file__)

CORPUS_SIZE = 2000
# Seuils « déjà connu » et centre de la bande des mots riches (indice SFI de Manulex, CE2-CM2).
KNOWN_EARLY_PER_MILLION = 15  # fréquence par million dans les livres de CP ou CE1
KNOWN_SFI = 57.5
RICH_SFI_CENTER = 47
# Suffixes de noms abstraits (sentiments, qualités, idées) : plus utiles qu'un nom concret déjà connu.
ABSTRACT_SUFFIXES = r'(tion|sion|ité|ude|esse|ance|ence|isme|eur|ise|ment|age|té)$'
CONTENT_POS = {'NC', 'ADJ', 'VER', 'ADV'}
POS_LABEL = {'NC': 'nom', 'ADJ': 'adjectif', 'VER': 'verbe', 'ADV': 'adverbe', 'CON': 'conjonction', 'PRE': 'préposition'}
# Mots grammaticaux gardés seulement s'ils figurent dans une liste thématique (connecteurs utiles à l'écrit).
THEMED_ONLY_POS = {'CON', 'PRE'}

# Provenance et licences : on recopie ce qui est connu, sans rien inventer.
PROVENANCE = {
    'manulex': {
        'name': 'MANULEX',
        'description': 'Base lexicale issue de 54 manuels de lecture du primaire, fréquences par niveau (CP, CE1, CE2-CM2, CP-CM2).',
        'citation': 'Lété, B., Sprenger-Charolles, L., & Colé, P. (2004). MANULEX: A grade-level lexical database from French '
        'elementary school readers. Behavior Research Methods, Instruments, & Computers, 36(1), 156-166.',
        'file': 'manulex.xls (feuille LEMMES)',
        'license': 'Non indiquée dans le fichier fourni. À vérifier auprès des auteurs avant toute redistribution.',
    },
    'eduscol': {
        'name': 'Éduscol — Mots les plus fréquents de la langue écrite française (XIXe et XXe siècles)',
        'description': 'Table hiérarchique d’environ 1 500 lemmes avec catégorie et fréquence.',
        'citation': 'Ministère de l’Éducation nationale, DESCO A1 (2002). Liste de fréquence lexicale, Éduscol.',
        'file': 'eduscol-mots-frequents.pdf (métadonnées : auteur « DESCO A1 », créé le 05/09/2002)',
        'license': 'Non indiquée dans le document fourni. À vérifier sur eduscol.education.fr avant toute redistribution.',
    },
}


def slug(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('œ', 'oe').replace('æ', 'ae')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def read_list(name: str) -> set[str]:
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return {unicodedata.normalize('NFC', l.split('\t')[0].strip()) for l in f if l.strip() and not l.startswith('#')}


def read_exclusions() -> dict[str, str]:
    out = {}
    with open(os.path.join(HERE, 'exclusions.txt'), encoding='utf-8') as f:
        for l in f:
            if l.strip() and not l.startswith('#'):
                lemma, _, reason = l.rstrip('\n').partition('\t')
                out[unicodedata.normalize('NFC', lemma.strip())] = reason.strip() or 'exclu'
    return out


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manulex = read_manulex(os.path.join(SRC, 'manulex.xls'))
    eduscol = read_eduscol(os.path.join(SRC, 'eduscol-mots-frequents.pdf'))
    themes = {t[:-4]: read_list(os.path.join('themes', t)) for t in sorted(os.listdir(os.path.join(HERE, 'themes'))) if t.endswith('.txt')}
    exclusions = read_exclusions()

    report = Counter()
    excluded_examples: dict[str, list[str]] = {}

    def drop(reason: str, lemma: str) -> None:
        report[f'exclu : {reason}'] += 1
        excluded_examples.setdefault(reason, [])
        if len(excluded_examples[reason]) < 12:
            excluded_examples[reason].append(lemma)

    # 1. Regroupement par lemme (une entrée par lemme, toutes catégories conservées).
    themed = set().union(*themes.values())
    # Index de tous les lemmes Manulex par catégorie, pour repérer les variantes fléchies redondantes.
    all_by_pos: dict[str, set[str]] = {}
    for m in manulex:
        all_by_pos.setdefault(m.pos, set()).add(m.lemma)
    any_pos = set().union(*all_by_pos.values())

    def redundant_variant(lemma: str, pos: str) -> str | None:
        """Forme fléchie listée comme lemme (« haute », « beaux ») ou participe doublon du verbe (« oublié »)."""
        if pos != 'ADJ' or len(lemma) < 4:
            return None
        adj = all_by_pos.get('ADJ', set()) | all_by_pos.get('DET', set()) | all_by_pos.get('PRO', set())
        candidates = []
        if lemma.endswith('eaux'):
            candidates.append(lemma[:-1])  # beaux → beau
        if lemma.endswith(('s', 'x')):
            candidates.append(lemma[:-1])
        if lemma.endswith('e'):
            candidates += [lemma[:-1], lemma[:-2] if lemma.endswith(('ne', 'le', 'te')) and lemma[-3] == lemma[-2] else None]
        if lemma.endswith('es'):
            candidates.append(lemma[:-2])
        for c in filter(None, candidates):
            if c in adj and c != lemma:
                return f'forme fléchie de « {c} »'
        m = re.fullmatch(r'(.+)é(e?s?)', lemma)
        if m and m[1] + 'er' in all_by_pos.get('VER', set()):
            return f'participe du verbe « {m[1]}er »'
        return None

    NUMBER_WORDS = r'(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille)'
    entries: dict[str, dict] = {}
    for m in manulex:
        lemma = m.lemma
        if m.pos == 'NP':
            drop('nom propre (Manulex NP)', lemma)
            continue
        if m.pos not in CONTENT_POS and not (m.pos in THEMED_ONLY_POS and lemma in themed):
            drop(f'mot grammatical ou hors vocabulaire ({m.pos})', lemma)
            continue
        if ' ' in lemma:
            drop('expression de plusieurs mots', lemma)
            continue
        if not re.fullmatch(r"[a-zàâäçéèêëîïôöùûüÿœæ’'-]+", lemma) or len(lemma) < 3:
            drop('forme inhabituelle (majuscule, chiffre, trop courte)', lemma)
            continue
        if lemma in exclusions:
            drop(f'liste d’exclusion ({exclusions[lemma]})', lemma)
            continue
        if re.fullmatch(rf'{NUMBER_WORDS}(-{NUMBER_WORDS}|-et-{NUMBER_WORDS})*s?', lemma):
            drop('nombre écrit en lettres', lemma)
            continue
        variant = redundant_variant(lemma, m.pos)
        if variant and lemma not in themed:
            drop('variante fléchie redondante', f'{lemma} ({variant})')
            continue
        e = entries.setdefault(lemma, {'lemma': lemma, 'categories': {}, 'eduscol': []})
        e['categories'][m.pos] = {'nlet': m.nlet, 'manulex': m.freq}

    for w in eduscol:
        if (w.pos not in CONTENT_POS and not (w.pos in THEMED_ONLY_POS and w.lemma in themed)) or w.lemma in exclusions or ' ' in w.lemma:
            continue
        if w.lemma not in entries and (redundant_variant(w.lemma, w.pos) or redundant_variant(w.lemma, 'ADJ')):
            continue
        e = entries.get(w.lemma)
        if e is None:
            # Présent seulement dans Éduscol : gardé, signalé comme tel.
            e = entries.setdefault(w.lemma, {'lemma': w.lemma, 'categories': {}, 'eduscol': []})
            report['ajouté depuis Éduscol seul'] += 1
        e['categories'].setdefault(w.pos, {'nlet': len(w.lemma), 'manulex': {}})
        e['eduscol'].append({'rank': w.rank, 'pos': w.pos, 'freq': w.freq})

    # 2. Statistiques, difficulté estimée, priorité d'apprentissage (trois notions distinctes).
    out = []
    for lemma, e in entries.items():
        cats = e['categories']
        # catégorie principale = la plus fréquente en CE2-CM2
        def u(pos: str, lvl: str) -> float:
            return cats[pos]['manulex'].get(lvl, {}).get('U', 0.0)

        main_pos = max(cats, key=lambda p: (u(p, 'CE2-CM2'), p == 'VER'))
        mx = cats[main_pos]['manulex']
        u_target = sum(u(p, 'CE2-CM2') for p in cats)
        u_early = max(sum(u(p, 'CP') for p in cats), sum(u(p, 'CE1') for p in cats))
        sfi = mx.get('CE2-CM2', {}).get('SFI')
        disp = mx.get('CE2-CM2', {}).get('D', 0.0)
        ed_rank = min((x['rank'] for x in e['eduscol']), default=None)
        if sfi is None and ed_rank is None:
            drop('absent du corpus CE2-CM2', lemma)
            continue
        # Les mots des listes thématiques (mots « riches » choisis) échappent au seuil de fréquence.
        if sfi is not None and sfi < 38 and ed_rank is None and lemma not in themed:
            drop('trop rare dans les manuels CE2-CM2 (SFI < 38)', lemma)
            continue
        # Mots probablement déjà connus à 8 ans : très fréquents, ou déjà courants dans les livres de CP-CE1.
        # Le parcours vise l'ENRICHISSEMENT (« persévérant », « perplexe »), pas « blessure » ou « sang ».
        if u_early >= KNOWN_EARLY_PER_MILLION or (sfi or 0) >= KNOWN_SFI:
            drop('probablement déjà connu à 8 ans (fréquent ou courant dès le CP-CE1)', lemma)
            continue

        entry_themes = sorted(t for t, words in themes.items() if lemma in words)

        # Difficulté pédagogique estimée (1 facile · 2 moyen · 3 difficile) : plus le mot est rare, plus il est difficile.
        nlet = cats[main_pos]['nlet']
        s_ = sfi if sfi is not None else 46
        difficulty = 1 if s_ >= 52 else (2 if s_ >= 45 and nlet <= 10 else 3)

        # Priorité d'apprentissage : la « bande des mots riches » (présents dans les livres de CE2-CM2,
        # rares à l'oral et absents des premiers livres), plutôt adjectifs, verbes, adverbes et noms abstraits.
        band = max(0.0, 1 - abs(s_ - RICH_SFI_CENTER) / 10)
        early_absent = 1.0 if u_early < 1 else (0.5 if u_early < 5 else 0.0)
        if main_pos == 'NC':
            pos_bonus = 0.08 if re.search(ABSTRACT_SUFFIXES, lemma) else -0.05
        else:
            pos_bonus = {'ADJ': 0.20, 'VER': 0.15, 'ADV': 0.12}.get(main_pos, 0.05)
        score = 0.40 * band + 0.20 * early_absent + pos_bonus + (0.15 if entry_themes else 0) + (0.08 if ed_rank else 0) + 0.10 * disp

        out.append(
            {
                'id': slug(lemma),
                'lemma': lemma,
                'pos': POS_LABEL[main_pos],
                'categories': [POS_LABEL[p] for p in sorted(cats, key=lambda p: -u(p, 'CE2-CM2'))],
                'frequency': {
                    'manulexCE2CM2PerMillion': round(u_target, 2),
                    'manulexSFI': round(sfi, 2) if sfi is not None else None,
                    'manulexDispersion': round(disp, 3),
                    'manulexCPCE1PerMillion': round(u_early, 2),
                    'eduscolRank': ed_rank,
                },
                'difficulty': difficulty,
                'themes': entry_themes,
                'score': round(score, 4),
                'provenance': (['manulex'] if any(c['manulex'] for c in cats.values()) else []) + (['eduscol'] if e['eduscol'] else []),
            }
        )

    # Identifiants stables : deux lemmes distincts qui donnent le même slug (naufrage / naufragé) gardent
    # chacun leur entrée ; l'ordre alphabétique décide qui reçoit le suffixe, pour rester reproductible.
    seen: set[str] = set()
    for x in sorted(out, key=lambda x: x['lemma']):
        base, n = x['id'], 2
        while x['id'] in seen:
            x['id'] = f'{base}-{n}'
            n += 1
        seen.add(x['id'])
    out.sort(key=lambda x: (-x['score'], x['lemma']))
    unique = out
    for i, x in enumerate(unique):
        x['priorityRank'] = i + 1

    corpus = unique[:CORPUS_SIZE]
    header = {'format': 'academie-lexique', 'version': 1, 'sources': PROVENANCE, 'size': len(corpus)}
    with open(os.path.join(OUT, 'lexique-complet.json'), 'w', encoding='utf-8') as f:
        json.dump({**header, 'size': len(unique), 'entries': unique}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'corpus-2000.json'), 'w', encoding='utf-8') as f:
        json.dump({**header, 'entries': corpus}, f, ensure_ascii=False, indent=1)

    # 3. Rapport lisible.
    by = lambda key: Counter(x[key] for x in corpus)  # noqa: E731
    lines = [
        '# Rapport — lexique de l’Exploratrice des mots',
        '',
        f'- Lemmes Manulex lus : {len(manulex)} · entrées Éduscol lues : {len(eduscol)}',
        f'- Entrées retenues après filtrage : {len(unique)} · corpus prioritaire : {len(corpus)}',
        f'- Catégories du corpus : {dict(by("pos"))}',
        f'- Difficulté estimée : {dict(sorted(by("difficulty").items()))}',
        f'- Avec un thème prioritaire : {sum(1 for x in corpus if x["themes"])} · présents dans Éduscol : {sum(1 for x in corpus if "eduscol" in x["provenance"])}',
        '',
        '## Exclusions',
        *[f'- {k} : {v} (ex. {", ".join(excluded_examples.get(k[len("exclu : "):], [])[:8])})' for k, v in sorted(report.items()) if k.startswith('exclu')],
        '',
        '## 40 premières entrées',
        *[f'{x["priorityRank"]}. {x["lemma"]} ({x["pos"]}, difficulté {x["difficulty"]}{", " + "/".join(x["themes"]) if x["themes"] else ""})' for x in corpus[:40]],
        '',
        '## Provenance et licences',
        *[f'- **{p["name"]}** — {p["citation"]} Licence : {p["license"]}' for p in PROVENANCE.values()],
    ]
    with open(os.path.join(OUT, 'RAPPORT.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('\n'.join(lines[:8]))


if __name__ == '__main__':
    main()
