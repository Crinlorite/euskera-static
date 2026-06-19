// Validador de PARIDAD de traducción: para un locale dado, comprueba que cada
// lesson/unit/level traducido conserva IDÉNTICOS todos los campos que NUNCA
// deben traducirse (ids estables, estructura, y sobre todo el EUSKERA: answers,
// el lado `eu` de flashcards/pairs, words de order, passageEu). Solo deben
// diferir los campos vehiculares (title, prompt, options vehiculares,
// explanation, hint, el lado `es` de tarjetas, description, name, body).
//
// Uso: node scripts/validate-parity.mjs <locale> [locale2 ...]
//   sin args: valida todos los locales con contenido (menos es).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { load } from 'js-yaml';

const ROOT = join(import.meta.dirname, '..', 'src', 'content');
const BASE = 'es';

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

function frontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return load(m[1]); } catch { return null; }
}

// units/levels son YAML puro (sin delimitadores ---), no markdown con frontmatter.
function parseData(file) {
  if (!existsSync(file)) return null;
  try { return load(readFileSync(file, 'utf8')); } catch { return null; }
}

const problems = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function checkLesson(loc, relPath) {
  const esFile = join(ROOT, 'lessons', BASE, relPath);
  const locFile = join(ROOT, 'lessons', loc, relPath);
  if (!existsSync(esFile)) { problems.push(`[${loc}] lección huérfana (sin original es): ${relPath}`); return; }
  const a = frontmatter(esFile), b = frontmatter(locFile);
  const where = `[${loc}] lessons/${relPath}`;
  if (!b) { problems.push(`${where}: YAML inválido o sin frontmatter (no parsea)`); return; }
  if (!a) return;
  for (const k of ['id', 'unitId', 'code', 'unit', 'level', 'order', 'estimatedMinutes', 'covers']) {
    if (!eq(a[k], b[k])) problems.push(`${where}: campo invariante '${k}' difiere (es=${JSON.stringify(a[k])} ${loc}=${JSON.stringify(b[k])})`);
  }
  const exA = a.exercises ?? [], exB = b.exercises ?? [];
  if (exA.length !== exB.length) { problems.push(`${where}: nº de ejercicios difiere (${exA.length} vs ${exB.length})`); return; }
  for (let i = 0; i < exA.length; i++) {
    const ea = exA[i], eb = exB[i];
    const w = `${where} ex[${i}] ${ea.id}`;
    if (ea.id !== eb.id) problems.push(`${w}: id de ejercicio difiere`);
    if (ea.type !== eb.type) problems.push(`${w}: type difiere`);
    if (ea.type === 'multiple-choice' && !eq(ea.answer, eb.answer)) problems.push(`${w}: answer (índice) difiere`);
    if (ea.type === 'comprehension') {
      if (!eq(ea.correctIndex, eb.correctIndex)) problems.push(`${w}: correctIndex difiere`);
      if (!eq(ea.passageEu, eb.passageEu)) problems.push(`${w}: passageEu (euskera) fue alterado`);
    }
    if (ea.type === 'fill-in-blank' && !eq(ea.answers, eb.answers)) problems.push(`${w}: answers (euskera) fueron alteradas`);
    if (ea.type === 'order-words') {
      if (!eq(ea.words, eb.words)) problems.push(`${w}: words (euskera) fueron alteradas`);
      if (!eq(ea.correctOrder, eb.correctOrder)) problems.push(`${w}: correctOrder difiere`);
    }
    if (ea.type === 'flashcards') {
      const euA = (ea.cards ?? []).map((c) => c.eu), euB = (eb.cards ?? []).map((c) => c.eu);
      if (!eq(euA, euB)) problems.push(`${w}: el lado 'eu' de flashcards fue alterado`);
    }
    if (ea.type === 'match-pairs') {
      const euA = (ea.pairs ?? []).map((c) => c.eu), euB = (eb.pairs ?? []).map((c) => c.eu);
      if (!eq(euA, euB)) problems.push(`${w}: el lado 'eu' de match-pairs fue alterado`);
    }
  }
}

function checkUnit(loc, relPath) {
  const locFile = join(ROOT, 'units', loc, relPath);
  const a = parseData(join(ROOT, 'units', BASE, relPath)), b = parseData(locFile);
  const where = `[${loc}] units/${relPath}`;
  if (!a || !b) { problems.push(`${where}: YAML ilegible`); return; }
  for (const k of ['id', 'code', 'level', 'order', 'covers', 'estimatedMinutes']) {
    if (!eq(a[k], b[k])) problems.push(`${where}: campo invariante '${k}' difiere`);
  }
}

function checkLevel(loc, relPath) {
  const locFile = join(ROOT, 'levels', loc, relPath);
  if (!existsSync(locFile)) { problems.push(`[${loc}] FALTA level ${relPath}`); return; }
  const a = parseData(join(ROOT, 'levels', BASE, relPath)), b = parseData(locFile);
  const where = `[${loc}] levels/${relPath}`;
  if (!a || !b) { problems.push(`${where}: YAML ilegible`); return; }
  for (const k of ['code', 'order', 'status', 'beta']) {
    if (!eq(a[k], b[k])) problems.push(`${where}: campo invariante '${k}' difiere`);
  }
  const idsA = (a.curriculum ?? []).map((c) => c.id), idsB = (b.curriculum ?? []).map((c) => c.id);
  if (!eq(idsA, idsB)) problems.push(`${where}: ids del curriculum difieren`);
}

let locales = process.argv.slice(2);
if (locales.length === 0) {
  locales = readdirSync(join(ROOT, 'lessons')).filter((l) => l !== BASE);
}

let count = 0;
for (const loc of locales) {
  // Iteramos sobre lo que EXISTE en el locale (no sobre es), para no marcar
  // como error lo que aún no se traduce (A2-EGA) en esta tanda.
  for (const f of walk(join(ROOT, 'lessons', loc))) {
    if (f.endsWith('.md')) { checkLesson(loc, relative(join(ROOT, 'lessons', loc), f)); count++; }
  }
  for (const f of walk(join(ROOT, 'units', loc))) {
    if (f.endsWith('.yaml')) checkUnit(loc, relative(join(ROOT, 'units', loc), f));
  }
  for (const f of walk(join(ROOT, 'levels', loc))) {
    if (f.endsWith('.yaml')) checkLevel(loc, relative(join(ROOT, 'levels', loc), f));
  }
}

console.log(`Locales: ${locales.join(', ') || '(ninguno)'} · comprobaciones de lección: ${count}`);
if (problems.length) {
  console.log(`\n${problems.length} problema(s) de paridad:`);
  for (const p of problems.slice(0, 100)) console.log(`  - ${p}`);
  if (problems.length > 100) console.log(`  … y ${problems.length - 100} más`);
  process.exit(1);
} else {
  console.log('Paridad correcta: estructura, ids y euskera intactos.');
}
