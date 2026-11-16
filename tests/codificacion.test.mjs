import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// Texto UTF-8 que se ha leído como Latin-1/cp1252 y se ha vuelto a guardar:
// «lliçons» acaba como «lliÃ§ons», «é» como «Ã©», «’» como «â€™» (ticket EU-0006).
const ROTO = /[ÃÂ][\u0080-¿]|â€/;
const EXT = new Set(['.ts', '.mjs', '.js', '.astro', '.svelte', '.md', '.mdx', '.json', '.yaml', '.yml']);

function* ficheros(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* ficheros(p);
    else if (EXT.has(extname(n))) yield p;
  }
}

test('ningún texto de src/ está doblemente codificado', () => {
  const malos = [];
  for (const f of ficheros('src')) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const m = ROTO.exec(l);
      if (m) malos.push(`${f}:${i + 1}: …${l.slice(Math.max(0, m.index - 30), m.index + 20)}…`);
    });
  }
  assert.deepEqual(malos, []);
});
