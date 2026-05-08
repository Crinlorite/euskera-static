import type { Scene } from '../engine/types';

// Capítulo 4 — Bilboko itsasportua. Nivel B1. Ciudad moderna.
// Versión teaser: 1 NPC + 1 puzzle + transición.

export const sceneBilbao: Scene = {
  id: 'ch04-bilbao',
  chapter: 4,
  title: 'Bilboko itsasportua',
  subtitle: 'La ciudad que come humo',
  level: 'b1',
  bgId: 'bilboko-itsasportua',
  intro: {
    title: 'Bilboko itsasportua',
    subtitle: 'Capítulo 4 · El puerto industrial',
    body:
      'La ría huele a metal y a aceite. Las grúas se mueven como animales lentos. Mari te dijo que aquí la Palabra Negra tiene fuerza, y lo notas: a tu alrededor, casi nadie habla euskera.\n\nUn camarero joven de un bar de pintxos te mira como si supiera quién eres.',
  },
  playable: true,
  beats: [
    { type: 'narration', text: 'Bar Pintxonek. Olor a vino joven y boquerón en vinagre. Música de radio en castellano.' },
    { type: 'enter-actor', actor: { id: 'pintxonek', spriteId: 'pintxonek', x: 55, y: 65, scale: 2 } },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Aupa. Zer hartuko duzu?',
      es: '¿Qué pasa? ¿Qué tomarás?',
      emotion: 'neutral',
    },
    {
      type: 'speak',
      speaker: 'Tú',
      spriteId: 'biloba',
      eu: 'Pintxo bat eta esnedun kafe bat, mesedez.',
      es: 'Un pincho y un café con leche, por favor.',
      emotion: 'neutral',
    },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Aspaldikoa zaude euskaraz, ezta? Lehen aldia? Hala dirudi.',
      es: 'Llevas tiempo sin euskera, ¿no? ¿Primera vez? Lo parece.',
      emotion: 'happy',
    },
    {
      type: 'choice',
      prompt: 'Te ofrece consejo. ¿Cómo respondes?',
      options: [
        { label: '"Bai, ikasten ari naiz. Aitonarengatik."', gotoLabel: 'because-grandpa' },
        { label: '"Ez dakit zenbat denbora behar dudan."', gotoLabel: 'unsure-time' },
      ],
    },
    { type: 'label', id: 'because-grandpa' },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Aitonengatik? Hori da motiborik onena.',
      es: '¿Por el abuelo? Ese es el mejor motivo.',
      emotion: 'happy',
    },
    { type: 'goto-label', label: 'continue-bar' },
    { type: 'label', id: 'unsure-time' },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Inork ez daki. Hizkuntza bat bizitza osoko bidaia da.',
      es: 'Nadie lo sabe. Una lengua es un viaje de toda la vida.',
      emotion: 'neutral',
    },
    { type: 'label', id: 'continue-bar' },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Aitonak gauza bat eskatu zidan: zerbait kontatzea zatozenean. Aditza astintzen.',
      es: 'El abuelo me pidió una cosa: contarte algo cuando vinieras. Sacudirte el verbo.',
      emotion: 'mystic',
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'order-words',
        prompt: 'Pasado: "Ayer comí pintxos en este bar."',
        words: ['atzo', 'jan', 'taberna', 'nituen', 'pintxoak', 'honetan'],
        correctOrder: [0, 4, 1, 3, 2, 5],
      },
      onSuccess: 'after-pasado',
    },
    { type: 'label', id: 'after-pasado' },
    {
      type: 'gain-word',
      word: { eu: 'atzo', es: 'ayer', level: 'a2' },
    },
    {
      type: 'gain-word',
      word: { eu: 'jan nituen', es: 'comí (ellos, NOR-NORK pasado)', level: 'b1' },
    },
    {
      type: 'speak',
      speaker: 'Hodei',
      spriteId: 'pintxonek',
      eu: 'Hori da. Iraganaldia barneratzen ari zara. Hurrengo geltokia: Gasteiz. Plaza Berria.',
      es: 'Eso es. Estás interiorizando el pasado. Próxima parada: Gasteiz. Plaza Berria.',
      emotion: 'happy',
    },
    {
      type: 'gain-item',
      item: { id: 'page-bilbao', name: 'Página del puerto', description: 'Una hoja sobre los oficios y el ritmo del trabajo.', icon: '📄' },
    },
    { type: 'leave-actor', actorId: 'pintxonek' },
    { type: 'narration', text: 'Pagas el pintxo, sales del bar. La ciudad ya es otra, no por la ciudad sino por ti.' },
    { type: 'goto-scene', scene: 'ch05-gasteiz' },
  ],
};
