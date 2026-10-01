import { CATS, api, avatar, catIcon, esc, fmt, icon, initLayout, timeAgo, titleBadge, toast } from './common.js';

const GOAL_CATEGORIES = ['blitz', 'bullet', 'rapid', 'daily', 'tactics', 'rush'];
const ACCENTS = ['#81b64c', '#f5c451', '#f08a4b', '#f0616d', '#ff7aa8', '#9b8cff', '#5aa9ff', '#4fd1c5'];
const MAX_LINKS = 5;

const root = document.getElementById('settings-root');
let user = await initLayout('');
if (!user) location.replace('/login');
else render();

function render() {
  const pageUrl = `/player/${encodeURIComponent(user.username)}`;
  root.innerHTML = `
    <div class="settings-head">
      <div><span class="muted">Личная страница</span><h1>Настройки страницы</h1></div>
      <div class="profile-actions">
        <a class="btn" href="${pageUrl}">${icon('user')}Моя страница</a>
        <button class="btn btn-primary" type="submit" form="profile-form">${icon('check')}Сохранить</button>
      </div>
    </div>
    <div class="settings-grid">
      <form class="card card-pad form-grid" id="profile-form" novalidate>
        <div class="field">
          <label for="f-tagline">Статус</label>
          <input class="input" id="f-tagline" name="tagline" maxlength="80" placeholder="Иду к 2000 в блице" value="${esc(user.tagline)}">
          <span class="hint">Короткая строка под ником — видна в рейтинге сообщества.</span>
        </div>
        <div class="field">
          <label for="f-bio">О себе</label>
          <textarea class="textarea" id="f-bio" name="bio" maxlength="2000" rows="6" placeholder="Как давно играете, любимые турниры, кумиры…">${esc(user.bio)}</textarea>
        </div>
        <div class="field">
          <label for="f-opening">Любимый дебют</label>
          <input class="input" id="f-opening" name="favoriteOpening" maxlength="80" list="openings" placeholder="Сицилианская защита" value="${esc(user.favoriteOpening)}">
        </div>
        <div class="field">
          <label>Цель по рейтингу</label>
          <div class="form-row">
            <select class="select" name="goalCategory" aria-label="Категория цели">
              ${GOAL_CATEGORIES.map((key) => `<option value="${key}" ${user.goal?.category === key ? 'selected' : ''}>${CATS[key].label}</option>`).join('')}
            </select>
            <input class="input" name="goalRating" type="number" min="100" max="4000" step="1" placeholder="например, 1800"
                   value="${user.goal?.rating ?? ''}" aria-label="Целевой рейтинг">
          </div>
          <span class="hint">На странице появится прогресс до цели. Оставьте пустым, чтобы скрыть.</span>
        </div>
        <div class="field">
          <label>Цвет страницы</label>
          <div class="swatches" id="swatches">
            ${ACCENTS.map((c) => `<button type="button" class="swatch" data-color="${c}" style="background:${c}" aria-label="Цвет ${c}"></button>`).join('')}
            <input type="color" name="accent" value="${esc(user.accent)}" aria-label="Свой цвет">
          </div>
        </div>
        <div class="field">
          <label>Ссылки</label>
          <div class="form-grid" id="links" style="gap:8px"></div>
          <div><button class="btn btn-sm" type="button" id="add-link">${icon('link')}Добавить ссылку</button></div>
          <span class="hint">YouTube, Twitch, Telegram, Lichess — до ${MAX_LINKS} штук.</span>
        </div>
      </form>

      <aside class="stack">
        <div class="card preview-card" id="preview"></div>
        <div class="card card-pad">
          <div class="card-title">${icon('refresh')}Данные с Chess.com</div>
          <div class="links-list" id="ratings"></div>
          <p class="faint" style="font-size:13px;margin:12px 0" id="synced"></p>
          <button class="btn btn-sm" type="button" id="sync">${icon('refresh')}Обновить сейчас</button>
        </div>
        <div class="card card-pad">
          <div class="card-title" style="--accent:var(--red)">${icon('trash')}Удаление страницы</div>
          <div class="danger-zone" style="margin-top:0">
            <p>Записи и настройки удалятся безвозвратно, вы пропадёте из рейтинга сообщества.</p>
            <button class="btn btn-danger btn-sm" type="button" id="delete">Удалить страницу</button>
          </div>
        </div>
      </aside>
    </div>`;

  const form = document.getElementById('profile-form');
  user.links.forEach(addLinkRow);
  renderRatings();
  updatePreview();
  markSwatch();

  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', save);
  document.getElementById('add-link').addEventListener('click', () => addLinkRow());
  document.getElementById('swatches').addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    if (!swatch) return;
    form.accent.value = swatch.dataset.color;
    updatePreview();
  });
  document.getElementById('sync').addEventListener('click', sync);
  document.getElementById('delete').addEventListener('click', removePage);
}

function addLinkRow(link = { label: '', url: '' }) {
  const box = document.getElementById('links');
  if (box.children.length >= MAX_LINKS) return;
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
    <input class="input" data-link-label maxlength="30" placeholder="Название" value="${esc(link.label)}" aria-label="Название ссылки">
    <input class="input" data-link-url maxlength="200" placeholder="https://…" value="${esc(link.url)}" aria-label="Адрес ссылки">
    <button class="btn btn-ghost" type="button" title="Убрать ссылку">${icon('trash')}</button>`;
  row.querySelector('button').addEventListener('click', () => {
    row.remove();
    document.getElementById('add-link').disabled = false;
  });
  box.append(row);
  document.getElementById('add-link').disabled = box.children.length >= MAX_LINKS;
}

function readForm() {
  const form = document.getElementById('profile-form');
  return {
    tagline: form.tagline.value,
    bio: form.bio.value,
    favoriteOpening: form.favoriteOpening.value,
    goal: { category: form.goalCategory.value, rating: form.goalRating.value === '' ? null : Number(form.goalRating.value) },
    accent: form.accent.value,
    links: [...document.querySelectorAll('.link-row')].map((row) => ({
      label: row.querySelector('[data-link-label]').value,
      url: row.querySelector('[data-link-url]').value,
    })).filter((l) => l.url.trim()),
  };
}

function markSwatch() {
  const accent = document.getElementById('profile-form').accent.value.toLowerCase();
  document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.color === accent));
}

function updatePreview() {
  const values = readForm();
  const preview = document.getElementById('preview');
  preview.style.setProperty('--accent', values.accent);
  preview.innerHTML = `
    <div class="profile-cover"></div>
    <div class="pv-body">
      ${avatar(user.avatar, user.username)}
      <h3>${titleBadge(user.title)}${esc(user.username)}</h3>
      ${values.tagline.trim() ? `<div class="pv-tagline">${esc(values.tagline)}</div>` : '<div class="pv-tagline faint">Ваш статус</div>'}
      ${values.bio.trim() ? `<div class="pv-bio">${esc(values.bio)}</div>` : ''}
      ${values.goal.rating ? `<div class="chip" style="margin-top:12px">${icon('target')}Цель: ${CATS[values.goal.category].label} <b>${fmt(values.goal.rating)}</b></div>` : ''}
    </div>`;
  markSwatch();
}

function renderRatings() {
  const entries = Object.entries(user.ratings).filter(([key]) => CATS[key]);
  document.getElementById('ratings').innerHTML = entries.length
    ? entries.map(([key, value]) => `<span class="chip" style="--c:${CATS[key].color}">${catIcon(key)}${CATS[key].label} <b class="num">${fmt(value)}</b></span>`).join('')
    : '<span class="faint">Рейтингов пока нет</span>';
  document.getElementById('synced').textContent = `Обновлено ${timeAgo(user.syncedAt)}. Рейтинги подтягиваются автоматически.`;
}

async function save(event) {
  event.preventDefault();
  const buttons = document.querySelectorAll('[type="submit"]');
  buttons.forEach((b) => { b.disabled = true; });
  try {
    ({ user } = await api('/api/me', { method: 'PUT', body: readForm() }));
    toast(`Сохранено! <a href="/player/${encodeURIComponent(user.username)}">Посмотреть страницу</a>`, 'success');
  } catch (err) {
    toast(esc(err.message), 'error');
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

async function sync(event) {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    ({ user } = await api('/api/me/sync', { method: 'POST' }));
    renderRatings();
    toast('Рейтинги обновлены', 'success');
  } catch (err) {
    toast(esc(err.message), 'error');
  } finally {
    button.disabled = false;
  }
}

async function removePage() {
  if (!confirm('Удалить вашу страницу на ChessRank? Записи и настройки удалятся безвозвратно.')) return;
  try {
    await api('/api/me', { method: 'DELETE' });
    location.href = '/';
  } catch (err) {
    toast(esc(err.message), 'error');
  }
}
