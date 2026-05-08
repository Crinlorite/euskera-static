// Registro central de escenas. Cada capítulo exporta un Scene completo.

import type { Scene } from '../engine/types';
import { sceneEtxea } from './ch01-etxea';
import { sceneDonostia } from './ch02-donostia';
import { sceneAnboto } from './ch03-anboto';
import { sceneBilbao } from './ch04-bilbao';
import { sceneGasteiz } from './ch05-gasteiz';
import { sceneBaso } from './ch06-baso';
import { sceneSugaar } from './ch07-sugaar';
import { sceneFinala } from './ch08-finala';

const REGISTRY: Record<string, Scene> = {
  [sceneEtxea.id]: sceneEtxea,
  [sceneDonostia.id]: sceneDonostia,
  [sceneAnboto.id]: sceneAnboto,
  [sceneBilbao.id]: sceneBilbao,
  [sceneGasteiz.id]: sceneGasteiz,
  [sceneBaso.id]: sceneBaso,
  [sceneSugaar.id]: sceneSugaar,
  [sceneFinala.id]: sceneFinala,
};

export function getScene(id: string): Scene | undefined {
  return REGISTRY[id];
}

export function getAllScenes(): Scene[] {
  return Object.values(REGISTRY);
}

export const FIRST_SCENE_ID = sceneEtxea.id;
