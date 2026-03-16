import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { DB_PATH } from './config.js';

const db = new Database(DB_PATH);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      author_id INTEGER NOT NULL,
      approver_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_docs_author ON documents(author_id);
    CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES ('admin', ?, '관리자', 'admin')
    `).run(hash);
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES ('user1', ?, '홍길동', 'user')
    `).run(bcrypt.hashSync('user123', 10));
    console.log('초기 사용자 생성: admin/admin123, user1/user123');
  }
}

export default db;
