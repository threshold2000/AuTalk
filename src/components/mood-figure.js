// Module 4 (who-feeling) figure: same pattern as scene-figure (single composed
// scene per cell), but lives in scenes-4/ keyed by <character>_<emotion>.

const B = import.meta.env.BASE_URL;

const moodBase = (character, emotion) =>
  `${B}assets/scenes-4/${character.id}_${emotion.id}`;

function probeImage(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

export function createMoodFigure(character, emotion) {
  const el = document.createElement('div');
  el.className = 'scene';
  el.innerHTML = `
    <img class="scene__img" alt="" />
    <div class="scene__fallback">
      <div class="scene__hint">圖尚未生成<br>請執行 <code>npm run gen-moods-nano</code></div>
    </div>
  `;
  applyMood(el, character, emotion);
  return el;
}

export function updateMoodFigure(el, character, emotion) {
  const img = el.querySelector('.scene__img');
  const fb = el.querySelector('.scene__fallback');
  img.style.opacity = '0';
  fb.style.opacity = '0';
  setTimeout(() => {
    applyMood(el, character, emotion);
    requestAnimationFrame(() => {
      img.style.opacity = '1';
      fb.style.opacity = '1';
    });
  }, 180);
}

async function applyMood(el, character, emotion) {
  const img = el.querySelector('.scene__img');
  const fb = el.querySelector('.scene__fallback');

  img.removeAttribute('src');
  img.style.display = 'none';
  fb.style.display = 'none';

  const reqChar = character.id;
  const reqEmo = emotion.id;
  img.dataset.reqChar = reqChar;
  img.dataset.reqEmo = reqEmo;
  const stillCurrent = () =>
    img.dataset.reqChar === reqChar && img.dataset.reqEmo === reqEmo;

  const base = moodBase(character, emotion);
  for (const ext of ['svg', 'png']) {
    const src = `${base}.${ext}`;
    const ok = await probeImage(src);
    if (!stillCurrent()) return;
    if (ok) {
      img.src = src;
      img.alt = '';
      img.style.display = 'block';
      return;
    }
  }
  fb.style.display = 'flex';
}
