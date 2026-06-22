# AutismLangTraining

幫助家長帶自閉症兒童練習「主動語言表達」的 web app.

## 練習模組

### 1. 誰正在做什麼 (XX 正在 YY)
- 10 動物 × 12 動作 = 120 種組合, 各別生圖到 `public/assets/scenes-1/`
- 左欄「誰」「動作」可分別鎖定, 右欄「下一張」隨機換沒鎖的 (且不連續同一張)
- 右上 toggle 切換文字顯示, 鎖住的詞會橘色高亮

### 2. 什麼在哪裡 (X 在 Y)
- 12 物件 + 12 場景, **用 composite 疊圖** (場景背景 + 物件透明 PNG 定位)
- 圖在 `public/assets/scenes-2/items/` 跟 `public/assets/scenes-2/places/`
- 物件位置寫在 `src/data/places.js` 的 `itemAnchor` (top/left/size, 0..1 比例)
- 特殊處理: `clip` (藏在大碗後面 只露上半) / `rotate` (從桌邊掉下去)
- 互動跟模組 1 一樣 (lock / next / 文字 toggle)

通用: iPad 橫版 + 手機橫版優先, 透過 Tailscale Funnel 在真機測.

## 開發

```bash
npm install
npm run dev
```

Vite 綁 `0.0.0.0:5000`. 配合既有的 Tailscale Funnel:

```
https://20180089nb.flicker-broadnose.ts.net/  →  http://127.0.0.1:5000/
```

iPad / 手機開 `https://20180089nb.flicker-broadnose.ts.net/`.

## 生成圖片

填 API key 一次:
```bash
cp .env.example .env.local
# 編輯 .env.local, 填 OPENAI_API_KEY
```

### 模組 1 (`scenes-1/`)
```bash
npm run gen-scenes                                  # 全部 120 張
npm run gen-scenes -- --animals dog,cat --actions running,cycling  # 子集
npm run gen-scenes -- --force --animals dog                        # 重生
```
成本 ~$0.04 USD / 張 (gpt-image-1 1024×1024), 全部 120 張 ~$4.80.

### 模組 2 (`scenes-2/`)
```bash
npm run gen-pieces                                  # 全部 24 張 (12 items + 12 places)
npm run gen-pieces -- --kind items                  # 只生 items
npm run gen-pieces -- --kind places                 # 只生 places
npm run gen-pieces -- --only banana,table_top       # 指定 id
```
Items 用 `background: transparent` (overlay 需要透明), places 白底.
全部 24 張 ~$0.96.

### Trace PNG → SVG (兩個模組共用)
```bash
npm run optimize-scenes                # 掃所有 scenes-*/ 遞迴 trace
npm run optimize-scenes -- --force     # 重 trace 全部
npm run optimize-scenes -- --dir public/assets/scenes-2  # 限定子目錄
```
SVG 比 PNG 小約 37 倍.

## 保持風格一致 (加新內容時)

現有圖是用 [tools/lib/prompt.mjs](tools/lib/prompt.mjs) 鎖定的 prompt 生的.

1. **不要動 [tools/lib/prompt.mjs](tools/lib/prompt.mjs)** — 改了之後新生的圖會跟現有 set 不同風格. 真要改另寫新檔, 不要 mutate.
2. **新項目的 `en` 描述沿用同樣精簡度** — 例如 `running`, `a banana`, `a wooden table`. 不要寫長, 不要加環境.
3. **跑同樣的 model** (`gpt-image-1`). 換 model 風格一定跑掉.
4. **生完跑 `npm run optimize-scenes`** 統一 trace 成 SVG.

加新項目流程:
```bash
# 模組 1: 在 src/data/animals.js 或 actions.js 加 entry
npm run gen-scenes -- --animals <newId>
# 模組 2: 在 src/data/items.js 或 places.js 加 entry
npm run gen-pieces -- --only <newId>

npm run optimize-scenes
```

Image model 本質 stochastic, 同 prompt 每張仍 ±10-20% 風格變動. 跟現有 set 差太多就刪掉 PNG+SVG 用 `--force` 重生.

## Build (給 GitHub Pages, 之後再用)

```bash
npm run build      # 產出 dist/, vite.config.js base: './' 已處理子路徑
```

## 加新練習模組

1. 新資料: `src/data/<thing>.js`
2. 新 component: `src/components/<x>-figure.js` (參考 `scene-figure.js` 或 `place-figure.js`)
3. 新 page: `src/pages/<my-module>.js`
4. `src/main.js` 註冊 route, `src/pages/home.js` 加 entry + `enabled: true`
5. 圖目錄: `public/assets/scenes-<N>/`, gen script 比照 `gen-scenes.mjs` / `gen-pieces.mjs` 寫一個
