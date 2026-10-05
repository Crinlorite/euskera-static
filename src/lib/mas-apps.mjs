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
    // La app existe en castellano, inglés, rumano, chino y árabe (comprobado en
    // la App Store el 5-oct-2026). Las otras lenguas de España leen castellano.
    locales: ['es', 'ca', 'gl', 'ast', 'an', 'oc', 'en', 'ro', 'zh-Hans', 'ar'],
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
    // Solo en castellano y solo tiene sentido en España: es de la ESO.
    locales: ['es', 'ca', 'gl', 'ast', 'an', 'oc'],
  },
];

/**
 * Textos por idioma. Sale una tarjeta por cada app que exista para ese idioma
 * (`locales` de cada app); sin ninguna, no hay bloque. Francés, alemán,
 * italiano, portugués, ruso, polaco, japonés y coreano se quedan fuera: ninguna
 * de las dos apps está en esos idiomas y sería anunciar algo que no se puede leer.
 *
 * `antes` + Crintech + `despues` forman el título; en singular donde solo sale
 * una app. Las líneas de Aulixa en inglés, rumano, chino y árabe salen de su
 * propia ficha en cada tienda.
 */
export const TEXTOS = {
  es: { antetitulo: 'Del mismo estudio', antes: 'Más apps de', despues: '', entradilla: 'Hechas con el mismo cuidado, para repasar en casa.',
    apps: { aulixa: 'Repaso de Primaria', aprenza: 'Estudio y exámenes de la ESO' } },
  ca: { antetitulo: 'Del mateix estudi', antes: 'Més apps de', despues: '', entradilla: 'Fetes amb la mateixa cura, per repassar a casa.',
    apps: { aulixa: 'Repàs de Primària', aprenza: 'Estudi i exàmens de l’ESO' } },
  gl: { antetitulo: 'Do mesmo estudio', antes: 'Máis apps de', despues: '', entradilla: 'Feitas co mesmo coidado, para repasar na casa.',
    apps: { aulixa: 'Repaso de Primaria', aprenza: 'Estudo e exames da ESO' } },
  ast: { antetitulo: 'Del mesmu estudiu', antes: 'Más apps de', despues: '', entradilla: 'Feches col mesmu procuru, pa repasar en casa.',
    apps: { aulixa: 'Repasu de Primaria', aprenza: 'Estudiu y exámenes de la ESO' } },
  an: { antetitulo: 'D’o mesmo estudio', antes: 'Más apps de', despues: '', entradilla: 'Feitas con o mesmo ficacio, ta repasar en casa.',
    apps: { aulixa: 'Repaso de Primaria', aprenza: 'Estudio y examens d’a ESO' } },
  oc: { antetitulo: 'Del meteis estudi', antes: 'Mai d’apps de', despues: '', entradilla: 'Fachas amb lo meteis suenh, per repassar a l’ostal.',
    apps: { aulixa: 'Repàs de Primària', aprenza: 'Estudi e examens de l’ESO' } },
  en: { antetitulo: 'From the same studio', antes: 'Another app by', despues: '', entradilla: 'Made with the same care, for practising at home.',
    apps: { aulixa: 'Elementary school quiz' } },
  ro: { antetitulo: 'De la același studio', antes: 'O altă aplicație de la', despues: '', entradilla: 'Făcută cu aceeași grijă, pentru recapitulat acasă.',
    apps: { aulixa: 'Teste pentru clasele I–VI' } },
  'zh-Hans': { antetitulo: '来自同一工作室', antes: '另一款来自', despues: '的应用', entradilla: '同样用心制作，适合在家复习。',
    apps: { aulixa: '小学1-6年级复习' } },
  ar: { antetitulo: 'من الاستوديو نفسه', antes: 'تطبيق آخر من', despues: '', entradilla: 'مصنوع بالعناية نفسها، للمراجعة في البيت.',
    apps: { aulixa: 'مراجعة الابتدائية' } },
};

/** Las apps que se enseñan en un idioma del sitio: las que existen para él y tienen texto. */
export const appsDe = (locale) => APPS.filter((a) => a.locales.includes(locale) && TEXTOS[locale]?.apps[a.id]);

export const seMuestraEn = (locale) => appsDe(locale).length > 0;

/** Idiomas del sitio donde sale el bloque. */
export const LOCALES_ACTIVOS = Object.keys(TEXTOS).filter(seMuestraEn);

/**
 * Idioma de la ficha en Google Play (`hl`). Play no tiene asturiano, aragonés
 * ni occitano: castellano. No es una etiqueta de seguimiento: solo dice en qué
 * idioma enseñar la ficha.
 */
export const PLAY_HL = {
  es: 'es', ca: 'ca', gl: 'gl', ast: 'es', an: 'es', oc: 'es', en: 'en', ro: 'ro', 'zh-Hans': 'zh-CN', ar: 'ar',
};

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
 * `hl` es el idioma de la ficha de Google Play (PLAY_HL).
 */
export function enlaceDe(app, dispositivo, { pais = 'es', hl = '' } = {}) {
  if (dispositivo === 'ios') return `https://apps.apple.com/${pais}/app/${app.appStore}`;
  if (dispositivo === 'android') {
    return app.play ? `https://play.google.com/store/apps/details?id=${app.play}${hl ? `&hl=${hl}` : ''}` : null;
  }
  // Las webs de las apps solo existen en castellano.
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
  ast: '<strong>La tienda d’aplicaciones del to preséu, o la web de l’app</strong>, namái si calques una de les tarxetes de «Más apps de Crintech» del entamu. Kaixo nun rexistra esi toque nin amiesta dengún identificador al enllaz.',
  an: '<strong>A botiga d’aplicacions d’o tuyo dispositivo, u a web de l’app</strong>, nomás si pretas una d’as tarchetas de «Más apps de Crintech» de l’inicio. Kaixo no rechistra ixe toque ni adhibe garra identificador a l’enlaz.',
  oc: '<strong>La botiga d’aplicacions de ton aparelh, o lo site de l’app</strong>, solament se tòcas una de las cartas de «Mai d’apps de Crintech» de l’acuèlh. Kaixo enregistra pas aquel tòc ni apond pas cap d’identificant al ligam.',
  en: '<strong>Your device’s app store, or the app’s website</strong>, only if you tap the “Another app by Crintech” card on the home page. Kaixo does not record that tap or add any identifier to the link.',
  ro: '<strong>Magazinul de aplicații al dispozitivului tău sau site-ul aplicației</strong>, numai dacă atingi cardul „O altă aplicație de la Crintech” de pe pagina de pornire. Kaixo nu înregistrează acea atingere și nu adaugă niciun identificator la link.',
  'zh-Hans': '<strong>你设备上的应用商店，或该应用的网站</strong>：仅当你点击首页“另一款来自 Crintech 的应用”的卡片时。Kaixo 不会记录这次点击，也不会在链接中添加任何标识符。',
  ar: '<strong>متجر التطبيقات على جهازك، أو موقع التطبيق</strong>، فقط إذا ضغطت على بطاقة «تطبيق آخر من Crintech» في الصفحة الرئيسية. لا يسجّل Kaixo هذه الضغطة ولا يضيف أي معرّف إلى الرابط.',
};

/** La línea de privacidad de un idioma, o null si ahí no sale el bloque. */
export const avisoPrivacidad = (locale) => (seMuestraEn(locale) ? AVISO_PRIVACIDAD[locale] ?? null : null);
