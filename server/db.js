import pg from 'pg';
import bcrypt from 'bcryptjs';
import { DATABASE_URL } from './config.js';

const { Pool } = pg;
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

export async function initDb() {
  if (!pool) {
    throw new Error('DATABASE_URL이 설정되지 않았습니다. Replit Secrets 또는 .env에 설정하세요.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      author_id INTEGER NOT NULL REFERENCES users(id),
      approver_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_docs_author ON documents(author_id);
    CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);

    CREATE TABLE IF NOT EXISTS document_attachments (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_document ON document_attachments(document_id);
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as c FROM users');
  if (parseInt(rows[0].c, 10) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)`,
      ['admin', hash, '관리자', 'admin']
    );
    await pool.query(
      `INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)`,
      ['user1', bcrypt.hashSync('user123', 10), '홍길동', 'user']
    );
    console.log('초기 사용자 생성: admin/admin123, user1/user123');
  }
}

export default pool;
