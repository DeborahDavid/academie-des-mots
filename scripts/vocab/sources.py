"""Lecture des sources lexicales brutes (Manulex .xls, Éduscol .pdf) en enregistrements homogènes.

Aucune donnée n'est modifiée ici : on extrait fidèlement, la sélection se fait dans build_lexicon.py.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

# Étiquettes communes (celles de Manulex) ; Éduscol est converti vers elles.
EDUSCOL_POS = {
    'subst': 'NC', 'sub': 'NC', 'subs': 'NC', 'adj': 'ADJ', 'verbe': 'VER', 'verb': 'VER', 'adv': 'ADV', 'ad': 'ADV',
    'dét': 'DET', 'prép': 'PRE', 'conj': 'CON', 'pron': 'PRO', 'numér': 'NUM', 'interj': 'INT',
}

LEVELS = ['CP', 'CE1', 'CE2-CM2', 'CP-CM2']


def nfc(s: str) -> str:
    return unicodedata.normalize('NFC', s).strip()


@dataclass
class ManulexLemma:
    lemma: str
    pos: str
    nlet: int
    # par niveau : F (fréquence brute), D (dispersion), U (fréquence estimée par million), SFI (indice standard)
    freq: dict[str, dict[str, float]] = field(default_factory=dict)


def read_manulex(path: str) -> list[ManulexLemma]:
    import xlrd

    sheet = xlrd.open_workbook(path, on_demand=True).sheet_by_name('LEMMES')
    header = [str(c.value) for c in sheet.row(0)]
    assert header[:3] == ['LEMMES', 'NLET', 'SYNT'], header[:3]
    out: list[ManulexLemma] = []
    for r in range(1, sheet.nrows):
        row = sheet.row_values(r)
        freq = {}
        for i, lvl in enumerate(LEVELS):
            f, d, u, sfi = row[3 + 4 * i: 7 + 4 * i]
            if f != '':
                freq[lvl] = {'F': float(f), 'D': float(d), 'U': float(u), 'SFI': float(sfi)}
        out.append(ManulexLemma(lemma=nfc(str(row[0])), pos=str(row[2]), nlet=int(float(row[1] or 0)), freq=freq))
    return out


@dataclass
class EduscolWord:
    rank: int
    lemma: str
    pos: str
    pos_raw: str
    freq: int | None


_LINE = re.compile(r'^(?P<lemma>.+?)\s+(?P<pos>[a-zéèû]+)\.?\s*(?P<freq>\d+)?\s*$')


def read_eduscol(path: str) -> list[EduscolWord]:
    """Table hiérarchique : « lemme catégorie fréquence », une entrée par ligne.
    Quelques catégories sont coupées en fin de ligne (« gouvernement sub » / « st. ») : on recolle."""
    from pypdf import PdfReader

    lines: list[str] = []
    for page in PdfReader(path).pages:
        for raw in (page.extract_text() or '').splitlines():
            line = nfc(raw)
            if not line or line.startswith('Mots les plus fréquents') or line == 'Table hiérarchique' or line.isdigit():
                continue
            # suite d'une catégorie coupée : « st. 5470 » ou « st. »
            if lines and re.fullmatch(r'[a-zé]{1,4}\.?(\s+\d+)?', line) and not re.search(r'\d+\s*$', lines[-1]):
                lines[-1] = lines[-1] + line
                continue
            lines.append(line)

    out: list[EduscolWord] = []
    for line in lines:
        m = _LINE.match(line)
        if not m:
            continue
        pos_raw = m['pos']
        pos = next((v for k, v in sorted(EDUSCOL_POS.items(), key=lambda kv: -len(kv[0])) if pos_raw.startswith(k)), None)
        if pos is None:
            continue
        out.append(EduscolWord(rank=len(out) + 1, lemma=nfc(m['lemma']), pos=pos, pos_raw=pos_raw, freq=int(m['freq']) if m['freq'] else None))
    return out
