const B = import.meta.env.BASE_URL;

const foodSrc = (food) => `${B}assets/scenes-3/foods/${food.id}.svg`;

// Item size (as % of figure width) chosen so `total` copies fit comfortably
// inside the figure with flex-wrap and reasonable padding.
const SIZE_PCT_BY_COUNT = {
  1: 60, 2: 42, 3: 32, 4: 30, 5: 26, 6: 24, 7: 22, 8: 22, 9: 22, 10: 19,
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// groups: [{ food, count }, ...]
//   single mode: 1 group
//   mix mode:    2 groups, total count = sum
export function createCountFigure(groups) {
  const el = document.createElement('div');
  el.className = 'scene scene--count';
  el.innerHTML = `
    <div class="scene__count-grid"></div>
    <div class="scene__fallback">
      <div class="scene__hint">圖尚未生成<br>請執行 <code>npm run gen-foods-nano</code></div>
    </div>
  `;
  applyCountFigure(el, groups);
  return el;
}

export function updateCountFigure(el, groups) {
  const grid = el.querySelector('.scene__count-grid');
  grid.style.opacity = '0';
  setTimeout(() => {
    applyCountFigure(el, groups);
    requestAnimationFrame(() => {
      grid.style.opacity = '1';
    });
  }, 180);
}

function applyCountFigure(el, groups) {
  const grid = el.querySelector('.scene__count-grid');
  const fb = el.querySelector('.scene__fallback');

  const total = groups.reduce((s, g) => s + g.count, 0);
  const sizePct = SIZE_PCT_BY_COUNT[total] || 18;

  grid.innerHTML = '';
  // start with both hidden; first-img load/error event will toggle as needed
  grid.style.display = 'none';
  fb.style.display = 'none';

  // Expand groups into an array of (food, src) entries, then shuffle so the
  // two foods interleave when in mix mode.
  const expanded = [];
  for (const g of groups) {
    const src = foodSrc(g.food);
    for (let i = 0; i < g.count; i++) expanded.push({ food: g.food, src });
  }
  shuffleInPlace(expanded);

  let anyOk = false;
  expanded.forEach((entry, i) => {
    const img = document.createElement('img');
    img.className = 'scene__count-item';
    img.src = entry.src;
    img.alt = entry.food.name;
    img.style.width = `${sizePct}%`;
    img.style.height = `${sizePct}%`;
    if (i === 0) {
      img.addEventListener('load', () => {
        anyOk = true;
        grid.style.display = 'flex';
        fb.style.display = 'none';
        grid.style.opacity = '1';
      });
      img.addEventListener('error', () => {
        if (!anyOk) {
          grid.style.display = 'none';
          fb.style.display = 'flex';
        }
      });
    }
    grid.appendChild(img);
  });
}

const CHINESE_NUMS = ['', '一個', '兩個', '三個', '四個', '五個', '六個', '七個', '八個', '九個', '十個'];
export const chineseCount = (n) => CHINESE_NUMS[n] || `${n}個`;
