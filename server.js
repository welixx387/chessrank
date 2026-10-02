import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, oauthEnabled, oauthRedirectUri, ROOT } from './src/config.js';
import { authApiRouter, loadUser, oauthRouter } from './src/auth.js';
import { apiRouter } from './src/api.js';
import { ChessComError } from './src/chesscom.js';
import { db } from './src/db.js';
import { refreshStaleMembers } from './src/members.js';
import { csrfGuard, securityHeaders } from './src/http.js';

// HTML читаем по явным путям: так сборщик Vercel включит файлы в функцию.
const PAGES = {
  index: new URL('./public/index.html', import.meta.url),
  player: new URL('./public/player.html', import.meta.url),
  login: new URL('./public/login.html', import.meta.url),
  me: new URL('./public/me.html', import.meta.url),
  notFound: new URL('./public/404.html', import.meta.url),
};
const pageCache = new Map();
const page = (name, status = 200) => (req, res) => {
  if (!pageCache.has(name)) pageCache.set(name, fs.readFileSync(PAGES[name]));
  res.status(status).type('html').send(pageCache.get(name));
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // за прокси хостинга (Vercel, Render…) для req.ip и secure-cookie

app.use(securityHeaders);
app.use(express.json({ limit: '64kb' }));

app.use('/auth', loadUser, oauthRouter);
app.use('/api', csrfGuard, loadUser);
app.use('/api/auth', authApiRouter);
app.use('/api', apiRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Не найдено' }));

// На Vercel статику из public/ раздаёт CDN, а express.static игнорируется.
app.use(express.static(path.join(ROOT, 'public'), { index: false, maxAge: config.isProd ? '1h' : 0 }));

app.get('/', page('index'));
app.get('/player/:username', page('player'));
app.get('/login', page('login'));
app.get('/me', page('me'));
app.use(page('notFound', 404));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const expected = status < 500 || status === 503 || err instanceof ChessComError;
  if (!expected) console.error(err);
  else if (status >= 500) console.warn(`${req.method} ${req.path}: ${err.message}`);
  const message = expected ? err.message : 'Внутренняя ошибка сервера';
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).type('text').send(message);
});

export default app;

if (!config.isVercel) {
  app.listen(config.port, () => {
    console.log(`ChessRank запущен: ${config.baseUrl} (база: ${db?.kind ?? 'не подключена'})`);
    console.log(oauthEnabled()
      ? `Вход через Chess.com OAuth включён, redirect URI: ${oauthRedirectUri()}`
      : 'OAuth не настроен (CHESSCOM_CLIENT_ID пуст) — работает вход через подтверждение профиля');
    refreshStaleMembers().catch(() => {});
    setInterval(() => refreshStaleMembers().catch(() => {}), 30 * 60_000).unref();
  });
}
