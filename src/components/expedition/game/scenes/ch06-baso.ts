import type { Scene } from '../engine/types';

// Capítulo 6 — Iparraldeko basoa. Nivel B2/C1. Basajaun en el bosque.

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
    { type: 'enter-actor', actor: { id: 'basajaun', spriteId: 'basajaun', x: 60, y: 65, scale: 2.6 } },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Ez nazazu galdetu. Entzun.',
      es: 'No me preguntes. Escucha.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Basajaun',
      spriteId: 'basajaun',
      eu: 'Hizkuntzak ez dira saretu daitezkeen sareak. Sareak baino zaharrak dira. Mendi hau bezain zaharrak.',
      es: 'Las lenguas no son redes que se puedan tejer. Son más antiguas que las redes. Tan antiguas como esta montaña.',
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
      type: 'puzzle',
      puzzle: {
        type: 'multiple-choice',
        prompt: 'Basajaun te pone a prueba con un conector avanzado. ¿Cuál encaja en: "Hitz Beltza ez da indartsua, ___, isila baizik"?',
        options: [
          'beraz',
          'aldiz',
          'hots',
          'baina',
        ],
        correctIndex: 3,
        explainCorrect: '"Baina" introduce contraste: no es fuerte, sino silencioso. La estructura "ez da X, ___, Y baizik" cierra con "baina" o "ezpada" en registro alto.',
      },
      onSuccess: 'after-puzzle',
    },
    { type: 'label', id: 'after-puzzle' },
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
