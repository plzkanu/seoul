import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProd = NODE_ENV === 'production';

export const PORT = parseInt(process.env.PORT || '3000', 10);

const rawSecret = process.env.JWT_SECRET;
export const JWT_SECRET = rawSecret || (isProd ? null : 'seoul-approval-secret');
if (isProd && !rawSecret) {
  console.warn('경고: JWT_SECRET이 설정되지 않았습니다. Replit Secrets에 설정하세요.');
}

export const DB_PATH = process.env.DATABASE_PATH || join(__dirname, 'approval.db');
