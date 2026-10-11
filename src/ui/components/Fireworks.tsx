/**
 * Feu d'artifice doré, doux et court (~3 s), joué une fois en fin de séance.
 * Désactivé si l'appareil demande moins d'animations ou si le parent a coupé les animations.
 */
const BURSTS: { x: number; y: number; d: number; c: string }[] = [
  { x: 22, y: 30, d: 0, c: '#F7C65B' },
  { x: 74, y: 22, d: 0.45, c: '#F9C9D6' },
  { x: 50, y: 40, d: 0.9, c: '#FFE08A' },
  { x: 32, y: 18, d: 1.4, c: '#BFEAE7' },
  { x: 80, y: 44, d: 1.8, c: '#F7C65B' },
];

export function Fireworks() {
  return (
    <div className="fireworks" aria-hidden>
      {BURSTS.map((b, i) => (
        <span key={i} className="burst" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s`, color: b.c }}>
          {Array.from({ length: 12 }, (_, k) => (
            <i key={k} style={{ ['--r' as string]: `${k * 30}deg` }} />
          ))}
        </span>
      ))}
    </div>
  );
}
