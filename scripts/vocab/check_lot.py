"""Contrôle qualité d'un lot d'enrichissement (définitions, exemples, exercices) avant publication.

Usage : .venv/bin/python -I scripts/vocab/check_lot.py src/content/vocab/lot-001.json [...]

Erreurs (bloquantes) : structure invalide, identifiant inconnu du corpus, bonne réponse absente, doublons…
Avertissements : points à relire par le parent (mot absent d'un exemple, distracteur trop proche…).
Le parent valide ensuite chaque mot dans l'application : rien n'est montré à l'enfant avant.
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CORPUS = os.path.join(ROOT, 'data', 'build', 'corpus-2000.json')
TYPES = {'sens', 'situation', 'synonyme', 'antonyme', 'phrase'}
MAX_LEN = 140


def plain(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('œ', 'oe')


def stem(lemma: str) -> str:
    """Radical tolérant aux accords et conjugaisons (« anxieux » → « anxieu », « exaspérer » → « exasper »)."""
    p = plain(lemma)
    for end in ('er', 'ir', 're', 'eux', 'if', 'al', 'e', 's', 'x'):
        if p.endswith(end) and len(p) - len(end) >= 4:
            return p[: -len(end)]
    return p


def check(path: str, corpus: dict[str, dict] | None) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    if data.get('format') != 'academie-vocab' or not isinstance(data.get('words'), list):
        return [f'{path} : format « academie-vocab » attendu'], []
    ids = set()
    for w in data['words']:
        at = f'« {w.get("lemma", "?")} »'
        if w.get('id') in ids:
            errors.append(f'{at} : identifiant en double')
        ids.add(w.get('id'))
        for k in ('id', 'lemma', 'pos', 'definition'):
            if not str(w.get(k, '')).strip():
                errors.append(f'{at} : champ « {k} » manquant')
        if corpus is not None:
            c = corpus.get(w.get('id'))
            if c is None:
                warnings.append(f'{at} : absent du corpus prioritaire (ajout manuel ?)')
            elif c['lemma'] != w.get('lemma'):
                errors.append(f'{at} : le lemme ne correspond pas au corpus (« {c["lemma"]} »)')
        st = stem(w['lemma'])
        if st in plain(w['definition']):
            warnings.append(f'{at} : la définition contient le mot lui-même')
        for txt in [w['definition'], *w.get('examples', []), *(q['prompt'] for q in w.get('questions', []))]:
            if "'" in txt:
                warnings.append(f'{at} : apostrophe droite (utiliser ’) dans « {txt[:40]}… »')
            if len(txt) > MAX_LEN:
                warnings.append(f'{at} : phrase longue ({len(txt)} caractères) « {txt[:40]}… »')
        if len(w.get('examples', [])) < 2:
            warnings.append(f'{at} : moins de 2 exemples')
        for ex in w.get('examples', []):
            if st not in plain(ex):
                warnings.append(f'{at} : le mot n’apparaît pas dans l’exemple « {ex[:50]}… »')
        syn = {plain(s) for s in w.get('synonyms', [])}
        qs = w.get('questions', [])
        if len(qs) < 2:
            errors.append(f'{at} : au moins 2 questions')
        if len({q.get('type') for q in qs}) < 2:
            warnings.append(f'{at} : un seul type d’épreuve (il en faut au moins 2 pour atteindre « compris »)')
        qids = set()
        for q in qs:
            qat = f'{at} / {q.get("id")}'
            if q.get('id') in qids:
                errors.append(f'{qat} : identifiant de question en double')
            qids.add(q.get('id'))
            if q.get('type') not in TYPES:
                errors.append(f'{qat} : type inconnu')
            ch = q.get('choices', [])
            if len(ch) != 3 or len({plain(c) for c in ch}) != 3:
                errors.append(f'{qat} : exactement 3 propositions différentes')
                continue
            if not q.get('explanation', '').strip():
                errors.append(f'{qat} : explication manquante')
            right, *wrong = ch
            if q['type'] in ('sens', 'situation', 'phrase') and st not in plain(right):
                errors.append(f'{qat} : la bonne réponse (en premier) ne contient pas le mot')
            if q['type'] == 'phrase' and not all(st in plain(c) for c in ch):
                warnings.append(f'{qat} : toutes les phrases devraient contenir le mot')
            if q['type'] in ('sens', 'situation') and any(plain(x) in syn for x in wrong):
                errors.append(f'{qat} : un distracteur est un synonyme du mot (deux bonnes réponses)')
            if q['type'] == 'synonyme' and plain(right) not in syn and not any(plain(right) in s or s in plain(right) for s in syn):
                warnings.append(f'{qat} : la bonne réponse n’est pas dans la liste des synonymes')
            if q['type'] == 'antonyme' and w.get('antonyms') and plain(right) not in {plain(a) for a in w['antonyms']}:
                warnings.append(f'{qat} : la bonne réponse n’est pas dans la liste des contraires')
    return errors, warnings


def main() -> int:
    corpus = None
    if os.path.exists(CORPUS):
        with open(CORPUS, encoding='utf-8') as f:
            corpus = {e['id']: e for e in json.load(f)['entries']}
    status = 0
    for path in sys.argv[1:]:
        errors, warnings = check(path, corpus)
        print(f'\n{path} : {len(errors)} erreur(s), {len(warnings)} avertissement(s)')
        for e in errors:
            print('  ✗', e)
        for w in warnings:
            print('  !', w)
        status |= bool(errors)
    return status


if __name__ == '__main__':
    sys.exit(main())
