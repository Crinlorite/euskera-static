// Datos del Modo Expedición (vista previa).
// Las zonas se desbloquean por progreso en A1: cuantas más lecciones lleves,
// más ciudades de Euskal Herria se abren a la exploración. En cada una hay
// un NPC con un mini-reto de vocabulario y una recompensa simbólica.

export interface Encounter {
  npcName: string;
  npcGreeting: { eu: string; es: string };
  challenge: string;
  options: string[];
  correctIndex: number;
  rewardLine: string;
  rewardWord: { eu: string; es: string };
}

export interface Zone {
  id: string;
  label: string;
  region: string;
  // Coordenadas en porcentaje sobre el viewBox del mapa (0-100).
  x: number;
  y: number;
  requiresLessons: number;
  encounter: Encounter;
}

export const ZONES: Zone[] = [
  {
    id: 'donostia',
    label: 'Donostia',
    region: 'Gipuzkoa',
    x: 58,
    y: 22,
    requiresLessons: 0,
    encounter: {
      npcName: 'Itsasoko marinela',
      npcGreeting: {
        eu: 'Kaixo! Egun on. Nor zara zu?',
        es: '¡Hola! Buenos días. ¿Quién eres tú?',
      },
      challenge: '¿Cómo te presentas correctamente?',
      options: [
        'Agur, ondo lo egin.',
        'Kaixo, ni Lide naiz.',
        'Ez dakit euskaraz, agur.',
        'Itsas usaina dago hemen.',
      ],
      correctIndex: 1,
      rewardLine: 'El marinero te asiente y te tiende un pin de la Concha.',
      rewardWord: { eu: 'itsasoa', es: 'el mar' },
    },
  },
  {
    id: 'bilbao',
    label: 'Bilbao',
    region: 'Bizkaia',
    x: 22,
    y: 26,
    requiresLessons: 3,
    encounter: {
      npcName: 'Pintxo-jangelako neska',
      npcGreeting: {
        eu: 'Egun on! Zer nahi duzu?',
        es: '¡Buenos días! ¿Qué deseas?',
      },
      challenge: 'Pides un café con leche, por favor.',
      options: [
        'Esnedun kafe bat, mesedez.',
        'Ez, eskerrik asko.',
        'Etxean nago, agur.',
        'Zer ordutan da bazkaria?',
      ],
      correctIndex: 0,
      rewardLine: 'La camarera sonríe y empuja un pintxo extra hacia ti.',
      rewardWord: { eu: 'pintxoa', es: 'el pincho' },
    },
  },
  {
    id: 'gasteiz',
    label: 'Gasteiz',
    region: 'Araba',
    x: 33,
    y: 56,
    requiresLessons: 8,
    encounter: {
      npcName: 'Plaza Berriko aitona',
      npcGreeting: {
        eu: 'Aupa! Nondik zatoz?',
        es: '¡Buenas! ¿De dónde vienes?',
      },
      challenge: 'Le respondes que vienes de Donostia.',
      options: [
        'Donostiatik nator.',
        'Donostiara noa.',
        'Donostian bizi naiz.',
        'Donostiarekin nago.',
      ],
      correctIndex: 0,
      rewardLine: 'El abuelo te indica con orgullo el camino al casco viejo.',
      rewardWord: { eu: 'plaza', es: 'la plaza' },
    },
  },
  {
    id: 'irunea',
    label: 'Iruñea',
    region: 'Nafarroa',
    x: 72,
    y: 50,
    requiresLessons: 14,
    encounter: {
      npcName: 'Festetako kuadrilla',
      npcGreeting: {
        eu: 'Kaixo lagun! Zer ordu da?',
        es: '¡Hola amigo! ¿Qué hora es?',
      },
      challenge: 'Le dices que son las ocho de la tarde.',
      options: [
        'Arratsaldeko zortziak dira.',
        'Goizeko zortziak dira.',
        'Eguerdiko hamabiak dira.',
        'Gauerdia da.',
      ],
      correctIndex: 0,
      rewardLine: 'La cuadrilla brinda contigo y te ofrece un pañuelo rojo.',
      rewardWord: { eu: 'jaiak', es: 'las fiestas' },
    },
  },
  {
    id: 'maule',
    label: 'Maule',
    region: 'Zuberoa',
    x: 92,
    y: 40,
    requiresLessons: 22,
    encounter: {
      npcName: 'Mendiko artzaina',
      npcGreeting: {
        eu: 'Egun on! Hotza al duzu?',
        es: '¡Buenos días! ¿Tienes frío?',
      },
      challenge: 'Le respondes que sí, mucho frío.',
      options: [
        'Bai, hotz handia dut.',
        'Ez, bero nago.',
        'Bai, gose naiz.',
        'Ez dakit, agur.',
      ],
      correctIndex: 0,
      rewardLine: 'El pastor te ofrece un trozo de queso de oveja, todavía templado.',
      rewardWord: { eu: 'mendia', es: 'la montaña' },
    },
  },
];

export const STORAGE_KEY_VISITS = 'euskera-static.expedicion.visits.v1';

export function loadVisits(): Record<string, true> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, true>;
  } catch {
    return {};
  }
}

export function saveVisit(zoneId: string) {
  try {
    const cur = loadVisits();
    cur[zoneId] = true;
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(cur));
  } catch {
    /* noop */
  }
}

import { getProgress } from '../../stores/progress';

export function countA1Lessons(): number {
  const p = getProgress();
  return Object.keys(p.lessons).filter((k) => k.startsWith('a1-')).length;
}
