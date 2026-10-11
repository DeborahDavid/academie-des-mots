import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { setPortrait } from '../../db/repo';
import type { ArtSlot } from '../../domain/model';
import { usePortraitUrl } from '../components/Portrait';

const VIEW = 280; // taille du cadre de recadrage (px)
const OUT = 512; // taille de l'image enregistrée (px)


interface SlotDef {
  slot: ArtSlot;
  label: string;
  help: string;
  /** Visage : recadrage rond. Sinon : grande case, image gardée telle quelle. */
  face: boolean;
}

const SLOTS: SlotDef[] = [
  { slot: 'leyu-pied', label: 'Leyu en pied', help: 'Grande case de l’écran d’accueil.', face: false },
  { slot: 'leyu', label: 'Leyu — visage', help: 'Avatar, garde-robe.', face: true },
  { slot: 'leyu-grimace', label: 'Leyu — grimace rigolote', help: 'Apparaît sur les réussites « Le POULET ! ».', face: true },
  { slot: 'elsa-buste', label: 'Elsa en buste', help: 'Sa case sur l’écran d’accueil.', face: false },
  { slot: 'elsa', label: 'Elsa — visage', help: 'Ses bulles pendant les séances.', face: true },
];

export function CharactersPanel() {
  return (
    <div className="stack">
      <p className="notice small-text">
        Importez les illustrations des filles. Elles restent <strong>uniquement dans ce navigateur</strong> et ne sont jamais publiées avec le code du
        site. Les sauvegardes (Réglages) les incluent.
      </p>
      <div className="level-grid">
        {SLOTS.map((d) => (
          <CharacterCard key={d.slot} def={d} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ def }: { def: SlotDef }) {
  const [src, setSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const url = usePortraitUrl(def.slot);
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  return (
    <section className="card stack" style={{ alignItems: 'center' }}>
      <h3 style={{ margin: 0 }}>{def.label}</h3>
      <p className="muted small-text" style={{ margin: 0 }}>
        {def.help}
      </p>
      {src ? (
        <Cropper src={src} onCancel={() => setSrc(null)} onSave={async (blob) => (await setPortrait(def.slot, blob), setSrc(null))} />
      ) : (
        <>
          {url ? (
            def.face ? (
              <div className="portrait" style={{ width: 140, height: 140 }}>
                <img src={url} alt="" />
              </div>
            ) : (
              <img src={url} alt="" style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 10 }} />
            )
          ) : (
            <div className="portrait" style={{ width: 140, height: 140 }}>
              <span className="muted small-text">vide</span>
            </div>
          )}
          <div className="row center">
            <button className="primary" onClick={() => fileRef.current?.click()}>
              Importer…
            </button>
            {url && (
              <button className="ghost" onClick={() => confirm(`Retirer « ${def.label} » ?`) && setPortrait(def.slot, null)}>
                Retirer
              </button>
            )}
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
          e.target.value = '';
          if (!f) return;
          if (def.face) setSrc(URL.createObjectURL(f));
          else setPortrait(def.slot, f);
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
