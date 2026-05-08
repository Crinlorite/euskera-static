import type { Scene } from '../engine/types';

// Capítulo 7 — Sugaarren galeria. Nivel C1. Última parada antes del final.

export const sceneSugaar: Scene = {
  id: 'ch07-sugaar',
  chapter: 7,
  title: 'Sugaarren galeria',
  subtitle: 'La galería del consorte de Mari',
  level: 'c1',
  bgId: 'sugaar-galeria',
  intro: {
    title: 'Sugaarren galeria',
    subtitle: 'Capítulo 7 · Bajo tierra',
    body:
      'Bajas por una grieta estrecha. La piedra está caliente. Sugaar — la serpiente de fuego, consorte de Mari — vive en una galería profunda donde se quema el aire.\n\nEs el último que verás antes del final. Y es el único que te dirá cómo hablar a Hitz Beltza.',
  },
  playable: true,
  beats: [
    { type: 'narration', text: 'El calor sube. La galería brilla como una herrería natural. En el fondo, una figura larga, de piel oscura y ojos de oro fundido.' },
    { type: 'enter-actor', actor: { id: 'sugaar', spriteId: 'sugaar', x: 55, y: 65, scale: 2.6 } },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Iritsi zara, azkenean. Aitona Anderren bidearen amaiera dago zure begien aurrean.',
      es: 'Has llegado, finalmente. El final del camino del abuelo Ander está delante de tus ojos.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Hitz Beltzaren aurrean, gauza bakar bat egin dezakezu: hitz egin. Etenik gabe. Indarrez.',
      es: 'Frente a la Palabra Negra, solo puedes hacer una cosa: hablar. Sin parar. Con fuerza.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Baina hitz egin behar duzu zergatiarekin, ez bakarrik formekin. Ulertzen?',
      es: 'Pero tienes que hablar con un porqué, no solo con formas. ¿Lo entiendes?',
      emotion: 'neutral',
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'comprehension',
        prompt: 'Sugaar te enseña una idea de los antiguos. Léela.',
        passageEu:
          'Hizkuntza bakoitzak ahaztu ezin den ikuspegi bat dakar. Hizkuntza bat galtzen bada, ez da hitz multzo bat soilik desagertzen: galaxia oso bat itzaltzen da. Eta galaxia hori berreskuratzea ezinezkoa da, zeren eta zerumugaren beste aldera doazen izarrek ez baitute itzulerarik.',
        passageEs:
          'Cada lengua trae consigo una mirada que no puede olvidarse. Si una lengua se pierde, no desaparece solo un conjunto de palabras: se apaga toda una galaxia. Y recuperar esa galaxia es imposible, porque las estrellas que cruzan el horizonte no tienen vuelta.',
        question: '¿Qué metáfora usa el texto para describir la pérdida de una lengua?',
        options: [
          'Un libro quemado.',
          'Una galaxia que se apaga.',
          'Un río que se seca.',
          'Una herida que cicatriza.',
        ],
        correctIndex: 1,
        explainCorrect: 'La metáfora central es astronómica: una galaxia se apaga y las estrellas no vuelven.',
      },
      onSuccess: 'after-comp',
    },
    { type: 'label', id: 'after-comp' },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Ulertzen duzu. Orain, hartu liburuko azken orria. Bertan zaude zu, idatziak.',
      es: 'Lo entiendes. Ahora coge la última hoja del libro. En ella estás escrito tú.',
      emotion: 'mystic',
    },
    {
      type: 'gain-item',
      item: { id: 'page-sugaar', name: 'Última página del libro', description: 'Está en blanco. La rellenarás tú al final, con tus palabras.', icon: '📄' },
    },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Joan. Hitz Beltza zain dago. Ez du hiri ezer egingo orain arte. Arrazoi bakar batengatik.',
      es: 'Vete. La Palabra Negra te espera. No te ha hecho nada hasta ahora. Por una sola razón.',
      emotion: 'sad',
    },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Ez zinelako oraindik mehatxua. Orain bazara.',
      es: 'Porque no eras todavía una amenaza. Ahora sí.',
      emotion: 'mystic',
    },
    { type: 'leave-actor', actorId: 'sugaar' },
    { type: 'goto-scene', scene: 'ch08-finala' },
  ],
};
