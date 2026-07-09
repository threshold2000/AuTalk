// Module 6 (money-count) figure — real NT coin photos scattered at random
// positions with random rotations inside the scene container.

const B = import.meta.env.BASE_URL;

const COIN_SRC = {
  1:  `${B}assets/scenes-6/coin1.png`,
  5:  `${B}assets/scenes-6/coin5.png`,
  10: `${B}assets/scenes-6/coin10.png`,
  20: `${B}assets/scenes-6/coin20.png`,
  50: `${B}assets/scenes-6/coin50.png`,
};

// Diameter as a percentage of the scene container, scaled from the real-world
// NT coin diameters (1 元 = 20 mm baseline):
//   5 元 22 mm  → ×1.10
//  10 元 26 mm  → ×1.30
//  20 元 26.85 mm → ×1.34
//  50 元 28 mm  → ×1.40
const COIN_SIZE = {
  1:  16.0,
  5:  17.6,
  10: 20.8,
  20: 21.5,
  50: 22.4,
};

// Coins start inside the left 66 % of the scene so the child has clear
// empty space on the right to push them into while counting.
const START_RIGHT_PCT = 66;

// Pick a spot that does not overlap any already-placed coin. Compare
// centre distance against the sum of the two radii (plus a small buffer)
// rather than corner distance, so coins really don't touch.
function placeAway(denom, existing) {
  const size = COIN_SIZE[denom];
  const half = size / 2;
  const buffer = 1; // 1% extra gap so coins are visibly separate
  const maxLeft = Math.max(size + 2, START_RIGHT_PCT - size - 2);
  const maxTop  = Math.max(0, 100 - size - 2);

  let best = null;
  let bestOverlap = Infinity;
  const attempts = 60;
  for (let i = 0; i < attempts; i++) {
    const left = 2 + Math.random() * (maxLeft - 2);
    const top  = 2 + Math.random() * (maxTop  - 2);
    const cx = left + half;
    const cy = top + half;

    let worstOverlap = 0;
    for (const e of existing) {
      const dx = cx - e.cx;
      const dy = cy - e.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minSep = half + e.radius + buffer;
      const overlap = minSep - dist;
      if (overlap > worstOverlap) worstOverlap = overlap;
    }
    if (worstOverlap <= 0) {
      return { left, top, cx, cy, radius: half, rot: (Math.random() - 0.5) * 60 };
    }
    if (worstOverlap < bestOverlap) {
      bestOverlap = worstOverlap;
      best = { left, top, cx, cy, radius: half };
    }
  }
  return { ...best, rot: (Math.random() - 0.5) * 60 };
}

export function createCoinFigure(coins) {
  const el = document.createElement('div');
  el.className = 'scene scene--coins';
  el.innerHTML = `
    <div class="coins-grid"></div>
    <div class="scene__fallback">
      <div class="scene__hint">沒有錢幣</div>
    </div>
  `;
  applyCoins(el, coins);
  return el;
}

export function updateCoinFigure(el, coins) {
  const grid = el.querySelector('.coins-grid');
  grid.style.opacity = '0';
  setTimeout(() => {
    applyCoins(el, coins);
    requestAnimationFrame(() => {
      grid.style.opacity = '1';
    });
  }, 180);
}

function applyCoins(el, coins) {
  const grid = el.querySelector('.coins-grid');
  const fb = el.querySelector('.scene__fallback');
  grid.innerHTML = '';

  if (!coins || coins.length === 0) {
    grid.style.display = 'none';
    fb.style.display = 'flex';
    return;
  }

  const placed = [];
  let zTop = 1;
  for (const denom of coins) {
    const img = document.createElement('img');
    img.className = `coin coin--${denom}`;
    img.src = COIN_SRC[denom] || COIN_SRC[1];
    img.alt = '';
    img.draggable = false;
    const spot = placeAway(denom, placed);
    placed.push({ cx: spot.cx, cy: spot.cy, radius: spot.radius });
    img.style.left = `${spot.left}%`;
    img.style.top = `${spot.top}%`;
    img.style.width = `${COIN_SIZE[denom]}%`;
    img.style.transform = `rotate(${spot.rot}deg)`;
    attachDrag(img, grid, COIN_SIZE[denom], () => ++zTop);
    grid.appendChild(img);
  }
  grid.style.display = 'block';
  fb.style.display = 'none';
  grid.style.opacity = '1';
}

// Pointer-based drag so the child can push the coin across the scene while
// counting. Uses percentage coords so the movement follows the scene's
// responsive sizing.
function attachDrag(img, grid, sizePct, bringToFront) {
  img.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = grid.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    img.setPointerCapture(e.pointerId);
    img.style.zIndex = String(bringToFront());
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startLeft = parseFloat(img.style.left) || 0;
    const startTop  = parseFloat(img.style.top)  || 0;
    const maxPos = 100 - sizePct;

    const onMove = (ev) => {
      const dxPct = ((ev.clientX - startClientX) / rect.width)  * 100;
      const dyPct = ((ev.clientY - startClientY) / rect.height) * 100;
      const nl = Math.max(0, Math.min(maxPos, startLeft + dxPct));
      const nt = Math.max(0, Math.min(maxPos, startTop  + dyPct));
      img.style.left = `${nl}%`;
      img.style.top  = `${nt}%`;
    };
    const onUp = () => {
      img.removeEventListener('pointermove', onMove);
      img.removeEventListener('pointerup', onUp);
      img.removeEventListener('pointercancel', onUp);
    };
    img.addEventListener('pointermove', onMove);
    img.addEventListener('pointerup', onUp);
    img.addEventListener('pointercancel', onUp);
  });
}

export function totalOf(coins) {
  return (coins || []).reduce((s, d) => s + d, 0);
}
