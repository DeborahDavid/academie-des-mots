/**
 * Ada endormie sur sa pile de livres — silhouette provisoire (asset A3 à venir dans le style des illustrations).
 * `awake` : elle ouvre un œil vert (arrivée, constellation), puis se rendort.
 */
export function AdaSleeping({ awake }: { awake: boolean }) {
  return (
    <svg className="ada-sleeping" viewBox="0 0 170 120" role="img" aria-label="Ada, la chatte noire de la tour, dort sur ses livres">
      {/* pile de livres */}
      <rect x="18" y="92" width="134" height="18" rx="4" fill="#B9D7B1" />
      <rect x="18" y="92" width="134" height="5" rx="2.5" fill="#FFFAF1" opacity="0.7" />
      <rect x="28" y="76" width="118" height="17" rx="4" fill="#F4B9C8" />
      <rect x="132" y="79" width="8" height="11" rx="2" fill="#FFFAF1" opacity="0.8" />
      <rect x="22" y="61" width="122" height="16" rx="4" fill="#B7A6E8" />
      <rect x="30" y="66" width="40" height="3" rx="1.5" fill="#F7C65B" />
      {/* Ada roulée en boule */}
      <g className="ada-body">
        <path d="M40 62 C38 38 70 22 104 24 C134 26 152 42 150 60 C149 70 130 72 96 72 C66 72 41 72 40 62 Z" fill="#1E1B2E" />
        {/* queue enroulée devant */}
        <path d="M148 58 C156 74 110 80 66 72" stroke="#1E1B2E" strokeWidth="10" strokeLinecap="round" fill="none" />
        {/* tête posée sur les pattes */}
        <path d="M30 60 C26 44 38 34 52 35 C66 36 74 46 70 58 C67 68 34 72 30 60 Z" fill="#1E1B2E" />
        <path d="M33 44 L30 27 L45 37 Z" fill="#1E1B2E" />
        <path d="M54 36 L64 22 L68 41 Z" fill="#1E1B2E" />
        <path d="M34 41 L33 32 L41 38 Z" fill="#F4B9C8" opacity="0.55" />
        {/* reflet doux de la lampe */}
        <path d="M58 30 C80 24 112 24 136 34" stroke="#F7C65B" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
        {awake ? (
          <>
            <ellipse cx="44" cy="51" rx="4.5" ry="3" fill="#7FD6A0" />
            <ellipse cx="44" cy="51" rx="1.2" ry="2.6" fill="#1E1B2E" />
            <path d="M54 52 q5 3 10 0" stroke="#5A5674" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M39 51 q5 3 10 0" stroke="#5A5674" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M54 52 q5 3 10 0" stroke="#5A5674" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        <path d="M49 58 l2 1.6 l2 -1.6" stroke="#F4B9C8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
      {!awake && (
        <g className="ada-z" fill="#6A5A9E" fontFamily="Fredoka, sans-serif" fontWeight="600">
          <text x="76" y="20" fontSize="14">z</text>
          <text x="88" y="10" fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
}
