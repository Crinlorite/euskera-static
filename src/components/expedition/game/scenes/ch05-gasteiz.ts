import type { Scene } from '../engine/types';

// Capítulo 5 — Gasteizko Plaza Berria. Nivel B2. Encuentro formal.

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
      type: 'speak',
      speaker: 'Patxi',
      spriteId: 'aitonajaun',
      eu: 'Ulertu duzu. Orduan zaude prest hurrengo helbiderako. Iparraldea. Basoa.',
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
