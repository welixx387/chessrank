import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

export const config = {
  port,
  baseUrl,
  isProd: process.env.NODE_ENV === 'production',
  secureCookies: baseUrl.startsWith('https://'),
  dbPath: path.resolve(ROOT, process.env.DATABASE_PATH || 'data/chessrank.db'),
  userAgent: process.env.CHESSCOM_USER_AGENT || 'ChessRank/1.0 (community rating site)',
  oauth: {
    clientId: process.env.CHESSCOM_CLIENT_ID || '',
    clientSecret: process.env.CHESSCOM_CLIENT_SECRET || '',
    scope: process.env.CHESSCOM_OAUTH_SCOPE || 'openid',
    authorizeUrl: process.env.CHESSCOM_OAUTH_AUTHORIZE_URL || 'https://oauth.chess.com/authorize',
    tokenUrl: process.env.CHESSCOM_OAUTH_TOKEN_URL || 'https://oauth.chess.com/token',
    userinfoUrl: process.env.CHESSCOM_OAUTH_USERINFO_URL || '',
    usernameClaim: process.env.CHESSCOM_OAUTH_USERNAME_CLAIM || '',
  },
};

export const oauthEnabled = () => Boolean(config.oauth.clientId);
export const oauthRedirectUri = () => `${config.baseUrl}/auth/chesscom/callback`;
