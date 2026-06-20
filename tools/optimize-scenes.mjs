#!/usr/bin/env node
// Vectorize generated PNG scenes into SVG via potrace.
// Reads public/assets/scenes/*.png, writes corresponding *.svg next to them.
// Idempotent: skips if .svg already newer than .png.
//
// Usage:
//   npm run optimize-scenes
//   npm run optimize-scenes -- --force
//   npm run optimize-scenes -- --threshold 180
//   npm run optimize-scenes -- --only dog_running

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import potrace from 'potrace';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const scenesDir = path.join(root, 'public/assets/scenes');

const argv = process.argv.slice(2);
const flagVal = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? null : argv[i + 1];
};
const FORCE = argv.includes('--force');
const THRESHOLD = Number(flagVal('--threshold') || 180);
const ONLY = flagVal('--only');

if (!fs.existsSync(scenesDir)) {
  console.error(`Scenes dir does not exist: ${scenesDir}`);
  process.exit(1);
}

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

const pngFiles = fs
  .readdirSync(scenesDir)
  .filter((f) => f.endsWith('.png'))
  .filter((f) => !ONLY || f.startsWith(ONLY))
  .sort();

if (pngFiles.length === 0) {
  console.log('No PNGs found in', scenesDir);
  process.exit(0);
}

console.log(`Scenes dir:  ${scenesDir}`);
console.log(`Threshold:   ${THRESHOLD}`);
console.log(`PNG files:   ${pngFiles.length}${ONLY ? ` (filter: ${ONLY}*)` : ''}`);
console.log('');

let done = 0;
let skipped = 0;
let failed = 0;
let pngBytes = 0;
let svgBytes = 0;

for (const file of pngFiles) {
  const pngPath = path.join(scenesDir, file);
  const svgPath = path.join(scenesDir, file.replace(/\.png$/, '.svg'));
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
    console.log(
      `OK  ${file.replace(/\.png$/, '')}  PNG ${Math.round(pngStat.size / 1024)}KB → SVG ${Math.round(
        svgStat.size / 1024,
      )}KB (${ratio}%)`,
    );
    done++;
  } catch (e) {
    failed++;
    console.error(`ERR ${file}  ${e.message}`);
  }
}

const pngTotal = Math.round(pngBytes / 1024);
const svgTotal = Math.round(svgBytes / 1024);
const overall = pngBytes > 0 ? ((svgBytes / pngBytes) * 100).toFixed(1) : '0';
console.log('');
console.log(
  `Summary: ${done} traced, ${skipped} skipped, ${failed} failed.  Total PNG ${pngTotal}KB → SVG ${svgTotal}KB (${overall}%)`,
);
process.exit(failed === 0 ? 0 : 1);
