#!/usr/bin/env node
// Module-6 coin image generator using Google Gemini 2.5 Flash Image.
// Generates 3 New Taiwan Dollar coin PNGs (1/5/10 元) to
// public/assets/scenes-6/coin{1,5,10}.png. White-ish backgrounds are
// converted to transparent so the coins can be scattered over the scene.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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
  console.error('Missing GEMINI_API_KEY in .env.local.');
  process.exit(1);
}

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const MODEL = 'gemini-2.5-flash-image';

const COINS = [
  {
    id: 'coin1', denom: 1,
    prompt: 'A photorealistic top-down view of a single circular New Taiwan Dollar (NT$1) coin. Bright silver-nickel metal with a raised rim. The reverse face is shown: a very LARGE Arabic numeral 1 dominates the center, with the Chinese characters 壹圓 arranged around it and a small plum-blossom motif. The coin fills most of the frame. Set on a pure white background. No text overlays, no drop shadow, no other objects, no perspective — a flat overhead product photo of just the coin.',
  },
  {
    id: 'coin5', denom: 5,
    prompt: 'A photorealistic top-down view of a single circular New Taiwan Dollar (NT$5) coin, slightly larger than the NT$1 coin. Bright silver-nickel metal with a raised rim. The reverse face is shown: a very LARGE Arabic numeral 5 dominates the center, with the Chinese characters 伍圓 arranged around it and a small plum-blossom motif. The coin fills most of the frame. Set on a pure white background. No text overlays, no drop shadow, no other objects, no perspective — a flat overhead product photo of just the coin.',
  },
  {
    id: 'coin10', denom: 10,
    prompt: 'A photorealistic top-down view of a single circular New Taiwan Dollar (NT$10) coin, larger than both the NT$1 and NT$5 coins. Bright silver-nickel metal with a raised rim. The reverse face is shown: a very LARGE two-digit Arabic numeral 10 dominates the center, with the Chinese characters 拾圓 arranged around it. The coin fills most of the frame. Set on a pure white background. No text overlays, no drop shadow, no other objects, no perspective — a flat overhead product photo of just the coin.',
  },
];

const outDir = path.join(root, 'public/assets/scenes-6');
fs.mkdirSync(outDir, { recursive: true });

const work = COINS.filter((c) => FORCE || !fs.existsSync(path.join(outDir, `${c.id}.png`)));
console.log(`Model:       ${MODEL}`);
console.log(`To generate: ${work.length} / 3 (force=${FORCE})`);
if (work.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

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
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
  }
  return resp.json();
}

function extractImageBase64(data) {
  for (const c of (data.candidates || [])) {
    for (const p of (c.content?.parts || [])) {
      if (p.inlineData?.data) return p.inlineData.data;
      if (p.inline_data?.data) return p.inline_data.data;
    }
  }
  return null;
}

async function whiteBackgroundToTransparent(buf, threshold = 240) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

let done = 0;
for (const c of work) {
  try {
    const data = await callApiOnce(c.prompt);
    const b64 = extractImageBase64(data);
    if (!b64) throw new Error('No inline image in response');
    const buf = await whiteBackgroundToTransparent(Buffer.from(b64, 'base64'));
    const fp = path.join(outDir, `${c.id}.png`);
    fs.writeFileSync(fp, buf);
    console.log(`OK  ${c.id}.png  (${Math.round(buf.length / 1024)} KB)`);
    done++;
  } catch (e) {
    console.error(`ERR ${c.id}: ${e.message}`);
  }
}
console.log(`\nDone. ${done}/${work.length} ok.`);
