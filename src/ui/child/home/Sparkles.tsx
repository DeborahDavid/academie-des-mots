/** Petites étincelles dorées qui scintillent lentement (écran principal uniquement, désactivables). */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const COLORS = ['#FFE08A', '#FFF4D6', '#F7C65B', '#F9C9D6'];

export function Sparkles({ count = 18, seed = 3 }: { count?: number; seed?: number }) {
  const r = rng(seed);
  return (
    <div className="sparkles" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const size = 6 + r() * 10;
        return (
          <svg
            key={i}
            className="sparkle"
            viewBox="-10 -10 20 20"
            width={size}
            height={size}
            style={{ left: `${r() * 100}%`, top: `${r() * 100}%`, animationDelay: `${(r() * 6).toFixed(2)}s`, animationDuration: `${(4 + r() * 4).toFixed(2)}s` }}
          >
            <path d="M0 -10 Q2 -2 10 0 Q2 2 0 10 Q-2 2 -10 0 Q-2 -2 0 -10Z" fill={COLORS[i % COLORS.length]} />
          </svg>
        );
      })}
    </div>
  );
}
