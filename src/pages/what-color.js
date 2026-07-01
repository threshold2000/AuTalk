import { colorItems } from '../data/color-items.js';
import { colors } from '../data/colors.js';
import { createColorFigure, updateColorFigure } from '../components/color-figure.js';
import { createLockCard, updateLockCard } from '../components/lock-card.js';

const findById = (list, id) => list.find((x) => x.id === id);
const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

function poolColors(multi) {
  return multi ? colors : colors.filter((c) => !c.extra);
}

function randomDifferent(list, currentId) {
  if (list.length < 2) return list[0];
  const candidates = list.filter((x) => x.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function renderWhatColor(root) {
  const state = {
    itemId: randomFrom(colorItems).id,
    colorId: randomFrom(poolColors(false)).id,
    itemLocked: false,
    colorLocked: false,
    multi: false,
    showText: false,
  };

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
        <span>顯示文字</span>
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
  const colorCard = createLockCard({ label: '顏色', locked: state.colorLocked });
  const itemCard = createLockCard({ label: '什麼', locked: state.itemLocked });
  const multiToggle = document.createElement('button');
  multiToggle.id = 'multi-toggle';
  multiToggle.className = 'toggle toggle--block';
  multiToggle.type = 'button';
  multiToggle.innerHTML = `<span class="toggle__dot"></span><span>多色</span>`;
  leftCol.append(colorCard, itemCard, multiToggle);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createColorFigure(
    findById(colorItems, state.itemId),
    findById(colors, state.colorId),
  );
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const it = findById(colorItems, state.itemId);
    const co = findById(colors, state.colorId);
    const cw = state.colorLocked
      ? `<span class="locked-word">${co.name}</span>`
      : co.name;
    const iw = state.itemLocked
      ? `<span class="locked-word">${it.name}</span>`
      : it.name;
    captionEl.innerHTML = `${cw}的${iw}`;
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  colorCard.addEventListener('click', () => {
    state.colorLocked = !state.colorLocked;
    updateLockCard(colorCard, { locked: state.colorLocked });
    updateCaption();
  });
  itemCard.addEventListener('click', () => {
    state.itemLocked = !state.itemLocked;
    updateLockCard(itemCard, { locked: state.itemLocked });
    updateCaption();
  });

  multiToggle.addEventListener('click', () => {
    state.multi = !state.multi;
    multiToggle.classList.toggle('on', state.multi);
    // If turning multi OFF while current color is an extra, re-roll to base.
    const co = findById(colors, state.colorId);
    if (!state.multi && co.extra) {
      state.colorId = randomFrom(poolColors(false)).id;
      updateColorFigure(fig, findById(colorItems, state.itemId), findById(colors, state.colorId));
      updateCaption();
    }
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
    prevSnapshot = { itemId: state.itemId, colorId: state.colorId };
    if (!state.itemLocked) state.itemId = randomDifferent(colorItems, state.itemId).id;
    if (!state.colorLocked) {
      const pool = poolColors(state.multi);
      state.colorId = randomDifferent(pool, state.colorId).id;
    }
    const it = findById(colorItems, state.itemId);
    const co = findById(colors, state.colorId);
    updateColorFigure(fig, it, co);
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.itemId = prevSnapshot.itemId;
    state.colorId = prevSnapshot.colorId;
    prevSnapshot = null;
    const it = findById(colorItems, state.itemId);
    const co = findById(colors, state.colorId);
    updateColorFigure(fig, it, co);
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
