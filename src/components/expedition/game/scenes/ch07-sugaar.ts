import type { Scene } from '../engine/types';

// Capítulo 7 — Sugaarren galeria. Nivel C1. Última parada antes del final:
// una pregunta al consorte de Mari y la declaración del porqué.

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
      eu: 'Galdera bakarra erantzungo dizut. Aukeratu ondo.',
      es: 'Te responderé una sola pregunta. Elige bien.',
      emotion: 'neutral',
    },
    {
      type: 'choice',
      prompt: 'Puedes hacerle una sola pregunta.',
      options: [
        { label: '"Nor da Hitz Beltza, benetan?" (¿Quién es realmente la Palabra Negra?)', gotoLabel: 'q-beltza' },
        { label: '"Ezagutu al zenuen nire aitona?" (¿Conoció usted a mi abuelo?)', gotoLabel: 'q-aitona' },
        { label: '"Zergatik laguntzen didazue?" (¿Por qué me ayudáis?)', gotoLabel: 'q-zergatik' },
      ],
    },
    { type: 'label', id: 'q-beltza' },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Ez da inor. Horregatik da arriskutsua: ez dauka aurpegirik, ez izenik. Axolagabekeria hutsa da, beltzez jantzita.',
      es: 'No es nadie. Por eso es peligrosa: no tiene cara ni nombre. Es pura indiferencia, vestida de negro.',
      emotion: 'mystic',
    },
    { type: 'goto-label', label: 'after-q' },
    { type: 'label', id: 'q-aitona' },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Behin jaitsi zen hona, zu bezala. Galdera berberak zekartzan. Erantzunak, ordea, berak idatzi zituen.',
      es: 'Bajó aquí una vez, como tú. Traía las mismas preguntas. Las respuestas, en cambio, las escribió él.',
      emotion: 'sad',
    },
    { type: 'goto-label', label: 'after-q' },
    { type: 'label', id: 'q-zergatik' },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Gu ez gara existitzen hizkuntzarik gabe. Mari, Basajaun, ni neu… hitzek gordetzen gaituzte. Zuri lagunduz, geure burua zaintzen dugu.',
      es: 'Nosotros no existimos sin lengua. Mari, Basajaun, yo mismo… nos guardan las palabras. Ayudándote a ti, nos cuidamos a nosotros mismos.',
      emotion: 'neutral',
    },
    { type: 'label', id: 'after-q' },
    {
      type: 'gain-word',
      word: { eu: 'mehatxua', es: 'la amenaza', level: 'c1', context: 'Ez zinen oraindik mehatxua. Orain bazara.' },
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
      type: 'gain-word',
      word: { eu: 'zerumuga', es: 'el horizonte', level: 'c1', context: 'Zerumugaren beste aldera doazen izarrek ez dute itzulerarik.' },
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'free-write',
        prompt: 'Sugaar te mira fijo: "Esan ozen: zergatik ari zara euskara ikasten?" — Escríbelo en euskera, con tus palabras (mínimo 8).',
        minWords: 8,
        mustContain: ['euskara'],
        acceptableExamples: [
          'Euskara ikasten ari naiz aitonaren hitzak ulertu nahi ditudalako eta hizkuntza bizirik mantendu nahi dudalako.',
        ],
      },
    },
    {
      type: 'speak',
      speaker: 'Sugaar',
      spriteId: 'sugaar',
      eu: 'Ulertzen duzu. Orain, hartu liburuko azken orria. Bertan zaude zu, idatzita.',
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
      eu: 'Joan. Hitz Beltza zain duzu. Ez dizu ezer egin orain arte. Arrazoi bakar batengatik.',
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
