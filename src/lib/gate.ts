// Gate de revisión: el plaintext del token NO está en el repo, solo
// guardamos su SHA-256. La comprobación pasa por hashear lo que el usuario
// escribe y compararlo. Esto es protección "casual visitor" — su propósito
// es evitar acceso al contenido aún no validado pedagógicamente, no seguridad.
//
// Para rotar el token sin tocar código, define `PUBLIC_GATE_HASH` en las
// env vars de Cloudflare Pages (se inlinea en el bundle al build time).

// Rutas que requieren desbloqueo. A1 nunca está bloqueado.
// Misma lista usada por LevelGate (gate runtime) y por el home (estilo
// visual "Próximamente" en cards de nivel). Mantener single source of truth.
export const LOCKED_PATHS: readonly string[] = ['a2', 'b1', 'b2', 'c1', 'ega', 'expedicion'];

const FALLBACK_HASH = '048d57cd633576444ccfb25ea9e9c85e3c351a10a6a371d401d6fe4774665f6a';

const envHash = (import.meta.env.PUBLIC_GATE_HASH as string | undefined)?.trim();
export const GATE_HASH: string = envHash && envHash.length === 64 ? envHash : FALLBACK_HASH;

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
