import type { Scene } from '../engine/types';

// Capítulo 6 — Iparraldeko basoa. Nivel B2/C1. Basajaun en el bosque:
// la lección es pragmática — aquí se escucha, no se pregunta.

export const sceneBaso: Scene = {
  id: 'ch06-baso',
  chapter: 6,
  title: 'Iparraldeko basoa',
  subtitle: 'El señor del bosque',
  level: 'b2',
  bgId: 'iparraldeko-basoa',
  intro: {
    title: 'Iparraldeko basoa',
    subtitle: 'Capítulo 6 · El bosque del Norte',
    body:
      'Cruzas la frontera. La luz cambia. El bosque de Iparralde es más oscuro y huele distinto. Aquí, te ha dicho aitona, vive Basajaun — el señor de los árboles, el primer pastor.\n\nNo se le pregunta. Se le escucha.',
  },
  playable: true,
  beats: [
    { type: 'narration', text: 'No oyes pájaros. Y eso, dice el saber popular, es señal de que él está cerca.' },
    { type: 'narration', text: 'Caminas despacio. Cada paso suena demasiado fuerte. Entre dos hayas, algo enorme se mueve sin hacer ruido.' },
    { type: 'enter-actor', actor: { id: 'basajaun', spriteId: 'basajaun', x: 60, y: 65, scale: 2.6 } },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Ez galdetu ezer. Entzun.',
      es: 'No preguntes nada. Escucha.',
      emotion: 'mystic',
    },
    {
      type: 'choice',
      prompt: '¿Qué haces?',
      options: [
        { label: 'Guardar silencio y esperar.', gotoLabel: 'silent' },
        { label: '"Barkatu, jauna… baina nor zara zu?" (Perdone, señor… pero ¿quién es usted?)', gotoLabel: 'asked' },
      ],
    },
    { type: 'label', id: 'asked' },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Esan dizut: entzun. Beste galdera bat, eta basoak bidea itxiko dizu.',
      es: 'Te lo he dicho: escucha. Una pregunta más, y el bosque te cerrará el camino.',
      emotion: 'angry',
    },
    { type: 'goto-label', label: 'listen' },
    { type: 'label', id: 'silent' },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Ondo. Isiltasuna ere hizkuntza da, eta zuk badakizu hartan hitz egiten.',
      es: 'Bien. El silencio también es una lengua, y tú sabes hablarla.',
      emotion: 'happy',
    },
    { type: 'label', id: 'listen' },
    {
      type: 'gain-word',
      word: { eu: 'isiltasuna', es: 'el silencio', level: 'b2', context: 'Isiltasuna ere hizkuntza da.' },
    },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Hizkuntzak ez dira gau batean ehundutako sareak. Sareak baino zaharragoak dira. Mendi hau bezain zaharrak.',
      es: 'Las lenguas no son redes tejidas en una noche. Son más antiguas que las redes. Tan antiguas como esta montaña.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Hitz Beltzak ez du borrokarik nahi. Ahaztearen poderioz hiltzen ditu hizkuntzak.',
      es: 'La Palabra Negra no quiere combate. Mata las lenguas a fuerza de olvido.',
      emotion: 'sad',
    },
    {
      type: 'gain-word',
      word: { eu: 'ahanztura', es: 'el olvido', level: 'c1', context: 'Ahanztura da Hitz Beltzaren arma bakarra.' },
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'multiple-choice',
        prompt: 'Basajaun te pone a prueba. Completa: "Hitz Beltza ez da indartsua, ___" (no es fuerte, sino silenciosa).',
        options: [
          'isila baizik',
          'isila ere bai',
          'isila arren',
          'isila beraz',
        ],
        correctIndex: 0,
        explainCorrect: 'La estructura "X ez da A, B baizik" = "no es A, sino B". *Baizik* va detrás del elemento que corrige.',
      },
      onSuccess: 'after-puzzle',
    },
    { type: 'label', id: 'after-puzzle' },
    {
      type: 'puzzle',
      puzzle: {
        type: 'fill-in',
        prompt: 'Repite la enseñanza de Basajaun: "Mata las lenguas a fuerza de olvido".',
        before: 'Ahaztearen ',
        after: ' hiltzen ditu hizkuntzak.',
        accept: ['poderioz'],
        hint: 'la has oído hace un momento: -aren poderioz = a fuerza de',
      },
    },
    {
      type: 'gain-word',
      word: { eu: 'oihartzuna', es: 'el eco', level: 'b2', context: 'Basoan, hitz bakoitzak oihartzuna uzten du.' },
    },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Ondo. Sugaarrengana joan zaitez orain. Lurpean dago. Hark zer egin behar duzun esango dizu.',
      es: 'Bien. Ve ahora a Sugaar. Está bajo tierra. Él te dirá qué tienes que hacer.',
      emotion: 'mystic',
    },
    {
      type: 'gain-item',
      item: { id: 'page-baso', name: 'Página del bosque', description: 'Aquí Basajaun ha tachado palabras enteras. Quedan las que importan.', icon: '📄' },
    },
    { type: 'leave-actor', actorId: 'basajaun' },
    { type: 'goto-scene', scene: 'ch07-sugaar' },
  ],
};
