// Fusiona las traducciones de UI en src/i18n/ui.ts.
// Cada idioma se traduce a un fichero src/i18n/ui-tmp/<locale>.json con la
// forma { "clave": "valor", ... } (mismas claves que el bloque 'es'). Este
// script reemplaza cada `'<locale>': {}` vacío del objeto STRINGS por el bloque
// traducido. Usa JSON.stringify para emitir comillas/escapado TS válidos.
// Uso: node scripts/merge-ui.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const UI = join(import.meta.dirname, '..', 'src', 'i18n', 'ui.ts');
const TMP = join(import.meta.dirname, '..', 'src', 'i18n', 'ui-tmp');

if (!existsSync(TMP)) { console.error('No existe', TMP); process.exit(1); }

// Claves de referencia: las que tiene 'es' (para avisar de faltantes).
const srcOrig = readFileSync(UI, 'utf8');
const esBlock = srcOrig.match(/'es':\s*\{([\s\S]*?)\n  \}/);
const esKeys = esBlock ? [...esBlock[1].matchAll(/'([^']+)':/g)].map((m) => m[1]) : [];

let src = srcOrig;
const applied = [];
const warnings = [];

for (const file of readdirSync(TMP).filter((f) => f.endsWith('.json'))) {
  const loc = file.replace('.json', '');
  let obj;
  try { obj = JSON.parse(readFileSync(join(TMP, file), 'utf8')); }
  catch (e) { warnings.push(`${loc}: JSON inválido — ${e.message}`); continue; }

  const keys = Object.keys(obj);
  const missing = esKeys.filter((k) => !(k in obj));
  if (missing.length) warnings.push(`${loc}: faltan ${missing.length} claves (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''})`);

  const entries = esKeys
    .filter((k) => k in obj)
    .map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(obj[k])},`)
    .join('\n');
  const block = `{\n${entries}\n  }`;
  const needle = `'${loc}': {}`;
  if (!src.includes(needle)) { warnings.push(`${loc}: no se encontró \`'${loc}': {}\` (¿ya rellenado?)`); continue; }
  src = src.replace(needle, `'${loc}': ${block}`);
  applied.push(`${loc}(${keys.length})`);
}

writeFileSync(UI, src);
console.log(`Aplicados ${applied.length}: ${applied.join(', ')}`);
if (warnings.length) { console.log('Avisos:'); warnings.forEach((w) => console.log('  - ' + w)); }
console.log(`Claves de referencia (es): ${esKeys.length}`);
