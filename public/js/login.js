import { PAWN_SVG, api, avatar, esc, icon, initLayout, parseUsername, toast } from './common.js';

const ERRORS = {
  oauth_disabled: 'Быстрый вход через Chess.com ещё не подключён владельцем сайта. Используйте подтверждение через профиль — это так же надёжно.',
  oauth_denied: 'Вход отменён на стороне Chess.com.',
  oauth_state: 'Сессия входа устарела. Попробуйте ещё раз.',
  oauth_profile: 'Chess.com не передал ник аккаунта. Попробуйте подтверждение через профиль.',
  oauth_failed: 'Не удалось завершить вход через Chess.com. Попробуйте ещё раз или подтвердите аккаунт через профиль.',
  db_disabled: 'Вход пока недоступен: владелец сайта ещё не подключил базу данных.',
};
const STORAGE_KEY = 'cr_verify';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const me = await initLayout('');

if (me) {
  $('auth-alert').innerHTML = `<div class="alert alert-success">Вы уже вошли как <b>${esc(me.username)}</b>.
    <a href="/player/${encodeURIComponent(me.username)}" style="text-decoration:underline">Открыть мою страницу</a></div>`;
} else if (ERRORS[params.get('error')]) {
  $('auth-alert').innerHTML = `<div class="alert alert-error">${ERRORS[params.get('error')]}</div>`;
}

let config = { oauthEnabled: false, dbEnabled: true };
try {
  config = await api('/api/config');
} catch {}

if (!config.dbEnabled && !me) {
  $('auth-alert').innerHTML = `<div class="alert alert-info">Вход и личные страницы скоро заработают — владелец сайта ещё не подключил базу данных.
    Рейтинги и страницы игроков уже доступны: <a href="/" style="text-decoration:underline">к рейтингу</a>.</div>`;
}

const oauthReady = config.oauthEnabled && config.dbEnabled;
const recommended = '<span class="badge-rec">Рекомендуем</span>';

$('oauth-card').innerHTML = `
  <h2>${icon('key')}Быстрый вход ${oauthReady ? recommended : ''}</h2>
  <p>Официальная авторизация Chess.com: откроется chess.com, где нужно нажать «Разрешить». Займёт пару секунд.</p>
  ${oauthReady
    ? `<a class="btn btn-chesscom" href="/auth/chesscom">${PAWN_SVG}Войти через Chess.com</a>`
    : `<button class="btn btn-chesscom" type="button" disabled>${PAWN_SVG}Войти через Chess.com</button>
       <p class="faint" style="font-size:13.5px">${config.dbEnabled
         ? 'Владелец сайта ещё не подключил OAuth-ключи Chess.com. Пока используйте подтверждение через профиль.'
         : 'Станет доступно после подключения базы данных.'}</p>`}
  <div class="about-item" style="margin-top:auto">${icon('shield')}<div><small>Безопасно</small>
    <strong>Мы получаем только ваш ник — без пароля и доступа к аккаунту.</strong></div></div>`;

// ---------- подтверждение через профиль ----------

function loadPending() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    return saved && saved.expiresAt > Date.now() ? saved : null;
  } catch {
    return null;
  }
}

function savePending(value) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

const verifyCard = $('verify-card');
const heading = `<h2>${icon('shield')}Подтверждение через профиль ${config.oauthEnabled ? '' : recommended}</h2>`;

function renderUsernameStep(prefill = '', error = '') {
  verifyCard.innerHTML = `
    ${heading}
    <p>Работает всегда: вы на минуту вписываете одноразовый код в свой профиль Chess.com, а мы проверяем его через официальный API.</p>
    <form id="verify-start" class="form-grid" style="gap:12px">
      <div class="field">
        <label for="verify-username">Ваш ник на Chess.com</label>
        <input class="input" id="verify-username" name="username" placeholder="например, MagnusCarlsen" autocomplete="username"
               spellcheck="false" required value="${esc(prefill)}">
      </div>
      ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
      <button class="btn btn-primary btn-lg" type="submit">Получить код</button>
    </form>`;

  const form = $('verify-start');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = parseUsername(form.username.value);
    if (!username) return renderUsernameStep(form.username.value, 'Ник может содержать только латиницу, цифры, «_» и «-»');
    const button = form.querySelector('button');
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>Ищем игрока…';
    try {
      const pending = await api('/api/auth/verify/start', { method: 'POST', body: { username } });
      savePending(pending);
      renderCodeStep(pending);
    } catch (err) {
      renderUsernameStep(username, err.message);
    }
  });
}

function renderCodeStep(pending, message = null) {
  verifyCard.innerHTML = `
    ${heading}
    <div class="verify-user">
      ${avatar(pending.avatar, pending.username)}
      <div class="grow"><small class="muted">Подтверждаем аккаунт</small><div><b>${esc(pending.username)}</b></div></div>
      <button class="btn btn-ghost btn-sm" type="button" data-restart>Другой ник</button>
    </div>
    <div class="code-box">
      <code>${esc(pending.code)}</code>
      <button class="btn btn-sm" type="button" data-copy>${icon('copy')}Копировать</button>
    </div>
    <ol class="steps">
      <li>Откройте <a href="https://www.chess.com/settings/profile" target="_blank" rel="noopener" style="color:var(--green-bright);font-weight:600">настройки профиля Chess.com</a></li>
      <li>Вставьте код в поле <b>«Местоположение»</b> (Location) и нажмите <b>«Сохранить»</b></li>
      <li>Вернитесь сюда и нажмите <b>«Проверить»</b>. После входа код из профиля можно удалить</li>
    </ol>
    ${message ? `<div class="alert ${message.type === 'error' ? 'alert-error' : 'alert-info'}">${esc(message.text)}</div>` : ''}
    <button class="btn btn-primary btn-lg" type="button" data-check>${icon('check')}Проверить</button>`;

  verifyCard.querySelector('[data-restart]').addEventListener('click', () => {
    savePending(null);
    renderUsernameStep(pending.username);
  });

  verifyCard.querySelector('[data-copy]').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(pending.code);
      event.currentTarget.innerHTML = `${icon('check')}Скопировано`;
    } catch {
      toast('Не получилось скопировать — выделите код вручную', 'error');
    }
  });

  verifyCard.querySelector('[data-check]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>Проверяем профиль…';
    try {
      const result = await api('/api/auth/verify/check', { method: 'POST', body: { id: pending.id } });
      savePending(null);
      verifyCard.innerHTML = `${heading}<div class="alert alert-success">Аккаунт подтверждён! Открываем вашу страницу…</div>`;
      location.href = `/player/${encodeURIComponent(result.username)}?welcome=1`;
    } catch (err) {
      if (err.status === 410) {
        savePending(null);
        return renderUsernameStep(pending.username, err.message);
      }
      renderCodeStep(pending, { type: err.status === 409 ? 'info' : 'error', text: err.message });
    }
  });
}

const pending = loadPending();
if (!config.dbEnabled) {
  verifyCard.innerHTML = `${heading}
    <p>Одноразовый код в профиле Chess.com — без паролей и ключей.</p>
    <button class="btn btn-primary btn-lg" type="button" disabled>Получить код</button>
    <p class="faint" style="font-size:13.5px">Станет доступно после подключения базы данных.</p>`;
} else if (pending) renderCodeStep(pending);
else renderUsernameStep(params.get('username') || '');
