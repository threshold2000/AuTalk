# AutismLangTraining

幫助家長帶自閉症兒童練習「主動語言表達」的 web app.

## 第一組練習: 誰正在做什麼 (XX 正在 YY)

- 10 動物 × 12 動作 = 120 種組合 (圖透過 OpenAI DALL-E 3 生成, 黑線卡通風格)
- 左欄「誰」「動作」可分別 toggle 鎖定 (鎖頭 icon)
- 右欄「下一張」按鈕: 鎖住的不變, 沒鎖的隨機換 (且不連續同一張)
- 右上「顯示文字」toggle: 預設關閉, 開啟後顯示「小狗 正在跑步」這類完整句子, 鎖住的詞會橘色高亮
- 目標平台: iPad 橫版 + 手機橫版, 透過 Tailscale Funnel 在真機開

## 開發

```bash
npm install
npm run dev
```

Vite 綁 `0.0.0.0:5000`. 配合既有的 Tailscale Funnel:

```
https://20180089nb.flicker-broadnose.ts.net/  →  http://127.0.0.1:5000/
```

iPad / 手機直接開 `https://20180089nb.flicker-broadnose.ts.net/`.

## 生成場景圖 (用 OpenAI API)

每個 (動物 × 動作) 組合會輸出一張 PNG 到 `public/assets/scenes/<animal>_<action>.png`. 沒圖時 UI 會顯示 emoji + 中文 + 「請執行 npm run gen-scenes」hint.

### 1. 填 API key

```bash
cp .env.example .env.local
# 編輯 .env.local, 把 OPENAI_API_KEY 填好
```

`.env.local` 已被 gitignore.

### 2. 生圖

```bash
# 生全部還沒有的圖 (預設 dall-e-3, 1024x1024, 並發 3)
npm run gen-scenes

# 只生指定子集 (測 prompt 用)
npm run gen-scenes -- --animals dog,cat --actions running,cycling

# 強制重生
npm run gen-scenes -- --force --animals dog --actions running

# 換模型 / 尺寸 / 並發數
npm run gen-scenes -- --model gpt-image-1 --size 1024x1024 --concurrency 5
```

**成本** (DALL-E 3 standard 1024×1024 ≈ $0.04 USD/張):
- 全部 120 張 ≈ $4.80 USD
- 小批測試 (例 4×4 = 16 張) ≈ $0.64 USD

Script 是 idempotent — 跑兩次不會重生已存在的圖, 除非加 `--force`.

### 3. 調整 prompt

prompt 統一模板在 `tools/gen-scenes.mjs` 的 `buildPrompt()`. 動物用「anthropomorphic cartoon …」, 人 (小男孩/小女孩) 用「cute cartoon young …」. 改完 prompt 後加 `--force` 重跑想要的子集.

## Build (給之後 GitHub Pages, 不立刻需要)

```bash
npm run build
```

`vite.config.js` 已設 `base: './'`.

## 保持風格一致 (加新動物 / 新動作時)

現有 120 張圖是用 [tools/lib/prompt.mjs](tools/lib/prompt.mjs) 的 prompt + [src/data/actions.js](src/data/actions.js) 的 `en` 描述生出來的. 之後要加新內容又想風格一致, 規則:

1. **不要動 `tools/lib/prompt.mjs`** — 動了之後新生的圖會跟現有 120 張不同風格. 真的需要改 (例如想試新風格) 就另寫一個 `tools/lib/prompt-v2.mjs` + 新 script, 不要 mutate 原本的.
2. **新動物 / 動作的 `en` 描述沿用同樣的精簡度** — 像 "running", "drinking water from a cup" 這種短句, 不要寫成 "running in a park with trees", 也不要寫成 "runs".
3. **跑同樣的 model** (`gpt-image-1`). 換 model 風格絕對會跑掉.
4. **生完跑 `npm run optimize-scenes`** 統一 trace 成 SVG. 同一份 potrace 參數確保線條粗細跟現有一致.

加新項目的步驟:
```bash
# 1. 在 src/data/animals.js 或 actions.js 加 entry
# 2. 只生新項目相關的組合 (不要 --force 動到現有的)
npm run gen-scenes -- --animals <newId>         # 新動物 × 12 動作
npm run gen-scenes -- --actions <newId>         # 10 動物 × 新動作
# 3. trace 成 SVG
npm run optimize-scenes
```

注意 image model 本質 stochastic, 即使同 prompt 每張都有 ±10-20% 風格變動. 若某張新生圖跟 set 差太多, 刪掉 PNG+SVG 重新 `--force` 重生.

## 擴充

- **新動物**: `src/data/animals.js` 加 entry (`id, name, en, emoji`, 必要時 `human: true`), 然後 `npm run gen-scenes -- --animals <newId>`.
- **新動作**: `src/data/actions.js` 加 entry (`id, name, verb, en`), 然後 `npm run gen-scenes -- --actions <newId>`, 別忘了在 `src/components/scene-figure.js` 的 `ACTION_EMOJI` 補對應 fallback emoji.
- **新練習模組**: `src/pages/` 加新檔案 → `src/pages/home.js` 的 `modules` 把對應 entry `enabled: true` → `src/main.js` 註冊 route.
