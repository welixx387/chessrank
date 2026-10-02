// Участники сайта: люди, которые вошли через Chess.com и ведут личную страницу.
import { db } from './db.js';
import { getPlayer, ratingSummary } from './chesscom.js';

const STALE_AFTER = 6 * 60 * 60_000;

export async function findMember(username) {
  if (!db) return null;
  return db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
}

export async function listMembers() {
  if (!db) return [];
  return db.all('SELECT * FROM users ORDER BY created_at LIMIT 2000');
}

// Создаёт участника при первом входе или обновляет данные с Chess.com при повторном.
export async function saveMember(player, authMethod) {
  const now = Date.now();
  await db.run(`
    INSERT INTO users (username, display_name, name, avatar, country, title, league, ratings,
                       auth_method, synced_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (username) DO UPDATE SET
      display_name = excluded.display_name, name = excluded.name, avatar = excluded.avatar,
      country = excluded.country, title = excluded.title, league = excluded.league,
      ratings = excluded.ratings, synced_at = excluded.synced_at
  `, [
    player.username.toLowerCase(), player.username, player.name, player.avatar, player.country,
    player.title, player.league, JSON.stringify(ratingSummary(player)), authMethod, now, now, now,
  ]);
  return findMember(player.username);
}

// Обновляет только существующего участника; для остальных игроков ничего не создаёт.
export async function updateMemberFromPlayer(player) {
  if (!db) return null;
  await db.run(`
    UPDATE users SET display_name = ?, name = ?, avatar = ?, country = ?, title = ?, league = ?,
                     ratings = ?, synced_at = ?
    WHERE username = ?
  `, [
    player.username, player.name, player.avatar, player.country, player.title, player.league,
    JSON.stringify(ratingSummary(player)), Date.now(), player.username.toLowerCase(),
  ]);
  return findMember(player.username);
}

export function memberView(row) {
  return {
    username: row.display_name,
    name: row.name,
    avatar: row.avatar,
    country: row.country,
    title: row.title,
    league: row.league,
    ratings: JSON.parse(row.ratings),
    tagline: row.tagline,
    bio: row.bio,
    favoriteOpening: row.favorite_opening,
    goal: row.goal_rating ? { category: row.goal_category, rating: row.goal_rating } : null,
    accent: row.accent,
    links: JSON.parse(row.links),
    memberSince: row.created_at,
    syncedAt: row.synced_at,
  };
}

export async function listPosts(userId, limit = 50) {
  return db.all(
    'SELECT id, body, created_at AS "createdAt" FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit],
  );
}

// Фоновое обновление рейтингов участников, которые давно не заходили.
let refreshing = false;
export async function refreshStaleMembers(limit = 10) {
  if (!db || refreshing) return;
  refreshing = true;
  try {
    const stale = await db.all(
      'SELECT username FROM users WHERE synced_at < ? ORDER BY synced_at LIMIT ?',
      [Date.now() - STALE_AFTER, limit],
    );
    for (const { username } of stale) {
      try {
        const player = await getPlayer(username, { fresh: true });
        if (player) await updateMemberFromPlayer(player);
        else await db.run('UPDATE users SET synced_at = ? WHERE username = ?', [Date.now(), username]);
      } catch (err) {
        console.warn(`Не удалось обновить ${username}: ${err.message}`);
      }
    }
  } finally {
    refreshing = false;
  }
}
