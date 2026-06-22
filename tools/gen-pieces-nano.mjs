#!/usr/bin/env node
// Module-2 image generator using Google Gemini 2.5 Flash Image (Nano Banana).
// Generates 12 items + 12 places to public/assets/scenes-2/{items,places}/.
//
// Gemini doesn't expose a `transparent background` option, so items come back
// with a white background. We post-process item PNGs with sharp: pixels near
// pure white have their alpha forced to 0, so items composite cleanly over
// place backgrounds.
//
// Usage:
//   npm run gen-pieces-nano                              # missing 24
//   npm run gen-pieces-nano -- --kind items              # only items
//   npm run gen-pieces-nano -- --kind places             # only places
//   npm run gen-pieces-nano -- --only shoes,screwdriver  # specific ids
//   npm run gen-pieces-nano -- --force                   # re-generate
//
// Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from .env.local.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { buildItemPrompt, buildPlacePrompt } from './lib/prompt.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ---- env ----
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local.');
  console.error('Get one at https://aistudio.google.com/apikey');
  process.exit(1);
}

// ---- args ----
const argv = process.argv.slice(2);
const flagVal = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? null : argv[i + 1];
};
const flagBool = (f) => argv.includes(f);
const FORCE = flagBool('--force');
const MODEL = flagVal('--model') || 'gemini-2.5-flash-image';
const CONCURRENCY = Number(flagVal('--concurrency') || 2);
const MAX_RETRIES = Number(flagVal('--retries') || 6);
const KIND = flagVal('--kind');
const ONLY = flagVal('--only');

// ---- data ----
const itemsMod = await import(pathToFileURL(path.join(root, 'src/data/items.js')).href);
const placesMod = await import(pathToFileURL(path.join(root, 'src/data/places.js')).href);
const allItems = itemsMod.items;
const allPlaces = placesMod.places;

const onlySet = ONLY ? new Set(ONLY.split(',')) : null;

const itemsOutDir = path.join(root, 'public/assets/scenes-2/items');
const placesOutDir = path.join(root, 'public/assets/scenes-2/places');
fs.mkdirSync(itemsOutDir, { recursive: true });
fs.mkdirSync(placesOutDir, { recursive: true });

// ---- worklist ----
const work = [];
if (!KIND || KIND === 'items') {
  for (const it of allItems) {
    if (onlySet && !onlySet.has(it.id)) continue;
    const file = `${it.id}.png`;
    const fp = path.join(itemsOutDir, file);
    if (!FORCE && fs.existsSync(fp)) continue;
    work.push({ kind: 'item', payload: it, fp, file });
  }
}
if (!KIND || KIND === 'places') {
  for (const pl of allPlaces) {
    if (onlySet && !onlySet.has(pl.id)) continue;
    const file = `${pl.id}.png`;
    const fp = path.join(placesOutDir, file);
    if (!FORCE && fs.existsSync(fp)) continue;
    work.push({ kind: 'place', payload: pl, fp, file });
  }
}

console.log(`Model:       ${MODEL}`);
console.log(`Items:       ${allItems.length}, Places: ${allPlaces.length}`);
console.log(`To generate: ${work.length} (kind=${KIND || 'both'}, force=${FORCE})`);
if (work.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}
console.log('');

// ---- Gemini API ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callApiOnce(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    const err = new Error(`HTTP ${resp.status}: ${t.slice(0, 400)}`);
    err.status = resp.status;
    if (resp.status === 429) {
      const m = t.match(/retry.*?(\d+(?:\.\d+)?)\s*s/i);
      err.waitMs = m ? Math.ceil(Number(m[1]) * 1000) + 500 : 20000;
    }
    throw err;
  }
  return resp.json();
}

function extractImageBase64(data) {
  const cands = data.candidates || [];
  for (const c of cands) {
    const parts = c.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData?.data) return p.inlineData.data;
      if (p.inline_data?.data) return p.inline_data.data;
    }
  }
  return null;
}

// Convert near-white background pixels to fully transparent.
// Used for items because Gemini does not expose a transparent-bg option.
async function whiteBackgroundToTransparent(buf, threshold = 240) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0; // alpha = 0
    }
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function generate(item) {
  const isItem = item.kind === 'item';
  const prompt = isItem ? buildItemPrompt({ item: item.payload }) : buildPlacePrompt({ place: item.payload });
  let data;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      data = await callApiOnce(prompt);
      break;
    } catch (e) {
      if (e.status === 429 && attempt <= MAX_RETRIES) {
        const w = e.waitMs || 20000;
        console.log(`     429 — sleeping ${Math.round(w / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(w);
        continue;
      }
      throw e;
    }
  }
  const b64 = extractImageBase64(data);
  if (!b64) throw new Error('No inline image in Gemini response');
  let buf = Buffer.from(b64, 'base64');
  if (isItem) buf = await whiteBackgroundToTransparent(buf);
  fs.writeFileSync(item.fp, buf);
  return Math.round(buf.length / 1024);
}

let done = 0;
let failed = 0;
const started = Date.now();
let cursor = 0;
async function worker() {
  while (cursor < work.length) {
    const w = work[cursor++];
    const tag = `[${String(done + failed + 1).padStart(3)}/${work.length}]`;
    try {
      const kb = await generate(w);
      done++;
      console.log(`${tag} OK  ${w.kind}/${w.file}  (${kb} KB)`);
    } catch (e) {
      failed++;
      console.error(`${tag} ERR ${w.kind}/${w.file}  ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const secs = Math.round((Date.now() - started) / 1000);
console.log(`\nDone. ${done} ok, ${failed} failed, ${secs}s elapsed.`);
process.exit(failed === 0 ? 0 : 1);
