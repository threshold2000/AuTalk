// Module 5 (what-color) figure — one B&W item outline + one silhouette
// stacked with CSS `mask-image` so the fill layer can be any color at runtime.
//
// Assets per item (only 6 needed, no color cross-product):
//   scenes-5/items/<item>.png       — raw outline PNG from Nano
//   scenes-5/items/<item>.svg       — traced line drawing (black)
//   scenes-5/items/<item>-fill.svg  — flood-filled silhouette (white)
//
// Rendering:
//   - <div class="scene__color-fill"> uses -fill.svg as mask-image and gets
//     `background-color: <hex>` so the silhouette region is painted the
//     selected colour.
//   - <img class="scene__color-line"> overlays the outline on top.

const B = import.meta.env.BASE_URL;

const itemLineSrc = (item) => `${B}assets/scenes-5/items/${item.id}.svg`;
const itemFillSrc = (item) => `${B}assets/scenes-5/items/${item.id}-fill.svg`;

function probeImage(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

export function createColorFigure(item, color) {
  const el = document.createElement('div');
  el.className = 'scene scene--color';
  el.innerHTML = `
    <div class="scene__color-fill"></div>
    <img class="scene__color-line" alt="" />
    <div class="scene__fallback">
      <div class="scene__hint">圖尚未生成<br>請執行 <code>npm run gen-color-items-nano</code></div>
    </div>
  `;
  applyColor(el, item, color);
  return el;
}

export function updateColorFigure(el, item, color) {
  const fill = el.querySelector('.scene__color-fill');
  const line = el.querySelector('.scene__color-line');
  const fb = el.querySelector('.scene__fallback');
  fill.style.opacity = '0';
  line.style.opacity = '0';
  fb.style.opacity = '0';
  setTimeout(() => {
    applyColor(el, item, color);
    requestAnimationFrame(() => {
      fill.style.opacity = '1';
      line.style.opacity = '1';
      fb.style.opacity = '1';
    });
  }, 180);
}

async function applyColor(el, item, color) {
  const fill = el.querySelector('.scene__color-fill');
  const line = el.querySelector('.scene__color-line');
  const fb = el.querySelector('.scene__fallback');

  line.removeAttribute('src');
  fill.style.display = 'none';
  line.style.display = 'none';
  fb.style.display = 'none';

  const reqKey = `${item.id}_${color.id}`;
  el.dataset.req = reqKey;
  const stillCurrent = () => el.dataset.req === reqKey;

  const lineUrl = itemLineSrc(item);
  const fillUrl = itemFillSrc(item);
  const [hasLine, hasFill] = await Promise.all([probeImage(lineUrl), probeImage(fillUrl)]);
  if (!stillCurrent()) return;

  if (hasLine) {
    line.src = lineUrl;
    line.style.display = 'block';
  }
  if (hasFill) {
    fill.style.webkitMaskImage = `url(${fillUrl})`;
    fill.style.maskImage = `url(${fillUrl})`;
    fill.style.backgroundColor = color.swatch;
    fill.style.display = 'block';
  }
  if (!hasLine && !hasFill) {
    fb.style.display = 'flex';
  }
}
