const ICON_LOCKED = `
<svg class="lock-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="5" y="11" width="14" height="10" rx="2" />
  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
</svg>`;

const ICON_UNLOCKED = `
<svg class="lock-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="5" y="11" width="14" height="10" rx="2" />
  <path d="M8 11V7a4 4 0 0 1 8 0" />
</svg>`;

export function createLockCard({ label, locked }) {
  const el = document.createElement('button');
  el.className = `lock-card${locked ? ' locked' : ''}`;
  el.type = 'button';
  el.innerHTML = `
    <span class="lock-card__label"></span>
    <span class="lock-card__icon-slot"></span>
  `;
  el.querySelector('.lock-card__label').textContent = label;
  updateLockCard(el, { locked });
  return el;
}

export function updateLockCard(el, { locked }) {
  el.classList.toggle('locked', !!locked);
  el.querySelector('.lock-card__icon-slot').innerHTML = locked ? ICON_LOCKED : ICON_UNLOCKED;
}
