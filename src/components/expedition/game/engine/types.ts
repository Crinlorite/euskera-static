// Tipos del engine de aventura gráfica "Aitonaren Hitzak".
// Una escena es un screenplay: lista ordenada de beats que el jugador
// avanza con clicks y elecciones. Algunos beats ramifican (choice/puzzle).

export type CefrLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'ega';

export interface WordCard {
  eu: string;
  es: string;
  level: CefrLevel;
  context?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji o sprite id
}

// ---------- Puzzles ----------

export interface PuzzleMC {
  type: 'multiple-choice';
  prompt: string;
  promptEu?: string;
  options: string[];
  correctIndex: number;
  explainCorrect?: string;
  explainWrong?: string;
}

export interface PuzzleFill {
  type: 'fill-in';
  prompt: string;
  before: string;
  after: string;
  accept: string[]; // strings aceptables (case-insensitive, trimmed)
  hint?: string;
}

export interface PuzzleOrder {
  type: 'order-words';
  prompt: string;
  words: string[]; // shuffled to player
  correctOrder: number[]; // indices into words[] in correct order
}

export interface PuzzleMatch {
  type: 'match-pairs';
  prompt: string;
  pairs: Array<{ left: string; right: string }>;
}

export interface PuzzleWrite {
  type: 'free-write';
  prompt: string;
  minWords: number;
  maxWords?: number;
  mustContain?: string[]; // raíces o palabras requeridas
  acceptableExamples?: string[]; // ejemplos válidos para feedback
}

export interface PuzzleListen {
  type: 'comprehension';
  prompt: string;
  passageEu: string;
  passageEs?: string; // opcional, traducción
  question: string;
  options: string[];
  correctIndex: number;
  explainCorrect?: string;
  explainWrong?: string;
}

export type Puzzle =
  | PuzzleMC
  | PuzzleFill
  | PuzzleOrder
  | PuzzleMatch
  | PuzzleWrite
  | PuzzleListen;

// ---------- Beats ----------

export interface Choice {
  label: string;
  /** salta a label dentro de la escena */
  gotoLabel?: string;
  /** salta directo a otra escena */
  gotoScene?: string;
  /** efectos colaterales del beat */
  effect?: BeatEffect;
}

export interface BeatEffect {
  flag?: string; // setea flag en story
  removeFlag?: string;
  unlockChapter?: string; // marca capítulo desbloqueado
}

export type Beat =
  | { type: 'narration'; id?: string; text: string }
  | {
      type: 'speak';
      id?: string;
      speaker: string;
      spriteId: string;
      eu: string;
      es: string;
      emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'mystic';
    }
  | {
      type: 'choice';
      id?: string;
      prompt: string;
      options: Choice[];
    }
  | {
      type: 'puzzle';
      id?: string;
      puzzle: Puzzle;
      onSuccess?: string; // label
      onFailure?: string; // label (si null, deja reintentar)
    }
  | {
      type: 'gain-item';
      id?: string;
      item: Item;
      flavor?: string;
    }
  | {
      type: 'gain-word';
      id?: string;
      word: WordCard;
      flavor?: string;
    }
  | {
      type: 'set-bg';
      id?: string;
      bgId: string;
    }
  | {
      type: 'enter-actor';
      id?: string;
      actor: ActorPlacement;
    }
  | {
      type: 'leave-actor';
      id?: string;
      actorId: string;
    }
  | {
      type: 'flag';
      id?: string;
      flag: string;
      value?: boolean;
    }
  | {
      type: 'goto-scene';
      id?: string;
      scene: string;
    }
  | {
      type: 'goto-label';
      id?: string;
      label: string;
    }
  | {
      type: 'ending';
      id?: string;
      title: string;
      body: string;
    }
  | {
      type: 'label';
      id: string;
    }
  | {
      type: 'pause';
      id?: string;
      ms: number;
    };

export interface ActorPlacement {
  id: string;
  spriteId: string;
  x: number; // 0-100 % del viewport
  y: number;
  scale?: number;
  flip?: boolean;
}

// ---------- Scene ----------

export interface Scene {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  level: CefrLevel;
  bgId: string;
  /** narración inicial mostrada en chapter intro */
  intro?: { title: string; subtitle: string; body: string };
  beats: Beat[];
  /** marca de "playable now" — los placeholder devuelven false */
  playable: boolean;
}

// ---------- Story state ----------

export interface StoryState {
  cursor: number; // índice actual en beats[]
  currentSceneId: string;
  inventory: Item[];
  notebook: WordCard[];
  flags: Record<string, boolean>;
  /** progreso por escena */
  progress: Record<string, 'unvisited' | 'in-progress' | 'completed'>;
  /** actor placements en la escena actual */
  actors: Record<string, ActorPlacement>;
  /** background actual (override del scene.bgId) */
  bgOverride: string | null;
  /** ts de última partida */
  lastSavedAt?: string;
}

export const STORAGE_KEY_GAME = 'euskera-static.expedicion.game.v1';

export function emptyStoryState(): StoryState {
  return {
    cursor: 0,
    currentSceneId: 'ch01-etxea',
    inventory: [],
    notebook: [],
    flags: {},
    progress: {},
    actors: {},
    bgOverride: null,
  };
}
