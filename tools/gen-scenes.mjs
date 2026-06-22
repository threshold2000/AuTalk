#!/usr/bin/env node
// Batch-generate scene PNGs for every (animal × action) combination using
// OpenAI Images API (DALL-E 3). Idempotent: skips files that already exist.
//
// Usage:
//   npm run gen-scenes
//   npm run gen-scenes -- --animals dog,cat --actions running,cycling
//   npm run gen-scenes -- --force                  (re-generate even if file exists)
//   npm run gen-scenes -- --model gpt-image-1      (use gpt-image-1 instead of dall-e-3)
//
// Reads OPENAI_API_KEY from .env.local (or process env).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildScenePrompt } from './lib/prompt.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ---- env loader (no dotenv dep) ----
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY. Put it in .env.local (see .env.example).');
  process.exit(1);
}

// ---- args ----
const argv = process.argv.slice(2);
const flagVal = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
};
const flagBool = (flag) => argv.includes(flag);
const FORCE = flagBool('--force');
const MODEL = flagVal('--model') || 'dall-e-3';
const SIZE = flagVal('--size') || '1024x1024';
const CONCURRENCY = Number(flagVal('--concurrency') || 1);
const MAX_RETRIES = Number(flagVal('--retries') || 6);
const filterAnimalsArg = flagVal('--animals');
const filterActionsArg = flagVal('--actions');
const pairsArg = flagVal('--pairs');

// ---- load data ----
const animalsMod = await import(pathToFileURL(path.join(root, 'src/data/animals.js')).href);
const actionsMod = await import(pathToFileURL(path.join(root, 'src/data/actions.js')).href);
const allAnimals = animalsMod.animals;
const allActions = actionsMod.actions;

const animalSet = filterAnimalsArg ? new Set(filterAnimalsArg.split(',')) : null;
const actionSet = filterActionsArg ? new Set(filterActionsArg.split(',')) : null;

const animals = animalSet ? allAnimals.filter((a) => animalSet.has(a.id)) : allAnimals;
const actions = actionSet ? allActions.filter((a) => actionSet.has(a.id)) : allActions;

if (animals.length === 0 || actions.length === 0) {
  console.error('Filter matched nothing. Check --animals / --actions ids.');
  process.exit(1);
}

const outDir = path.join(root, 'public/assets/scenes-1');
fs.mkdirSync(outDir, { recursive: true });

// ---- prompt (shared with gen-scenes-nano via tools/lib/prompt.mjs) ----
const buildPrompt = (animal, action) => buildScenePrompt({ animal, action });

// ---- worklist ----
const animalById = new Map(allAnimals.map((a) => [a.id, a]));
const actionById = new Map(allActions.map((a) => [a.id, a]));

const work = [];
if (pairsArg) {
  for (const raw of pairsArg.split(',')) {
    const [aid, vid] = raw.split(':');
    const an = animalById.get(aid);
    const ac = actionById.get(vid);
    if (!an || !ac) {
      console.error(`Unknown pair "${raw}" — check ids.`);
      process.exit(1);
    }
    const file = `${an.id}_${ac.id}.png`;
    const fp = path.join(outDir, file);
    if (!FORCE && fs.existsSync(fp)) continue;
    work.push({ animal: an, action: ac, file, fp });
  }
} else {
  for (const an of animals) {
    for (const ac of actions) {
      const file = `${an.id}_${ac.id}.png`;
      const fp = path.join(outDir, file);
      if (!FORCE && fs.existsSync(fp)) continue;
      work.push({ animal: an, action: ac, file, fp });
    }
  }
}

console.log(`Model:       ${MODEL}`);
console.log(`Size:        ${SIZE}`);
console.log(`Animals:     ${animals.length} (${animals.map((a) => a.id).join(',')})`);
console.log(`Actions:     ${actions.length} (${actions.map((a) => a.id).join(',')})`);
console.log(`To generate: ${work.length} (force=${FORCE})`);
if (work.length === 0) {
  console.log('Nothing to do. Use --force to re-generate.');
  process.exit(0);
}
const estUsd = (work.length * (MODEL === 'dall-e-3' ? 0.04 : 0.04)).toFixed(2);
console.log(`Estimated cost: ~$${estUsd} USD (varies by model/size)`);
console.log('');

// ---- generate ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(text, resp) {
  const header = resp.headers.get('retry-after');
  if (header) {
    const s = Number(header);
    if (!Number.isNaN(s)) return Math.ceil(s * 1000);
  }
  // OpenAI 429 message often says "Please try again in 12s." or "in 1.234s"
  const m = text.match(/try again in (\d+(?:\.\d+)?)s/i);
  if (m) return Math.ceil(Number(m[1]) * 1000) + 500;
  return null;
}

async function callApiOnce(prompt) {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, prompt, n: 1, size: SIZE }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    const wait = resp.status === 429 ? parseRetryAfter(t, resp) ?? 15000 : null;
    const err = new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
    err.status = resp.status;
    err.waitMs = wait;
    throw err;
  }
  return resp.json();
}

async function generate(item) {
  const { animal, action, fp } = item;
  const prompt = buildPrompt(animal, action);
  let data;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      data = await callApiOnce(prompt);
      break;
    } catch (e) {
      if (e.status === 429 && attempt <= MAX_RETRIES) {
        const wait = e.waitMs || 15000;
        console.log(`     429 rate limit — sleeping ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(wait);
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
    const imgResp = await fetch(item0.url);
    if (!imgResp.ok) throw new Error(`Download failed: HTTP ${imgResp.status}`);
    buf = Buffer.from(await imgResp.arrayBuffer());
  } else {
    throw new Error('No url or b64_json in response: ' + JSON.stringify(data).slice(0, 200));
  }
  fs.writeFileSync(fp, buf);
  return Math.round(buf.length / 1024);
}

let done = 0;
let failed = 0;
const startedAt = Date.now();
let cursor = 0;
async function worker(id) {
  while (cursor < work.length) {
    const item = work[cursor++];
    const tag = `[${String(done + failed + 1).padStart(3)}/${work.length}]`;
    try {
      const kb = await generate(item);
      done++;
      console.log(`${tag} OK  ${item.file}  (${kb} KB)`);
    } catch (e) {
      failed++;
      console.error(`${tag} ERR ${item.file}  ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

const secs = Math.round((Date.now() - startedAt) / 1000);
console.log(`\nDone. ${done} ok, ${failed} failed, ${secs}s elapsed.`);
process.exit(failed === 0 ? 0 : 1);
