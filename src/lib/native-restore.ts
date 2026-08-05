import { getProgress, saveNow, setProgress } from '../stores/progress';
import { decodeHash } from '../stores/progress-hash';
import { mergeProgress } from '../stores/progress-merge';

/**
 * Puerta que el wrapper nativo (iOS) usa para devolver el progreso respaldado en
 * iCloud. El nativo no puede tocar el localStorage del WKWebView, así que la web
 * expone estas tres primitivas y **la decisión de cuándo restaurar la toma el
 * nativo**, que es quien conoce la fecha del respaldo.
 *
 * `merge` es no destructiva por construcción (ver progress-merge.ts): solo puede
 * añadir lecciones o subir puntuaciones, nunca quitar. Por eso se puede llamar
 * sin preguntar al usuario.
 */
export interface KaixoWebApi {
  /** ISO del progreso local; cadena vacía si no hay nada guardado. */
  lastUpdated(): string;
  /** True si aquí no hay ninguna lección empezada (instalación limpia o purga). */
  isEmpty(): boolean;
  /** Fusiona un código de progreso con el local. Devuelve cuántas lecciones se añadieron. */
  merge(hash: string): Promise<{ ok: boolean; added: number }>;
}

declare global {
  interface Window {
    KaixoWeb?: KaixoWebApi;
  }
}

if (typeof window !== 'undefined') {
  window.KaixoWeb = {
    lastUpdated: () => getProgress().lastUpdated ?? '',
    isEmpty: () => Object.keys(getProgress().lessons).length === 0,
    async merge(hash: string) {
      const remote = await decodeHash(hash);
      if (!remote) return { ok: false, added: 0 };
      const local = getProgress();
      const merged = mergeProgress(local, remote);
      setProgress(merged);
      // Sin esperar al debounce: si la app se cierra ahora, el progreso recuperado
      // ya está en disco.
      saveNow();
      return { ok: true, added: Object.keys(merged.lessons).length - Object.keys(local.lessons).length };
    },
  };
}
