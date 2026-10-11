/**
 * GitHub Pages autorise 10 min de cache : au démarrage, on compare le script chargé
 * avec celui de la page en ligne et on recharge une fois si une nouvelle version existe.
 */
export async function reloadIfOutdated(): Promise<boolean> {
  if (!import.meta.env.PROD) return false;
  try {
    const current = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.src.match(/index-[^/]+\.js/)?.[0];
    const html = await (await fetch(`${import.meta.env.BASE_URL}?v=${Date.now()}`, { cache: 'no-store' })).text();
    const latest = html.match(/index-[^/"]+\.js/)?.[0];
    if (!current || !latest || current === latest) return false;
    // Une seule tentative par version, pour ne jamais boucler.
    if (sessionStorage.getItem('reloadedFor') === latest) return false;
    sessionStorage.setItem('reloadedFor', latest);
    location.reload();
    return true;
  } catch {
    return false;
  }
}
