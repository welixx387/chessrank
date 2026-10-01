import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    NOT NULL UNIQUE,          -- ник в нижнем регистре
    display_name     TEXT    NOT NULL,                 -- ник как на Chess.com
    name             TEXT,
    avatar           TEXT,
    country          TEXT,
    title            TEXT,
    league           TEXT,
    ratings          TEXT    NOT NULL DEFAULT '{}',    -- JSON: { blitz: 1500, ... }
    tagline          TEXT    NOT NULL DEFAULT '',
    bio              TEXT    NOT NULL DEFAULT '',
    favorite_opening TEXT    NOT NULL DEFAULT '',
    goal_category    TEXT    NOT NULL DEFAULT 'blitz',
    goal_rating      INTEGER,
    accent           TEXT    NOT NULL DEFAULT '#81b64c',
    links            TEXT    NOT NULL DEFAULT '[]',
    auth_method      TEXT    NOT NULL,
    synced_at        INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,                    -- sha256 от значения cookie
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS posts_by_user ON posts(user_id, created_at DESC);

  -- незавершённые входы: OAuth state + PKCE verifier или код подтверждения профиля
  CREATE TABLE IF NOT EXISTS pending_auth (
    id         TEXT    PRIMARY KEY,
    kind       TEXT    NOT NULL,
    username   TEXT,
    secret     TEXT    NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

function cleanupExpired() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('DELETE FROM pending_auth WHERE expires_at < ?').run(now);
}
cleanupExpired();
setInterval(cleanupExpired, 60 * 60_000).unref();
