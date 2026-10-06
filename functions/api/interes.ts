// CF Pages Function — POST /api/interes
//
// Botón «Me interesa» de Kaixo Jolas: suma uno a un contador por día, idioma y
// origen. No guarda nada más (ver _lib/interes.mjs). Mismo patrón que
// feedback.ts: Turnstile se verifica SOLO si TURNSTILE_SECRET está configurado,
// para que la vista previa local y los tests no lo necesiten.
//
// Bindings/env en CF Pages:
//   JOLAS_DB o WAITLIST_DB   D1 con la tabla `interes` (schema-interes.sql).
//                            WAITLIST_DB es el enlace que ya existe en producción
//                            (D1 kaixo_jolas_waitlist, creada para la lista de
//                            correos que nunca se publicó): se acepta tal cual
//                            para no tocar la configuración de Pages.
//   TURNSTILE_SECRET         secreto server-side de Turnstile
import { validaInteres, sumaInteres } from './_lib/interes.mjs';

interface Env {
  TURNSTILE_SECRET?: string;
  JOLAS_DB?: D1Database;
  WAITLIST_DB?: D1Database;
}

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: 'bad_json' } }, 400);
  }
  const v = validaInteres(body) as { ok: true; locale: string; origen: string } | { ok: false; code: string };
  if (!v.ok) return json({ error: { code: v.code } }, 400);
  const db = env.JOLAS_DB ?? env.WAITLIST_DB;
  if (!db) return json({ error: { code: 'sin_contador' } }, 503);

  if (env.TURNSTILE_SECRET) {
    const token = String((body as { turnstileToken?: unknown }).turnstileToken ?? '');
    if (!token) return json({ error: { code: 'turnstile' } }, 403);
    const form = new FormData();
    form.set('secret', env.TURNSTILE_SECRET);
    form.set('response', token);
    // Sin `remoteip`: la IP de quien pulsa no se reenvía ni se guarda.
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const j = (await r.json()) as { success?: boolean };
    if (!j.success) return json({ error: { code: 'turnstile' } }, 403);
  }

  await sumaInteres(db, v);
  return json({ ok: true }, 201);
};
