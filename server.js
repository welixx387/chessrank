import path from 'node:path';
import express from 'express';
import { config, oauthEnabled, oauthRedirectUri, ROOT } from './src/config.js';
import { authApiRouter, loadUser, oauthRouter } from './src/auth.js';
import { apiRouter } from './src/api.js';
import { ChessComError } from './src/chesscom.js';
import { refreshStaleMembers } from './src/members.js';
import { csrfGuard, securityHeaders } from './src/http.js';

const PUBLIC = path.join(ROOT, 'public');
const page = (file) => (req, res) => res.sendFile(path.join(PUBLIC, file));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // за прокси хостинга (Render, Railway…) для req.ip и secure-cookie

app.use(securityHeaders);
app.use(express.json({ limit: '64kb' }));
app.use(loadUser);

app.use('/auth', oauthRouter);
app.use('/api', csrfGuard);
app.use('/api/auth', authApiRouter);
app.use('/api', apiRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Не найдено' }));

app.use('/vendor/chart.js', express.static(path.join(ROOT, 'node_modules/chart.js/dist'), { maxAge: '7d' }));
app.use(express.static(PUBLIC, { index: false, maxAge: config.isProd ? '1h' : 0 }));

app.get('/', page('index.html'));
app.get('/player/:username', page('player.html'));
app.get('/login', page('login.html'));
app.get('/me', page('me.html'));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const message = status < 500 || err instanceof ChessComError ? err.message : 'Внутренняя ошибка сервера';
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).type('text').send(message);
});

app.listen(config.port, () => {
  console.log(`ChessRank запущен: ${config.baseUrl}`);
  console.log(oauthEnabled()
    ? `Вход через Chess.com OAuth включён, redirect URI: ${oauthRedirectUri()}`
    : 'OAuth не настроен (CHESSCOM_CLIENT_ID пуст) — работает вход через подтверждение профиля');
  refreshStaleMembers().catch(() => {});
  setInterval(() => refreshStaleMembers().catch(() => {}), 30 * 60_000).unref();
});
