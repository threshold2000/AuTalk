const B = import.meta.env.BASE_URL;

const itemBase = (item) => `${B}assets/scenes-2/items/${item.id}`;
const itemFillUrl = (item) => `${B}assets/scenes-2/items/${item.id}-fill.svg`;
const placeBase = (place) => `${B}assets/scenes-2/places/${place.id}`;

function probeImage(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

async function firstExisting(urls) {
  for (const url of urls) {
    if (await probeImage(url)) return url;
  }
  return null;
}

export function createPlaceFigure(item, place) {
  const el = document.createElement('div');
  el.className = 'scene scene--place';
  el.innerHTML = `
    <img class="scene__place-bg" alt="" />
    <svg class="scene__hang-strings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line class="scene__hang-line-l" stroke="#1a1a1a" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" />
      <line class="scene__hang-line-r" stroke="#1a1a1a" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" />
    </svg>
    <img class="scene__item-fill" alt="" />
    <img class="scene__item" alt="" />
    <div class="scene__fallback">
      <div class="scene__hint">圖尚未生成<br>請執行 <code>npm run gen-pieces</code></div>
    </div>
  `;
  applyPlaceFigure(el, item, place);
  return el;
}

export function updatePlaceFigure(el, item, place) {
  const layers = el.querySelectorAll('.scene__place-bg, .scene__item-fill, .scene__item, .scene__fallback, .scene__hang-strings');
  layers.forEach((l) => (l.style.opacity = '0'));
  setTimeout(() => {
    applyPlaceFigure(el, item, place);
    requestAnimationFrame(() => layers.forEach((l) => (l.style.opacity = '1')));
  }, 180);
}

async function applyPlaceFigure(el, item, place) {
  const bg = el.querySelector('.scene__place-bg');
  const fill = el.querySelector('.scene__item-fill');
  const it = el.querySelector('.scene__item');
  const fb = el.querySelector('.scene__fallback');

  bg.removeAttribute('src');
  fill.removeAttribute('src');
  it.removeAttribute('src');
  bg.style.display = 'none';
  fill.style.display = 'none';
  it.style.display = 'none';
  fb.style.display = 'none'; // hide during load; never spoil the answer

  // Resolve the anchor for this (item, place) pair:
  //   1. start with the place's default itemAnchor
  //   2. overlay item.placeOverrides[place.id] (partial — any of top/left/size)
  //   3. apply item.sizeMultiplier to the final size
  // rotation = place.rotate (scene-driven, e.g. "falling") + item.rotate.
  const baseAnchor = place.itemAnchor;
  const override = item.placeOverrides?.[place.id] || {};
  const a = { ...baseAnchor, ...override };
  const totalRotate = (place.rotate || 0) + (item.rotate || 0);
  const finalSize = a.size * (item.sizeMultiplier || 1);
  // Keep item visually centered on the original anchor box midpoint when its
  // intrinsic size shrinks.
  const sizeShift = (a.size - finalSize) / 2;
  const finalTop = a.top + sizeShift;
  const finalLeft = a.left + sizeShift;

  for (const layer of [fill, it]) {
    layer.style.top = `${finalTop * 100}%`;
    layer.style.left = `${finalLeft * 100}%`;
    layer.style.width = `${finalSize * 100}%`;
    layer.style.clipPath = place.clip || 'none';
    layer.style.webkitClipPath = place.clip || 'none';
    layer.style.transform = totalRotate ? `rotate(${totalRotate}deg)` : '';
  }

  // Layer order: by default place is the backdrop and item layers sit on top.
  // For places where the item visually goes BEHIND something in the scene
  // (e.g. hidden behind a bowl), flip so the place SVG (with its own filled
  // shape) renders on top of the item.
  if (place.itemBehind) {
    bg.style.zIndex = '3';
    it.style.zIndex = '2';
    fill.style.zIndex = '1';
  } else {
    bg.style.zIndex = '';
    it.style.zIndex = '';
    fill.style.zIndex = '';
  }

  // Optional hanging strings (e.g. wall_hook): two diagonal lines from a
  // hook anchor down to a pair of target points (the top corners of a
  // picture frame, if the scene has one; otherwise the item box corners).
  const strSvg = el.querySelector('.scene__hang-strings');
  if (place.hangString) {
    const hs = place.hangString;
    const fromTop = hs.fromTop;
    const fromLeft = hs.atLeft ?? finalLeft + finalSize / 2;
    const toTop   = hs.toTop   ?? finalTop;
    const toLeft  = hs.toLeft  ?? finalLeft;
    const toRight = hs.toRight ?? finalLeft + finalSize;
    const lineL = strSvg.querySelector('.scene__hang-line-l');
    const lineR = strSvg.querySelector('.scene__hang-line-r');
    // viewBox is 0..100, values are percentages of the scene container.
    lineL.setAttribute('x1', fromLeft * 100);
    lineL.setAttribute('y1', fromTop * 100);
    lineL.setAttribute('x2', toLeft * 100);
    lineL.setAttribute('y2', toTop * 100);
    lineR.setAttribute('x1', fromLeft * 100);
    lineR.setAttribute('y1', fromTop * 100);
    lineR.setAttribute('x2', toRight * 100);
    lineR.setAttribute('y2', toTop * 100);
    strSvg.style.display = 'block';
  } else {
    strSvg.style.display = 'none';
  }

  const requestedItem = item.id;
  const requestedPlace = place.id;
  el.dataset.requestedItem = requestedItem;
  el.dataset.requestedPlace = requestedPlace;
  const stillCurrent = () =>
    el.dataset.requestedItem === requestedItem &&
    el.dataset.requestedPlace === requestedPlace;

  const placeUrl = await firstExisting([`${placeBase(place)}.svg`, `${placeBase(place)}.png`]);
  if (!stillCurrent()) return;
  const itemUrl = await firstExisting([`${itemBase(item)}.svg`, `${itemBase(item)}.png`]);
  if (!stillCurrent()) return;
  // silhouette is optional — only shown if traced
  const fillUrl = (await probeImage(itemFillUrl(item))) ? itemFillUrl(item) : null;
  if (!stillCurrent()) return;

  if (placeUrl && itemUrl) {
    bg.src = placeUrl;
    it.src = itemUrl;
    bg.alt = '';
    it.alt = '';
    bg.style.display = 'block';
    it.style.display = 'block';
    if (fillUrl) {
      fill.src = fillUrl;
      fill.style.display = 'block';
    }
  } else {
    // Hard failure: show the dev-only "image not generated" hint.
    fb.style.display = 'flex';
  }
}
