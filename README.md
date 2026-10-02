# ChessRank — рейтинг игроков Chess.com

Сайт с красивыми таблицами лидеров Chess.com, страницами игроков и личными страницами,
которые можно вести после входа через Chess.com.

> Неофициальный фан-проект, не связан с Chess.com. Все данные берутся из
> [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api).

## Возможности

- **Мировой топ** — топ-50 Chess.com в 11 категориях: блиц, пуля, рапид, заочные, Chess960,
  задачи, Puzzle Rush, Puzzle Battle, шведские и «три шаха». Пьедестал для тройки лидеров,
  сортировка, фильтр, статистика побед/ничьих/поражений и тренд рейтинга.
- **Рейтинг сообщества** — все игроки, которые вошли на сайт, отсортированные по рейтингу
  в выбранной категории. Рейтинги обновляются автоматически.
- **Страница любого игрока** — поиск по нику (или по ссылке на профиль Chess.com):
  рейтинги и рекорды, график рейтинга за 3 месяца, статистика, точность, любимые дебюты,
  последние партии.
- **Вход через Chess.com и личная страница** — статус, «О себе», любимый дебют, цель по рейтингу
  с прогрессом, цвет страницы, ссылки на соцсети и лента записей.
- Тёмный дизайн, адаптивная вёрстка под телефоны, без сборки фронтенда.

## Быстрый старт

Нужен [Node.js](https://nodejs.org/) **22.13 или новее** (используется встроенный `node:sqlite`).

```bash
npm install
npm start
```

Откройте <http://localhost:3000>. Для разработки с автоперезапуском: `npm run dev`.

Настройки задаются через переменные окружения или файл `.env` — скопируйте `.env.example`
в `.env` и поправьте значения.

## Вход через Chess.com

Сайт поддерживает два способа, пароль от Chess.com никогда не запрашивается.

### 1. Подтверждение через профиль — работает сразу

1. Игрок вводит свой ник, сайт выдаёт одноразовый код вида `CR-7KQ2MX`.
2. Игрок вставляет код в поле **«Местоположение» (Location)** в
   [настройках профиля Chess.com](https://www.chess.com/settings/profile) и сохраняет.
3. Сайт проверяет профиль через официальный API и создаёт сессию. После входа код можно удалить.

### 2. Официальный OAuth 2.0 (кнопка «Войти через Chess.com»)

Chess.com выдаёт OAuth-ключи только по заявке, поэтому кнопка включается после настройки:

1. Подайте заявку: <https://forms.gle/RwGLuZkwDysCj2GV7>
   ([подробности на форуме Chess.com](https://www.chess.com/clubs/forum/view/guide-applying-for-oauth-access)).
2. В заявке укажите redirect URI: `https://ВАШ-ДОМЕН/auth/chesscom/callback`.
3. Полученный `client_id` (и `client_secret`, если выдали) пропишите в `.env`:

   ```env
   BASE_URL=https://ваш-домен
   CHESSCOM_CLIENT_ID=...
   CHESSCOM_CLIENT_SECRET=
   ```

Используется Authorization Code + PKCE (S256). Ник берётся из `id_token`
(`preferred_username` или `username`). Если в документации, которую пришлёт Chess.com,
указаны другие scope или поле с ником, настройте `CHESSCOM_OAUTH_SCOPE`,
`CHESSCOM_OAUTH_USERNAME_CLAIM` или `CHESSCOM_OAUTH_USERINFO_URL`.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `PORT` | `3000` | Порт сервера |
| `BASE_URL` | адрес Vercel или `http://localhost:PORT` | Публичный адрес сайта; от него строится OAuth redirect URI. С `https://` cookie становятся `Secure` |
| `DATABASE_URL` / `POSTGRES_URL` | — | Строка подключения Postgres. Если задана, используется вместо SQLite (обязательно для Vercel) |
| `DATABASE_PATH` | `data/chessrank.db` | Файл базы SQLite, когда Postgres не задан |
| `CHESSCOM_USER_AGENT` | `ChessRank/1.0 …` | User-Agent для API Chess.com — добавьте свой контакт |
| `CHESSCOM_CLIENT_ID` | — | OAuth client id; пусто — OAuth выключен |
| `CHESSCOM_CLIENT_SECRET` | — | Секрет, если он выдан (для PKCE не обязателен) |
| `CHESSCOM_OAUTH_SCOPE` | `openid` | Запрашиваемые scope |
| `CHESSCOM_OAUTH_AUTHORIZE_URL` | `https://oauth.chess.com/authorize` | Адрес авторизации |
| `CHESSCOM_OAUTH_TOKEN_URL` | `https://oauth.chess.com/token` | Адрес обмена кода на токены |
| `CHESSCOM_OAUTH_USERINFO_URL` | — | Необязательный userinfo-эндпоинт |
| `CHESSCOM_OAUTH_USERNAME_CLAIM` | — | Имя поля с ником, если оно нестандартное |

## Деплой

### Vercel

1. **Add New → Project** → импортируйте этот репозиторий. Настройки не нужны: Vercel сам
   распознает Express (`server.js`), а `public/` раздаст через CDN.
2. Подключите базу: в проекте откройте **Storage → Create Database → Neon (Postgres)** →
   **Connect** к проекту (все окружения). Vercel сам добавит переменную `DATABASE_URL`.
3. **Deployments → ⋯ → Redeploy**, чтобы новая переменная подхватилась.

Без базы сайт тоже работает — таблицы лидеров и страницы игроков открываются, а вход, личные
страницы и рейтинг сообщества включатся после шага 2. Таблицы создаются автоматически.
`BASE_URL` на Vercel задавать не обязательно — берётся из адреса production-деплоя.

### Сервер с диском

Подойдёт любой хостинг для Node.js с **постоянным диском** — тогда база хранится в файле SQLite.

**Render.com:** New → Web Service → подключите этот репозиторий.
Build command `npm install`, start command `npm start`. Добавьте Disk (например, `/var/data`)
и переменные `BASE_URL=https://<ваш-сервис>.onrender.com`, `DATABASE_PATH=/var/data/chessrank.db`.
Без диска сайт тоже работает, но участники и записи будут пропадать при каждом перезапуске.

**Railway / Fly.io / VPS:** так же — запустите `npm start` и укажите `DATABASE_PATH` на подключённый том.

**Docker:**

```bash
docker build -t chessrank .
docker run -p 3000:3000 -v chessrank-data:/app/data -e BASE_URL=http://localhost:3000 chessrank
```

## Как устроено

```
server.js            Express: страницы, API, обработка ошибок
src/config.js        настройки из окружения / .env
src/db.js            Postgres или SQLite: участники, сессии, записи, незавершённые входы
src/chesscom.js      клиент Chess.com API: кэш, ограничение параллельных запросов, разбор партий
src/auth.js          OAuth + PKCE, подтверждение через профиль, сессии в httpOnly cookie
src/members.js       участники сайта и фоновое обновление их рейтингов
src/api.js           JSON API
src/http.js          ошибки, rate limit, защита от CSRF, заголовки безопасности
public/              HTML-страницы, стили и JS без сборки (Chart.js лежит в public/vendor)
vercel.json          маршруты страниц и заголовки безопасности для Vercel
```

### API

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/api/leaderboards` | Таблицы лидеров по всем категориям |
| GET | `/api/community?category=blitz` | Рейтинг участников сайта |
| GET | `/api/players/:username` | Профиль и рейтинги игрока + его личная страница, если есть |
| GET | `/api/players/:username/history` | График, статистика, дебюты и партии за 3 месяца |
| GET | `/api/me` | Текущий пользователь |
| PUT | `/api/me` | Сохранить личную страницу |
| POST | `/api/me/sync` | Обновить рейтинги с Chess.com |
| POST / DELETE | `/api/me/posts[/:id]` | Добавить / удалить запись |
| DELETE | `/api/me` | Удалить личную страницу |
| POST | `/api/auth/verify/start`, `/api/auth/verify/check` | Вход через подтверждение профиля |
| POST | `/api/auth/logout` | Выход |
| GET | `/auth/chesscom` | Начать вход через OAuth |

Изменяющие запросы требуют заголовок `X-Requested-With: fetch` (защита от CSRF).

## Ограничения

- Chess.com отдаёт таблицы лидеров только для топ-50 в каждой категории — полного списка всех
  игроков в API нет. Поэтому любого игрока можно найти поиском, а «рейтинг всех» строится
  из участников сайта.
- Данные кэшируются: таблицы лидеров — 10 минут, профили — 5 минут, история партий — 20 минут.

## Лицензия

[MIT](LICENSE)
