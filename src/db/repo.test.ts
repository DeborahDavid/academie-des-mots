import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { addWeek, deleteWeek, ensureSeeded, getSettings, setNotionStatus, setWordAudio, suggestNextStartDate } from './repo';
import { backupToJson, exportData, importData, parseBackup } from './backup';

let db: AcademieDB;
let n = 0;

beforeEach(async () => {
  db = new AcademieDB(`test-${n++}`);
  await ensureSeeded(db);
});

const entries = (level: 'jaune' | 'vert' | 'violet', ...words: string[]) => words.map((text) => ({ level, entry: { text } }));

describe('addWeek', () => {
  it('crée mots, items FSRS et avance la lune', async () => {
    const r = await addWeek({ label: 'Semaine 1', startDate: '2026-09-07', entries: entries('jaune', 'forêt', 'château') }, db);
    expect(r.added).toBe(2);
    expect(await db.items.where('kind').equals('word').count()).toBe(2);
    expect((await getSettings(db)).moonPhase).toBe(1);
  });

  it('ne duplique pas un mot déjà vu une semaine précédente', async () => {
    await addWeek({ label: 'S1', startDate: '2026-09-07', entries: entries('jaune', 'forêt') }, db);
    const r = await addWeek({ label: 'S2', startDate: '2026-09-14', entries: entries('vert', 'Forêt', 'soudain') }, db);
    expect(r.added).toBe(1);
    expect(r.duplicates).toEqual(['Forêt']);
  });

  it('5 semaines d’arriéré : la lune fait 5 pas', async () => {
    for (let i = 0; i < 5; i++) await addWeek({ label: `S${i}`, startDate: `2026-09-0${i + 1}`, entries: entries('jaune', `mot${i}`) }, db);
    expect((await getSettings(db)).moonPhase).toBe(5);
  });
});

describe('deleteWeek', () => {
  it('supprime mots, items et audio', async () => {
    const { week } = await addWeek({ label: 'S1', startDate: '2026-09-07', entries: entries('jaune', 'forêt') }, db);
    const w = (await db.words.toArray())[0];
    await setWordAudio(w.id, new Blob(['x'], { type: 'audio/webm' }), db);
    await deleteWeek(week.id, db);
    expect(await db.words.count()).toBe(0);
    expect(await db.items.count()).toBe(0);
    expect(await db.audio.count()).toBe(0);
  });
});

describe('notions', () => {
  it('activer une notion crée un item une seule fois', async () => {
    await setNotionStatus('gn-genre', true, db);
    await setNotionStatus('gn-genre', false, db);
    await setNotionStatus('gn-genre', true, db);
    expect(await db.items.where('kind').equals('notion').count()).toBe(1);
  });
});

describe('export / import', () => {
  it('aller-retour JSON complet, dates FSRS et audio compris', async () => {
    await addWeek({ label: 'S1', startDate: '2026-09-07', entries: entries('violet', 'aujourd’hui') }, db);
    const w = (await db.words.toArray())[0];
    await setWordAudio(w.id, new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mp4' }), db);
    const json = backupToJson(await exportData(db));

    const db2 = new AcademieDB(`test-${n++}`);
    await importData(parseBackup(json), db2);
    expect(await db2.words.count()).toBe(1);
    const item = (await db2.items.toArray())[0];
    expect(item.card.due).toBeInstanceOf(Date);
    const clip = (await db2.audio.toArray())[0];
    expect(new Uint8Array(await clip.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await getSettings(db2)).moonPhase).toBe(1);
  });

  it('refuse un fichier étranger', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow();
  });
});

describe('suggestNextStartDate', () => {
  it('lundi suivant la dernière semaine', () => {
    expect(suggestNextStartDate([{ id: 'a', label: '', startDate: '2026-09-28', createdAt: 0 }])).toBe('2026-10-05');
  });
  it('lundi courant si aucune semaine', () => {
    expect(suggestNextStartDate([], new Date(2026, 9, 11))).toBe('2026-10-05');
  });
});

describe('nettoyage', () => {
  it('efface les anciennes phrases de contexte', async () => {
    await db.words.add({ id: 'w', weekId: 'k', text: 'forêt', level: 'jaune', context: 'Le loup…', createdAt: 0 });
    await ensureSeeded(db);
    expect((await db.words.get('w'))!.context).toBeUndefined();
  });
});
