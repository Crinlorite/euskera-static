// Generates raster icons + OG image from public/favicon.svg.
// Run once after changes to favicon.svg or branding. Commits the outputs.
//   npm install --save-dev --save-exact sharp@0.33.5
//   node scripts/generate-assets.mjs

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const SVG_PATH = resolve(PUBLIC, 'favicon.svg');

const svg = readFileSync(SVG_PATH);

async function renderPng(out, size) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, out));
  console.log(`wrote ${out}`);
}

async function makeOgImage(outName) {
  const W = 1200, H = 630;
  // Background: white
  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png().toBuffer();

  // Colored lauburu for OG (red+green Ikurriña)
  const lauburuColored = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">
    <defs>
      <path id="l" d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" />
    </defs>
    <g>
      <use href="#l" transform="rotate(0)" fill="#D52B1E"/>
      <use href="#l" transform="rotate(90)" fill="#00964B"/>
      <use href="#l" transform="rotate(180)" fill="#D52B1E"/>
      <use href="#l" transform="rotate(270)" fill="#00964B"/>
    </g>
  </svg>`;
  const lauburuPng = await sharp(Buffer.from(lauburuColored), { density: 384 })
    .resize(380, 380)
    .png()
    .toBuffer();

  // Text overlay as SVG. Uso "Iowan Old Style" / "Cambria" / "Georgia" como
  // fallback porque sharp no tiene Manrope/Fraunces registradas y los anchos
  // de glifo del fallback hacían overflow del título antes.
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <style>
      .title { font-family: 'Georgia', 'Iowan Old Style', serif; font-style: italic; font-weight: 700; font-size: 78px; fill: #1A1A1A; }
      .sub { font-family: sans-serif; font-weight: 500; font-size: 30px; fill: #6B6B6B; }
      .url { font-family: sans-serif; font-weight: 600; font-size: 28px; fill: #D52B1E; }
      .brand { font-family: sans-serif; font-weight: 600; font-size: 22px; fill: #6B6B6B; letter-spacing: 4px; }
    </style>
    <text class="brand" x="520" y="195">EUSKERA</text>
    <text class="title" x="520" y="285">Aprende</text>
    <text class="title" x="520" y="370">euskera.</text>
    <text class="sub" x="520" y="430">Gratis · Sin login · Para todos</text>
    <text class="url" x="520" y="490">euskera.crintech.pro</text>
  </svg>`;
  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();

  await sharp(bg)
    .composite([
      { input: lauburuPng, left: 100, top: (H - 380) / 2 },
      { input: textPng, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, outName));
  console.log(`wrote ${outName}`);
}

async function makeMaskableIcon(outName) {
  // Maskable icon para Android adaptive icons.
  // Safe zone: el centro 80% del canvas. Pintamos un lauburu SÓLIDO grande
  // (no las líneas finas decorativas del favicon) sobre fondo blanco con
  // un anillo rojo Ikurriña sutil para dar presencia en launchers Android.
  //
  // Diferencia clave vs favicon-512: aquí los lobes son anchos y sólidos
  // (curva amplia con cabezas redondeadas) para que el icono se LEA a
  // 48dp en el launcher, no se confunda con un asterisco.
  const SIZE = 512;
  const ART_RATIO = 0.62; // 62% del canvas — bien dentro de la safe zone 80%.
  const ART = Math.round(SIZE * ART_RATIO);

  // Lauburu sólido: cada lobe es una "comma head" amplia. Path describe
  // un lobe que apunta hacia arriba-derecha; rotamos 4 veces 90° para
  // formar la cruz tradicional. ViewBox -100..100 da margen para los
  // path coords.
  const lauburuSolid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">
    <defs>
      <path id="lobe" d="M0 0
        C 0 -25, 15 -55, 50 -78
        C 75 -92, 92 -82, 88 -55
        C 80 -25, 45 -8, 0 0 Z" />
    </defs>
    <g>
      <use href="#lobe" transform="rotate(0)"   fill="#D52B1E"/>
      <use href="#lobe" transform="rotate(90)"  fill="#00964B"/>
      <use href="#lobe" transform="rotate(180)" fill="#D52B1E"/>
      <use href="#lobe" transform="rotate(270)" fill="#00964B"/>
    </g>
  </svg>`;

  const bg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png().toBuffer();

  const lauburuPng = await sharp(Buffer.from(lauburuSolid), { density: 512 })
    .resize(ART, ART)
    .png()
    .toBuffer();

  const offset = Math.round((SIZE - ART) / 2);

  await sharp(bg)
    .composite([{ input: lauburuPng, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, outName));
  console.log(`wrote ${outName}`);
}

await renderPng('favicon-32.png', 32);
await renderPng('favicon-192.png', 192);
await renderPng('favicon-512.png', 512);
await renderPng('apple-touch-icon.png', 180);
await makeMaskableIcon('favicon-512-maskable.png');
await makeOgImage('og-image.png');

console.log('done.');
