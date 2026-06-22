const modules = [
  { id: 'who-doing-what', name: '誰正在做什麼', emoji: '🐶', enabled: true },
  { id: 'what-where',     name: '什麼在哪裡',   emoji: '📦', enabled: true },
  { id: 'what-count',     name: '東西和數量',   emoji: '🍎', enabled: true },
  { id: 'who-feeling',    name: '誰的心情',     emoji: '😊', enabled: true },
  { id: 'colors',         name: '什麼顏色',     emoji: '🎨', enabled: false },
];

export function renderHome(root) {
  const wrap = document.createElement('div');
  wrap.className = 'home';
  wrap.innerHTML = `
    <h1 class="home__title">語言練習</h1>
    <div class="home__grid"></div>
  `;
  const grid = wrap.querySelector('.home__grid');

  modules.forEach((m) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `module-card ${m.enabled ? 'active' : 'disabled'}`;
    card.innerHTML = `
      <div class="module-card__emoji">${m.emoji}</div>
      <div>${m.name}</div>
      ${m.enabled ? '' : '<div style="font-size:0.7em;color:var(--muted);margin-top:0.5em;font-weight:400">即將推出</div>'}
    `;
    if (m.enabled) {
      card.addEventListener('click', () => {
        location.hash = '#/' + m.id;
      });
    }
    grid.appendChild(card);
  });

  root.appendChild(wrap);
}
