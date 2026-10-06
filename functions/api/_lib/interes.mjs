// Lógica pura del botón «Me interesa» de Kaixo Jolas (sin red), para poder
// probarla con node --test. La usa functions/api/interes.ts. El prefijo _ del
// directorio lo excluye del enrutado de Pages Functions.
//
// ⛔ CERO DATOS PERSONALES (decisión de Crinlorite, 6-oct-2026: «0 recogida de
// datos, only intent»). Lo único que se guarda es una cifra por día, idioma y
// origen. Aquí no entra ni sale correo, IP, user agent ni identificador alguno:
// si un día hace falta algo más, es otra decisión, no un campo más.
const LOCALES = new Set(['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro', 'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko']);
const ORIGENES = new Set(['web', 'ios', 'android']);

/** Solo deja pasar idioma y origen conocidos; todo lo demás del cuerpo se ignora. */
export function validaInteres(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, code: 'bad_json' };
  return {
    ok: true,
    locale: LOCALES.has(body.locale) ? body.locale : 'es',
    origen: ORIGENES.has(body.origen) ? body.origen : 'web',
  };
}

/** Día en UTC, 'AAAA-MM-DD': la única marca de tiempo que se guarda. */
export const diaUTC = (fecha = new Date()) => fecha.toISOString().slice(0, 10);

export const SQL_SUMA =
  'INSERT INTO interes (dia, locale, origen, n) VALUES (?1, ?2, ?3, 1) ' +
  'ON CONFLICT(dia, locale, origen) DO UPDATE SET n = n + 1';

/** Suma uno al contador de ese día, idioma y origen. */
export async function sumaInteres(db, { locale, origen }, fecha = new Date()) {
  await db.prepare(SQL_SUMA).bind(diaUTC(fecha), locale, origen).run();
}
