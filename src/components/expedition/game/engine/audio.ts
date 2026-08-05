// Voz del modo Expedición. Los clips propios del guion viven en
// /audio/exp/ (scripts/build_audio_exp.py, voz por personaje); si una frase
// no está ahí se intenta el banco de lecciones (/audio/eu/). El auto-play se
// puede silenciar y la preferencia persiste en localStorage.
import { writable } from 'svelte/store';
import expManifest from '../../../../data/audio-exp.json';
import { playEu as playBankEu, hasEuAudio as hasBankEu } from '../../../../lib/audio';

const M = expManifest as Record<string, string>;
const k = (t: string) => t.trim().normalize('NFC');
const isBrowser = typeof window !== 'undefined';
const VOICE_PREF_KEY = 'euskera-static.exp.voice';

export const voiceOn = writable<boolean>(
  isBrowser ? localStorage.getItem(VOICE_PREF_KEY) !== '0' : true,
);
voiceOn.subscribe((v) => {
  if (isBrowser) {
    try { localStorage.setItem(VOICE_PREF_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  }
});

let current: HTMLAudioElement | null = null;

export function stopVoice() {
  current?.pause();
  current = null;
}

export function hasVoice(text: string): boolean {
  return !!M[k(text)] || hasBankEu(text);
}

/** Reproduce la frase del guion (o del banco de lecciones). false si no hay clip. */
export function playVoice(text: string): boolean {
  const f = M[k(text)];
  if (f) {
    current?.pause();
    current = new Audio(`/audio/exp/${f}`);
    current.play().catch(() => {});
    return true;
  }
  return playBankEu(text);
}
