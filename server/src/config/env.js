import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'QR_HMAC_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    console.error('Please configure server/.env according to server/.env.example');
    process.exit(1);
  }
}

if (process.env.SESSION_SECRET.length < 32 || process.env.QR_HMAC_SECRET.length < 32) {
  console.warn('[SECURITY WARNING] SESSION_SECRET or QR_HMAC_SECRET is shorter than 32 characters. Use a high-entropy secret in production.');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET,
  qrHmacSecret: process.env.QR_HMAC_SECRET,
  qrTokenTtlSeconds: parseInt(process.env.QR_TOKEN_TTL_SECONDS || '90', 10),
  sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10),
  cookieSameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  cookieSecure: process.env.NODE_ENV === 'production',
};
