#!/usr/bin/env node
// Module-2 (what-where) image generator.
// Generates 12 items + 12 places to:
//   public/assets/scenes-2/items/<id>.png
//   public/assets/scenes-2/places/<id>.png
// Items use `background: 'transparent'` so they can be composited over places.
//
// Usage:
//   npm run gen-pieces                         # all 24
//   npm run gen-pieces -- --kind items         # only items
//   npm run gen-pieces -- --kind places        # only places
//   npm run gen-pieces -- --only banana,peach  # specific ids (across both kinds)
//   npm run gen-pieces -- --force              # re-generate existing
//
// Reads OPENAI_API_KEY from .env.local.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env.local.');
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
const MODEL = flagVal('--model') || 'gpt-image-1';
const SIZE = flagVal('--size') || '1024x1024';
const CONCURRENCY = Number(flagVal('--concurrency') || 1);
const MAX_RETRIES = Number(flagVal('--retries') || 6);
const KIND = flagVal('--kind'); // 'items' | 'places' | null = both
const ONLY = flagVal('--only'); // comma-separated ids

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
const estUsd = (work.length * 0.04).toFixed(2);
console.log(`Estimated cost: ~$${estUsd} USD\n`);

// ---- API ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(text, resp) {
  const h = resp.headers.get('retry-after');
  if (h) {
    const s = Number(h);
    if (!Number.isNaN(s)) return Math.ceil(s * 1000);
  }
  const m = text.match(/try again in (\d+(?:\.\d+)?)s/i);
  if (m) return Math.ceil(Number(m[1]) * 1000) + 500;
  return null;
}

async function callApiOnce(prompt, { transparent }) {
  const body = { model: MODEL, prompt, n: 1, size: SIZE };
  if (transparent) body.background = 'transparent';
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    const err = new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
    err.status = resp.status;
    if (resp.status === 429) err.waitMs = parseRetryAfter(t, resp) ?? 15000;
    throw err;
  }
  return resp.json();
}

async function generate(item) {
  const isItem = item.kind === 'item';
  const prompt = isItem ? buildItemPrompt({ item: item.payload }) : buildPlacePrompt({ place: item.payload });
  let data;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      data = await callApiOnce(prompt, { transparent: isItem });
      break;
    } catch (e) {
      if (e.status === 429 && attempt <= MAX_RETRIES) {
        const w = e.waitMs || 15000;
        console.log(`     429 — sleeping ${Math.round(w / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(w);
        continue;
      }
      throw e;
    }
  }
  const item0 = data.data?.[0];
  let buf;
  if (item0?.b64_json) {
    buf = Buffer.from(item0.b64_json, 'base64');
  } else if (item0?.url) {
    const ir = await fetch(item0.url);
    if (!ir.ok) throw new Error(`Download failed: HTTP ${ir.status}`);
    buf = Buffer.from(await ir.arrayBuffer());
  } else {
    throw new Error('No image in response');
  }
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
