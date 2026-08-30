// Site key del widget Turnstile «euskera-crintech-pro» (Cloudflare).
// Es un valor PÚBLICO por diseño: viaja en el HTML y solo sirve para pintar el
// widget. El secreto que valida el token vive en las variables de CF Pages.
//
// Va como constante y NO por `import.meta.env`: el `define` de Vite no llega al
// bundle de las islas de Svelte y la clave se quedaba sin hornear en silencio
// (comprobado el 30-ago-2026) — justo el fallo mudo que deja el formulario
// muerto cuando el secreto está puesto.
//
// 🔴 ORDEN OBLIGATORIO al activar el captcha: publicar primero esta clave y
// verificar que el widget se pinta; SOLO DESPUÉS poner TURNSTILE_SECRET en el
// proyecto de Pages. Al revés, el cliente no manda token y el servidor rechaza
// todos los envíos sin dar ninguna pista.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAEcvEbl7NY3s5Qdu';
