// Fullscreen helper para inmersión. Sin librerías externas.
// API: requestFullscreen sobre el elemento del juego o el document.

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export async function enterFullscreen(el: HTMLElement) {
  if (document.fullscreenElement) return;
  try {
    await el.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* usuario lo bloqueó o navegador no soporta */
  }
}

export async function exitFullscreen() {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

export async function toggleFullscreen(el: HTMLElement) {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await enterFullscreen(el);
  }
}

/**
 * Listener de cambio. Devuelve función de cleanup.
 */
export function onFullscreenChange(cb: (isFs: boolean) => void): () => void {
  const handler = () => cb(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}
