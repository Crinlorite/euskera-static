import type { Scene } from '../engine/types';

// Capítulo 5 — Gasteizko Plaza Berria. Nivel B2. Encuentro formal:
// el registro de los nombres borrados y el peso de la cortesía (zuka).

export const sceneGasteiz: Scene = {
  id: 'ch05-gasteiz',
  chapter: 5,
  title: 'Gasteizko Plaza Berria',
  subtitle: 'El abuelo del registro',
  level: 'b2',
  bgId: 'gasteizko-plaza',
  intro: {
    title: 'Gasteizko Plaza Berria',
    subtitle: 'Capítulo 5 · El centro institucional',
    body:
      'Plaza Berria. Soportales largos, palomas, columnas. Aquí vive el viejo Patxi, antiguo funcionario y amigo de aitona. Cuida el archivo donde están guardados los nombres que el franquismo intentó borrar.\n\nNo te recibirá si no le hablas con respeto.',
  },
  playable: true,
  beats: [
    { type: 'enter-actor', actor: { id: 'aitonajaun', spriteId: 'aitonajaun', x: 50, y: 65, scale: 2 } },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Sartu. Zenbat denbora pasa den, Anderren biloba.',
      es: 'Pasa. Cuánto tiempo, nieto/a de Ander.',
      emotion: 'neutral',
    },
    {
      type: 'choice',
      prompt: '¿Cómo te diriges a él?',
      options: [
        { label: '"Egun on, Patxi jauna. Eskerrik asko ni hartzeagatik." (Buenos días, señor Patxi. Gracias por recibirme.)', gotoLabel: 'greet-formal' },
        { label: '"Kaixo, Patxi! Zer moduz?" (¡Hola, Patxi! ¿Qué tal?)', gotoLabel: 'greet-casual' },
      ],
    },
    { type: 'label', id: 'greet-formal' },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Ederki. Errespetuz hitz egiten dakizu. Zure aitonak ere horrela hitz egiten zuen, lekuak hala eskatzen zuenean.',
      es: 'Bien. Sabes hablar con respeto. Tu abuelo también hablaba así, cuando el lugar lo pedía.',
      emotion: 'happy',
    },
    { type: 'goto-label', label: 'after-greet' },
    { type: 'label', id: 'greet-casual' },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Hemen, gazte, erregistroaren aurrean, zuka eta astiro. Ez da zorroztasuna: errespetua da.',
      es: 'Aquí, joven, delante del registro, de usted y despacio. No es rigidez: es respeto.',
      emotion: 'neutral',
    },
    { type: 'label', id: 'after-greet' },
    {
      type: 'gain-word',
      word: { eu: 'erregistroa', es: 'el registro', level: 'b2', context: 'Erregistroa hementxe gordetzen dut.' },
    },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Erregistroa hementxe gordetzen dut. Anderren izena ere bada, baina ez da nahikoa.',
      es: 'El registro lo guardo aquí mismo. El nombre de Ander también está, pero no es suficiente.',
      emotion: 'sad',
    },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Garai batean, izen hauek idaztea bera debekatuta zegoen. Isilean gorde genituen, inork ezabatu ez zitzan.',
      es: 'En su tiempo, escribir estos nombres estaba prohibido. Los guardamos en silencio, para que nadie los borrara.',
      emotion: 'sad',
    },
    {
      type: 'gain-word',
      word: { eu: 'ezabatu', es: 'borrar', level: 'b2', context: 'Izenak gorde genituen, inork ezabatu ez zitzan.' },
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'fill-in',
        prompt: 'Pídele ver lo que escribió aitona — con la cortesía que exige el lugar ("quisiera ver…").',
        before: 'Hark idatzitakoa ikusi ',
        after: ', mesedez.',
        accept: ['nahiko nuke', 'nahi nuke'],
        hint: 'condicional de cortesía: nahi + -ko + nuke',
      },
    },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Hark idatzitako zerbait erakutsiko dizut. Iritzi bat zen, garai hartan ezin idatzizkoa.',
      es: 'Te enseñaré algo que él escribió. Era una opinión, en aquellos tiempos imposible de escribir.',
      emotion: 'mystic',
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'comprehension',
        prompt: 'Lee este fragmento del archivo de aitona y responde.',
        passageEu:
          'Hizkuntza bat hiltzeak ez du esan nahi liburuak desagertzen direnik. Liburuak existitzen jarraitzen dute apaletan, hauts artean. Hil egiten dena ez da liburua: hizkuntza horretan irudikatzeko gaitasuna da. Pentsatzeko modu bat. Hori galtzen denean, behin betiko galtzen da.',
        passageEs:
          'Que muera una lengua no significa que desaparezcan los libros. Los libros siguen existiendo en las estanterías, entre el polvo. Lo que muere no es el libro: es la capacidad de imaginar en esa lengua. Una manera de pensar. Cuando eso se pierde, se pierde para siempre.',
        question: 'Según el texto, ¿qué se pierde cuando muere una lengua?',
        options: [
          'Los libros escritos en ella.',
          'La forma de pensar que esa lengua permite.',
          'La identidad nacional del territorio.',
          'Las costumbres culinarias asociadas.',
        ],
        correctIndex: 1,
        explainCorrect: 'El texto dice "una manera de pensar" — eso es lo irrecuperable.',
      },
      onSuccess: 'after-comp',
    },
    { type: 'label', id: 'after-comp' },
    {
      type: 'gain-word',
      word: { eu: 'oroimena', es: 'la memoria', level: 'b2', context: 'Hizkuntza bat galtzen denean, oroimen oso bat galtzen da.' },
    },
    {
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Ulertu duzu. Orduan, prest zaude hurrengo helbiderako. Iparraldea. Basoa.',
      es: 'Lo has entendido. Entonces estás listo para la siguiente dirección. El Norte. El bosque.',
      emotion: 'mystic',
    },
    {
      type: 'gain-item',
      item: { id: 'page-gasteiz', name: 'Página del archivo', description: 'Un fragmento sobre la pérdida y la memoria. Pesa más que las anteriores.', icon: '📄' },
    },
    { type: 'leave-actor', actorId: 'aitonajaun' },
    { type: 'goto-scene', scene: 'ch06-baso' },
  ],
};
