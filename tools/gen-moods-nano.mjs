#!/usr/bin/env node
// Module 4 (who-feeling) image generator using Google Gemini 2.5 Flash Image.
// 7 characters × 6 emotions = 42 PNGs into public/assets/scenes-4/.
// Single composed scene per cell, file name <char>_<emotion>.png.
//
// Usage:
//   npm run gen-moods-nano
//   npm run gen-moods-nano -- --only boy_sad_cake,girl_happy_icecream
//   npm run gen-moods-nano -- --characters boy,girl
//   npm run gen-moods-nano -- --emotions sad_cake,happy_icecream
//   npm run gen-moods-nano -- --force

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildMoodPrompt } from './lib/prompt.mjs';

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
const ONLY = flagVal('--only');
const CHAR_FILTER = flagVal('--characters');
const EMO_FILTER = flagVal('--emotions');

// ---- data ----
const charactersMod = await import(pathToFileURL(path.join(root, 'src/data/characters.js')).href);
const emotionsMod = await import(pathToFileURL(path.join(root, 'src/data/emotions.js')).href);
const allChars = charactersMod.characters;
const allEmos = emotionsMod.emotions;

const onlySet = ONLY ? new Set(ONLY.split(',')) : null;
const charSet = CHAR_FILTER ? new Set(CHAR_FILTER.split(',')) : null;
const emoSet = EMO_FILTER ? new Set(EMO_FILTER.split(',')) : null;

const outDir = path.join(root, 'public/assets/scenes-4');
fs.mkdirSync(outDir, { recursive: true });

// ---- worklist (cross product) ----
const work = [];
for (const c of allChars) {
  if (charSet && !charSet.has(c.id)) continue;
  for (const e of allEmos) {
    if (emoSet && !emoSet.has(e.id)) continue;
    const id = `${c.id}_${e.id}`;
    if (onlySet && !onlySet.has(id)) continue;
    const file = `${id}.png`;
    const fp = path.join(outDir, file);
    if (!FORCE && fs.existsSync(fp)) continue;
    work.push({ char: c, emo: e, fp, file });
  }
}

console.log(`Model:       ${MODEL}`);
console.log(`Characters:  ${allChars.length}, Emotions: ${allEmos.length}`);
console.log(`To generate: ${work.length} (force=${FORCE})`);
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

async function generate(item) {
  const prompt = buildMoodPrompt({ character: item.char, emotion: item.emo });
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
  const buf = Buffer.from(b64, 'base64');
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
      console.log(`${tag} OK  ${w.file}  (${kb} KB)`);
    } catch (e) {
      failed++;
      console.error(`${tag} ERR ${w.file}  ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const secs = Math.round((Date.now() - started) / 1000);
console.log(`\nDone. ${done} ok, ${failed} failed, ${secs}s elapsed.`);
process.exit(failed === 0 ? 0 : 1);
