import { renderHome } from './pages/home.js';
import { renderWhoDoingWhat } from './pages/who-doing-what.js';
import { renderWhatWhere } from './pages/what-where.js';
import { renderWhatCount } from './pages/what-count.js';
import { renderWhoFeeling } from './pages/who-feeling.js';
import { renderWhatColor } from './pages/what-color.js';
import { renderMoneyCount } from './pages/money-count.js';

const routes = {
  '': renderHome,
  '/': renderHome,
  '/who-doing-what': renderWhoDoingWhat,
  '/what-where': renderWhatWhere,
  '/what-count': renderWhatCount,
  '/who-feeling': renderWhoFeeling,
  '/what-color': renderWhatColor,
  '/money-count': renderMoneyCount,
};

function route() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const hash = location.hash.replace(/^#/, '') || '/';
  const handler = routes[hash] || renderHome;
  handler(root);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
