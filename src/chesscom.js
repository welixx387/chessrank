// Клиент Chess.com Published-Data API: https://www.chess.com/news/view/published-data-api
import { config } from './config.js';

const API = 'https://api.chess.com/pub';

// board — ключ в /leaderboards, stats — ключ в /player/{u}/stats,
// timeClass/rules — по ним партии из архива попадают в график рейтинга.
export const CATEGORIES = {
  blitz:      { board: 'live_blitz',      stats: 'chess_blitz',    timeClass: 'blitz',  rules: 'chess' },
  bullet:     { board: 'live_bullet',     stats: 'chess_bullet',   timeClass: 'bullet', rules: 'chess' },
  rapid:      { board: 'live_rapid',      stats: 'chess_rapid',    timeClass: 'rapid',  rules: 'chess' },
  daily:      { board: 'daily',           stats: 'chess_daily',    timeClass: 'daily',  rules: 'chess' },
  daily960:   { board: 'daily960',        stats: 'chess960_daily', timeClass: 'daily',  rules: 'chess960' },
  blitz960:   { board: 'live_blitz960' },
  bughouse:   { board: 'live_bughouse' },
  threecheck: { board: 'live_threecheck' },
  tactics:    { board: 'tactics' },
  rush:       { board: 'rush' },
  battle:     { board: 'battle' },
};

export const COMMUNITY_CATEGORIES = ['blitz', 'bullet', 'rapid', 'daily', 'tactics', 'rush'];

const HISTORY_MONTHS = 3;

export class ChessComError extends Error {
  constructor(message) {
    super(message);
    this.status = 502;
  }
}

export const isValidUsername = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{2,30}$/.test(value);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Chess.com отвечает 429 на много параллельных запросов, поэтому держим не больше MAX_PARALLEL.
const MAX_PARALLEL = 4;
let active = 0;
const waiting = [];

async function withSlot(fn) {
  if (active < MAX_PARALLEL) active++;
  else await new Promise((resolve) => waiting.push(resolve)); // слот передаёт завершившийся запрос
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function request(url) {
  return withSlot(async () => {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(url, {
          headers: { 'User-Agent': config.userAgent, Accept: 'application/json' },
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw new ChessComError('Chess.com не отвечает, попробуйте чуть позже');
      }
      if (res.status === 429 && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (res.status === 404 || res.status === 410) return null;
      if (!res.ok) throw new ChessComError(`Chess.com вернул ошибку ${res.status}`);
      return res.json();
    }
  });
}

// Кэш промисов: одновременные запросы одного и того же ключа делят один поход в API.
const cache = new Map();
const CACHE_LIMIT = 1000;

function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  cache.delete(key);
  const promise = loader();
  cache.set(key, { expires: Date.now() + ttlMs, promise });
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return promise;
}

function fetchCached(url, ttlMs, fresh) {
  if (!fresh) return cached(url, ttlMs, () => request(url));
  const promise = request(url);
  cache.set(url, { expires: Date.now() + ttlMs, promise });
  return promise;
}

const countryCode = (url) => (url ? url.split('/').pop() : null);
const displayName = (profile) => profile.url?.split('/').pop() || profile.username;

// ---------- Таблицы лидеров ----------

function normalizeEntry(e) {
  const signed = (trend) => (trend ? (trend.direction || 0) * (trend.delta || 0) : 0);
  return {
    rank: e.rank,
    username: e.username,
    name: e.name || null,
    title: e.title || null,
    avatar: e.avatar || null,
    country: countryCode(e.country),
    rating: e.score,
    win: e.win_count ?? null,
    draw: e.draw_count ?? null,
    loss: e.loss_count ?? null,
    trend: signed(e.trend_score),
    trendRank: signed(e.trend_rank),
  };
}

export function getLeaderboards() {
  return cached('leaderboards', 10 * 60_000, async () => {
    const raw = await request(`${API}/leaderboards`);
    if (!raw) throw new ChessComError('Таблицы лидеров недоступны');
    const boards = {};
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      boards[key] = (raw[cat.board] || []).map(normalizeEntry);
    }
    return { fetchedAt: Date.now(), boards };
  });
}

// ---------- Профиль игрока ----------

function normalizePlayer(p, s) {
  const ratings = {};
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const st = cat.stats && s[cat.stats];
    if (!st?.last) continue;
    ratings[key] = {
      rating: st.last.rating,
      rd: st.last.rd ?? null,
      date: st.last.date ? st.last.date * 1000 : null,
      best: st.best?.rating ?? null,
      bestGame: st.best?.game ?? null,
      win: st.record?.win ?? 0,
      draw: st.record?.draw ?? 0,
      loss: st.record?.loss ?? 0,
    };
  }
  if (s.tactics?.highest) {
    ratings.tactics = { rating: s.tactics.highest.rating, best: s.tactics.highest.rating, puzzle: true };
  }
  if (s.puzzle_rush?.best) {
    ratings.rush = { rating: s.puzzle_rush.best.score, best: s.puzzle_rush.best.score, puzzle: true };
  }

  return {
    username: displayName(p),
    name: p.name || null,
    avatar: p.avatar || null,
    title: p.title || null,
    country: countryCode(p.country),
    location: p.location || null,
    followers: p.followers ?? 0,
    joined: p.joined ? p.joined * 1000 : null,
    lastOnline: p.last_online ? p.last_online * 1000 : null,
    status: p.status || null,
    league: p.league || null,
    isStreamer: Boolean(p.is_streamer),
    twitchUrl: p.twitch_url || null,
    url: p.url,
    fide: s.fide || null,
    ratings,
  };
}

export function getProfile(username, { fresh = false } = {}) {
  const url = `${API}/player/${encodeURIComponent(username.toLowerCase())}`;
  return fetchCached(url, 5 * 60_000, fresh);
}

export async function getPlayer(username, { fresh = false } = {}) {
  const statsUrl = `${API}/player/${encodeURIComponent(username.toLowerCase())}/stats`;
  const [profile, stats] = await Promise.all([
    getProfile(username, { fresh }),
    fetchCached(statsUrl, 5 * 60_000, fresh),
  ]);
  return profile ? normalizePlayer(profile, stats || {}) : null;
}

// Короткая сводка для таблицы сообщества: { blitz: 1520, rapid: 1610, ... }
export function ratingSummary(player) {
  const out = {};
  for (const [key, value] of Object.entries(player.ratings)) out[key] = value.rating;
  return out;
}

// ---------- История партий ----------

const DRAW_RESULTS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);

function openingName(eco) {
  if (!eco) return null;
  let slug = eco.split('/').pop() || '';
  try {
    slug = decodeURIComponent(slug);
  } catch {}
  return slug.replace(/-/g, ' ').trim() || null;
}

// «Alapin Sicilian Defense 2...Qa5» → «Alapin Sicilian Defense», «Modern Defense with 1 e4» → «Modern Defense»
const openingFamily = (name) => name.split(/\s\d/)[0].replace(/\s+(with|and)$/i, '').trim();

function parseGame(g, u) {
  const isWhite = g.white?.username?.toLowerCase() === u;
  const me = isWhite ? g.white : g.black;
  const opp = isWhite ? g.black : g.white;
  if (!me || me.username?.toLowerCase() !== u || !opp) return null;
  const result = me.result === 'win' ? 'win' : DRAW_RESULTS.has(me.result) ? 'draw' : 'loss';
  return {
    end: g.end_time * 1000,
    url: g.url,
    timeClass: g.time_class,
    timeControl: g.time_control,
    rules: g.rules,
    rated: Boolean(g.rated),
    color: isWhite ? 'white' : 'black',
    rating: me.rating,
    result,
    reason: result === 'win' ? opp.result : me.result,
    opponent: { username: opp.username, rating: opp.rating },
    accuracy: g.accuracies?.[isWhite ? 'white' : 'black'] ?? null,
    opening: openingName(g.eco),
  };
}

function categoryOf(game) {
  if (game.rules === 'chess' && ['blitz', 'bullet', 'rapid', 'daily'].includes(game.timeClass)) return game.timeClass;
  if (game.rules === 'chess960' && game.timeClass === 'daily') return 'daily960';
  return null;
}

// Оставляем последнюю точку за день: график на 3 месяца остаётся лёгким.
function lastPerDay(points) {
  const byDay = new Map();
  for (const point of points) byDay.set(Math.floor(point[0] / 86_400_000), point);
  return [...byDay.values()];
}

function summarize(games) {
  const series = {};
  const totals = { games: games.length, win: 0, draw: 0, loss: 0 };
  const byTimeClass = {};
  const openings = new Map();
  const accuracies = [];

  for (const g of games) {
    totals[g.result]++;
    byTimeClass[g.timeClass] = (byTimeClass[g.timeClass] || 0) + 1;
    if (g.accuracy != null) accuracies.push(g.accuracy);

    const category = categoryOf(g);
    if (g.rated && category) (series[category] ||= []).push([g.end, g.rating]);

    if (g.opening && g.rules === 'chess') {
      const family = openingFamily(g.opening);
      const entry = openings.get(family) || { name: family, games: 0, win: 0, draw: 0, loss: 0 };
      entry.games++;
      entry[g.result]++;
      openings.set(family, entry);
    }
  }
  for (const key of Object.keys(series)) series[key] = lastPerDay(series[key]);

  return {
    months: HISTORY_MONTHS,
    from: games[0]?.end ?? null,
    to: games.at(-1)?.end ?? null,
    totals,
    byTimeClass,
    avgAccuracy: accuracies.length
      ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 10) / 10
      : null,
    series,
    openings: [...openings.values()].sort((a, b) => b.games - a.games).slice(0, 6),
    recent: games.slice(-15).reverse(),
  };
}

export function getHistory(username) {
  const u = username.toLowerCase();
  return cached(`history:${u}`, 20 * 60_000, async () => {
    const list = await request(`${API}/player/${encodeURIComponent(u)}/games/archives`);
    if (!list) return null;
    const games = [];
    // Месяцы грузим последовательно — Chess.com просит не делать параллельных запросов.
    for (const url of (list.archives || []).slice(-HISTORY_MONTHS)) {
      const month = await request(url);
      for (const g of month?.games || []) {
        const parsed = parseGame(g, u);
        if (parsed) games.push(parsed);
      }
    }
    games.sort((a, b) => a.end - b.end);
    return summarize(games);
  });
}
