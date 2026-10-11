import type { RefObject } from 'react';

export const ACCENTS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'œ'] as const;

interface Props {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}

/** Insère le caractère à la position du curseur et rend le focus au champ. */
export function AccentBar({ inputRef, value, onChange }: Props) {
  function insert(ch: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + ch.length, start + ch.length);
    });
  }
  return (
    <div className="accent-bar" role="group" aria-label="Lettres accentuées">
      {ACCENTS.map((ch) => (
        <button key={ch} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>
          {ch}
        </button>
      ))}
    </div>
  );
}
