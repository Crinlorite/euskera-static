export interface ExerciseResultEvent {
  exerciseId: string;
  score: number;
  finished: boolean;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
