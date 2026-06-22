import { characters } from '../data/characters.js';
import { emotions } from '../data/emotions.js';
import { createMoodFigure, updateMoodFigure } from '../components/mood-figure.js';
import { createLockCard, updateLockCard } from '../components/lock-card.js';

const findById = (list, id) => list.find((x) => x.id === id);

function randomDifferent(list, currentId) {
  if (list.length < 2) return list[0];
  const candidates = list.filter((x) => x.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

export function renderWhoFeeling(root) {
  const state = {
    charId: randomFrom(characters).id,
    emoId: randomFrom(emotions).id,
    charLocked: false,
    emoLocked: false,
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
  const charCard = createLockCard({ label: '誰', locked: state.charLocked });
  const emoCard = createLockCard({ label: '心情', locked: state.emoLocked });
  leftCol.append(charCard, emoCard);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createMoodFigure(
    findById(characters, state.charId),
    findById(emotions, state.emoId),
  );
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const c = findById(characters, state.charId);
    const e = findById(emotions, state.emoId);
    const cw = state.charLocked
      ? `<span class="locked-word">${c.name}</span>`
      : c.name;
    const ew = state.emoLocked
      ? `<span class="locked-word">${e.verb}</span>`
      : e.verb;
    captionEl.innerHTML = `${cw}${ew}`;
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  charCard.addEventListener('click', () => {
    state.charLocked = !state.charLocked;
    updateLockCard(charCard, { locked: state.charLocked });
    updateCaption();
  });
  emoCard.addEventListener('click', () => {
    state.emoLocked = !state.emoLocked;
    updateLockCard(emoCard, { locked: state.emoLocked });
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
    prevSnapshot = { charId: state.charId, emoId: state.emoId };
    if (!state.charLocked) state.charId = randomDifferent(characters, state.charId).id;
    if (!state.emoLocked) state.emoId = randomDifferent(emotions, state.emoId).id;
    const c = findById(characters, state.charId);
    const e = findById(emotions, state.emoId);
    updateMoodFigure(fig, c, e);
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.charId = prevSnapshot.charId;
    state.emoId = prevSnapshot.emoId;
    prevSnapshot = null;
    const c = findById(characters, state.charId);
    const e = findById(emotions, state.emoId);
    updateMoodFigure(fig, c, e);
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
