const B = import.meta.env.BASE_URL;

const sceneBase = (animal, action) => `${B}assets/scenes/${animal.id}_${action.id}`;

function probeImage(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

export function createSceneFigure(animal, action) {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <img class="scene__img" alt="" />
    <div class="scene__fallback">
      <div class="scene__emoji"></div>
      <div class="scene__label"></div>
      <div class="scene__hint">圖尚未生成<br>請執行 <code>npm run gen-scenes</code></div>
    </div>
  `;
  applyScene(el, animal, action);
  return el;
}

export function updateSceneFigure(el, animal, action) {
  const img = el.querySelector('.scene__img');
  const fb = el.querySelector('.scene__fallback');
  img.style.opacity = '0';
  fb.style.opacity = '0';
  setTimeout(() => {
    applyScene(el, animal, action);
    requestAnimationFrame(() => {
      img.style.opacity = '1';
      fb.style.opacity = '1';
    });
  }, 180);
}

async function applyScene(el, animal, action) {
  const img = el.querySelector('.scene__img');
  const fb = el.querySelector('.scene__fallback');
  const emoji = el.querySelector('.scene__emoji');
  const label = el.querySelector('.scene__label');

  emoji.textContent = `${animal.emoji} · ${actionEmojiFor(action.id)}`;
  label.textContent = `${animal.name}${action.verb}`;
  img.removeAttribute('src');
  img.style.display = 'none';
  fb.style.display = 'flex';

  // Mark THIS request as the current one so later async probes from a stale
  // applyScene call bail out when they finish.
  const requestedAnimal = animal.id;
  const requestedAction = action.id;
  img.dataset.requestedAnimal = requestedAnimal;
  img.dataset.requestedAction = requestedAction;

  const stillCurrent = () =>
    img.dataset.requestedAnimal === requestedAnimal &&
    img.dataset.requestedAction === requestedAction;

  const base = sceneBase(animal, action);
  for (const ext of ['svg', 'png']) {
    const src = `${base}.${ext}`;
    const ok = await probeImage(src);
    if (!stillCurrent()) return;
    if (ok) {
      img.src = src;
      img.alt = `${animal.name}${action.verb}`;
      img.style.display = 'block';
      fb.style.display = 'none';
      return;
    }
  }
}

const ACTION_EMOJI = {
  running: '🏃',
  cycling: '🚴',
  fishing: '🎣',
  driving: '🚗',
  basketball: '🏀',
  drinking: '🥛',
  dinner: '🍽️',
  singing: '🎤',
  homework: '✏️',
  jumprope: '🪢',
  balloon: '🎈',
  ice_cream: '🍦',
};
const actionEmojiFor = (id) => ACTION_EMOJI[id] || '❓';
