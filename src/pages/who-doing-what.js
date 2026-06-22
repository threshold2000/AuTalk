import { animals } from '../data/animals.js';
import { actions } from '../data/actions.js';
import { createSceneFigure, updateSceneFigure } from '../components/scene-figure.js';
import { createLockCard, updateLockCard } from '../components/lock-card.js';

const findById = (list, id) => list.find((x) => x.id === id);

function randomDifferent(list, currentId) {
  if (list.length < 2) return list[0];
  const candidates = list.filter((x) => x.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

export function renderWhoDoingWhat(root) {
  const state = {
    animalId: randomFrom(animals).id,
    actionId: randomFrom(actions).id,
    animalLocked: false,
    actionLocked: false,
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
  const animalCard = createLockCard({ label: '誰', locked: state.animalLocked });
  const actionCard = createLockCard({ label: '動作', locked: state.actionLocked });
  leftCol.append(animalCard, actionCard);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createSceneFigure(
    findById(animals, state.animalId),
    findById(actions, state.actionId)
  );
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const a = findById(animals, state.animalId);
    const v = findById(actions, state.actionId);
    const aw = state.animalLocked
      ? `<span class="locked-word">${a.name}</span>`
      : a.name;
    const vw = state.actionLocked
      ? `<span class="locked-word">${v.verb}</span>`
      : v.verb;
    captionEl.innerHTML = `${aw} ${vw}`;
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  animalCard.addEventListener('click', () => {
    state.animalLocked = !state.animalLocked;
    updateLockCard(animalCard, { locked: state.animalLocked });
    updateCaption();
  });
  actionCard.addEventListener('click', () => {
    state.actionLocked = !state.actionLocked;
    updateLockCard(actionCard, { locked: state.actionLocked });
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

  // One-step undo: snapshot the (animalId, actionId) shown BEFORE each
  // next-click, restore it once on prev-click, then forget.
  let prevSnapshot = null;
  const prevBtn = wrap.querySelector('#prev');
  const refreshPrevBtn = () => {
    const hasSnap = !!prevSnapshot;
    prevBtn.setAttribute('aria-disabled', hasSnap ? 'false' : 'true');
    prevBtn.style.opacity = hasSnap ? '1' : '0';
  };
  refreshPrevBtn();

  wrap.querySelector('.next-btn').addEventListener('click', () => {
    prevSnapshot = { animalId: state.animalId, actionId: state.actionId };
    if (!state.animalLocked) {
      state.animalId = randomDifferent(animals, state.animalId).id;
    }
    if (!state.actionLocked) {
      state.actionId = randomDifferent(actions, state.actionId).id;
    }
    const a = findById(animals, state.animalId);
    const v = findById(actions, state.actionId);
    updateSceneFigure(fig, a, v);
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.animalId = prevSnapshot.animalId;
    state.actionId = prevSnapshot.actionId;
    prevSnapshot = null;
    const a = findById(animals, state.animalId);
    const v = findById(actions, state.actionId);
    updateSceneFigure(fig, a, v);
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
