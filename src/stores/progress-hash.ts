import type { ProgressAny, ProgressV1 } from './progress';

/**
 * Códec del código de progreso (`P1.…` comprimido, `P0.…` sin comprimir).
 *
 * Vive aparte del store porque no toca `localStorage` ni el puente nativo: así se
 * puede probar y reutilizar tal cual (exportar a mano, restaurar, o respaldar en
 * respaldo local del wrapper de iOS).
 */

/** Versión del esquema que este sitio sabe escribir. Las superiores se leen igual (ver decodeHash). */
export const SUPPORTED_SCHEMA = 1;

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function streamThrough(input: Uint8Array, transform: GenericTransformStream): Promise<Uint8Array> {
  const stream = new Response(new Blob([input as BlobPart])).body!.pipeThrough(
    transform as TransformStream<Uint8Array, Uint8Array>,
  );
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function exportHash(p: ProgressV1): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(p));
  if (typeof CompressionStream === 'undefined') return 'P0.' + bytesToBase64Url(encoded);
  const compressed = await streamThrough(encoded, new CompressionStream('deflate-raw'));
  return 'P1.' + bytesToBase64Url(compressed);
}

/**
 * Lee un código de progreso. Devuelve `null` si está corrupto, vacío o no trae un
 * `schemaVersion` numérico — nunca lanza, porque lo llama el wrapper nativo con lo
 * que hubiera guardado en su respaldo local.
 *
 * Un esquema MÁS NUEVO que `SUPPORTED_SCHEMA` también se devuelve: decide quien
 * importa (`migrate()` lo conserva como v1 con extras; `importHash` avisa con
 * `reason: 'outdated'`). Antes se descartaba y el progreso se perdía.
 */
export async function decodeHash(hash: string): Promise<ProgressAny | null> {
  const trimmed = hash?.trim();
  if (!trimmed) return null;
  try {
    let payload: unknown;
    if (trimmed.startsWith('P1.')) {
      const bytes = base64UrlToBytes(trimmed.slice(3));
      const expanded = await streamThrough(bytes, new DecompressionStream('deflate-raw'));
      payload = JSON.parse(new TextDecoder().decode(expanded));
    } else if (trimmed.startsWith('P0.')) {
      payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(trimmed.slice(3))));
    } else {
      payload = JSON.parse(trimmed);
    }
    if (!payload || typeof payload !== 'object') return null;
    if (typeof (payload as { schemaVersion?: unknown }).schemaVersion !== 'number') return null;
    return payload as ProgressAny;
  } catch {
    return null;
  }
}
