// Banco de audio euskera pre-generado (scripts/build_audio_bank.py).
// El manifest mapea la frase normalizada → MP3 en /audio/eu/. Se importa en
// las islas (bundle compartido), así funciona también offline en la PWA.
import manifest from '../data/audio-eu.json';

const M = manifest as Record<string, string>;

const key = (t: string) => t.trim().toLowerCase().normalize('NFC');

export function hasEuAudio(text: string): boolean {
  return !!M[key(text)];
}

let current: HTMLAudioElement | null = null;

/** Reproduce la frase si está en el banco; false si no (→ fallback speak()). */
export function playEu(text: string): boolean {
  const f = M[key(text)];
  if (!f) return false;
  current?.pause();
  current = new Audio(`/audio/eu/${f}`);
  current.play().catch(() => {});
  return true;
}
