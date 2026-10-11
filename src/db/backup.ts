import { type AcademieDB, ALL_TABLES, db as defaultDb } from './db';
import type { Item } from '../domain/model';

export const BACKUP_FORMAT = 'academie-des-mots';
export const BACKUP_VERSION = 1;

/** Tables qui contiennent des fichiers (exportés en base64). */
const BLOB_TABLES: string[] = ['audio', 'images'];

interface SerializedAudio {
  id: string;
  mime: string;
  base64: string;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Les dates des cartes FSRS redeviennent des objets Date à l'import. */
function reviveItem(raw: Item): Item {
  const card = { ...raw.card };
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return { ...raw, card };
}

export async function exportData(db: AcademieDB = defaultDb): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const name of ALL_TABLES) {
    if (BLOB_TABLES.includes(name)) continue;
    tables[name] = await db.table(name).toArray();
  }
  for (const name of BLOB_TABLES) {
    const out: SerializedAudio[] = [];
    for (const row of (await db.table(name).toArray()) as { id: string; mime: string; blob: Blob }[]) {
      out.push({ id: row.id, mime: row.mime, base64: await blobToBase64(row.blob) });
    }
    tables[name] = out;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export function backupToJson(b: Backup): string {
  return JSON.stringify(b, null, 1);
}

export function parseBackup(json: string): Backup {
  const b = JSON.parse(json) as Backup;
  if (b?.format !== BACKUP_FORMAT || typeof b.tables !== 'object') throw new Error('Ce fichier n’est pas une sauvegarde de L’Académie des Mots.');
  if (b.version > BACKUP_VERSION) throw new Error('Sauvegarde créée par une version plus récente de l’application.');
  return b;
}

/** Remplace TOUTES les données locales par celles de la sauvegarde. */
export async function importData(b: Backup, db: AcademieDB = defaultDb): Promise<void> {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const name of ALL_TABLES) await db.table(name).clear();
    for (const name of ALL_TABLES) {
      const rows = b.tables[name] ?? [];
      if (BLOB_TABLES.includes(name)) {
        await db.table(name).bulkAdd((rows as SerializedAudio[]).map((a) => ({ id: a.id, mime: a.mime, blob: base64ToBlob(a.base64, a.mime) })));
      } else if (name === 'items') {
        await db.items.bulkAdd((rows as Item[]).map(reviveItem));
      } else {
        await db.table(name).bulkAdd(rows);
      }
    }
  });
}
