// Genera los códigos dorados (`.p1.txt` comprimido y `.p0.txt` sin comprimir) de los
// fixtures de tests/fixtures/progress/ con el códec de progress-hash.ts.
//
// Se ejecutó UNA VEZ sobre el códec anterior a la fase 0 y la salida quedó congelada:
// la prueba de compatibilidad (tests/compat.test.mjs) solo vale si esos códigos los
// escribió el código viejo. Por eso no sobrescribe nada: para regenerar un fixture hay
// que borrar a mano sus .txt sabiendo lo que se hace (y con el códec de entonces).
//
//   node scripts/gen-progress-fixtures.mjs
import { access, readFile, writeFile } from 'node:fs/promises';
import { exportHash } from '../src/stores/progress-hash.ts';

const DIR = 'tests/fixtures/progress';
const NOMBRES = ['v1-sin-achievements', 'v1-claves-legacy', 'v1-completo'];

const existe = (ruta) => access(ruta).then(() => true, () => false);

async function escribirSiNoExiste(ruta, contenido) {
  if (await existe(ruta)) {
    console.log(`= ${ruta} (ya existe, no se toca)`);
    return;
  }
  await writeFile(ruta, contenido);
  console.log(`+ ${ruta}`);
}

for (const n of NOMBRES) {
  const json = JSON.parse(await readFile(`${DIR}/${n}.json`, 'utf8'));
  await escribirSiNoExiste(`${DIR}/${n}.p1.txt`, await exportHash(json));
  // Sin CompressionStream el códec cae a la ruta P0 (navegadores antiguos).
  const CS = globalThis.CompressionStream;
  delete globalThis.CompressionStream;
  try {
    await escribirSiNoExiste(`${DIR}/${n}.p0.txt`, await exportHash(json));
  } finally {
    globalThis.CompressionStream = CS;
  }
}
