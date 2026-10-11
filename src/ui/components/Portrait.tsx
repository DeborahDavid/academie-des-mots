import { useLiveQuery } from 'dexie-react-hooks';
import { type ReactNode, useEffect, useState } from 'react';
import { db } from '../../db/db';
import type { ArtSlot, CharacterId } from '../../domain/model';
import { useSettings } from '../hooks';

/** URL de l'image du portrait importé (ou undefined). */
export function usePortraitUrl(who: ArtSlot): string | undefined {
  const settings = useSettings();
  const id = settings?.portraits?.[who];
  const asset = useLiveQuery(() => (id ? db.images.get(id) : undefined), [id]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!asset) return setUrl(undefined);
    const u = URL.createObjectURL(asset.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [asset]);
  return url;
}

/** Médaillon rond cerclé d'or. Elsa est un peu plus petite que Leyu, comme en vrai. */
export function Portrait({ who, size, fallback }: { who: CharacterId; size: number; fallback: string }) {
  const url = usePortraitUrl(who);
  const s = who === 'elsa' ? Math.round(size * 0.88) : size;
  return (
    <div className="portrait" style={{ width: s, height: s }}>
      {url ? <img src={url} alt="" /> : <span style={{ fontSize: s * 0.6 }}>{fallback}</span>}
    </div>
  );
}

/** Grande case façon manga (illustration en pied ou en buste). */
export function MangaPanel({ slot, height, children }: { slot: ArtSlot; height: number; children?: ReactNode }) {
  const url = usePortraitUrl(slot);
  if (!url) return null;
  return (
    <div className="manga-panel" style={{ height }}>
      <img src={url} alt="" />
      {children}
    </div>
  );
}
