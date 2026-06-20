import { renderHome } from './pages/home.js';
import { renderWhoDoingWhat } from './pages/who-doing-what.js';

const routes = {
  '': renderHome,
  '/': renderHome,
  '/who-doing-what': renderWhoDoingWhat,
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
