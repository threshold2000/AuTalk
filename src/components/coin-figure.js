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

// Pick a spot that is as far as possible from every already-placed coin,
// so 5 coins spread across the frame instead of clumping into 1-2 rows.
function placeAway(denom, existing) {
  const size = COIN_SIZE[denom];
  const maxLeft = Math.max(0, 100 - size - 2);
  const maxTop  = Math.max(0, 100 - size - 2);

  let best = null;
  let bestScore = -Infinity;
  const attempts = 12;
  for (let i = 0; i < attempts; i++) {
    const left = 2 + Math.random() * (maxLeft - 2);
    const top  = 2 + Math.random() * (maxTop  - 2);
    let minDist = Infinity;
    for (const e of existing) {
      const dx = left - e.left;
      const dy = top - e.top;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
    if (minDist > bestScore) {
      bestScore = minDist;
      best = { left, top };
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
    const { left, top, rot } = placeAway(denom, placed);
    placed.push({ left, top });
    img.style.left = `${left}%`;
    img.style.top = `${top}%`;
    img.style.width = `${COIN_SIZE[denom]}%`;
    img.style.transform = `rotate(${rot}deg)`;
    grid.appendChild(img);
  }
  grid.style.display = 'block';
  fb.style.display = 'none';
  grid.style.opacity = '1';
}

export function totalOf(coins) {
  return (coins || []).reduce((s, d) => s + d, 0);
}
