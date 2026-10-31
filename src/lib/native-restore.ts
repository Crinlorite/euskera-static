import { getProgress, migrate, saveNow, setProgress, type ProgressV1 } from '../stores/progress';
import { decodeHash } from '../stores/progress-hash';
import { mergeProgress } from '../stores/progress-merge';

/**
 * Puerta que el wrapper nativo (iOS) usa para devolver el progreso respaldado en
 * su respaldo local. El nativo no puede tocar el localStorage del WKWebView, así que la web
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
  /**
   * Fusiona un código de progreso con el local. Devuelve cuántas lecciones se
   * añadieron y si cambió algo (`changed`, aditivo: los binarios actuales lo ignoran).
   */
  merge(hash: string): Promise<{ ok: boolean; added: number; changed: boolean }>;
}

/** Suma de intentos de todos los ejercicios: si sube, la fusión trajo trabajo nuevo. */
function totalAttempts(p: ProgressV1): number {
  let n = 0;
  for (const l of Object.values(p.lessons)) {
    for (const e of Object.values(l.exercises ?? {})) n += e.attempts || 0;
  }
  return n;
}

const completedCount = (p: ProgressV1): number =>
  Object.values(p.lessons).filter((l) => l.status === 'completed').length;

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
      const decoded = await decodeHash(hash);
      if (!decoded) return { ok: false, added: 0, changed: false };
      // Por migrate(): claves antiguas traducidas, esquemas superiores conservados
      // y `achievements` siempre presente. Antes se fusionaba el remoto en crudo.
      const remote = migrate(decoded);
      const local = getProgress();
      const merged = mergeProgress(local, remote);
      const added = Object.keys(merged.lessons).length - Object.keys(local.lessons).length;
      const newAchievements =
        Object.keys(merged.achievements ?? {}).length - Object.keys(local.achievements ?? {}).length;
      const changed =
        added > 0 ||
        newAchievements > 0 ||
        totalAttempts(merged) > totalAttempts(local) ||
        completedCount(merged) > completedCount(local);
      setProgress(merged);
      // Sin esperar al debounce: si la app se cierra ahora, el progreso recuperado
      // ya está en disco.
      saveNow();
      return { ok: true, added, changed };
    },
  };
}
