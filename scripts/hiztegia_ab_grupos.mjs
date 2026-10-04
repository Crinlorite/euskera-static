#!/usr/bin/env node
/**
 * Prueba A/B del Hiztegia (4-oct-2026): a que brazo pertenece cada entrada.
 * Imprime { slug: 'tratada' | 'control' | 'fuera' } en JSON. Lo usa
 * scripts/gsc_hiztegia_ab.py para medir el CTR de cada brazo.
 */
import { readFileSync } from 'node:fs';
import { brazo, cortaDe } from '../src/lib/hiztegia-seo.mjs';

const es = JSON.parse(readFileSync(new URL('../src/data/hiztegia/es.json', import.meta.url), 'utf8'));
const grupos = Object.fromEntries(es.entradas.map((e) => [e.slug, brazo({
  slug: e.slug, hitza: e.hitza, corta: cortaDe(e.traducciones), ejemplos: e.ejemplos,
})]));
console.log(JSON.stringify(grupos));
