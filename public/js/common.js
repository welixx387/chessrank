// Общие помощники для всех страниц: API, форматирование, иконки, шапка и подвал.

export const REPO_URL = 'https://github.com/welixx387/chessrank';

export const CATS = {
  blitz:      { label: 'Блиц',          color: '#f5c451', icon: 'bolt' },
  bullet:     { label: 'Пуля',          color: '#f08a4b', icon: 'bullet' },
  rapid:      { label: 'Рапид',         color: '#81b64c', icon: 'clock' },
  daily:      { label: 'Заочные',       color: '#5aa9ff', icon: 'sun' },
  daily960:   { label: 'Заочные 960',   color: '#9b8cff', icon: 'shuffle' },
  blitz960:   { label: 'Блиц 960',      color: '#c58cff', icon: 'shuffle' },
  bughouse:   { label: 'Шведские',      color: '#4fd1c5', icon: 'users' },
  threecheck: { label: 'Три шаха',      color: '#f56565', icon: 'checks' },
  tactics:    { label: 'Задачи',        color: '#ff7aa8', icon: 'puzzle', puzzle: true },
  rush:       { label: 'Puzzle Rush',   color: '#ff9f43', icon: 'flame', puzzle: true },
  battle:     { label: 'Puzzle Battle', color: '#63b3ed', icon: 'swords', puzzle: true },
};

const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  bullet: '<path d="M14 4h4a2 2 0 0 1 2 2v4L10 20H4v-6z"/><path d="m4 14 6 6M13 7l4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  checks: '<path d="m2 12 4 4 6-8M10 16l2 0M12 12l4 4 6-8"/>',
  puzzle: '<path d="M9 4h3.5v1.5a1.75 1.75 0 0 0 3.5 0V4H20v4.5h-1.5a1.75 1.75 0 0 0 0 3.5H20V20h-4.5v-1.5a1.75 1.75 0 0 0-3.5 0V20H4v-4.5h1.5a1.75 1.75 0 0 0 0-3.5H4V8a4 4 0 0 1 5-4z"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4.3 3 7 7 7z"/>',
  swords: '<path d="M4 4l16 16M20 4 4 20M4 8V4h4M20 8V4h-4M7 17l-3 3M17 17l3 3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  online: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5h4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
};

export const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
export const catIcon = (key) => icon(CATS[key]?.icon || 'trophy');

export const KNIGHT_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20.2h10.6v-2c0-1-.4-1.9-1.1-2.6l-.4-.4c1.4-2.3 1.9-4.8 1.4-7.2-.6-3-3.2-5.1-6.3-5.4L10.3 1.5 9.2 3c-1.3.4-2.3 1.3-2.8 2.5L4.9 9.1c-.3.8 0 1.6.8 2l.8.4c.7.3 1.5.2 2-.4l1.6-1.6c.3 1.3-.2 2.6-1.3 3.7C7.7 14.2 7 15.7 7 17.4z"/><rect x="5.6" y="21" width="13.4" height="1.8" rx=".9"/></svg>`;
export const PAWN_SVG = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a3.6 3.6 0 0 0-2.3 6.4C8.5 9.2 7.8 10.2 7.8 11.4h2.3L9 17.3h6l-1.1-5.9h2.3c0-1.2-.7-2.2-1.9-2.8A3.6 3.6 0 0 0 12 2.2zM6 18.6h12v2.6H6z"/></svg>`;

// ---------- API ----------

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'X-Requested-With': 'fetch', Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Ошибка ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ---------- форматирование ----------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const numberFormat = new Intl.NumberFormat('ru-RU');
export const fmt = (n) => (n == null ? '—' : numberFormat.format(n));

export function plural(n, [one, few, many]) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

export function timeAgo(ms) {
  if (!ms) return '—';
  const seconds = Math.max(0, (Date.now() - ms) / 1000);
  const steps = [
    [60, 1, null],
    [3600, 60, ['минуту', 'минуты', 'минут']],
    [86400, 3600, ['час', 'часа', 'часов']],
    [86400 * 30, 86400, ['день', 'дня', 'дней']],
    [86400 * 365, 86400 * 30, ['месяц', 'месяца', 'месяцев']],
    [Infinity, 86400 * 365, ['год', 'года', 'лет']],
  ];
  for (const [limit, unit, forms] of steps) {
    if (seconds < limit) {
      if (!forms) return 'только что';
      const n = Math.max(1, Math.floor(seconds / unit));
      return `${n} ${plural(n, forms)} назад`;
    }
  }
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
export const fmtDate = (ms) => (ms ? dateFormat.format(new Date(ms)) : '—');
export const fmtShortDate = (ms) => shortDateFormat.format(new Date(ms));

export const winRate = (w, d, l) => {
  const total = (w || 0) + (d || 0) + (l || 0);
  return total ? Math.round((w / total) * 100) : null;
};

// ---------- кусочки разметки ----------

const SPECIAL_FLAGS = { XE: 'gb-eng', XS: 'gb-sct', XW: 'gb-wls', XK: 'xk', EU: 'eu' };

export function flag(code) {
  if (!code) return '';
  const upper = code.toUpperCase();
  const slug = SPECIAL_FLAGS[upper] || (upper.startsWith('X') ? null : upper.toLowerCase());
  if (!slug) return `<span class="flag flag-globe" title="Международный">${icon('globe')}</span>`;
  return `<img class="flag" src="https://flagcdn.com/w40/${slug}.png" alt="${esc(upper)}" title="${esc(upper)}" loading="lazy">`;
}

export function avatar(url, name, extraClass = '') {
  const initial = esc((name || '?').trim().charAt(0) || '?');
  if (!url) return `<div class="avatar avatar-fallback ${extraClass}">${initial}</div>`;
  return `<img class="avatar ${extraClass}" src="${esc(url)}" alt="" loading="lazy" data-initial="${initial}">`;
}

export const titleBadge = (title) => (title ? `<span class="title-badge" title="Шахматный титул">${esc(title)}</span>` : '');

export function wdlBar(w, d, l) {
  const total = (w || 0) + (d || 0) + (l || 0);
  if (!total) return '<div class="wdl-bar"></div>';
  const pct = (v) => ((v || 0) / total) * 100;
  return `<div class="wdl-bar" title="Победы ${fmt(w)} · Ничьи ${fmt(d)} · Поражения ${fmt(l)}">
    <span class="w" style="width:${pct(w)}%"></span><span class="d" style="width:${pct(d)}%"></span><span class="l" style="width:${pct(l)}%"></span>
  </div>`;
}

// Битые аватары и флаги заменяем заглушкой (inline onerror запрещён CSP).
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.classList.contains('avatar')) {
    const div = document.createElement('div');
    div.className = `${img.className} avatar-fallback`;
    div.textContent = img.dataset.initial || '?';
    img.replaceWith(div);
  } else if (img.classList.contains('flag')) {
    img.remove();
  }
}, true);

// ---------- уведомления ----------

export function toast(html, type = 'info', timeout = 4500) {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    document.body.append(box);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = html;
  box.append(el);
  setTimeout(() => el.remove(), timeout);
}

// ---------- поиск игрока ----------

export function parseUsername(input) {
  let value = String(input || '').trim();
  const fromUrl = value.match(/chess\.com\/(?:member|players?)\/([A-Za-z0-9_-]+)/i);
  if (fromUrl) value = fromUrl[1];
  value = value.replace(/^@/, '');
  return /^[A-Za-z0-9_-]{2,30}$/.test(value) ? value : null;
}

export function goToPlayer(input) {
  const username = parseUsername(input);
  if (!username) {
    toast('Введите ник Chess.com: латиница, цифры, «_» или «-»', 'error');
    return false;
  }
  location.href = `/player/${encodeURIComponent(username)}`;
  return true;
}

// ---------- шапка и подвал ----------

export let currentUser = null;

function renderHeader(active) {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container">
      <a class="logo" href="/" aria-label="ChessRank — на главную">
        <span class="logo-mark">${KNIGHT_SVG}</span><span class="logo-text">Chess<b>Rank</b></span>
      </a>
      <nav class="nav" aria-label="Разделы">
        <a href="/" class="${active === 'world' ? 'active' : ''}">Мировой топ</a>
        <a href="/?mode=community" class="${active === 'community' ? 'active' : ''}">Сообщество</a>
      </nav>
      <form class="header-search" role="search">
        ${icon('search')}
        <input name="q" placeholder="Найти игрока…" autocomplete="off" spellcheck="false" aria-label="Найти игрока по нику">
      </form>
      <div class="header-user"></div>
    </div>`;
  header.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    goToPlayer(event.currentTarget.q.value);
  });
  document.body.prepend(header);
  return header.querySelector('.header-user');
}

function renderUserArea(slot, user) {
  if (!user) {
    slot.innerHTML = `<a class="btn btn-primary btn-sm" href="/login">${icon('user')}Войти</a>`;
    return;
  }
  slot.innerHTML = `
    <div class="user-menu">
      <button class="user-button" type="button" aria-haspopup="menu" aria-expanded="false">
        ${avatar(user.avatar, user.username)}
        <span class="uname-label">${esc(user.username)}</span>
      </button>
      <div class="dropdown" role="menu">
        <a href="/player/${encodeURIComponent(user.username)}" role="menuitem">${icon('user')}Моя страница</a>
        <a href="/me" role="menuitem">${icon('edit')}Настроить страницу</a>
        <a href="/?mode=community" role="menuitem">${icon('trophy')}Рейтинг сообщества</a>
        <hr>
        <button type="button" data-logout role="menuitem">${icon('logout')}Выйти</button>
      </div>
    </div>`;
  const button = slot.querySelector('.user-button');
  const menu = slot.querySelector('.dropdown');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', () => {
    menu.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  });
  slot.querySelector('[data-logout]').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    location.href = '/';
  });
}

function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container">
      <div>ChessRank — неофициальный фан-проект, не связан с Chess.com. Данные:
        <a href="https://www.chess.com/news/view/published-data-api" target="_blank" rel="noopener">Chess.com Published-Data API</a>.</div>
      <div class="footer-links">
        <a href="/">Рейтинг</a>
        <a href="/?mode=community">Сообщество</a>
        <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>`;
  document.body.append(footer);
}

export async function initLayout(active = '') {
  const slot = renderHeader(active);
  renderFooter();
  try {
    currentUser = (await api('/api/me')).user;
  } catch {
    currentUser = null;
  }
  renderUserArea(slot, currentUser);
  return currentUser;
}
