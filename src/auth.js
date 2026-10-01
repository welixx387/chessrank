// Вход через Chess.com двумя способами:
//  1. OAuth 2.0 + PKCE (oauth.chess.com) — нужен client_id, который Chess.com выдаёт по заявке.
//  2. Подтверждение через профиль: игрок вписывает одноразовый код в поле «Местоположение»
//     своего профиля, а мы проверяем его через публичный API. Работает без ключей.
import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';
import { config, oauthEnabled, oauthRedirectUri } from './config.js';
import { getPlayer, getProfile, isValidUsername } from './chesscom.js';
import { saveMember } from './members.js';
import { HttpError, rateLimit } from './http.js';

const SESSION_COOKIE = 'cr_session';
const OAUTH_COOKIE = 'cr_oauth_state';
const SESSION_TTL = 30 * 24 * 60 * 60_000;
const VERIFY_TTL = 30 * 60_000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('base64url');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.secureCookies,
  path: '/',
  maxAge,
});

function parseCookies(header = '') {
  const cookies = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const value = part.slice(eq + 1).trim();
    try {
      cookies[part.slice(0, eq).trim()] = decodeURIComponent(value);
    } catch {
      cookies[part.slice(0, eq).trim()] = value;
    }
  }
  return cookies;
}

export function loadUser(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  const token = req.cookies[SESSION_COOKIE];
  req.user = token
    ? db.prepare(`
        SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
      `).get(sha256(token), Date.now()) ?? null
    : null;
  next();
}

function startSession(res, userId) {
  const token = randomToken();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + SESSION_TTL);
  res.cookie(SESSION_COOKIE, token, cookieOptions(SESSION_TTL));
}

export function endSession(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function takePending(id, kind) {
  const row = db.prepare('SELECT * FROM pending_auth WHERE id = ? AND kind = ? AND expires_at > ?')
    .get(id, kind, Date.now());
  if (row) db.prepare('DELETE FROM pending_auth WHERE id = ?').run(id);
  return row ?? null;
}

// ---------- OAuth 2.0 + PKCE ----------

export const oauthRouter = Router();

oauthRouter.get('/chesscom', (req, res) => {
  if (!oauthEnabled()) return res.redirect('/login?error=oauth_disabled');

  const state = randomToken(16);
  const verifier = randomToken(48);
  db.prepare('INSERT INTO pending_auth (id, kind, secret, expires_at) VALUES (?, ?, ?, ?)')
    .run(state, 'oauth', verifier, Date.now() + 10 * 60_000);
  res.cookie(OAUTH_COOKIE, state, cookieOptions(10 * 60_000));

  const url = new URL(config.oauth.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: config.oauth.clientId,
    redirect_uri: oauthRedirectUri(),
    response_type: 'code',
    scope: config.oauth.scope,
    state,
    code_challenge: sha256(verifier),
    code_challenge_method: 'S256',
  });
  res.redirect(url.toString());
});

oauthRouter.get('/chesscom/callback', async (req, res) => {
  const fail = (reason) => res.redirect(`/login?error=${reason}`);
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const expectedState = req.cookies[OAUTH_COOKIE];
  res.clearCookie(OAUTH_COOKIE, { path: '/' });

  if (req.query.error) return fail('oauth_denied');
  if (!code || !state || state !== expectedState) return fail('oauth_state');
  const pending = takePending(state, 'oauth');
  if (!pending) return fail('oauth_state');

  try {
    const tokens = await exchangeCode(code, pending.secret);
    const username = await resolveUsername(tokens);
    const player = username ? await getPlayer(username, { fresh: true }) : null;
    if (!player) return fail('oauth_profile');
    const user = saveMember(player, 'oauth');
    startSession(res, user.id);
    res.redirect(`/player/${encodeURIComponent(player.username)}?welcome=1`);
  } catch (err) {
    console.error('Ошибка OAuth:', err);
    fail('oauth_failed');
  }
});

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri(),
    client_id: config.oauth.clientId,
    code_verifier: verifier,
  });
  if (config.oauth.clientSecret) body.set('client_secret', config.oauth.clientSecret);

  const res = await fetch(config.oauth.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`token endpoint ответил ${res.status}: ${await res.text()}`);
  return res.json();
}

function decodeJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// id_token получен напрямую с token endpoint по TLS, поэтому подпись можно не проверять
// (OpenID Connect Core, 3.1.3.7), но аудиторию сверяем.
async function resolveUsername(tokens) {
  const sources = [];
  const idClaims = tokens.id_token && decodeJwt(tokens.id_token);
  if (idClaims) {
    const aud = [].concat(idClaims.aud ?? []);
    if (aud.length === 0 || aud.includes(config.oauth.clientId)) sources.push(idClaims);
  }
  if (config.oauth.userinfoUrl && tokens.access_token) {
    const res = await fetch(config.oauth.userinfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) sources.push(await res.json());
  }

  // «name»/«nickname» сюда не входят: там может быть настоящее имя, совпадающее с чужим ником.
  const claimNames = config.oauth.usernameClaim ? [config.oauth.usernameClaim] : ['preferred_username', 'username'];
  for (const claims of sources) {
    for (const name of claimNames) {
      if (isValidUsername(claims[name])) return claims[name];
    }
  }
  console.error('OAuth: в ответе Chess.com не найден ник. Доступные поля:', sources.map((s) => Object.keys(s)));
  return null;
}

// ---------- Подтверждение через профиль ----------

export const authApiRouter = Router();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  'CR-' + Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

authApiRouter.post('/verify/start', rateLimit(20, 10 * 60_000), async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!isValidUsername(username)) throw new HttpError(400, 'Введите ник Chess.com: латиница, цифры, «_» или «-»');
  const player = await getPlayer(username);
  if (!player) throw new HttpError(404, 'Игрок с таким ником не найден на Chess.com');

  const id = randomToken(24);
  const code = makeCode();
  db.prepare('INSERT INTO pending_auth (id, kind, username, secret, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, 'verify', player.username, code, Date.now() + VERIFY_TTL);
  res.json({ id, code, username: player.username, avatar: player.avatar, expiresAt: Date.now() + VERIFY_TTL });
});

authApiRouter.post('/verify/check', rateLimit(60, 10 * 60_000), async (req, res) => {
  const id = String(req.body?.id || '');
  const pending = db.prepare("SELECT * FROM pending_auth WHERE id = ? AND kind = 'verify' AND expires_at > ?")
    .get(id, Date.now());
  if (!pending) throw new HttpError(410, 'Код устарел. Начните заново');

  const profile = await getProfile(pending.username, { fresh: true });
  if (!profile) throw new HttpError(404, 'Игрок не найден на Chess.com');
  const visible = `${profile.location || ''} ${profile.name || ''}`.toUpperCase();
  if (!visible.includes(pending.secret)) {
    throw new HttpError(409, `Код ${pending.secret} пока не виден в профиле. Сохраните профиль на Chess.com и попробуйте ещё раз через несколько секунд`);
  }

  takePending(id, 'verify');
  const player = await getPlayer(pending.username, { fresh: true });
  if (!player) throw new HttpError(404, 'Игрок не найден на Chess.com');
  const user = saveMember(player, 'profile');
  startSession(res, user.id);
  res.json({ ok: true, username: player.username });
});

authApiRouter.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});
