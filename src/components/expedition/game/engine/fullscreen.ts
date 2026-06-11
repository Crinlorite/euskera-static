// Fullscreen helper para inmersión. Sin librerías externas.
//
// Tres niveles de soporte:
//   1. API estándar (desktop, Android, iPad con Safari 16.4+)
//   2. API con prefijo webkit (iPad con Safari antiguo)
//   3. Pseudo-fullscreen CSS (iPhone: Apple no permite la Fullscreen API
//      salvo en <video>) — overlay fijo ocupando el viewport visual.
// En Android, al entrar en fullscreen real se intenta bloquear la
// orientación en apaisado (el juego es 16:9); donde no se puede, se ignora.

type AnyEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type AnyDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const doc = (): AnyDoc => document as AnyDoc;

let pseudoEl: HTMLElement | null = null;
const pseudoListeners = new Set<(fs: boolean) => void>();

function apiSupported(el: HTMLElement): boolean {
  const e = el as AnyEl;
  return !!(el.requestFullscreen || e.webkitRequestFullscreen);
}

export function isFullscreen(): boolean {
  return !!(doc().fullscreenElement ?? doc().webkitFullscreenElement) || pseudoEl !== null;
}

async function lockLandscape() {
  try {
    // Solo existe en Android/Chromium y solo dentro de fullscreen real.
    await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* iOS / desktop / usuario con rotación bloqueada: da igual */
  }
}

function unlockOrientation() {
  try {
    screen.orientation.unlock();
  } catch {
    /* ignore */
  }
}

function notifyPseudo() {
  for (const cb of pseudoListeners) cb(isFullscreen());
}

export async function enterFullscreen(el: HTMLElement) {
  if (isFullscreen()) return;
  if (apiSupported(el)) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
      } else {
        await (el as AnyEl).webkitRequestFullscreen?.();
      }
      await lockLandscape();
      return;
    } catch {
      /* bloqueado por el navegador → probamos el pseudo-modo */
    }
  }
  // Pseudo-fullscreen (iPhone y fallback): overlay fijo + sin scroll detrás.
  pseudoEl = el;
  el.classList.add('pseudo-fullscreen');
  document.body.style.overflow = 'hidden';
  notifyPseudo();
}

export async function exitFullscreen() {
  if (doc().fullscreenElement ?? doc().webkitFullscreenElement) {
    unlockOrientation();
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc().webkitExitFullscreen?.();
    } catch {
      /* ignore */
    }
    return;
  }
  if (pseudoEl) {
    pseudoEl.classList.remove('pseudo-fullscreen');
    document.body.style.overflow = '';
    pseudoEl = null;
    notifyPseudo();
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
 * Listener de cambio (API real, prefijada o pseudo). Devuelve cleanup.
 */
export function onFullscreenChange(cb: (isFs: boolean) => void): () => void {
  const handler = () => cb(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  pseudoListeners.add(cb);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    pseudoListeners.delete(cb);
  };
}

// En iPhone el pseudo-fullscreen es un overlay CSS, y al rotar Safari
// recalcula su viewport (barra que aparece/desaparece, dvh nuevo) sin avisar
// a nuestro estado: el overlay quedaba "colgado" y el botón no reflejaba la
// realidad ("bloqueado"). Al cambiar de orientación o redimensionar,
// re-afirmamos el overlay y re-notificamos para que el botón siga vivo.
function reassertPseudo() {
  if (!pseudoEl) return;
  pseudoEl.classList.add('pseudo-fullscreen');
  document.body.style.overflow = 'hidden';
  // Empujón de reflow: forzar que Safari recomponga el fixed con el dvh nuevo.
  void pseudoEl.offsetHeight;
  notifyPseudo();
}

if (typeof window !== 'undefined') {
  window.addEventListener('orientationchange', () => {
    // El recálculo del viewport en iOS llega un tick tarde tras el evento.
    setTimeout(reassertPseudo, 250);
  });
  window.addEventListener('resize', () => {
    if (pseudoEl) reassertPseudo();
  });
}
