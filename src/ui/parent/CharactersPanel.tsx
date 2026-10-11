import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { setPortrait } from '../../db/repo';
import type { CharacterId } from '../../domain/model';
import { Portrait } from '../components/Portrait';

const VIEW = 280; // taille du cadre de recadrage (px)
const OUT = 512; // taille de l'image enregistrée (px)

const NAMES: Record<CharacterId, string> = { leyu: 'Leyu', elsa: 'Elsa' };

export function CharactersPanel() {
  return (
    <div className="stack">
      <p className="notice small-text">
        Importez une illustration des filles, puis cadrez chaque visage. Les images restent <strong>uniquement dans ce navigateur</strong> :
        elles ne sont jamais publiées avec le code du site. Pensez à exporter une sauvegarde (Réglages) pour les retrouver sur un autre appareil.
      </p>
      <div className="level-grid">
        {(['leyu', 'elsa'] as CharacterId[]).map((who) => (
          <CharacterCard key={who} who={who} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ who }: { who: CharacterId }) {
  const [src, setSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  return (
    <section className="card stack" style={{ alignItems: 'center' }}>
      <h2>{NAMES[who]}</h2>
      {src ? (
        <Cropper src={src} onCancel={() => setSrc(null)} onSave={async (blob) => (await setPortrait(who, blob), setSrc(null))} />
      ) : (
        <>
          <Portrait who={who} size={160} fallback={who === 'elsa' ? '😊' : '🧙‍♀️'} />
          <div className="row center">
            <button className="primary" onClick={() => fileRef.current?.click()}>
              Importer une image…
            </button>
            <button className="ghost" onClick={() => confirm(`Retirer le portrait de ${NAMES[who]} ?`) && setPortrait(who, null)}>
              Retirer
            </button>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setSrc(URL.createObjectURL(f));
          e.target.value = '';
        }}
      />
    </section>
  );
}

/** Recadrage rond : glisser pour déplacer, curseur pour zoomer. */
function Cropper({ src, onSave, onCancel }: { src: string; onSave: (b: Blob) => void; onCancel: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // décalage du centre de l'image, en px du cadre
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Échelle de base : l'image couvre le cadre.
  const base = VIEW / Math.min(nat.w, nat.h);
  const scale = base * zoom;

  function onDown(e: PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }
  function onMove(e: PointerEvent) {
    if (!drag.current) return;
    setPos({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
  }

  function save() {
    const c = document.createElement('canvas');
    c.width = c.height = OUT;
    const k = OUT / VIEW;
    const g = c.getContext('2d')!;
    const w = nat.w * scale * k, h = nat.h * scale * k;
    g.drawImage(imgRef.current!, OUT / 2 + pos.x * k - w / 2, OUT / 2 + pos.y * k - h / 2, w, h);
    c.toBlob((b) => b && onSave(b), 'image/webp', 0.9);
  }

  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div className="cropper" style={{ width: VIEW, height: VIEW }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)}>
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ width: nat.w * scale, height: nat.h * scale, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
        />
        <div className="cropper-ring" />
      </div>
      <label style={{ margin: 0 }}>
        Zoom
        <input type="range" min={1} max={6} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: VIEW, background: 'transparent' }} />
      </label>
      <p className="muted small-text">Glissez l’image pour centrer le visage dans le cercle.</p>
      <div className="row center">
        <button className="ghost" onClick={onCancel}>
          Annuler
        </button>
        <button className="primary" onClick={save}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}
