import {
  CATS, api, avatar, catIcon, esc, flag, fmt, fmtDate, goToPlayer, icon, initLayout, timeAgo, titleBadge, wdlBar, winRate,
} from './common.js';

const WORLD_CATEGORIES = ['blitz', 'bullet', 'rapid', 'daily', 'daily960', 'blitz960', 'tactics', 'rush', 'battle', 'bughouse', 'threecheck'];
const COMMUNITY_CATEGORIES = ['blitz', 'bullet', 'rapid', 'daily', 'tactics', 'rush'];

const params = new URLSearchParams(location.search);
const state = {
  mode: params.get('mode') === 'community' ? 'community' : 'world',
  category: params.get('cat') || 'blitz',
  filter: '',
  sort: { key: 'rank', dir: 1 },
  world: null,
  community: {},
};

const $ = (id) => document.getElementById(id);
const me = await initLayout(state.mode);

$('hero-search').addEventListener('submit', (event) => {
  event.preventDefault();
  goToPlayer(event.currentTarget.q.value);
});

$('table-filter').addEventListener('input', (event) => {
  state.filter = event.target.value.trim().toLowerCase();
  renderTable();
});

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

$('category-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-cat]');
  if (tab) setCategory(tab.dataset.cat);
});

$('rank-head').addEventListener('click', (event) => {
  const th = event.target.closest('[data-sort]');
  if (!th) return;
  const key = th.dataset.sort;
  state.sort = state.sort.key === key ? { key, dir: -state.sort.dir } : { key, dir: key === 'rank' ? 1 : -1 };
  renderTable();
});

$('rank-body').addEventListener('click', (event) => {
  if (event.target.closest('a, button')) return;
  const row = event.target.closest('tr[data-user]');
  if (row) location.href = `/player/${encodeURIComponent(row.dataset.user)}`;
});

function categories() {
  return state.mode === 'world' ? WORLD_CATEGORIES : COMMUNITY_CATEGORIES;
}

function syncUrl() {
  const query = new URLSearchParams();
  if (state.mode === 'community') query.set('mode', 'community');
  if (state.category !== 'blitz') query.set('cat', state.category);
  const qs = query.toString();
  history.replaceState(null, '', qs ? `/?${qs}` : '/');
  document.querySelectorAll('.nav a').forEach((a) => {
    const isCommunity = a.getAttribute('href').includes('community');
    a.classList.toggle('active', isCommunity === (state.mode === 'community'));
  });
}

async function setMode(mode) {
  state.mode = mode;
  if (!categories().includes(state.category)) state.category = 'blitz';
  state.sort = { key: 'rank', dir: 1 };
  await load();
}

async function setCategory(category) {
  state.category = category;
  state.sort = { key: 'rank', dir: 1 };
  await load();
}

// ---------- данные ----------

let worldRequest = null;
async function loadWorld() {
  worldRequest ||= api('/api/leaderboards').catch((err) => {
    worldRequest = null;
    throw err;
  });
  state.world = await worldRequest;
  return state.world;
}

async function loadCommunity(category) {
  if (!state.community[category]) state.community[category] = await api(`/api/community?category=${category}`);
  return state.community[category];
}

function currentRows() {
  if (state.mode === 'world') {
    return (state.world?.boards[state.category] || []).map((r) => ({
      ...r,
      games: (r.win || 0) + (r.draw || 0) + (r.loss || 0),
      winrate: winRate(r.win, r.draw, r.loss),
    }));
  }
  return state.community[state.category]?.members || [];
}

async function load() {
  if (!categories().includes(state.category)) state.category = 'blitz';
  syncUrl();
  renderModeSwitch();
  renderTabs();
  renderLoading();
  try {
    if (state.mode === 'world') await loadWorld();
    else await loadCommunity(state.category);
    renderPodium();
    renderTable();
  } catch (err) {
    $('podium').innerHTML = '';
    $('rank-body').innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-icon">${icon('refresh')}</div>
      <h3>Не удалось загрузить рейтинг</h3><p>${esc(err.message)}</p></div></td></tr>`;
  }
}

// ---------- отрисовка ----------

function renderModeSwitch() {
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('mode-hint').textContent = state.mode === 'world'
    ? 'Официальные таблицы лидеров Chess.com'
    : 'Все игроки, которые вошли на сайт через Chess.com';
}

function renderTabs() {
  $('category-tabs').innerHTML = categories().map((key) => `
    <button type="button" class="tab ${key === state.category ? 'active' : ''}" data-cat="${key}" role="tab"
            aria-selected="${key === state.category}" style="--c:${CATS[key].color}">
      ${catIcon(key)}${CATS[key].label}
    </button>`).join('');
  const cat = CATS[state.category];
  const title = $('table-title');
  title.style.setProperty('--c', cat.color);
  title.innerHTML = `${catIcon(state.category)}${cat.label} — ${state.mode === 'world' ? 'топ-50 мира' : 'рейтинг сообщества'}`;
}

function renderLoading() {
  $('podium').innerHTML = [2, 1, 3].map((p) => `<div class="podium-place p${p} skeleton" style="height:${p === 1 ? 250 : 210}px"></div>`).join('');
  $('rank-head').innerHTML = '';
  $('rank-body').innerHTML = Array.from({ length: 8 }, () =>
    '<tr><td colspan="7"><div class="skeleton" style="height:28px"></div></td></tr>').join('');
  $('table-footer').textContent = '';
}

function renderHeroLeaders() {
  const box = $('hero-leaders');
  const items = ['blitz', 'bullet', 'rapid']
    .map((key) => ({ key, top: state.world?.boards[key]?.[0] }))
    .filter((item) => item.top);
  if (!items.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = items.map(({ key, top }) => `
    <a class="leader-card" href="/player/${encodeURIComponent(top.username)}" style="--c:${CATS[key].color}">
      <span class="cat">${catIcon(key)}</span>
      ${avatar(top.avatar, top.username)}
      <span class="who">
        <small>№1 · ${CATS[key].label}</small>
        <strong>${titleBadge(top.title)} ${esc(top.username)} ${flag(top.country)}</strong>
      </span>
      <span class="score num">${fmt(top.rating)}</span>
    </a>`).join('');
}

function renderPodium() {
  const top = currentRows().filter((r) => r.rank && r.rank <= 3).sort((a, b) => a.rank - b.rank);
  if (!top.length) {
    $('podium').innerHTML = '';
    return;
  }
  $('podium').innerHTML = top.map((r) => `
    <a class="podium-place p${r.rank}" href="/player/${encodeURIComponent(r.username)}">
      ${r.rank === 1 ? `<span class="crown">${icon('crown')}</span>` : ''}
      <span class="avatar-wrap">${avatar(r.avatar, r.username)}<span class="place">${r.rank}</span></span>
      <span class="pname">${titleBadge(r.title)} ${esc(r.username)}</span>
      <span class="preal">${flag(r.country)} ${esc(r.name || r.tagline || '')}</span>
      <span class="prating num">${fmt(r.rating)}</span>
    </a>`).join('');
}

function sortRows(rows) {
  const { key, dir } = state.sort;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * dir;
  });
}

function th(label, { sort, cls = '' } = {}) {
  if (!sort) return `<th class="${cls}">${label}</th>`;
  const sorted = state.sort.key === sort;
  const arrow = sorted ? `<span class="arrow">${state.sort.dir === 1 ? '↑' : '↓'}</span>` : '';
  return `<th class="sortable ${sorted ? 'sorted' : ''} ${cls}" data-sort="${sort}" aria-sort="${sorted ? (state.sort.dir === 1 ? 'ascending' : 'descending') : 'none'}">${label}${arrow}</th>`;
}

function trendCell(delta) {
  if (!delta) return '<span class="trend flat">—</span>';
  return delta > 0
    ? `<span class="trend up">▲ ${fmt(delta)}</span>`
    : `<span class="trend down">▼ ${fmt(Math.abs(delta))}</span>`;
}

function playerCell(r, subline) {
  return `<div class="player-cell">
    ${avatar(r.avatar, r.username)}
    <div class="names">
      <div class="uname">${titleBadge(r.title)}<a href="/player/${encodeURIComponent(r.username)}">${esc(r.username)}</a></div>
      <div class="real">${esc(subline || '')}</div>
    </div>
  </div>`;
}

function rankCell(rank) {
  return rank ? `<span class="rank-num ${rank <= 3 ? `r${rank}` : ''} num">${rank}</span>` : '<span class="rank-num">—</span>';
}

function renderTable() {
  const rows = sortRows(currentRows()).filter((r) => {
    if (!state.filter) return true;
    return [r.username, r.name, r.country, r.tagline].some((v) => v && String(v).toLowerCase().includes(state.filter));
  });
  state.mode === 'world' ? renderWorldTable(rows) : renderCommunityTable(rows);
}

function renderWorldTable(rows) {
  const puzzle = CATS[state.category].puzzle;
  $('rank-head').innerHTML = `<tr>
    ${th('#', { sort: 'rank' })}
    ${th('Игрок')}
    ${th('Страна', { cls: 'hide-sm' })}
    ${th(state.category === 'rush' ? 'Очки' : 'Рейтинг', { sort: 'rating', cls: 'right' })}
    ${puzzle ? '' : th('Партии', { sort: 'games', cls: 'hide-sm' })}
    ${puzzle ? '' : th('% побед', { sort: 'winrate', cls: 'right hide-sm' })}
    ${th('Тренд', { cls: 'right' })}
  </tr>`;

  $('rank-body').innerHTML = rows.length ? rows.map((r, i) => `
    <tr data-user="${esc(r.username)}" style="animation-delay:${Math.min(i, 20) * 15}ms">
      <td>${rankCell(r.rank)}</td>
      <td>${playerCell(r, r.name)}</td>
      <td class="hide-sm">${flag(r.country)} <span class="faint">${esc(r.country || '')}</span></td>
      <td class="right"><span class="rating-value num">${fmt(r.rating)}</span></td>
      ${puzzle ? '' : `<td class="hide-sm">${r.games ? `<div class="record">
        <div class="nums num"><span class="w">${fmt(r.win)} W</span><span>${fmt(r.draw)} D</span><span class="l">${fmt(r.loss)} L</span></div>
        ${wdlBar(r.win, r.draw, r.loss)}</div>` : '<span class="faint">—</span>'}</td>`}
      ${puzzle ? '' : `<td class="right hide-sm num">${r.winrate == null ? '—' : `${r.winrate}%`}</td>`}
      <td class="right">${trendCell(r.trend)}</td>
    </tr>`).join('') : emptyRow('Никого не нашли по фильтру');

  $('table-footer').textContent = `Источник: Chess.com · обновлено ${timeAgo(state.world.fetchedAt)}`;
}

function renderCommunityTable(rows) {
  $('rank-head').innerHTML = `<tr>
    ${th('#', { sort: 'rank' })}
    ${th('Игрок')}
    ${th('Страна', { cls: 'hide-sm' })}
    ${th(state.category === 'rush' ? 'Очки' : 'Рейтинг', { sort: 'rating', cls: 'right' })}
    ${th('Цель', { cls: 'hide-sm' })}
    ${th('На сайте с', { sort: 'memberSince', cls: 'right hide-sm' })}
  </tr>`;

  const total = state.community[state.category]?.members.length || 0;
  if (!total) {
    $('rank-body').innerHTML = `<tr><td colspan="6"><div class="empty">
      <div class="empty-icon">${icon('users')}</div>
      <h3>Здесь пока пусто</h3>
      <p>Войдите через Chess.com — и станьте первым в рейтинге сообщества.</p>
      <a class="btn btn-primary" href="${me ? '/me' : '/login'}">${me ? 'Настроить страницу' : 'Войти через Chess.com'}</a>
    </div></td></tr>`;
    $('table-footer').textContent = '';
    return;
  }

  $('rank-body').innerHTML = rows.length ? rows.map((r, i) => {
    const isMe = me && me.username.toLowerCase() === r.username.toLowerCase();
    return `<tr data-user="${esc(r.username)}" class="${isMe ? 'is-me' : ''}" style="animation-delay:${Math.min(i, 20) * 15}ms">
      <td>${rankCell(r.rank)}</td>
      <td>${playerCell(r, r.tagline || r.name)}</td>
      <td class="hide-sm">${flag(r.country)} <span class="faint">${esc(r.country || '')}</span></td>
      <td class="right"><span class="rating-value num">${fmt(r.rating)}</span></td>
      <td class="hide-sm">${goalCell(r)}</td>
      <td class="right hide-sm faint">${fmtDate(r.memberSince)}</td>
    </tr>`;
  }).join('') : emptyRow('Никого не нашли по фильтру');

  $('table-footer').textContent = `${fmt(total)} ${total === 1 ? 'участник' : 'участников'} · рейтинги подтягиваются с Chess.com автоматически`;
}

function goalCell(r) {
  if (!r.goal) return '<span class="faint">—</span>';
  const current = r.ratings[r.goal.category];
  const pct = current ? Math.min(100, Math.round((current / r.goal.rating) * 100)) : 0;
  return `<div class="goal-mini" style="--accent:${esc(r.accent)}">
    <span>${CATS[r.goal.category]?.label || ''}: ${fmt(current)} → <b>${fmt(r.goal.rating)}</b></span>
    <div class="progress"><span style="width:${pct}%"></span></div>
  </div>`;
}

function emptyRow(text) {
  return `<tr><td colspan="7"><div class="empty"><p>${esc(text)}</p></div></td></tr>`;
}

// Мировой топ нужен всегда — из него собирается блок лидеров в шапке.
loadWorld().then(renderHeroLeaders).catch(() => { $('hero-leaders').innerHTML = ''; });
load();
