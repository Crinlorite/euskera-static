// Validador estructural del contenido de lecciones.
// Comprueba invariantes que el schema Zod no cubre:
//   - multiple-choice: answer dentro de rango, opciones únicas
//   - fill-in-blank: prompt con exactamente un hueco "___"
//   - flashcards / match-pairs: claves eu únicas dentro del ejercicio
//   - ids de ejercicio únicos por lección y globalmente
//   - ids estables de lección únicos globalmente
// Uso: node scripts/validate-content.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { load } from 'js-yaml';

const ROOT = join(import.meta.dirname, '..', 'src', 'content', 'lessons');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith('.md')) yield p;
  }
}

const problems = [];
const lessonIds = new Map();
const exerciseIds = new Map();
let lessonCount = 0;
let exerciseCount = 0;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { problems.push(`${rel}: sin frontmatter`); continue; }
  let fm;
  try { fm = load(m[1]); } catch (e) { problems.push(`${rel}: YAML inválido — ${e.message}`); continue; }
  lessonCount++;

  if (lessonIds.has(fm.id)) problems.push(`${rel}: id de lección duplicado "${fm.id}" (también en ${lessonIds.get(fm.id)})`);
  else lessonIds.set(fm.id, rel);

  const seenLocal = new Set();
  for (const ex of fm.exercises ?? []) {
    exerciseCount++;
    const where = `${rel} → ${ex.id}`;
    if (seenLocal.has(ex.id)) problems.push(`${where}: id de ejercicio repetido en la misma lección`);
    seenLocal.add(ex.id);
    if (exerciseIds.has(ex.id) && exerciseIds.get(ex.id) !== rel) {
      problems.push(`${where}: id de ejercicio duplicado globalmente (también en ${exerciseIds.get(ex.id)})`);
    } else exerciseIds.set(ex.id, rel);

    if (ex.type === 'multiple-choice') {
      if (ex.answer >= ex.options.length) problems.push(`${where}: answer=${ex.answer} fuera de rango (${ex.options.length} opciones)`);
      const uniq = new Set(ex.options.map((o) => String(o).trim().toLowerCase()));
      if (uniq.size !== ex.options.length) problems.push(`${where}: opciones duplicadas`);
    }
    if (ex.type === 'fill-in-blank') {
      // Semántica del componente: una racha de 3+ guiones bajos (o varias
      // separadas solo por espacios) = UN hueco con un único input. Varios
      // grupos separados por texto no están soportados.
      const groups = ex.prompt.match(/_{3,}(?:[ \t]+_{3,})*/g) ?? [];
      if (groups.length === 0) problems.push(`${where}: prompt sin hueco "___"`);
      if (groups.length > 1) problems.push(`${where}: ${groups.length} grupos de huecos separados por texto (el componente solo soporta 1)`);
      if (!ex.answers?.length) problems.push(`${where}: sin answers`);
      if (groups.length === 1) {
        // Aviso si el nº de palabras del hueco no casa con la respuesta principal
        const slots = groups[0].split(/[ \t]+/).length;
        const words = String(ex.answers[0]).trim().split(/\s+/).length;
        if (slots > 1 && slots !== words) {
          problems.push(`${where}: hueco de ${slots} palabras pero la respuesta "${ex.answers[0]}" tiene ${words}`);
        }
      }
    }
    if (ex.type === 'flashcards' || ex.type === 'match-pairs') {
      const items = ex.cards ?? ex.pairs ?? [];
      for (const [i, c] of items.entries()) {
        // Una coma sin entrecomillar en flow-YAML parte el valor y mete
        // claves basura: { eu: Ondo, eskerrik asko, es: ... } → eu="Ondo"
        // + clave "eskerrik asko". Detectamos claves inesperadas y valores vacíos.
        const keys = Object.keys(c);
        const extra = keys.filter((k) => k !== 'eu' && k !== 'es');
        if (extra.length) problems.push(`${where}[${i}]: claves inesperadas (${extra.join(', ')}) — probable coma sin entrecomillar en YAML`);
        if (!c.eu || !c.es || typeof c.eu !== 'string' && typeof c.eu !== 'number' || String(c.es).trim() === '') {
          problems.push(`${where}[${i}]: eu/es vacío o no-string — probable coma sin entrecomillar en YAML`);
        }
      }
      const eus = new Set(items.map((c) => String(c.eu).trim().toLowerCase()));
      if (eus.size !== items.length) problems.push(`${where}: claves eu duplicadas`);
      if (ex.type === 'match-pairs') {
        // En match-pairs las traducciones también deben ser únicas: si dos
        // tarjetas comparten texto es, el jugador no puede distinguirlas.
        const ess = new Set(items.map((c) => String(c.es).trim().toLowerCase()));
        if (ess.size !== items.length) problems.push(`${where}: traducciones es duplicadas (ambiguo para emparejar)`);
      }
    }
  }
}

console.log(`Lecciones: ${lessonCount} · Ejercicios: ${exerciseCount}`);
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
} else {
  console.log('Sin problemas estructurales.');
}
