-- 문서 결재 시스템 - Supabase 테이블 생성
-- Supabase Dashboard → SQL Editor에서 이 스크립트 실행

-- users 테이블
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- documents 테이블
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

-- 초기 사용자 (비밀번호: admin123, user123)
INSERT INTO users (username, password, name, role) VALUES
  ('admin', '$2a$10$tIs5SUHGb6wkW7i3AijulOAuPVwVtixOfqOek8Wx72M62skA1g.Ri', '관리자', 'admin'),
  ('user1', '$2a$10$IpIExdnkXKdK6GTWAaFOpOaNcVxEHcEzvUgCKgS3N53qciGmb4iXS', '홍길동', 'user')
ON CONFLICT (username) DO NOTHING;
