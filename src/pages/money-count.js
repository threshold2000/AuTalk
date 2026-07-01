import { createCoinFigure, updateCoinFigure, totalOf } from '../components/coin-figure.js';

function rollCoins({ allowTen, over20 }) {
  const targetMin = over20 ? 15 : 3;
  const targetMax = over20 ? 55 : 20;

  // Cap the number of coins to keep the counting exercise tractable.
  for (let attempt = 0; attempt < 30; attempt++) {
    const target = targetMin + Math.floor(Math.random() * (targetMax - targetMin + 1));
    let remaining = target;
    const coins = [];

    if (allowTen) {
      const max = Math.floor(remaining / 10);
      const n = Math.floor(Math.random() * (max + 1));
      for (let i = 0; i < n; i++) coins.push(10);
      remaining -= n * 10;
    }
    {
      const max = Math.floor(remaining / 5);
      const n = Math.floor(Math.random() * (max + 1));
      for (let i = 0; i < n; i++) coins.push(5);
      remaining -= n * 5;
    }
    for (let i = 0; i < remaining; i++) coins.push(1);

    if (coins.length >= 2 && coins.length <= 5) {
      // shuffle
      for (let i = coins.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coins[i], coins[j]] = [coins[j], coins[i]];
      }
      return coins;
    }
  }
  return [1, 5]; // extreme fallback
}

export function renderMoneyCount(root) {
  const state = {
    over20: false,
    allowTen: false,
    coins: [],
    showText: false,
  };
  state.coins = rollCoins({ allowTen: state.allowTen, over20: state.over20 });

  const wrap = document.createElement('div');
  wrap.className = 'practice';
  wrap.innerHTML = `
    <div class="topbar">
      <button class="topbar__btn" id="back" type="button" aria-label="回首頁">
        <svg class="topbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <path d="M12 5l-7 7 7 7" />
        </svg>
        <svg class="topbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
        </svg>
      </button>
      <button class="toggle" id="text-toggle" type="button">
        <span class="toggle__dot"></span>
        <span>顯示答案</span>
      </button>
    </div>
    <div class="practice__main">
      <div class="left-col"></div>
      <div class="center-col">
        <div class="figure-slot"></div>
        <div class="caption"></div>
      </div>
      <div class="right-col">
        <button class="next-btn" type="button">
          <span class="next-btn__label">下一張</span>
          <svg class="next-btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
    <button class="prev-btn" id="prev" type="button" aria-disabled="true">
      <svg class="prev-btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 5l-7 7 7 7" />
      </svg>
      <span>上一張</span>
    </button>
  `;

  const leftCol = wrap.querySelector('.left-col');
  const over20Toggle = document.createElement('button');
  over20Toggle.id = 'over20-toggle';
  over20Toggle.className = 'toggle toggle--block';
  over20Toggle.type = 'button';
  over20Toggle.innerHTML = `<span class="toggle__dot"></span><span>超過 20 元</span>`;
  const tenToggle = document.createElement('button');
  tenToggle.id = 'ten-toggle';
  tenToggle.className = 'toggle toggle--block';
  tenToggle.type = 'button';
  tenToggle.innerHTML = `<span class="toggle__dot"></span><span>有 10 元</span>`;
  leftCol.append(over20Toggle, tenToggle);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createCoinFigure(state.coins);
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const total = totalOf(state.coins);
    captionEl.innerHTML = `共 <span class="locked-word">${total}</span> 元`;
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  over20Toggle.addEventListener('click', () => {
    state.over20 = !state.over20;
    over20Toggle.classList.toggle('on', state.over20);
  });
  tenToggle.addEventListener('click', () => {
    state.allowTen = !state.allowTen;
    tenToggle.classList.toggle('on', state.allowTen);
  });

  const textToggle = wrap.querySelector('#text-toggle');
  textToggle.addEventListener('click', () => {
    state.showText = !state.showText;
    textToggle.classList.toggle('on', state.showText);
    updateCaption();
  });

  wrap.querySelector('#back').addEventListener('click', () => {
    location.hash = '#/';
  });

  let prevSnapshot = null;
  const prevBtn = wrap.querySelector('#prev');
  const refreshPrevBtn = () => {
    const hasSnap = !!prevSnapshot;
    prevBtn.setAttribute('aria-disabled', hasSnap ? 'false' : 'true');
    prevBtn.style.opacity = hasSnap ? '1' : '0';
  };
  refreshPrevBtn();

  wrap.querySelector('.next-btn').addEventListener('click', () => {
    prevSnapshot = state.coins.slice();
    state.coins = rollCoins({ allowTen: state.allowTen, over20: state.over20 });
    updateCoinFigure(fig, state.coins);
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.coins = prevSnapshot;
    prevSnapshot = null;
    updateCoinFigure(fig, state.coins);
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
