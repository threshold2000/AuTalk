// Module 6 (money-count) figure — displays an array of coin denominations
// (1 / 5 / 10) as CSS-drawn coins in a flex-wrap grid.

const DENOM_CLASS = {
  1: 'coin--1',
  5: 'coin--5',
  10: 'coin--10',
};

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

  for (const denom of coins) {
    const c = document.createElement('div');
    c.className = `coin ${DENOM_CLASS[denom] || ''}`;
    c.textContent = String(denom);
    grid.appendChild(c);
  }
  grid.style.display = 'flex';
  fb.style.display = 'none';
  grid.style.opacity = '1';
}

export function totalOf(coins) {
  return (coins || []).reduce((s, d) => s + d, 0);
}
