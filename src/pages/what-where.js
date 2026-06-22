import { items } from '../data/items.js';
import { places } from '../data/places.js';
import { createPlaceFigure, updatePlaceFigure } from '../components/place-figure.js';
import { createLockCard, updateLockCard } from '../components/lock-card.js';

const findById = (list, id) => list.find((x) => x.id === id);

function randomDifferent(list, currentId) {
  if (list.length < 2) return list[0];
  const candidates = list.filter((x) => x.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

export function renderWhatWhere(root) {
  const state = {
    itemId: randomFrom(items).id,
    placeId: randomFrom(places).id,
    itemLocked: false,
    placeLocked: false,
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
  const itemCard = createLockCard({ label: '什麼', locked: state.itemLocked });
  const placeCard = createLockCard({ label: '哪裡', locked: state.placeLocked });
  leftCol.append(itemCard, placeCard);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createPlaceFigure(
    findById(items, state.itemId),
    findById(places, state.placeId),
  );
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const it = findById(items, state.itemId);
    const pl = findById(places, state.placeId);
    const iw = state.itemLocked
      ? `<span class="locked-word">${it.name}</span>`
      : it.name;
    const pw = state.placeLocked
      ? `<span class="locked-word">${pl.verb}</span>`
      : pl.verb;
    captionEl.innerHTML = `${iw} ${pw}`;
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  itemCard.addEventListener('click', () => {
    state.itemLocked = !state.itemLocked;
    updateLockCard(itemCard, { locked: state.itemLocked });
    updateCaption();
  });
  placeCard.addEventListener('click', () => {
    state.placeLocked = !state.placeLocked;
    updateLockCard(placeCard, { locked: state.placeLocked });
    updateCaption();
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
    prevSnapshot = { itemId: state.itemId, placeId: state.placeId };
    if (!state.itemLocked) state.itemId = randomDifferent(items, state.itemId).id;
    if (!state.placeLocked) state.placeId = randomDifferent(places, state.placeId).id;
    const it = findById(items, state.itemId);
    const pl = findById(places, state.placeId);
    updatePlaceFigure(fig, it, pl);
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.itemId = prevSnapshot.itemId;
    state.placeId = prevSnapshot.placeId;
    prevSnapshot = null;
    const it = findById(items, state.itemId);
    const pl = findById(places, state.placeId);
    updatePlaceFigure(fig, it, pl);
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
