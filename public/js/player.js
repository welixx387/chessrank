import {
  CATS, api, avatar, catIcon, esc, flag, fmt, fmtDate, fmtShortDate, icon, initLayout, parseUsername, plural,
  timeAgo, titleBadge, toast, wdlBar, winRate,
} from './common.js';

const RATING_ORDER = ['blitz', 'bullet', 'rapid', 'daily', 'daily960', 'tactics', 'rush'];
const CHART_KEYS = ['blitz', 'bullet', 'rapid', 'daily', 'daily960'];
const REASONS = {
  checkmated: 'мат', resigned: 'сдача', timeout: 'время', abandoned: 'покинул партию', agreed: 'соглашение',
  repetition: 'повторение', stalemate: 'пат', insufficient: 'мало материала', '50move': 'правило 50 ходов',
  timevsinsufficient: 'время / мало материала', lose: 'поражение', kingofthehill: 'король на холме', threecheck: 'три шаха',
};

const root = document.getElementById('player-root');
const regionNames = new Intl.DisplayNames(['ru'], { type: 'region' });
let chart = null;

function countryName(code) {
  if (!code || code.startsWith('X')) return code === 'XE' ? 'Англия' : code === 'XS' ? 'Шотландия' : code === 'XW' ? 'Уэльс' : 'Международный';
  try {
    return regionNames.of(code);
  } catch {
    return code;
  }
}

function fmtTimeControl(tc) {
  if (!tc) return '';
  if (tc.includes('/')) return `${Math.max(1, Math.round(Number(tc.split('/')[1]) / 86400))} д./ход`;
  const [base, inc] = tc.split('+').map(Number);
  const main = base >= 60 ? `${Math.round(base / 60)}` : `${base} с`;
  return inc ? `${main}+${inc}` : base >= 60 ? `${main} мин` : main;
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ---------- шапка профиля ----------

function heroHtml({ player, member, isOwner }) {
  const chips = [
    player.country && `<span class="chip">${flag(player.country)} ${esc(countryName(player.country))}</span>`,
    player.league && `<span class="chip">${icon('trophy')} Лига <b>${esc(player.league)}</b></span>`,
    `<span class="chip">${icon('users')} <b>${fmt(player.followers)}</b> ${plural(player.followers, ['подписчик', 'подписчика', 'подписчиков'])}</span>`,
    player.fide && `<span class="chip">FIDE <b>${fmt(player.fide)}</b></span>`,
    player.joined && `<span class="chip">${icon('calendar')} На Chess.com с ${fmtDate(player.joined)}</span>`,
    player.lastOnline && `<span class="chip">${icon('online')} Был(а) ${timeAgo(player.lastOnline)}</span>`,
    player.isStreamer && player.twitchUrl && `<a class="chip" href="${esc(player.twitchUrl)}" target="_blank" rel="noopener">${icon('sparkles')} Стример</a>`,
  ].filter(Boolean);

  return `
    <section class="card profile-hero">
      <div class="profile-cover"></div>
      <div class="profile-main">
        ${avatar(player.avatar, player.username)}
        <div class="profile-info">
          <h1>${titleBadge(player.title)}${esc(player.username)}
            ${member ? `<span class="member-badge">${icon('check')} Участник ChessRank</span>` : ''}</h1>
          ${player.name ? `<div class="realname">${esc(player.name)}</div>` : ''}
          ${member?.tagline ? `<div class="tagline">${esc(member.tagline)}</div>` : ''}
          <div class="profile-meta">${chips.join('')}</div>
        </div>
        <div class="profile-actions">
          ${isOwner ? `<a class="btn btn-primary" href="/me">${icon('edit')}Настроить страницу</a>` : ''}
          <a class="btn" href="${esc(player.url)}" target="_blank" rel="noopener">${icon('external')}Chess.com</a>
          <button class="btn btn-ghost" type="button" data-copy-link title="Скопировать ссылку на страницу">${icon('copy')}</button>
        </div>
      </div>
    </section>`;
}

function ratingCardsHtml(player) {
  const keys = RATING_ORDER.filter((key) => player.ratings[key]);
  if (!keys.length) {
    return `<div class="card card-pad" style="grid-column:1/-1"><div class="empty"><p>У игрока пока нет рейтинговых партий.</p></div></div>`;
  }
  return keys.map((key, i) => {
    const r = player.ratings[key];
    const total = (r.win || 0) + (r.draw || 0) + (r.loss || 0);
    return `
      <div class="rating-card" style="--c:${CATS[key].color};animation-delay:${i * 50}ms">
        <div class="rc-head">${catIcon(key)}${CATS[key].label}</div>
        <div class="rc-value num">${fmt(r.rating)}</div>
        <div class="rc-best">${key === 'rush' ? 'Лучший результат' : r.puzzle ? 'Лучший рейтинг' : `Рекорд: <b>${fmt(r.best)}</b>`}</div>
        ${r.puzzle || !total ? '' : `
          ${wdlBar(r.win, r.draw, r.loss)}
          <div class="rc-record num"><span>${fmt(total)} ${plural(total, ['игра', 'игры', 'игр'])}</span><span>${winRate(r.win, r.draw, r.loss)}% побед</span></div>`}
      </div>`;
  }).join('');
}

// ---------- личная страница ----------

function postHtml(post, member, isOwner) {
  return `
    <article class="post" data-post="${post.id}">
      <div class="post-head">
        ${avatar(member.avatar, member.username)}
        <strong>${esc(member.username)}</strong>
        <span>·</span>
        <time datetime="${new Date(post.createdAt).toISOString()}" title="${fmtDate(post.createdAt)}">${timeAgo(post.createdAt)}</time>
      </div>
      <div class="post-body">${esc(post.body)}</div>
      ${isOwner ? `<button class="btn btn-ghost btn-sm post-delete" type="button" data-delete-post="${post.id}" title="Удалить запись">${icon('trash')}</button>` : ''}
    </article>`;
}

function postsHtml({ member, posts, isOwner }) {
  return `
    <section class="card card-pad" id="posts-card">
      <div class="card-title">${icon('pen')}Записи<span class="spacer"></span><span class="faint num" id="posts-count">${posts.length || ''}</span></div>
      ${isOwner ? `
        <form class="composer" id="composer">
          <textarea class="textarea" name="body" maxlength="1000" placeholder="Чем поделитесь? Например: «Сегодня впервые взял 1600 в блице!»" aria-label="Текст записи"></textarea>
          <div class="row">
            <span class="counter"><span id="composer-count">0</span>/1000</span>
            <button class="btn btn-primary btn-sm" type="submit">${icon('pen')}Опубликовать</button>
          </div>
        </form>` : ''}
      <div id="posts-list">
        ${posts.length
          ? posts.map((post) => postHtml(post, member, isOwner)).join('')
          : `<p class="faint" id="posts-empty">${isOwner ? 'Здесь будут ваши записи: прогресс, мысли о партиях, цели.' : 'Пока нет записей.'}</p>`}
      </div>
    </section>`;
}

function aboutHtml({ player, member, isOwner }) {
  let goal = '';
  if (member.goal) {
    const current = player.ratings[member.goal.category]?.rating ?? null;
    const pct = current ? Math.min(100, Math.round((current / member.goal.rating) * 100)) : 0;
    const left = current == null ? null : member.goal.rating - current;
    goal = `
      <div class="goal-box" style="margin-top:16px">
        <div class="goal-top">
          <span class="muted">${icon('target')} Цель · ${CATS[member.goal.category]?.label || ''}</span>
          <strong class="num">${fmt(member.goal.rating)}</strong>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <div class="goal-foot">${current == null ? 'Пока нет рейтинга в этой категории'
          : left <= 0 ? `Цель достигнута! Сейчас ${fmt(current)}`
          : `Сейчас ${fmt(current)} · осталось ${fmt(left)} ${plural(left, ['очко', 'очка', 'очков'])}`}</div>
      </div>`;
  }

  return `
    <section class="card card-pad">
      <div class="card-title">${icon('user')}О себе</div>
      ${member.bio
        ? `<p class="about-text">${esc(member.bio)}</p>`
        : `<p class="faint">${isOwner ? 'Расскажите о себе в <a href="/me" class="muted" style="text-decoration:underline">настройках страницы</a>.' : 'Игрок пока ничего о себе не написал.'}</p>`}
      ${goal}
      <div style="margin-top:12px">
        ${member.favoriteOpening ? `<div class="about-item">${icon('book')}<div><small>Любимый дебют</small><strong>${esc(member.favoriteOpening)}</strong></div></div>` : ''}
        <div class="about-item">${icon('calendar')}<div><small>На ChessRank</small><strong>с ${fmtDate(member.memberSince)}</strong></div></div>
      </div>
      ${member.links.length ? `<div class="links-list" style="margin-top:12px">
        ${member.links.map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener nofollow ugc">${icon('link')}${esc(l.label)}</a>`).join('')}
      </div>` : ''}
    </section>`;
}

function claimHtml({ player }, me) {
  const body = me
    ? '<p>Этот игрок ещё не присоединился к ChessRank. Поделитесь с ним ссылкой на сайт!</p>'
    : `<p>Это вы? Войдите через Chess.com — появится личная страница с описанием, целями и записями, а вы попадёте в рейтинг сообщества.</p>
       <a class="btn btn-primary" href="/login?username=${encodeURIComponent(player.username)}">${icon('key')}Это я — войти</a>`;
  return `<section class="card card-pad claim-card"><div class="empty-icon">${icon('sparkles')}</div><h3>Личная страница</h3>${body}</section>`;
}

const loadingCard = (id, title, iconName) => `
  <section class="card card-pad" id="${id}">
    <div class="card-title">${icon(iconName)}${title}</div>
    <div class="skeleton" style="height:${id === 'chart-card' ? 300 : 160}px"></div>
  </section>`;

// ---------- история ----------

function renderChart(history) {
  const card = document.getElementById('chart-card');
  const keys = CHART_KEYS.filter((key) => history.series[key]?.length);
  if (!keys.length) {
    card.innerHTML = `<div class="card-title">${icon('chart')}График рейтинга</div>
      <div class="empty"><p>За последние ${history.months} мес. нет рейтинговых партий.</p></div>`;
    return;
  }
  let active = keys.reduce((a, b) => (history.series[b].length > history.series[a].length ? b : a));

  card.innerHTML = `
    <div class="card-title">${icon('chart')}График рейтинга<span class="spacer"></span>
      <div class="chart-toggles">${keys.map((key) => `
        <button type="button" class="tab" data-series="${key}" style="--c:${CATS[key].color}">${catIcon(key)}${CATS[key].label}</button>`).join('')}
      </div>
    </div>
    <div class="chart-box"><canvas aria-label="График рейтинга"></canvas></div>
    <p class="faint" style="margin-top:10px;font-size:13px">По партиям за последние ${history.months} мес. — последняя партия каждого дня.</p>`;

  const draw = () => {
    card.querySelectorAll('[data-series]').forEach((b) => b.classList.toggle('active', b.dataset.series === active));
    drawChart(card.querySelector('canvas'), history.series[active], CATS[active].color);
  };
  card.querySelector('.chart-toggles').addEventListener('click', (event) => {
    const button = event.target.closest('[data-series]');
    if (!button) return;
    active = button.dataset.series;
    draw();
  });
  draw();
}

function drawChart(canvas, points, color) {
  if (!window.Chart) return;
  const { Chart } = window;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = '#9aa3b2';
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, hexAlpha(color, 0.35));
  gradient.addColorStop(1, hexAlpha(color, 0));

  chart?.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        data: points.map(([x, y]) => ({ x, y })),
        borderColor: color,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: points.length < 25 ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: points[0][0],
          max: points.at(-1)[0],
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { maxTicksLimit: 6, callback: (value) => fmtShortDate(value) },
        },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { precision: 0 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#181c25',
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => fmtDate(items[0].parsed.x),
            label: (item) => `Рейтинг: ${fmt(item.parsed.y)}`,
          },
        },
      },
    },
  });
}

function donutHtml({ win, draw, loss }) {
  const total = win + draw + loss || 1;
  const parts = [[win, 'var(--win)'], [draw, 'var(--draw)'], [loss, 'var(--loss)']];
  let offset = 0;
  const arcs = parts.map(([value, color]) => {
    const pct = (value / total) * 100;
    const arc = `<circle cx="18" cy="18" r="15.915" fill="none" stroke="${color}" stroke-width="3.6"
      stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}"/>`;
    offset += pct;
    return arc;
  }).join('');
  return `<div class="donut"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3.6"/>${arcs}</svg>
    <div class="center"><strong class="num">${Math.round((win / total) * 100)}%</strong><small>побед</small></div></div>`;
}

function renderStats(history) {
  const card = document.getElementById('stats-card');
  const { totals } = history;
  if (!totals.games) {
    card.innerHTML = `<div class="card-title">${icon('chart')}Статистика</div><div class="empty"><p>Нет партий за последние ${history.months} мес.</p></div>`;
    return;
  }
  const classes = Object.entries(history.byTimeClass).sort((a, b) => b[1] - a[1]);
  card.innerHTML = `
    <div class="card-title">${icon('chart')}Последние ${history.months} мес.</div>
    <div class="stat-row">
      <div class="stat-box"><small>Партий</small><strong class="num">${fmt(totals.games)}</strong></div>
      <div class="stat-box"><small>Точность</small><strong class="num">${history.avgAccuracy == null ? '—' : `${String(history.avgAccuracy).replace('.', ',')}%`}</strong></div>
      <div class="stat-box"><small>Побед</small><strong class="num">${fmt(totals.win)}</strong></div>
    </div>
    <div class="donut-wrap">
      ${donutHtml(totals)}
      <div class="legend">
        <div><i style="background:var(--win)"></i>Победы <b class="num">${fmt(totals.win)}</b></div>
        <div><i style="background:var(--draw)"></i>Ничьи <b class="num">${fmt(totals.draw)}</b></div>
        <div><i style="background:var(--loss)"></i>Поражения <b class="num">${fmt(totals.loss)}</b></div>
      </div>
    </div>
    <div class="links-list" style="margin-top:16px">
      ${classes.map(([tc, n]) => `<span class="chip" style="--c:${CATS[tc]?.color || '#9aa3b2'}">${CATS[tc] ? catIcon(tc) : ''}${CATS[tc]?.label || esc(tc)} <b class="num">${fmt(n)}</b></span>`).join('')}
    </div>`;
}

function renderOpenings(history) {
  const card = document.getElementById('openings-card');
  if (!history.openings.length) {
    card.innerHTML = `<div class="card-title">${icon('book')}Любимые дебюты</div><p class="faint">Недостаточно партий.</p>`;
    return;
  }
  card.innerHTML = `
    <div class="card-title">${icon('book')}Любимые дебюты</div>
    ${history.openings.map((o) => `
      <div class="opening-row">
        <div class="top"><span title="${esc(o.name)}">${esc(o.name)}</span><span class="num">${fmt(o.games)} · ${winRate(o.win, o.draw, o.loss)}%</span></div>
        ${wdlBar(o.win, o.draw, o.loss)}
      </div>`).join('')}`;
}

function renderGames(history) {
  const card = document.getElementById('games-card');
  if (!history.recent.length) {
    card.innerHTML = `<div class="card-title">${icon('clock')}Последние партии</div><div class="empty"><p>Партий пока нет.</p></div>`;
    return;
  }
  const marks = { win: '1', draw: '½', loss: '0' };
  card.innerHTML = `
    <div class="card-title">${icon('clock')}Последние партии</div>
    <div class="games-list">
      ${history.recent.map((g) => {
        const opp = parseUsername(g.opponent.username);
        return `
        <div class="game-row">
          <span class="result-pill ${g.result}" title="${g.result === 'win' ? 'Победа' : g.result === 'draw' ? 'Ничья' : 'Поражение'}">${marks[g.result]}</span>
          <div class="game-main">
            <div class="opp">
              <span class="color-dot ${g.color}" title="${g.color === 'white' ? 'Белыми' : 'Чёрными'}"></span>
              ${opp ? `<a href="/player/${encodeURIComponent(opp)}">${esc(g.opponent.username)}</a>` : esc(g.opponent.username)}
              <span class="faint num">(${fmt(g.opponent.rating)})</span>
            </div>
            <div class="sub">
              <span style="--c:${CATS[g.timeClass]?.color || '#9aa3b2'}">${CATS[g.timeClass] ? catIcon(g.timeClass) : ''}${fmtTimeControl(g.timeControl)}${g.rules !== 'chess' ? ` · ${esc(g.rules)}` : ''}</span>
              ${REASONS[g.reason] ? `<span>${REASONS[g.reason]}</span>` : ''}
              ${g.accuracy != null ? `<span>точность ${String(g.accuracy).replace('.', ',')}%</span>` : ''}
              ${g.opening ? `<span class="opening" title="${esc(g.opening)}">${esc(g.opening)}</span>` : ''}
            </div>
          </div>
          <div class="game-side">
            <div class="num"><b>${fmt(g.rating)}</b></div>
            <div class="when">${timeAgo(g.end)}</div>
            <a href="${esc(g.url)}" target="_blank" rel="noopener" title="Открыть партию на Chess.com">${icon('external')}</a>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function loadHistory(username) {
  try {
    const history = await api(`/api/players/${encodeURIComponent(username)}/history`);
    renderChart(history);
    renderStats(history);
    renderOpenings(history);
    renderGames(history);
  } catch (err) {
    for (const id of ['chart-card', 'stats-card', 'openings-card', 'games-card']) {
      const card = document.getElementById(id);
      card.querySelector('.skeleton')?.replaceWith(Object.assign(document.createElement('p'), {
        className: 'faint',
        textContent: `Не удалось загрузить историю партий: ${err.message}`,
      }));
    }
  }
}

// ---------- обработчики ----------

function bindOwnerActions(data) {
  const form = document.getElementById('composer');
  if (!form) return;
  const counter = document.getElementById('composer-count');
  form.body.addEventListener('input', () => { counter.textContent = form.body.value.length; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = form.body.value.trim();
    if (!body) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const { post } = await api('/api/me/posts', { method: 'POST', body: { body } });
      data.posts.unshift(post);
      document.getElementById('posts-empty')?.remove();
      document.getElementById('posts-list').insertAdjacentHTML('afterbegin', postHtml(post, data.member, true));
      document.getElementById('posts-count').textContent = data.posts.length;
      form.reset();
      counter.textContent = '0';
      toast('Запись опубликована', 'success');
    } catch (err) {
      toast(esc(err.message), 'error');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('posts-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-post]');
    if (!button || !confirm('Удалить запись?')) return;
    try {
      await api(`/api/me/posts/${button.dataset.deletePost}`, { method: 'DELETE' });
      button.closest('.post').remove();
      data.posts = data.posts.filter((p) => String(p.id) !== button.dataset.deletePost);
      document.getElementById('posts-count').textContent = data.posts.length || '';
    } catch (err) {
      toast(esc(err.message), 'error');
    }
  });
}

function renderError(err, username) {
  const notFound = err.status === 404 || err.status === 400;
  document.title = 'Игрок не найден · ChessRank';
  root.innerHTML = `
    <section class="card card-pad"><div class="empty">
      <div class="empty-icon">${icon(notFound ? 'search' : 'refresh')}</div>
      <h3>${notFound ? `Игрок «${esc(username)}» не найден` : 'Не удалось загрузить профиль'}</h3>
      <p>${notFound ? 'Проверьте ник — он должен совпадать с ником на Chess.com.' : esc(err.message)}</p>
      <a class="btn btn-primary" href="/">${icon('arrowLeft')}К рейтингу</a>
    </div></section>`;
}

async function main() {
  const username = decodeURIComponent(location.pathname.split('/')[2] || '');
  const me = await initLayout('');

  let data;
  try {
    data = await api(`/api/players/${encodeURIComponent(username)}`);
  } catch (err) {
    renderError(err, username);
    return;
  }

  const { player, member, isOwner } = data;
  document.title = `${player.username} — рейтинг и статистика · ChessRank`;
  if (member?.accent) root.style.setProperty('--accent', member.accent);

  root.innerHTML = `
    ${heroHtml(data)}
    <section class="rating-grid">${ratingCardsHtml(player)}</section>
    <div class="grid-2">
      <div class="stack">
        ${loadingCard('chart-card', 'График рейтинга', 'chart')}
        ${member ? postsHtml(data) : ''}
        ${loadingCard('games-card', 'Последние партии', 'clock')}
      </div>
      <div class="stack">
        ${member ? aboutHtml(data) : claimHtml(data, me)}
        ${loadingCard('stats-card', 'Статистика', 'chart')}
        ${loadingCard('openings-card', 'Любимые дебюты', 'book')}
      </div>
    </div>`;

  root.querySelector('[data-copy-link]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/player/${encodeURIComponent(player.username)}`);
      toast('Ссылка скопирована', 'success');
    } catch {
      toast('Не удалось скопировать ссылку', 'error');
    }
  });
  bindOwnerActions(data);

  const params = new URLSearchParams(location.search);
  if (params.has('welcome')) {
    history.replaceState(null, '', location.pathname);
    if (isOwner) toast('Добро пожаловать на ChessRank! <a href="/me">Заполните свою страницу</a> — добавьте описание и цель.', 'success', 8000);
  }

  // Chart.js подгружается с defer — ждём его перед отрисовкой графика.
  if (!window.Chart && document.readyState !== 'complete') {
    await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }
  loadHistory(player.username);
}

main();
