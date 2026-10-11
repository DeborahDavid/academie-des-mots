import type { ReactNode } from 'react';

/**
 * Jeu d'icônes de l'Académie, dessiné pour le jeu (jamais d'emoji système).
 * Style commun : grille 32, contour encre prune arrondi, aplats de la palette chaude, petit reflet clair.
 */
export type IconName =
  | 'lock'
  | 'flame'
  | 'star'
  | 'music'
  | 'bell'
  | 'bell-off'
  | 'wand'
  | 'telescope'
  | 'map'
  | 'book'
  | 'dress'
  | 'speaker'
  | 'speaker-off'
  | 'turtle'
  | 'bulb'
  | 'magnifier'
  | 'crystal'
  | 'medal'
  | 'quill'
  | 'crown'
  | 'flag'
  | 'sparkles'
  | 'hourglass'
  | 'scarf'
  | 'cat'
  | 'moon'
  | 'hat'
  | 'sneakers'
  | 'redo';

const INK = '#3E2D4F';
const GOLD = '#F7C65B';
const GOLD_D = '#E9A54B';
const CREAM = '#FFF6E6';
const ROSE = '#F4B9C8';
const LAV = '#B7A6E8';
const TURQ = '#6CCFCB';
const NIGHT = '#4A4F9C';
const SAGE = '#B9D7B1';

const line = { stroke: INK, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const shine = { stroke: '#fff', strokeOpacity: 0.75, strokeWidth: 1.6, strokeLinecap: 'round', fill: 'none' } as const;

const ICONS: Record<IconName, ReactNode> = {
  lock: (
    <>
      <path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" {...line} />
      <rect x="7" y="13.5" width="18" height="13" rx="3.5" fill={GOLD} {...line} />
      <circle cx="16" cy="19" r="1.8" fill={INK} />
      <path d="M16 20v2.6" {...line} />
      <path d="M9.8 16.5v3" {...shine} />
    </>
  ),
  flame: (
    <>
      <path d="M16 3.5c1 4.5 7.5 7.4 7.5 14.2A7.5 7.5 0 0 1 8.5 17.7c0-3.4 1.8-5.4 3.4-6.9.2 2 1 3.2 2.3 3.8C13.6 10.6 14.4 6.6 16 3.5Z" fill="#FF9D5C" {...line} />
      <path d="M16 14.5c.6 2.5 3.8 3.8 3.8 7a3.8 3.8 0 0 1-7.6 0c0-1.7.9-2.8 1.8-3.6.3 1 .8 1.5 1.3 1.7-.2-1.9.1-3.6.7-5.1Z" fill={GOLD} />
    </>
  ),
  star: (
    <>
      <path d="M16 3.5c.9 6.4 2.4 8.6 9.5 9.6-7.1 1-8.6 3.3-9.5 9.6-.9-6.3-2.4-8.6-9.5-9.6 7.1-1 8.6-3.2 9.5-9.6Z" fill={GOLD} {...line} transform="translate(0 3)" />
    </>
  ),
  music: (
    <>
      <path d="M12.5 22V8.5l12-3V19" fill="none" {...line} />
      <path d="M12.5 12.5l12-3" {...line} />
      <ellipse cx="9.3" cy="22.3" rx="3.6" ry="3" fill={LAV} {...line} />
      <ellipse cx="21.3" cy="19.3" rx="3.6" ry="3" fill={LAV} {...line} />
    </>
  ),
  bell: (
    <>
      <path d="M8 22.5c1.5-1.6 2-3.4 2-6.5a6 6 0 0 1 12 0c0 3.1.5 4.9 2 6.5Z" fill={GOLD} {...line} />
      <path d="M13.5 25.5a2.6 2.6 0 0 0 5 0" fill="none" {...line} />
      <path d="M16 6.8V5" {...line} />
      <path d="M12.6 13.2c.4-1.4 1.3-2.3 2.6-2.7" {...shine} />
    </>
  ),
  'bell-off': (
    <>
      <path d="M8 22.5c1.5-1.6 2-3.4 2-6.5a6 6 0 0 1 12 0c0 3.1.5 4.9 2 6.5Z" fill="#E8DCCB" {...line} />
      <path d="M13.5 25.5a2.6 2.6 0 0 0 5 0" fill="none" {...line} />
      <path d="M6.5 6.5l19 19" {...line} />
    </>
  ),
  wand: (
    <>
      <path d="M6 26 19.5 12.5" stroke={INK} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M6 26 19.5 12.5" stroke={NIGHT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M17.2 14.8 19.5 12.5" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M23 3.5c.5 2.8 1.2 3.5 4 4-2.8.5-3.5 1.2-4 4-.5-2.8-1.2-3.5-4-4 2.8-.5 3.5-1.2 4-4Z" fill={GOLD} {...line} strokeWidth={1.5} />
      <circle cx="13" cy="6" r="1.2" fill={GOLD_D} />
      <circle cx="27" cy="16" r="1" fill={GOLD_D} />
    </>
  ),
  telescope: (
    <>
      <path d="M5.5 15.5l17-7.2 2.4 5.6-17 7.2Z" fill={LAV} {...line} />
      <path d="M21.6 6.8l3.6-1.5 3.3 7.8-3.6 1.5Z" fill={GOLD} {...line} />
      <path d="M4.2 14.3l2.4-1 2.4 5.6-2.4 1Z" fill={NIGHT} {...line} />
      <path d="M15.5 17.5 11 27.5M15.5 17.5 20 27.5M15.5 17.5v10" {...line} />
      <path d="M9.5 15.2l9-3.8" {...shine} />
    </>
  ),
  map: (
    <>
      <path d="M4.5 8.5l7-3 9 3 7-3v18l-7 3-9-3-7 3Z" fill={CREAM} {...line} />
      <path d="M11.5 5.5v18M20.5 8.5v18" {...line} strokeOpacity={0.45} />
      <path d="M7.5 19c2.5-.5 3.5-3 6-3.5s3.5 2.5 6 2" fill="none" stroke={GOLD_D} strokeWidth="1.8" strokeDasharray="0.1 3.2" strokeLinecap="round" />
      <path d="M22 11.5l3 3M25 11.5l-3 3" stroke="#E2607A" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M16 9.5c-2.6-2-6.4-2.6-11-2v15.5c4.6-.6 8.4 0 11 2Z" fill={CREAM} {...line} />
      <path d="M16 9.5c2.6-2 6.4-2.6 11-2v15.5c-4.6-.6-8.4 0-11 2Z" fill={CREAM} {...line} />
      <path d="M16 9.5v15.5" {...line} />
      <path d="M8 12c1.8-.2 3.5 0 5 .6M8 15.5c1.8-.2 3.5 0 5 .6M19 12.6c1.5-.6 3.2-.8 5-.6" stroke={LAV} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21.5 15.5c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5Z" fill={GOLD} />
    </>
  ),
  dress: (
    <>
      <path d="M12.5 4.5c.6 2 1.8 3 3.5 3s2.9-1 3.5-3l2.8 1.6-2 6.4c3.4 4.3 5.3 8.5 5.9 13-4.4 1.6-15 1.6-20.4 0 .6-4.5 2.5-8.7 5.9-13l-2-6.4Z" fill={TURQ} {...line} />
      <path d="M10.3 12.5h11.4" {...line} />
      <path d="M12 16.5c-1.5 2.2-2.6 4.7-3 7.3" {...shine} />
      <path d="M19.5 19.5c.3 1.4.6 1.7 2 2-1.4.3-1.7.6-2 2-.3-1.4-.6-1.7-2-2 1.4-.3 1.7-.6 2-2Z" fill={GOLD} />
    </>
  ),
  speaker: (
    <>
      <path d="M5.5 12.5h4.5l6.5-5.5v18L10 19.5H5.5Z" fill={GOLD} {...line} />
      <path d="M20.5 12a5.5 5.5 0 0 1 0 8M23.8 8.8a10 10 0 0 1 0 14.4" fill="none" {...line} />
    </>
  ),
  'speaker-off': (
    <>
      <path d="M5.5 12.5h4.5l6.5-5.5v18L10 19.5H5.5Z" fill="#E8DCCB" {...line} />
      <path d="M20.5 12.5l6 7M26.5 12.5l-6 7" {...line} />
    </>
  ),
  turtle: (
    <>
      <path d="M6 21.5c0-6 4.5-10 10-10s10 4 10 10Z" fill={SAGE} {...line} />
      <path d="M11 21.5l2-5h6l2 5M16 11.5v5" {...line} strokeOpacity={0.55} />
      <path d="M26 19.5c1.5 0 3-.8 3-2.5s-1.5-2.5-3-2" fill={SAGE} {...line} />
      <path d="M9 21.5v3M23 21.5v3" {...line} />
      <circle cx="27.4" cy="16.6" r="0.9" fill={INK} />
    </>
  ),
  bulb: (
    <>
      <path d="M11.5 20.5c0-3-3.5-4.6-3.5-8.6a8 8 0 0 1 16 0c0 4-3.5 5.6-3.5 8.6Z" fill={GOLD} {...line} />
      <path d="M12 24h8M13 27.2h6" {...line} />
      <path d="M12.4 9.2a4.6 4.6 0 0 1 3-2" {...shine} />
    </>
  ),
  magnifier: (
    <>
      <circle cx="13.5" cy="13.5" r="8" fill="#DDF3F2" {...line} />
      <path d="M19.5 19.5 27 27" stroke={INK} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M19.5 19.5 27 27" stroke={GOLD_D} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.6 11.6a4.4 4.4 0 0 1 3-3" {...shine} />
    </>
  ),
  crystal: (
    <>
      <path d="M9 25.5c.8-1.8 2-2.6 3.6-2.6h6.8c1.6 0 2.8.8 3.6 2.6Z" fill={GOLD_D} {...line} />
      <circle cx="16" cy="14" r="9" fill={LAV} {...line} />
      <path d="M11 11a6 6 0 0 1 4-4" {...shine} />
      <path d="M18.5 13c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3Z" fill="#fff" fillOpacity={0.9} />
    </>
  ),
  medal: (
    <>
      <path d="M11 3.5h4l2 8h-4ZM21 3.5h-4l-2 8h4Z" fill={ROSE} {...line} />
      <circle cx="16" cy="19.5" r="8" fill={GOLD} {...line} />
      <path d="M16 15c.6 2.5 1.2 3 3.6 3.6-2.4.6-3 1.1-3.6 3.6-.6-2.5-1.2-3-3.6-3.6 2.4-.6 3-1.1 3.6-3.6Z" fill="#FFF6D8" />
    </>
  ),
  quill: (
    <>
      <path d="M26.5 4.5C18 5.5 11.5 12 9.5 21.5l2.2.8C15 19 22.5 13 26.5 4.5Z" fill={CREAM} {...line} />
      <path d="M22 9.5c-3.5 2.5-6.6 6.3-9 11" stroke={LAV} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.6 21.9 7 27.5" {...line} />
      <path d="M4.5 27.5h11" stroke={NIGHT} strokeWidth="1.9" strokeLinecap="round" strokeOpacity={0.5} />
    </>
  ),
  crown: (
    <>
      <path d="M5.5 22.5 4 10.5l6.5 5L16 7l5.5 8.5 6.5-5-1.5 12Z" fill={GOLD} {...line} />
      <path d="M6 25.5h20" {...line} />
      <circle cx="16" cy="18" r="1.8" fill={ROSE} />
      <circle cx="10" cy="19.5" r="1.3" fill={TURQ} />
      <circle cx="22" cy="19.5" r="1.3" fill={TURQ} />
    </>
  ),
  flag: (
    <>
      <path d="M8.5 27.5v-23" {...line} />
      <path d="M8.5 5.5c4-1.8 7 1.8 11 0s5 0 5 0v11s-1-1.8-5 0-7-1.8-11 0Z" fill={ROSE} {...line} />
      <path d="M8.5 11c4-1.8 7 1.8 11 0" stroke="#fff" strokeOpacity={0.7} strokeWidth="1.5" fill="none" />
    </>
  ),
  sparkles: (
    <>
      <path d="M13 5c.8 5.6 2.2 7.2 8 8-5.8.8-7.2 2.4-8 8-.8-5.6-2.2-7.2-8-8 5.8-.8 7.2-2.4 8-8Z" fill={GOLD} {...line} strokeWidth={1.6} />
      <path d="M24 17c.5 3 1.1 3.6 4 4-2.9.4-3.5 1-4 4-.5-3-1.1-3.6-4-4 2.9-.4 3.5-1 4-4Z" fill={ROSE} {...line} strokeWidth={1.4} />
      <circle cx="25" cy="7.5" r="1.4" fill={GOLD_D} />
    </>
  ),
  hourglass: (
    <>
      <path d="M8 4.5h16M8 27.5h16" {...line} />
      <path d="M10 4.5c0 6 6 7.5 6 11.5s-6 5.5-6 11.5h12c0-6-6-7.5-6-11.5s6-5.5 6-11.5Z" fill={CREAM} {...line} />
      <path d="M12.6 25.5c.6-2.6 2.2-3.8 3.4-4.6 1.2.8 2.8 2 3.4 4.6Z" fill={GOLD} />
      <path d="M13 9.5h6l-3 3.5Z" fill={GOLD} />
    </>
  ),
  scarf: (
    <>
      <path d="M7 9.5c3 2.4 15 2.4 18 0l-1.6 5c-3.4 1.8-11.4 1.8-14.8 0Z" fill={ROSE} {...line} />
      <path d="M19 14.8l1.5 12.2-4.5-1.2-1-10.7" fill={ROSE} {...line} />
      <path d="M16.6 19.5l3.4.5M17.2 23l3.4.5" stroke="#fff" strokeOpacity={0.8} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 12.4l1.2 2.6M15 13l.6 2.8M21 12.4l-1 2.6" stroke="#fff" strokeOpacity={0.8} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  cat: (
    <>
      <path d="M6.5 25c-1.2-7 1.8-12 2-17l5 4.2c1.6-.4 3.4-.4 5 0l5-4.2c.2 5 3.2 10 2 17-3 2.2-16 2.2-19 0Z" fill="#2A2540" {...line} />
      <path d="M11 18.5q2 1.6 4 0M17 18.5q2 1.6 4 0" stroke="#8FE0A8" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M15 21.3l1 .8 1-.8Z" fill={ROSE} />
      <path d="M10.5 10.8l1.4 1.4M21.5 10.8l-1.4 1.4" stroke={ROSE} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  moon: (
    <>
      <path d="M20.5 4.5a11.5 11.5 0 1 0 7 19A9.5 9.5 0 0 1 20.5 4.5Z" fill={GOLD} {...line} />
      <path d="M9 13a8 8 0 0 1 4.5-5.5" {...shine} />
      <circle cx="25" cy="8" r="1.2" fill={GOLD_D} />
    </>
  ),
  hat: (
    <>
      <path d="M16 3.5c-2 5-5 12-6.5 18.5h13C21 16 18.5 9 20.5 6.5c-1.5-.3-3 -.8-4.5-3Z" fill={NIGHT} {...line} />
      <ellipse cx="16" cy="23" rx="12" ry="3.6" fill={NIGHT} {...line} />
      <path d="M10.6 18.5c3.6 1 7.2 1 10.8 0" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 11c.4 1.6.8 2 2.4 2.4-1.6.4-2 .8-2.4 2.4-.4-1.6-.8-2-2.4-2.4 1.6-.4 2-.8 2.4-2.4Z" fill={GOLD} />
    </>
  ),
  sneakers: (
    <>
      <path d="M4.5 22.5V13c2 .8 4.5.8 6-1 2.5 3.2 6 5.2 11 6 3.4.6 6 2 6 4.5v1H4.5Z" fill="#fff" {...line} />
      <path d="M4.5 22.5h23v2.2c0 .7-.5 1.3-1.2 1.3H5.7c-.7 0-1.2-.6-1.2-1.3Z" fill={TURQ} {...line} />
      <path d="M11.5 14.5l2-1.5M13.5 16.5l2-1.5M15.8 18l1.8-1.6" stroke={TURQ} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  redo: (
    <>
      <path d="M24.5 16a8.5 8.5 0 1 1-2.6-6.1" fill="none" {...line} />
      <path d="M23.5 4.5v6h-6" fill="none" {...line} />
    </>
  ),
};

export function Icon({ name, size = 24, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
