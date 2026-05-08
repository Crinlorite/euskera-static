// CF Pages Function — POST /api/feedback
//
// Replica el patrón de Avalon Tracker / Royal Forge: recibe el form de
// feedback, verifica Turnstile (opcional) y reenvía a Vigil Bot con
// project="euskera-static". El bot genera el ID público (EU-XXXX) y, si
// está configurado, abre un thread en el Discord del proyecto.
//
// Env vars requeridas en Cloudflare Pages settings:
//   FEEDBACK_SECRET   bearer compartido con Vigil Bot (X-API-Key)
//   VIGIL_BOT_URL     base URL del bot (ej: https://vigil.crintech.pro)
//   TURNSTILE_SECRET  opcional — secret server-side de Cloudflare Turnstile

interface Env {
  FEEDBACK_SECRET?: string;
  VIGIL_BOT_URL?: string;
  TURNSTILE_SECRET?: string;
}

const TYPES = ['bug', 'feature', 'question', 'language', 'pedagogy'] as const;
type FeedbackType = (typeof TYPES)[number];

const MAX_TITLE = 200;
const MAX_DESC = 4000;
const MAX_EMAIL = 120;
const MAX_DISCORD = 40;
const MAX_CONTEXT_BYTES = 2000;

interface IncomingBody {
  type?: string;
  title?: string;
  description?: string;
  email?: string | null;
  discordUser?: string | null;
  turnstileToken?: string;
  context?: Record<string, unknown>;
}

function err(code: string, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip: string | null,
): Promise<{ success: boolean }> {
  if (!secret) return { success: true };
  if (!token) return { success: false };
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return { success: !!data.success };
  } catch {
    return { success: false };
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const env = ctx.env;
  if (!env.FEEDBACK_SECRET || !env.VIGIL_BOT_URL) {
    return err('NOT_CONFIGURED', 503, 'Feedback no configurado todavía');
  }

  let raw: IncomingBody;
  try {
    raw = (await ctx.request.json()) as IncomingBody;
  } catch {
    return err('VALIDATION_ERROR', 400, 'Body inválido');
  }

  const type = raw.type as FeedbackType | undefined;
  if (!type || !TYPES.includes(type)) {
    return err('VALIDATION_ERROR', 400, 'type inválido');
  }
  if (typeof raw.title !== 'string' || typeof raw.description !== 'string') {
    return err('VALIDATION_ERROR', 400, 'title y description requeridos');
  }

  const t = raw.title.trim();
  const d = raw.description.trim();
  if (t.length < 5 || t.length > MAX_TITLE) {
    return err('VALIDATION_ERROR', 400, `Título debe tener 5–${MAX_TITLE} caracteres`);
  }
  if (d.length < 20 || d.length > MAX_DESC) {
    return err('VALIDATION_ERROR', 400, `Descripción debe tener 20–${MAX_DESC} caracteres`);
  }

  if (raw.email && raw.email !== '') {
    if (typeof raw.email !== 'string' || raw.email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
      return err('VALIDATION_ERROR', 400, 'Email inválido');
    }
  }
  if (raw.discordUser && raw.discordUser !== '') {
    if (typeof raw.discordUser !== 'string' || raw.discordUser.length > MAX_DISCORD) {
      return err('VALIDATION_ERROR', 400, 'Usuario Discord demasiado largo');
    }
  }

  let safeContext: Record<string, unknown> | undefined;
  if (raw.context && typeof raw.context === 'object') {
    const serialized = JSON.stringify(raw.context);
    if (serialized.length > MAX_CONTEXT_BYTES) {
      return err('VALIDATION_ERROR', 400, 'Context demasiado grande');
    }
    safeContext = raw.context;
  }

  const ip =
    ctx.request.headers.get('cf-connecting-ip') ||
    ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null;

  const ts = await verifyTurnstile(raw.turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!ts.success) {
    return err('VALIDATION_ERROR', 400, 'Anti-bot fallido');
  }

  const forward: Record<string, unknown> = {
    project: 'euskera-static',
    type,
    title: t,
    description: d,
  };
  if (raw.email) forward.email = raw.email.trim();
  if (raw.discordUser) forward.discordUser = raw.discordUser.trim();
  if (safeContext) forward.context = safeContext;

  let botRes: Response;
  try {
    botRes = await fetch(`${env.VIGIL_BOT_URL.replace(/\/$/, '')}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.FEEDBACK_SECRET,
        'X-Project': 'euskera-static',
      },
      body: JSON.stringify(forward),
    });
  } catch {
    return err('UPSTREAM_ERROR', 502, 'Servicio de tickets no responde');
  }

  if (botRes.status === 503) {
    return err('UPSTREAM_DISABLED', 503, 'Tickets temporalmente desactivados');
  }
  if (!botRes.ok) {
    const detail = await botRes.text().catch(() => '');
    let parsedDetail: string | undefined;
    try {
      parsedDetail = (JSON.parse(detail) as { error?: string }).error;
    } catch {
      parsedDetail = detail || undefined;
    }
    return err(
      'UPSTREAM_ERROR',
      botRes.status >= 500 ? 502 : botRes.status,
      parsedDetail || 'Error registrando ticket',
    );
  }

  let data: { publicId?: string; threadUrl?: string | null };
  try {
    data = (await botRes.json()) as typeof data;
  } catch {
    return err('UPSTREAM_INVALID', 502, 'Respuesta inválida del bot');
  }

  return new Response(
    JSON.stringify({
      publicId: data.publicId,
      threadUrl: data.threadUrl ?? null,
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
};
