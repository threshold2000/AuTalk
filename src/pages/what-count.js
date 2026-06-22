import { foods } from '../data/foods.js';
import { createCountFigure, updateCountFigure, chineseCount } from '../components/count-figure.js';
import { createLockCard, updateLockCard } from '../components/lock-card.js';

const findById = (list, id) => list.find((x) => x.id === id);
const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

function randomDifferentFood(currentId) {
  if (foods.length < 2) return foods[0];
  const candidates = foods.filter((x) => x.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomTwoFoods() {
  const a = randomFrom(foods);
  const b = randomDifferentFood(a.id);
  return [a.id, b.id];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// pick groups for the next round respecting current locks
function nextGroups(prev, mix, foodLocked, countLocked) {
  // foods
  let foodIds;
  if (foodLocked) {
    const prevIds = prev.map((g) => g.foodId);
    if (mix && prevIds.length < 2) {
      foodIds = [prevIds[0], randomDifferentFood(prevIds[0]).id];
    } else if (!mix && prevIds.length > 1) {
      foodIds = [prevIds[0]];
    } else {
      foodIds = prevIds;
    }
  } else {
    foodIds = mix ? randomTwoFoods() : [randomFrom(foods).id];
  }

  // counts
  let counts;
  if (countLocked) {
    const prevTotal = prev.reduce((s, g) => s + g.count, 0);
    if (mix) {
      // re-split prevTotal (clamped to 2..9) into two parts each >= 1
      const total = Math.max(2, Math.min(9, prevTotal));
      const a = randomInt(1, total - 1);
      counts = [a, total - a];
    } else {
      counts = [Math.max(1, Math.min(10, prevTotal))];
    }
  } else {
    if (mix) {
      const total = randomInt(2, 9);
      const a = randomInt(1, total - 1);
      counts = [a, total - a];
    } else {
      counts = [randomInt(1, 10)];
    }
  }

  return foodIds.map((id, i) => ({ foodId: id, count: counts[i] }));
}

const inflateGroups = (groups) =>
  groups.map((g) => ({ food: findById(foods, g.foodId), count: g.count }));

export function renderWhatCount(root) {
  const state = {
    mix: false,
    groups: [{ foodId: randomFrom(foods).id, count: randomInt(1, 10) }],
    foodLocked: false,
    countLocked: false,
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
  const countCard = createLockCard({ label: '幾個', locked: state.countLocked });
  const foodCard = createLockCard({ label: '什麼', locked: state.foodLocked });
  const mixToggle = document.createElement('button');
  mixToggle.id = 'mix-toggle';
  mixToggle.className = 'toggle toggle--block';
  mixToggle.type = 'button';
  mixToggle.innerHTML = `<span class="toggle__dot"></span><span>混合</span>`;
  leftCol.append(countCard, foodCard, mixToggle);

  const figSlot = wrap.querySelector('.figure-slot');
  const fig = createCountFigure(inflateGroups(state.groups));
  figSlot.appendChild(fig);

  const captionEl = wrap.querySelector('.caption');
  const updateCaption = () => {
    const parts = state.groups.map((g) => {
      const food = findById(foods, g.foodId);
      const cw = state.countLocked
        ? `<span class="locked-word">${chineseCount(g.count)}</span>`
        : chineseCount(g.count);
      const fw = state.foodLocked
        ? `<span class="locked-word">${food.name}</span>`
        : food.name;
      return `${cw}${fw}`;
    });
    captionEl.innerHTML = parts.join('和');
    captionEl.classList.toggle('hidden', !state.showText);
  };
  updateCaption();

  countCard.addEventListener('click', () => {
    state.countLocked = !state.countLocked;
    updateLockCard(countCard, { locked: state.countLocked });
    updateCaption();
  });
  foodCard.addEventListener('click', () => {
    state.foodLocked = !state.foodLocked;
    updateLockCard(foodCard, { locked: state.foodLocked });
    updateCaption();
  });

  mixToggle.addEventListener('click', () => {
    state.mix = !state.mix;
    mixToggle.classList.toggle('on', state.mix);
    // Re-roll groups under the new mode (treat as a "next" with current locks).
    state.groups = nextGroups(state.groups, state.mix, false, false);
    updateCountFigure(fig, inflateGroups(state.groups));
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
    prevSnapshot = state.groups.map((g) => ({ ...g }));
    state.groups = nextGroups(state.groups, state.mix, state.foodLocked, state.countLocked);
    updateCountFigure(fig, inflateGroups(state.groups));
    updateCaption();
    refreshPrevBtn();
  });

  prevBtn.addEventListener('click', () => {
    if (!prevSnapshot) return;
    state.groups = prevSnapshot;
    prevSnapshot = null;
    updateCountFigure(fig, inflateGroups(state.groups));
    updateCaption();
    refreshPrevBtn();
  });

  root.appendChild(wrap);
}
