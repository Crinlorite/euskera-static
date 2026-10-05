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
    // la App Store el 5-oct-2026). En los demás idiomas del sitio se enseña
    // igualmente por decisión de Crinlorite (5-oct), y la tarjeta dice en qué
    // idiomas está para no prometer lo que no hay.
    locales: ['es', 'ca', 'gl', 'ast', 'an', 'oc', 'en', 'ro', 'zh-Hans', 'ar',
      'fr', 'de', 'it', 'pt-BR', 'ru', 'pl', 'ja', 'ko'],
  },
  {
    id: 'aprenza',
    nombre: 'Aprenza',
    icono: '/apps/aprenza.png',
    web: 'https://aprenza.app/',
    appStore: 'id6786163224',
    // En Google Play está en prueba CERRADA (5-oct-2026): la ficha pública da
    // 404 y no se puede enlazar. En Android la tarjeta lleva a la guía de tres
    // pasos para apuntarse (/app/aprenza-beta/<idioma>/). El día que pase a
    // producción: poner aquí el paquete y quitar `playBeta`.
    play: null,
    playBeta: {
      paquete: 'com.crintechstudios.aprenza',
      grupo: 'https://groups.google.com/g/crintechstudios',
      prueba: 'https://play.google.com/apps/testing/com.crintechstudios.aprenza',
    },
    // Solo en castellano y solo tiene sentido en España: es de la ESO.
    locales: ['es', 'ca', 'gl', 'ast', 'an', 'oc'],
  },
];

/**
 * Textos por idioma. Sale una tarjeta por cada app activada para ese idioma
 * (`locales` de cada app); sin ninguna, no hay bloque.
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
  'zh-Hans': { antetitulo: '来自同一工作室', antes: '另一款来自', despues: ' 的应用', entradilla: '同样用心制作，适合在家复习。',
    apps: { aulixa: '小学1-6年级复习' } },
  ar: { antetitulo: 'من الاستوديو نفسه', antes: 'تطبيق آخر من', despues: '', entradilla: 'مصنوع بالعناية نفسها، للمراجعة في البيت.',
    apps: { aulixa: 'مراجعة الابتدائية' } },
  // Aulixa no está en estos idiomas: la tarjeta lo dice.
  fr: { antetitulo: 'Du même studio', antes: 'Une autre app de', despues: '', entradilla: 'Faite avec le même soin, pour réviser à la maison.',
    apps: { aulixa: 'Quiz de primaire (en anglais ou en espagnol)' } },
  de: { antetitulo: 'Vom selben Studio', antes: 'Noch eine App von', despues: '', entradilla: 'Mit derselben Sorgfalt gemacht, zum Üben zu Hause.',
    apps: { aulixa: 'Grundschul-Quiz (auf Englisch oder Spanisch)' } },
  it: { antetitulo: 'Dallo stesso studio', antes: 'Un’altra app di', despues: '', entradilla: 'Fatta con la stessa cura, per ripassare a casa.',
    apps: { aulixa: 'Quiz della scuola primaria (in inglese o spagnolo)' } },
  'pt-BR': { antetitulo: 'Do mesmo estúdio', antes: 'Outro app da', despues: '', entradilla: 'Feito com o mesmo cuidado, para revisar em casa.',
    apps: { aulixa: 'Quiz do ensino fundamental (em inglês ou espanhol)' } },
  ru: { antetitulo: 'От той же студии', antes: 'Ещё одно приложение от', despues: '', entradilla: 'Сделано с той же заботой — для повторения дома.',
    apps: { aulixa: 'Викторина для начальной школы (на английском или испанском)' } },
  pl: { antetitulo: 'Od tego samego studia', antes: 'Kolejna aplikacja od', despues: '', entradilla: 'Zrobiona z tą samą starannością, do powtórek w domu.',
    apps: { aulixa: 'Quiz dla szkoły podstawowej (po angielsku lub hiszpańsku)' } },
  ja: { antetitulo: '同じスタジオから', antes: '', despues: 'のもうひとつのアプリ', entradilla: '同じこだわりで作りました。おうちでの復習に。',
    apps: { aulixa: '小学校の復習クイズ（英語・スペイン語）' } },
  ko: { antetitulo: '같은 스튜디오에서', antes: '', despues: '의 또 다른 앱', entradilla: '같은 정성으로 만들었습니다. 집에서 복습할 때 좋아요.',
    apps: { aulixa: '초등학교 복습 퀴즈 (영어·스페인어)' } },
};

/**
 * Aviso del paso 1 de la guía de la beta de Aprenza. Aprenza es para la ESO
 * (12-16 años) y quien llega puede tener una cuenta de menor supervisada: en un
 * caso real (oct-2026) no pudo entrar en el grupo y se quedó atascado sin saber
 * por qué. Dice «puede que» porque no hay una fuente de Google que lo confirme.
 * Sugerido por la sesión de Aprenza.
 */
export const NOTA_MENORES = {
  es: 'Si la cuenta de Google del móvil es de un menor supervisado con Family Link, puede que Google no le deje entrar en el grupo. En ese caso, haz los tres pasos con la cuenta de un adulto o pide ayuda en <a href="https://aprenza.app/soporte" rel="noopener">la página de soporte de Aprenza</a>.',
  ca: 'Si el compte de Google del mòbil és d’un menor supervisat amb Family Link, pot ser que Google no el deixi entrar al grup. En aquest cas, fes els tres passos amb el compte d’un adult o demana ajuda a <a href="https://aprenza.app/soporte" rel="noopener">la pàgina de suport d’Aprenza</a>.',
  gl: 'Se a conta de Google do móbil é dun menor supervisado con Family Link, pode que Google non o deixe entrar no grupo. Nese caso, fai os tres pasos coa conta dun adulto ou pide axuda na <a href="https://aprenza.app/soporte" rel="noopener">páxina de soporte de Aprenza</a>.',
  ast: 'Si la cuenta de Google del móvil ye d’un menor supervisáu con Family Link, pue que Google nun lu dexe entrar nel grupu. Nesi casu, fai los tres pasos cola cuenta d’un adultu o pidi ayuda na <a href="https://aprenza.app/soporte" rel="noopener">páxina de soporte d’Aprenza</a>.',
  an: 'Si a cuenta de Google d’o mobil ye d’un menor supervisau con Family Link, puet estar que Google no le deixe dentrar en o grupo. En ixe caso, fe os tres pasos con a cuenta d’un adulto u demanda aduya en a <a href="https://aprenza.app/soporte" rel="noopener">pachina de soporte d’Aprenza</a>.',
  oc: 'Se lo compte Google del telefòn es lo d’un menor supervisat amb Family Link, es possible que Google lo daisse pas dintrar dins lo grop. Dins aquel cas, fasètz los tres passes amb lo compte d’un adult o demandatz d’ajuda sus <a href="https://aprenza.app/soporte" rel="noopener">la pagina de supòrt d’Aprenza</a>.',
};

/** El título tal como se lee: `antes` + Crintech + `despues` (que trae su propio espacio si lo lleva). */
export const tituloDe = (locale) => {
  const t = TEXTOS[locale];
  return t ? `${t.antes ? `${t.antes} ` : ''}Crintech${t.despues}` : '';
};

/** Título de la guía para apuntarse a la beta de Aprenza en Android. */
export const TITULO_BETA = {
  es: 'Aprenza para Android: apúntate a la beta',
  ca: 'Aprenza per a Android: apunta’t a la beta',
  gl: 'Aprenza para Android: apúntate á beta',
  ast: 'Aprenza p’Android: apúntate a la beta',
  an: 'Aprenza ta Android: apunta-te a la beta',
  oc: 'Aprenza per Android: marca-te a la beta',
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
  fr: 'fr', de: 'de', it: 'it', 'pt-BR': 'pt-BR', ru: 'ru', pl: 'pl', ja: 'ja', ko: 'ko',
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
export function enlaceDe(app, dispositivo, { pais = 'es', hl = '', locale = 'es' } = {}) {
  if (dispositivo === 'ios') return `https://apps.apple.com/${pais}/app/${app.appStore}`;
  if (dispositivo === 'android') {
    if (app.play) return `https://play.google.com/store/apps/details?id=${app.play}${hl ? `&hl=${hl}` : ''}`;
    // Prueba cerrada: no hay ficha que enlazar; a la guía para apuntarse.
    if (app.playBeta && TITULO_BETA[locale]) return rutaBeta(app, locale);
    return null;
  }
  // Las webs de las apps solo existen en castellano.
  return app.web;
}

/** Guía para apuntarse a la beta cerrada de una app en Android (página de servicio). */
export const rutaBeta = (app, locale) => `/app/${app.id}-beta/${locale}/`;

/** ¿El enlace de esta app en Android es la guía de la beta, y no la tienda? */
export const esBetaEnAndroid = (app) => !app.play && !!app.playBeta;

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
  fr: '<strong>La boutique d’applications de votre appareil, ou le site de l’app</strong>, uniquement si vous touchez la carte « Une autre app de Crintech » de l’accueil. Kaixo n’enregistre pas ce geste et n’ajoute aucun identifiant au lien.',
  de: '<strong>Der App-Shop deines Geräts oder die Website der App</strong>, nur wenn du auf der Startseite auf die Karte „Noch eine App von Crintech“ tippst. Kaixo zeichnet dieses Antippen nicht auf und fügt dem Link keine Kennung hinzu.',
  it: '<strong>Il negozio di app del tuo dispositivo, o il sito dell’app</strong>, solo se tocchi la scheda «Un’altra app di Crintech» nella pagina iniziale. Kaixo non registra quel tocco né aggiunge alcun identificatore al link.',
  'pt-BR': '<strong>A loja de aplicativos do seu dispositivo, ou o site do app</strong>, somente se você tocar no cartão “Outro app da Crintech” na página inicial. O Kaixo não registra esse toque nem adiciona nenhum identificador ao link.',
  ru: '<strong>Магазин приложений вашего устройства или сайт приложения</strong> — только если вы нажмёте карточку «Ещё одно приложение от Crintech» на главной странице. Kaixo не записывает это нажатие и не добавляет в ссылку никаких идентификаторов.',
  pl: '<strong>Sklep z aplikacjami na Twoim urządzeniu lub strona aplikacji</strong> — tylko jeśli dotkniesz karty „Kolejna aplikacja od Crintech” na stronie głównej. Kaixo nie zapisuje tego dotknięcia ani nie dodaje do linku żadnego identyfikatora.',
  ja: '<strong>お使いの端末のアプリストア、またはアプリのウェブサイト</strong>：ホームの「Crintechのもうひとつのアプリ」のカードをタップした場合のみ。Kaixo はそのタップを記録せず、リンクに識別子を付けることもありません。',
  ko: '<strong>기기의 앱 스토어 또는 앱 웹사이트</strong>: 홈의 「Crintech의 또 다른 앱」 카드를 누른 경우에만 해당합니다. Kaixo는 그 터치를 기록하지 않으며 링크에 어떤 식별자도 추가하지 않습니다.',
};

/** La línea de privacidad de un idioma, o null si ahí no sale el bloque. */
export const avisoPrivacidad = (locale) => (seMuestraEn(locale) ? AVISO_PRIVACIDAD[locale] ?? null : null);
