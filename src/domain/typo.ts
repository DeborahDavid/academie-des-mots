/** Typographie française : espace fine insécable avant ! ? : ; (jamais de ponctuation seule en début de ligne). */
export function frTypo(s: string): string {
  return s.replace(/[  ]+([!?:;])/g, ' $1');
}
