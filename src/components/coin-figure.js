// Module 6 (money-count) figure — real NT coin photos scattered at random
// positions with random rotations inside the scene container.

const B = import.meta.env.BASE_URL;

const COIN_SRC = {
  1:  `${B}assets/scenes-6/coin1.png`,
  5:  `${B}assets/scenes-6/coin5.png`,
  10: `${B}assets/scenes-6/coin10.png`,
};

// Diameter as a percentage of the scene container.
const COIN_SIZE = {
  1:  16,
  5:  19,
  10: 23,
};

// Pick a spot that does not overlap any already-placed coin. Compare
// centre distance against the sum of the two radii (plus a small buffer)
// rather than corner distance, so coins really don't touch.
function placeAway(denom, existing) {
  const size = COIN_SIZE[denom];
  const half = size / 2;
  const buffer = 1; // 1% extra gap so coins are visibly separate
  const maxLeft = Math.max(0, 100 - size - 2);
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
  for (const denom of coins) {
    const img = document.createElement('img');
    img.className = `coin coin--${denom}`;
    img.src = COIN_SRC[denom] || COIN_SRC[1];
    img.alt = '';
    const spot = placeAway(denom, placed);
    placed.push({ cx: spot.cx, cy: spot.cy, radius: spot.radius });
    img.style.left = `${spot.left}%`;
    img.style.top = `${spot.top}%`;
    img.style.width = `${COIN_SIZE[denom]}%`;
    img.style.transform = `rotate(${spot.rot}deg)`;
    grid.appendChild(img);
  }
  grid.style.display = 'block';
  fb.style.display = 'none';
  grid.style.opacity = '1';
}

export function totalOf(coins) {
  return (coins || []).reduce((s, d) => s + d, 0);
}
