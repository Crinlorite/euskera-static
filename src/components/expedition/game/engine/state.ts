// Store central del juego. Svelte writable accesible desde todas las
// piezas presentacionales. La escena actual se obtiene via `getScene`
// del registry, y el cursor avanza con `advance` o salta con `gotoLabel`.

import { writable, derived, get } from 'svelte/store';
import type { Beat, Scene, StoryState, ActorPlacement, Item, WordCard, Choice } from './types';
import { emptyStoryState, STORAGE_KEY_GAME } from './types';
import { getScene } from '../scenes';

const isBrowser = typeof window !== 'undefined';

// ---------- internal helpers ----------

function loadFromStorage(): StoryState {
  if (!isBrowser) return emptyStoryState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME);
    if (!raw) return emptyStoryState();
    const parsed = JSON.parse(raw) as StoryState;
    // sanity check mínimo
    if (typeof parsed?.cursor !== 'number' || !parsed?.currentSceneId) {
      return emptyStoryState();
    }
    return { ...emptyStoryState(), ...parsed };
  } catch {
    return emptyStoryState();
  }
}

function saveToStorage(state: StoryState) {
  if (!isBrowser) return;
  try {
    state.lastSavedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ---------- store ----------

export const story = writable<StoryState>(emptyStoryState());

export function loadGame() {
  story.set(loadFromStorage());
}

export function saveGame() {
  saveToStorage(get(story));
}

export function newGame(startSceneId = 'ch01-etxea') {
  const fresh = emptyStoryState();
  fresh.currentSceneId = startSceneId;
  fresh.progress[startSceneId] = 'in-progress';
  story.set(fresh);
  saveToStorage(fresh);
}

export function resetGame() {
  if (isBrowser) localStorage.removeItem(STORAGE_KEY_GAME);
  story.set(emptyStoryState());
}

export function hasSave(): boolean {
  if (!isBrowser) return false;
  return !!localStorage.getItem(STORAGE_KEY_GAME);
}

// ---------- derived: current scene + current beat ----------

export const currentScene = derived(story, ($story): Scene | null => {
  return getScene($story.currentSceneId) ?? null;
});

export const currentBeat = derived(
  [story, currentScene],
  ([$story, $scene]): Beat | null => {
    if (!$scene) return null;
    return $scene.beats[$story.cursor] ?? null;
  },
);

// ---------- mutators ----------

/**
 * Avanza el cursor al siguiente beat. Si no hay más beats en la escena,
 * el caller decide qué hacer (típicamente esperar a un goto-scene final).
 */
export function advance() {
  story.update((s) => {
    const scene = getScene(s.currentSceneId);
    if (!scene) return s;
    const next = s.cursor + 1;
    if (next >= scene.beats.length) {
      // fin de escena sin goto explícito — quedamos atascados en el
      // último beat (debería ser un ending o goto-scene).
      return s;
    }
    return { ...s, cursor: next };
  });
  saveGame();
}

/** Salta a un label dentro de la escena actual. */
export function gotoLabel(label: string) {
  story.update((s) => {
    const scene = getScene(s.currentSceneId);
    if (!scene) return s;
    const idx = scene.beats.findIndex(
      (b) => (b.type === 'label' && b.id === label) || b.id === label,
    );
    if (idx < 0) return s;
    return { ...s, cursor: idx + 1 }; // saltar el label propio, ir al siguiente
  });
  saveGame();
}

/** Cambia de escena reseteando cursor a 0. */
export function gotoScene(sceneId: string) {
  story.update((s) => {
    const next = { ...s };
    next.progress[s.currentSceneId] = 'completed';
    next.currentSceneId = sceneId;
    next.cursor = 0;
    next.actors = {};
    next.bgOverride = null;
    next.progress[sceneId] = 'in-progress';
    return next;
  });
  saveGame();
}

export function applyChoice(c: Choice) {
  if (c.effect) {
    story.update((s) => {
      const next = { ...s };
      if (c.effect?.flag) next.flags = { ...next.flags, [c.effect.flag]: true };
      if (c.effect?.removeFlag) next.flags = { ...next.flags, [c.effect.removeFlag]: false };
      return next;
    });
  }
  if (c.gotoScene) {
    gotoScene(c.gotoScene);
  } else if (c.gotoLabel) {
    gotoLabel(c.gotoLabel);
  } else {
    advance();
  }
}

export function gainItem(item: Item) {
  story.update((s) => {
    if (s.inventory.find((i) => i.id === item.id)) return s;
    return { ...s, inventory: [...s.inventory, item] };
  });
  saveGame();
}

export function gainWord(word: WordCard) {
  story.update((s) => {
    if (s.notebook.find((w) => w.eu === word.eu)) return s;
    return { ...s, notebook: [...s.notebook, word] };
  });
  saveGame();
}

export function setFlag(flag: string, value = true) {
  story.update((s) => ({ ...s, flags: { ...s.flags, [flag]: value } }));
  saveGame();
}

export function setBackground(bgId: string | null) {
  story.update((s) => ({ ...s, bgOverride: bgId }));
}

export function enterActor(actor: ActorPlacement) {
  story.update((s) => ({ ...s, actors: { ...s.actors, [actor.id]: actor } }));
}

export function leaveActor(actorId: string) {
  story.update((s) => {
    const next = { ...s.actors };
    delete next[actorId];
    return { ...s, actors: next };
  });
}
