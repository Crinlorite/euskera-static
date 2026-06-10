// Validador estático de las escenas del Modo Expedición.
// Bundlea el registry TS con esbuild y comprueba la integridad del grafo:
//   - todo gotoLabel / onSuccess / onFailure apunta a un label existente
//   - todo gotoScene apunta a una escena del registry
//   - puzzles: correctIndex en rango, correctOrder permutación válida,
//     match-pairs sin duplicados, fill-in con accept no vacío
//   - reachability (BFS desde el beat 0): dead-ends (caminos que caen del
//     final sin ending/goto-scene) y beats inalcanzables
// Uso: node scripts/validate-scenes.mjs
import { build } from 'esbuild';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '..');
const ENTRY = join(ROOT, 'src', 'components', 'expedition', 'game', 'scenes', 'index.ts');

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});

const tmp = mkdtempSync(join(tmpdir(), 'scenes-'));
const bundlePath = join(tmp, 'scenes.mjs');
writeFileSync(bundlePath, result.outputFiles[0].text);
const { getAllScenes, getScene } = await import(pathToFileURL(bundlePath).href);

const problems = [];
const warnings = [];

function targetIndex(scene, label) {
  return scene.beats.findIndex((b) => (b.type === 'label' && b.id === label) || b.id === label);
}

for (const scene of getAllScenes()) {
  const S = `[${scene.id}]`;
  const n = scene.beats.length;

  // --- referencias y puzzles ---
  scene.beats.forEach((b, i) => {
    const where = `${S} beat ${i} (${b.type})`;
    const checkLabel = (label, what) => {
      if (label && targetIndex(scene, label) < 0) problems.push(`${where}: ${what} '${label}' no existe`);
    };
    if (b.type === 'goto-label') checkLabel(b.label, 'label');
    if (b.type === 'goto-scene' && !getScene(b.scene)) {
      warnings.push(`${where}: escena '${b.scene}' no existe (caerá al ending fallback)`);
    }
    if (b.type === 'choice') {
      for (const c of b.options) {
        checkLabel(c.gotoLabel, 'gotoLabel');
        if (c.gotoScene && !getScene(c.gotoScene)) problems.push(`${where}: gotoScene '${c.gotoScene}' no existe`);
      }
    }
    if (b.type === 'puzzle') {
      checkLabel(b.onSuccess, 'onSuccess');
      checkLabel(b.onFailure, 'onFailure');
      const p = b.puzzle;
      if ((p.type === 'multiple-choice' || p.type === 'comprehension') && p.correctIndex >= p.options.length) {
        problems.push(`${where}: correctIndex=${p.correctIndex} fuera de rango (${p.options.length} opciones)`);
      }
      if (p.type === 'order-words') {
        const sorted = [...p.correctOrder].sort((a, z) => a - z);
        const ok = sorted.length === p.words.length && sorted.every((v, idx) => v === idx);
        if (!ok) problems.push(`${where}: correctOrder no es permutación válida de ${p.words.length} palabras`);
      }
      if (p.type === 'match-pairs') {
        const lefts = new Set(p.pairs.map((x) => x.left));
        const rights = new Set(p.pairs.map((x) => x.right));
        if (lefts.size !== p.pairs.length) problems.push(`${where}: left duplicado en match-pairs`);
        if (rights.size !== p.pairs.length) problems.push(`${where}: right duplicado en match-pairs`);
      }
      if (p.type === 'fill-in' && (!p.accept || p.accept.length === 0)) {
        problems.push(`${where}: fill-in sin accept`);
      }
    }
  });

  // --- reachability ---
  const reachable = new Set();
  const deadEnds = new Set();
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    if (i >= n) { deadEnds.add(i); continue; }
    if (reachable.has(i)) continue;
    reachable.add(i);
    const b = scene.beats[i];
    const pushLabel = (label) => {
      const t = targetIndex(scene, label);
      if (t >= 0) queue.push(t + 1);
    };
    switch (b.type) {
      case 'ending':
        break; // terminal
      case 'goto-scene':
        break; // terminal para esta escena
      case 'goto-label':
        pushLabel(b.label);
        // fallback del engine si el label no existe: advance
        if (targetIndex(scene, b.label) < 0) queue.push(i + 1);
        break;
      case 'choice':
        for (const c of b.options) {
          if (c.gotoScene) continue; // terminal
          if (c.gotoLabel) pushLabel(c.gotoLabel);
          else queue.push(i + 1);
        }
        break;
      case 'puzzle':
        if (b.onSuccess) pushLabel(b.onSuccess); else queue.push(i + 1);
        if (b.onFailure) pushLabel(b.onFailure);
        break;
      default:
        queue.push(i + 1);
    }
  }
  if (deadEnds.size) {
    problems.push(`${S} hay caminos que caen del final de beats[] sin ending/goto-scene (dead-end)`);
  }
  // Los beats 'label' alcanzados solo por salto nunca se visitan como índice
  // (gotoLabel aterriza en label+1), así que no cuentan como inalcanzables.
  const unreachable = [];
  for (let i = 0; i < n; i++) if (!reachable.has(i) && scene.beats[i].type !== 'label') unreachable.push(i);
  if (unreachable.length) {
    warnings.push(`${S} beats inalcanzables: ${unreachable.map((i) => `${i}(${scene.beats[i].type})`).join(', ')}`);
  }

  // el último beat alcanzable de cada camino debería terminar — heurística:
  // la escena debe contener al menos un ending o goto-scene alcanzable
  const hasTerminal = scene.beats.some((b, i) => reachable.has(i) && (b.type === 'ending' || b.type === 'goto-scene'));
  if (!hasTerminal) problems.push(`${S} sin terminal alcanzable (ending/goto-scene)`);
}

rmSync(tmp, { recursive: true, force: true });

const scenes = getAllScenes();
console.log(`Escenas: ${scenes.length} · Beats: ${scenes.reduce((a, s) => a + s.beats.length, 0)}`);
for (const w of warnings) console.log(`  AVISO: ${w}`);
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
} else {
  console.log('Grafo de escenas íntegro.');
}
