#!/usr/bin/env node
// Vectorize all generated PNG scenes into SVG via potrace.
// Scans every public/assets/scenes-*/ directory recursively, finds .png files,
// and writes a matching .svg next to each one.
// Idempotent: skips when the .svg already exists and is newer than its .png.
//
// Usage:
//   npm run optimize-scenes
//   npm run optimize-scenes -- --force
//   npm run optimize-scenes -- --threshold 180
//   npm run optimize-scenes -- --dir public/assets/scenes-1
//   npm run optimize-scenes -- --only dog_running

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import potrace from 'potrace';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flagVal = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? null : argv[i + 1];
};
const FORCE = argv.includes('--force');
const THRESHOLD = Number(flagVal('--threshold') || 180);
const ONLY = flagVal('--only');
const DIR_ARG = flagVal('--dir');

const traceOpts = {
  threshold: THRESHOLD,
  turdSize: 8,
  optTolerance: 0.4,
  color: '#1a1a1a',
  background: 'transparent',
};

const trace = (input, opts) =>
  new Promise((resolve, reject) => {
    potrace.trace(input, opts, (err, svg) => (err ? reject(err) : resolve(svg)));
  });

// For items (transparent-bg PNGs): the raw alpha channel only marks the line
// pixels, not the enclosed interior. To get a true silhouette that can hide
// place-background lines, flood-fill the image from its corners to find the
// "outside", then take everything not-outside (lines + enclosed interior) as
// the silhouette and trace that.
async function traceSilhouette(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;

  // Binary mask of opaque pixels (the drawn lines).
  const isLine = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    isLine[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }

  // Iterative flood-fill from every edge pixel through transparent areas.
  const outside = new Uint8Array(n);
  const stack = [];
  const seed = (i) => {
    if (!isLine[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + (w - 1));
  }
  while (stack.length) {
    const idx = stack.pop();
    const y = (idx / w) | 0;
    const x = idx - y * w;
    if (x > 0) {
      const k = idx - 1;
      if (!isLine[k] && !outside[k]) { outside[k] = 1; stack.push(k); }
    }
    if (x < w - 1) {
      const k = idx + 1;
      if (!isLine[k] && !outside[k]) { outside[k] = 1; stack.push(k); }
    }
    if (y > 0) {
      const k = idx - w;
      if (!isLine[k] && !outside[k]) { outside[k] = 1; stack.push(k); }
    }
    if (y < h - 1) {
      const k = idx + w;
      if (!isLine[k] && !outside[k]) { outside[k] = 1; stack.push(k); }
    }
  }

  // Build the binary silhouette PNG: anything NOT outside is filled.
  const sil = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const v = outside[i] ? 255 : 0;
    sil[i * 3] = v;
    sil[i * 3 + 1] = v;
    sil[i * 3 + 2] = v;
  }
  const silPng = await sharp(sil, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();

  return await trace(silPng, {
    threshold: 128,
    turdSize: 32,
    optTolerance: 0.8,
    color: '#ffffff',
    background: 'transparent',
  });
}

const isItemPng = (pngPath) =>
  /[\\/]scenes-\d+[\\/]items[\\/][^\\/]+\.png$/.test(pngPath);

// Find directories to scan. If --dir given, use that. Otherwise scan
// public/assets/scenes-*/ and all their subdirs.
function findScenesDirs() {
  if (DIR_ARG) {
    const abs = path.isAbsolute(DIR_ARG) ? DIR_ARG : path.join(root, DIR_ARG);
    return [abs];
  }
  const assetsDir = path.join(root, 'public/assets');
  if (!fs.existsSync(assetsDir)) return [];
  return fs
    .readdirSync(assetsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('scenes-'))
    .map((d) => path.join(assetsDir, d.name));
}

// Recursively collect *.png under a directory.
function collectPngs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectPngs(fp));
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      if (ONLY && !entry.name.startsWith(ONLY)) continue;
      out.push(fp);
    }
  }
  return out;
}

const dirs = findScenesDirs();
if (dirs.length === 0) {
  console.log('No scenes-* directories found.');
  process.exit(0);
}

const pngFiles = dirs.flatMap(collectPngs).sort();
if (pngFiles.length === 0) {
  console.log('No PNGs found in', dirs.join(', '));
  process.exit(0);
}

console.log(`Directories: ${dirs.map((d) => path.relative(root, d)).join(', ')}`);
console.log(`Threshold:   ${THRESHOLD}`);
console.log(`PNG files:   ${pngFiles.length}${ONLY ? ` (filter: ${ONLY}*)` : ''}`);
console.log('');

let done = 0;
let skipped = 0;
let failed = 0;
let pngBytes = 0;
let svgBytes = 0;

for (const pngPath of pngFiles) {
  const svgPath = pngPath.replace(/\.png$/, '.svg');
  const pngStat = fs.statSync(pngPath);
  pngBytes += pngStat.size;

  if (!FORCE && fs.existsSync(svgPath)) {
    const svgStat = fs.statSync(svgPath);
    if (svgStat.mtimeMs >= pngStat.mtimeMs) {
      skipped++;
      svgBytes += svgStat.size;
      continue;
    }
  }

  try {
    const svg = await trace(pngPath, traceOpts);
    fs.writeFileSync(svgPath, svg);
    const svgStat = fs.statSync(svgPath);
    svgBytes += svgStat.size;
    const ratio = ((svgStat.size / pngStat.size) * 100).toFixed(1);
    const rel = path.relative(root, pngPath).replace(/\\/g, '/');
    console.log(
      `OK  ${rel.replace(/\.png$/, '')}  PNG ${Math.round(pngStat.size / 1024)}KB → SVG ${Math.round(svgStat.size / 1024)}KB (${ratio}%)`,
    );
    done++;

    // Items also get a -fill.svg (white silhouette) to mask the place
    // background under the item's transparent interior.
    if (isItemPng(pngPath)) {
      const fillPath = pngPath.replace(/\.png$/, '-fill.svg');
      const fillSvg = await traceSilhouette(pngPath);
      fs.writeFileSync(fillPath, fillSvg);
      const fkb = Math.round(fs.statSync(fillPath).size / 1024);
      console.log(`    + silhouette  ${path.relative(root, fillPath).replace(/\\/g, '/')}  (${fkb} KB)`);
    }
  } catch (e) {
    failed++;
    console.error(`ERR ${path.relative(root, pngPath)}  ${e.message}`);
  }
}

const overall = pngBytes > 0 ? ((svgBytes / pngBytes) * 100).toFixed(1) : '0';
console.log('');
console.log(
  `Summary: ${done} traced, ${skipped} skipped, ${failed} failed.  Total PNG ${Math.round(pngBytes / 1024)}KB → SVG ${Math.round(svgBytes / 1024)}KB (${overall}%)`,
);
process.exit(failed === 0 ? 0 : 1);
