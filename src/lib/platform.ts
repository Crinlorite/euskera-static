type HapticType = 'success' | 'warning' | 'error' | 'light' | 'selection';

interface KaixoBridge {
  platform: string;
  speak(text: string, lang?: string): void;
  haptic(type: HapticType): void;
  saveProgress(s: ProgressSummary): void;
  share(hash: string): void;
  requestNotifications?(): void;
}
interface ProgressSummary {
  streak: number; longest: number; lessonsCompleted: number; lastStudied: string;
}
declare global { interface Window { Kaixo?: KaixoBridge } }

const bridge = (): KaixoBridge | undefined =>
  typeof window !== 'undefined' ? window.Kaixo : undefined;

/** True si corre dentro de un wrapper nativo (iOS o, en el futuro, Android). */
export const isNative = (): boolean => !!bridge()?.platform;

/** True si se puede pronunciar (puente nativo o SpeechSynthesis del navegador). */
export const canSpeak = (): boolean =>
  !!bridge()?.speak || (typeof window !== 'undefined' && 'speechSynthesis' in window);

export function speak(text: string): void {
  const t = text?.trim();
  if (!t) return;
  const b = bridge();
  if (b?.speak) { b.speak(t, 'eu-ES'); return; }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const run = () => {
    const voices = window.speechSynthesis.getVoices();
    // Prioriza euskera; si no hay, español. Nunca el idioma del sistema.
    const v =
      voices.find((x) => x.lang?.toLowerCase().startsWith('eu')) ||
      voices.find((x) => x.lang?.toLowerCase().startsWith('es'));
    if (!v) return;
    const u = new SpeechSynthesisUtterance(t);
    u.voice = v;
    u.lang = v.lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length) run();
  else window.speechSynthesis.addEventListener('voiceschanged', run, { once: true });
}

export function haptic(type: HapticType): void {
  const b = bridge();
  if (b?.haptic) { b.haptic(type); return; }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const pattern = type === 'success' ? 20 : type === 'error' ? [40, 40, 40] : 10;
    navigator.vibrate(pattern as number | number[]);
  }
}

/** Devuelve true si lo gestionó el puente nativo (para cortar el flujo web). */
export function shareProgress(hash: string): boolean {
  const b = bridge();
  if (b?.share) { b.share(hash); return true; }
  return false;
}

export function saveProgress(s: ProgressSummary): void {
  bridge()?.saveProgress?.(s);
}
