#!/usr/bin/env node
// Generate scene PNGs using Google Gemini 2.5 Flash Image (a.k.a. Nano Banana).
// Writes to public/assets/scenes-nano/ so it sits beside the OpenAI version.
// Same prompt as gen-scenes.mjs so visual quality can be compared directly.
//
// Usage:
//   npm run gen-scenes-nano -- --pairs dog:running,cat:cycling
//   npm run gen-scenes-nano -- --animals dog --actions running
//   npm run gen-scenes-nano                 # all 120 combos
//
// Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from .env.local.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildScenePrompt } from './lib/prompt.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ---- env loader ----
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

const outDir = path.join(root, 'public/assets/scenes-1-nano');
fs.mkdirSync(outDir, { recursive: true });

// ---- prompt (shared with gen-scenes.mjs via tools/lib/prompt.mjs) ----
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
      console.error(`Unknown pair "${raw}"`);
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
console.log(`Out dir:     ${outDir}`);
console.log(`To generate: ${work.length} (force=${FORCE})`);
if (work.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}
console.log('');

// ---- API call ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callApiOnce(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
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
        const wait = e.waitMs || 20000;
        console.log(`     429 — sleeping ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  const b64 = extractImageBase64(data);
  if (!b64) {
    throw new Error('No inline image in response: ' + JSON.stringify(data).slice(0, 400));
  }
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(fp, buf);
  return Math.round(buf.length / 1024);
}

let done = 0;
let failed = 0;
const started = Date.now();
let cursor = 0;
async function worker() {
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
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const secs = Math.round((Date.now() - started) / 1000);
console.log(`\nDone. ${done} ok, ${failed} failed, ${secs}s elapsed.`);
process.exit(failed === 0 ? 0 : 1);
