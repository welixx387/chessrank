import { Router } from 'express';
import { db } from './db.js';
import { oauthEnabled } from './config.js';
import { COMMUNITY_CATEGORIES, getHistory, getLeaderboards, getPlayer, isValidUsername } from './chesscom.js';
import { findMember, listPosts, memberView, refreshStaleMembers, updateMemberFromPlayer } from './members.js';
import { endSession } from './auth.js';
import { HttpError, rateLimit, requireUser } from './http.js';

export const apiRouter = Router();

const MAX_POSTS = 300;

function validUsernameParam(req) {
  const { username } = req.params;
  if (!isValidUsername(username)) throw new HttpError(400, 'Некорректный ник');
  return username;
}

apiRouter.get('/config', (req, res) => {
  res.json({ oauthEnabled: oauthEnabled() });
});

apiRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? memberView(req.user) : null });
});

apiRouter.get('/leaderboards', async (req, res) => {
  res.json(await getLeaderboards());
});

apiRouter.get('/players/:username', async (req, res) => {
  const username = validUsernameParam(req);
  const player = await getPlayer(username);
  if (!player) throw new HttpError(404, 'Игрок с таким ником не найден на Chess.com');

  let member = findMember(username);
  if (member && Date.now() - member.synced_at > 10 * 60_000) member = updateMemberFromPlayer(player);

  res.json({
    player,
    member: member ? memberView(member) : null,
    posts: member ? listPosts(member.id) : [],
    isOwner: Boolean(req.user && member && req.user.id === member.id),
  });
});

apiRouter.get('/players/:username/history', async (req, res) => {
  const history = await getHistory(validUsernameParam(req));
  if (!history) throw new HttpError(404, 'История партий недоступна');
  res.json(history);
});

apiRouter.get('/community', (req, res) => {
  const category = COMMUNITY_CATEGORIES.includes(req.query.category) ? req.query.category : 'blitz';
  const rows = db.prepare(`
    SELECT * FROM users
    ORDER BY json_extract(ratings, '$.' || ?) IS NULL, json_extract(ratings, '$.' || ?) DESC, created_at
    LIMIT 1000
  `).all(category, category);

  let rank = 0;
  const members = rows.map((row) => {
    const view = memberView(row);
    const rating = view.ratings[category] ?? null;
    return {
      rank: rating == null ? null : ++rank,
      username: view.username,
      name: view.name,
      title: view.title,
      avatar: view.avatar,
      country: view.country,
      rating,
      tagline: view.tagline,
      goal: view.goal,
      ratings: view.ratings,
      accent: view.accent,
      memberSince: view.memberSince,
    };
  });

  refreshStaleMembers().catch(() => {});
  res.json({ category, members });
});

// ---------- Личная страница ----------

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

function cleanLinks(links) {
  if (!Array.isArray(links)) return [];
  const out = [];
  for (const link of links.slice(0, 5)) {
    const url = text(link?.url, 200);
    const label = text(link?.label, 30);
    if (!url) continue;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new HttpError(400, `Ссылка «${url}» некорректна`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'Ссылки должны начинаться с http:// или https://');
    out.push({ label: label || parsed.hostname.replace(/^www\./, ''), url: parsed.toString() });
  }
  return out;
}

apiRouter.put('/me', requireUser, (req, res) => {
  const body = req.body || {};
  const goalCategory = COMMUNITY_CATEGORIES.includes(body.goal?.category) ? body.goal.category : 'blitz';
  let goalRating = null;
  if (body.goal?.rating !== undefined && body.goal?.rating !== null && body.goal?.rating !== '') {
    goalRating = Number(body.goal.rating);
    if (!Number.isInteger(goalRating) || goalRating < 100 || goalRating > 4000) {
      throw new HttpError(400, 'Цель по рейтингу — целое число от 100 до 4000');
    }
  }
  const accent = /^#[0-9a-f]{6}$/i.test(body.accent) ? body.accent.toLowerCase() : '#81b64c';

  db.prepare(`
    UPDATE users SET tagline = ?, bio = ?, favorite_opening = ?, goal_category = ?, goal_rating = ?,
                     accent = ?, links = ?, updated_at = ?
    WHERE id = ?
  `).run(
    text(body.tagline, 80), text(body.bio, 2000), text(body.favoriteOpening, 80), goalCategory, goalRating,
    accent, JSON.stringify(cleanLinks(body.links)), Date.now(), req.user.id,
  );
  res.json({ user: memberView(findMember(req.user.username)) });
});

apiRouter.post('/me/sync', requireUser, rateLimit(20, 10 * 60_000), async (req, res) => {
  const player = await getPlayer(req.user.username, { fresh: true });
  if (!player) throw new HttpError(404, 'Профиль на Chess.com не найден');
  res.json({ user: memberView(updateMemberFromPlayer(player)) });
});

apiRouter.post('/me/posts', requireUser, rateLimit(30, 10 * 60_000), (req, res) => {
  const body = text(req.body?.body, 1000);
  if (!body) throw new HttpError(400, 'Запись не может быть пустой');
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id = ?').get(req.user.id);
  if (count >= MAX_POSTS) throw new HttpError(400, `Можно хранить до ${MAX_POSTS} записей — удалите старые`);

  const createdAt = Date.now();
  const { lastInsertRowid } = db.prepare('INSERT INTO posts (user_id, body, created_at) VALUES (?, ?, ?)')
    .run(req.user.id, body, createdAt);
  res.status(201).json({ post: { id: Number(lastInsertRowid), body, createdAt } });
});

apiRouter.delete('/me/posts/:id', requireUser, (req, res) => {
  const { changes } = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!changes) throw new HttpError(404, 'Запись не найдена');
  res.json({ ok: true });
});

apiRouter.delete('/me', requireUser, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  endSession(req, res);
  res.json({ ok: true });
});
