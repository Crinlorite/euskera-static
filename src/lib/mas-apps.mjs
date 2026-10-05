/**
 * «Más apps de Crintech»: el bloque del inicio que presenta las otras apps del
 * estudio (decisión de Crinlorite, 5-oct-2026, «opción A»).
 *
 * REGLA: nunca se nombra ni se enlaza una tienda que no sea la del dispositivo.
 * Kaixo es web y a la vez app de iOS y de Android; Apple (2.3.10) rechaza una
 * app que mencione otra plataforma. Por eso el destino no lo decide la página
 * sino el aparato:
 *
 *   iPhone / iPad (app o navegador)   App Store
 *   Android (app o navegador)         Google Play, y solo apps publicadas allí
 *   ordenador                         la web de cada app
 *
 * El HTML que sale del servidor lleva la web de cada app (neutra). Dentro de
 * las apps el bloque no se pinta hasta que el guion ha puesto el enlace bueno.
 */

export const APPS = [
  {
    id: 'aulixa',
    nombre: 'Aulixa',
    icono: '/apps/aulixa.png',
    web: 'https://aulixa.app/',
    appStore: 'id6782634156',
    play: 'com.crintechstudios.brainykidsacademy',
  },
  {
    id: 'aprenza',
    nombre: 'Aprenza',
    icono: '/apps/aprenza.png',
    web: 'https://aprenza.app/',
    appStore: 'id6786163224',
    // En Google Play está en prueba cerrada (5-oct-2026): la ficha pública da
    // 404, así que en Android esta tarjeta no sale. Poner el paquete
    // (pro.crintech.aprenza) el día que pase a producción.
    play: null,
  },
];

/**
 * Idiomas del sitio donde se enseña. Las dos apps siguen el currículo español
 * (Primaria y ESO) y están en castellano: a quien aprende euskera desde el
 * japonés no le dicen nada. Hay textos preparados para las lenguas de España;
 * activarlas es añadirlas aquí.
 */
export const LOCALES_ACTIVOS = ['es'];

/** [antetítulo, título sin la marca, entradilla, Aulixa, Aprenza] */
export const TEXTOS = {
  es: ['Del mismo estudio', 'Más apps de', 'Hechas con el mismo cuidado, para repasar en casa.', 'Repaso de Primaria', 'Estudio y exámenes de la ESO'],
  ca: ['Del mateix estudi', 'Més apps de', 'Fetes amb la mateixa cura, per repassar a casa.', 'Repàs de Primària', 'Estudi i exàmens de l’ESO'],
  gl: ['Do mesmo estudio', 'Máis apps de', 'Feitas co mesmo coidado, para repasar na casa.', 'Repaso de Primaria', 'Estudo e exames da ESO'],
  ast: ['Del mesmu estudiu', 'Más apps de', 'Feches col mesmu procuru, pa repasar en casa.', 'Repasu de Primaria', 'Estudiu y exámenes de la ESO'],
  an: ['D’o mesmo estudio', 'Más apps de', 'Feitas con o mesmo ficacio, ta repasar en casa.', 'Repaso de Primaria', 'Estudio y examens d’a ESO'],
  oc: ['Del meteis estudi', 'Mai d’apps de', 'Fachas amb lo meteis suenh, per repassar a l’ostal.', 'Repàs de Primària', 'Estudi e examens de l’ESO'],
};

export const seMuestraEn = (locale) => LOCALES_ACTIVOS.includes(locale) && !!TEXTOS[locale];

/**
 * 'ios' | 'android' | 'otro'. Manda el puente de la app (window.Kaixo.platform);
 * sin puente —navegador, o un binario antiguo— decide el aparato.
 */
export function dispositivoDe({ plataforma, ua = '', toques = 0 } = {}) {
  if (plataforma === 'ios' || plataforma === 'android') return plataforma;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  // El iPad se presenta como un Mac; lo delata la pantalla táctil.
  if (/Macintosh/.test(ua) && toques > 1) return 'ios';
  return 'otro';
}

/**
 * Enlace de una app para un dispositivo, o null si ahí no se puede ofrecer.
 * `pais` es el de la App Store (appstore.ts): sin país, Apple manda a EE. UU.
 */
export function enlaceDe(app, dispositivo, pais = 'es') {
  if (dispositivo === 'ios') return `https://apps.apple.com/${pais}/app/${app.appStore}`;
  if (dispositivo === 'android') {
    return app.play ? `https://play.google.com/store/apps/details?id=${app.play}` : null;
  }
  return app.web;
}

/**
 * ⛔ Los enlaces van LIMPIOS: sin `utm_*`, sin `referrer`, sin identificadores,
 * y Kaixo no cuenta los toques. La página de privacidad promete «sin analítica
 * ni tracking» y Crinlorite lo confirmó para este bloque (5-oct-2026). Si
 * convierte se mira en el destino con lo que cada tienda mide por su cuenta
 * (App Store Connect → «referente de app») y comparando antes y después.
 *
 * Línea para la página de privacidad, en los idiomas donde sale el bloque. No
 * nombra ninguna tienda: esa página también se ve dentro de las apps.
 */
export const AVISO_PRIVACIDAD = {
  es: '<strong>La tienda de aplicaciones de tu dispositivo, o la web de la app</strong>, únicamente si pulsas una de las tarjetas de «Más apps de Crintech» del inicio. Kaixo no registra ese toque ni añade ningún identificador al enlace.',
  ca: '<strong>La botiga d’aplicacions del teu dispositiu, o el web de l’app</strong>, únicament si prems una de les targetes de «Més apps de Crintech» de l’inici. Kaixo no registra aquest toc ni afegeix cap identificador a l’enllaç.',
  gl: '<strong>A tenda de aplicacións do teu dispositivo, ou a web da app</strong>, unicamente se premes unha das tarxetas de «Máis apps de Crintech» do inicio. Kaixo non rexistra ese toque nin engade ningún identificador á ligazón.',
};

/** Hasta que el bloque se active en un idioma sin aviso propio, vale el castellano. */
export const avisoPrivacidad = (locale) => (seMuestraEn(locale) ? AVISO_PRIVACIDAD[locale] ?? AVISO_PRIVACIDAD.es : null);
