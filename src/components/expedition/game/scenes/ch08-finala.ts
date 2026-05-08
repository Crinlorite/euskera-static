import type { Scene } from '../engine/types';

// Capítulo 8 — Hitz Beltzaren aurpegia. El final.
// Boss multi-etapa: comprensión C1 + cohesión + escritura libre + discurso.
// El jefe no se "derrota": se le habla. El final cambia según las elecciones.

export const sceneFinala: Scene = {
  id: 'ch08-finala',
  chapter: 8,
  title: 'Hitz Beltzaren aurpegia',
  subtitle: 'El rostro de la Palabra Negra',
  level: 'ega',
  bgId: 'hitzbeltz-finala',
  intro: {
    title: 'Hitz Beltzaren aurpegia',
    subtitle: 'Capítulo 8 · El silencio',
    body:
      'Has subido tres montes, cruzado dos fronteras y bajado a una galería. El último lugar no aparece en el mapa: es una sala sin paredes donde el aire pesa.\n\nFrente a ti, una figura sin contorno. No te mira: no necesita ojos. Esta vez no hay puzzle de calentamiento. Hay un examen.\n\nLo que escribas y elijas aquí decide si el Fuego de la Palabra sigue ardiendo.',
  },
  playable: true,
  beats: [
    { type: 'narration', text: 'No hay suelo. Hay una superficie que actúa como suelo. No hay luz: hay una idea de luz proyectada en algún sitio.' },
    { type: 'enter-actor', actor: { id: 'hitzbeltz', spriteId: 'hitzbeltz', x: 50, y: 60, scale: 3 } },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: '...',
      es: '... (no habla. Espera.)',
      emotion: 'mystic',
    },
    { type: 'narration', text: 'No habla. Te enfrenta con una pregunta sin palabras.' },
    {
      type: 'speak',
      speaker: 'Aitonaren ahotsa (memoria)',
      spriteId: 'aitona',
      eu: 'Hizkuntza ez da galtzen, biloba: utzia da. Pertsona bakoitzak erabakitzen du.',
      es: 'Una lengua no se pierde, nieto: se abandona. Cada persona decide.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Aitonaren ahotsa',
      spriteId: 'aitona',
      eu: 'Lau froga jasango dituzu. Ez du iraingo. Ez du gezurrik egingo. Baina ahaztea proposatuko dizu.',
      es: 'Pasarás cuatro pruebas. No te ofenderá. No te mentirá. Pero te propondrá olvidar.',
      emotion: 'sad',
    },

    // ============= ETAPA 1: COMPRENSIÓN AVANZADA =============
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Lehen froga: irakurri eta uler ezazu. Hori egiten ez badakizu, ez dago hizkuntzarik defendatzeko.',
      es: 'Primera prueba: lee y comprende. Si no sabes hacerlo, no hay lengua que defender.',
      emotion: 'mystic',
    },
    {
      type: 'puzzle',
      puzzle: {
        type: 'comprehension',
        prompt: 'Lee el siguiente fragmento y responde.',
        passageEu:
          'Hizkuntza gutxituen bidegurutzeak iraupenezkoak izan ohi dira. Ez dute hil-eguna mugatu bezala. Aldiz, urtero pixka bat estutzen den bide bat bezala bizi dira: oraindik ibilgarria, baina geroz eta zailagoa belaunaldi berrientzat. Eta krisi-une bakoitzean, hiztun batek erabakia hartzen du: aurrerapauso bat egin, ala atzera egin. Erabaki horiek dira hizkuntzaren benetako biziraupena.',
        passageEs:
          'Las encrucijadas de las lenguas minorizadas suelen ser de duración. No tienen un día fijo de muerte. Más bien viven como un camino que se estrecha cada año un poco: aún transitable, pero cada vez más difícil para las nuevas generaciones. Y en cada momento de crisis, un hablante toma una decisión: dar un paso adelante, o retroceder. Esas decisiones son la verdadera supervivencia de la lengua.',
        question: 'Según el texto, la supervivencia de una lengua minoritaria depende fundamentalmente de:',
        options: [
          'Que se decrete su día de muerte oficial.',
          'Las decisiones cotidianas que toman los hablantes en cada momento de presión.',
          'Que las nuevas generaciones la rechacen explícitamente.',
          'La política institucional únicamente.',
        ],
        correctIndex: 1,
        explainCorrect: 'El texto subraya que la supervivencia se juega en las microdecisiones de cada hablante en momentos concretos de presión.',
      },
      onSuccess: 'stage-2',
    },
    { type: 'label', id: 'stage-2' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Ondo. Bigarren froga: kohesioa. Hizkuntza ez da hitzak, hitzen arteko lokarriak baizik.',
      es: 'Bien. Segunda prueba: cohesión. Una lengua no son las palabras, sino los vínculos entre las palabras.',
      emotion: 'mystic',
    },

    // ============= ETAPA 2: ORDEN COMPLEJO =============
    {
      type: 'puzzle',
      puzzle: {
        type: 'order-words',
        prompt: 'Construye una frase coherente: "Aunque el camino sea difícil, no podemos dejar de andarlo."',
        words: ['ezin', 'utzi', 'dezakegu', 'zaila', 'bidea', 'bada', 'ere,', 'ibiltzeari'],
        correctOrder: [4, 3, 5, 6, 7, 0, 2, 1],
      },
      onSuccess: 'stage-3',
    },
    { type: 'label', id: 'stage-3' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Ondo, berriro. Hirugarren froga: idatzi. Hizkuntza idazten ez bada, ahaztua da.',
      es: 'Bien, de nuevo. Tercera prueba: escribe. Una lengua que no se escribe está olvidada.',
      emotion: 'sad',
    },

    // ============= ETAPA 3: ESCRITURA LIBRE =============
    {
      type: 'puzzle',
      puzzle: {
        type: 'free-write',
        prompt:
          'Escribe en euskera por qué quieres que esta lengua siga viva. Mínimo 20 palabras. Tienes que usar las palabras: hizkuntza, biloba, hitzak.',
        minWords: 20,
        maxWords: 100,
        mustContain: ['hizkuntza', 'biloba', 'hitzak'],
        acceptableExamples: [
          'Hizkuntza honek bizirik iraun behar du. Biloba bezala, ezin dut ahaztu aitonak utzitako hitzak. Hizkuntzak nire memoria dira eta ez ditut galduko.',
          'Niretzat hizkuntza hau familia da. Aitonaren biloba naizen bezala, hitzak ere niretik datoz. Iraun behar du.',
        ],
      },
      onSuccess: 'stage-4',
    },
    { type: 'label', id: 'stage-4' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Ondo. Eta orain, azken froga. Erabaki bat. Hau da garrantzitsuena.',
      es: 'Bien. Y ahora, la última prueba. Una decisión. Esta es la importante.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Hiru aukera dituzu. Ez dago erantzun zuzena. Hire benetako hitza nahi dut.',
      es: 'Tienes tres opciones. No hay respuesta correcta. Quiero tu palabra verdadera.',
      emotion: 'neutral',
    },

    // ============= ETAPA 4: DECISIÓN FINAL =============
    {
      type: 'choice',
      prompt: 'Hitz Beltza espera. Tu respuesta sella la historia.',
      options: [
        {
          label: '"Hizkuntza hau ez da nirea bakarrik. Beste askorena ere bada. Niri ez tokatzen erabakitzea."',
          gotoLabel: 'ending-collective',
          effect: { flag: 'ending_collective' },
        },
        {
          label: '"Hau aitonarena zen. Eta orain nirea da. Eta nik aukeratzen dut zaintzea."',
          gotoLabel: 'ending-personal',
          effect: { flag: 'ending_personal' },
        },
        {
          label: '"Ez dakit. Baina ez dut utzi nahi nik ulertu gabe. Nire bidean jarraituko dut."',
          gotoLabel: 'ending-honest',
          effect: { flag: 'ending_honest' },
        },
      ],
    },

    // ============= ENDING A: COLECTIVO =============
    { type: 'label', id: 'ending-collective' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Erantzun ona. Baina arrisku bat duzu: norberak ez badu erabakitzen, inork ez du erabakitzen.',
      es: 'Buena respuesta. Pero hay un riesgo: si nadie individual decide, nadie decide.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Aitonaren ahotsa',
      spriteId: 'aitona',
      eu: 'Egia da, biloba. Baina ez bakarrik. Komunitatea egia da, baina hitzak ezpainetan ditugu, banaka.',
      es: 'Es verdad, nieto. Pero no solo. La comunidad es verdad, pero las palabras las tenemos en los labios, una a una.',
      emotion: 'happy',
    },
    {
      type: 'ending',
      title: 'Final del colectivo',
      body:
        'Hitz Beltza no se desvanece, pero pierde forma. Su silueta se desdibuja como humo. Tú sales de la sala, y lo que sea que estaba allí ya no es lo que era.\n\nVuelves a la casa de aitona. Decides que la llave del archivo, el lauburu y el libro pasarán a un grupo de personas, no a una sola. Es una decisión de comunidad.\n\nLa última hoja del libro sigue casi en blanco — pero ahora hay un nombre escrito al pie: el tuyo, junto a otros que aún no conoces.',
    },

    // ============= ENDING B: PERSONAL =============
    { type: 'label', id: 'ending-personal' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Erabaki gogorra. Baina egiazkoa. Hitz horretan dago Anderren oinordeko izaera.',
      es: 'Decisión dura. Pero verdadera. En esa palabra está tu condición de heredero/a de Ander.',
      emotion: 'sad',
    },
    {
      type: 'speak',
      speaker: 'Aitonaren ahotsa',
      spriteId: 'aitona',
      eu: 'Hori da, biloba. Norberak hartu behar du erantzukizuna. Bakarka ez, baina norberak.',
      es: 'Eso es, nieto. Cada uno tiene que asumir la responsabilidad. No solo, pero personalmente.',
      emotion: 'happy',
    },
    {
      type: 'ending',
      title: 'Final personal',
      body:
        'Hitz Beltza se inclina, casi en respeto. Su contorno se afirma — pero ya no como amenaza, sino como compañero molesto del trabajo de mantener viva una lengua.\n\nVuelves a la casa de aitona y la conviertes en una pequeña biblioteca de hablantes. Cada persona que viene se lleva una palabra y deja otra escrita.\n\nLa última hoja del libro la rellenas tú. Empiezas con: "Nik aukeratu nuen."\n\n("Yo elegí.")',
    },

    // ============= ENDING C: HONESTO =============
    { type: 'label', id: 'ending-honest' },
    {
      type: 'speak',
      speaker: 'Hitz Beltza',
      spriteId: 'hitzbeltz',
      eu: 'Hori erantzunik zailena da: ez dakit. Baina aurrera segitzen dut. Egiazko hizkuntza-jokoaren oinarria.',
      es: 'Esa es la respuesta más difícil: no sé. Pero sigo adelante. La base del juego lingüístico real.',
      emotion: 'mystic',
    },
    {
      type: 'speak',
      speaker: 'Aitonaren ahotsa',
      spriteId: 'aitona',
      eu: 'Ondo erantzun duzu, biloba. Hizkuntza bat ikastea bizi guztiko bidaia da. Honaino iritsi bazara, ez zara galduko.',
      es: 'Has respondido bien, nieto. Aprender una lengua es un viaje de toda la vida. Si has llegado hasta aquí, no te perderás.',
      emotion: 'happy',
    },
    {
      type: 'ending',
      title: 'Final honesto',
      body:
        'Hitz Beltza desaparece como una marea baja, sin estruendo. Lo que quedó después es el aire frío del valle.\n\nVuelves al pueblo de aitona. La casa sigue allí. Coges el libro y la última hoja. La rellenas con preguntas, no con respuestas. Y dejas la casa abierta para quien venga después.\n\nTu nivel de euskera no es perfecto. Pero ya no se llamará nunca "olvidado".',
    },
  ],
};
