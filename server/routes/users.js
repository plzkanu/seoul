import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware.js';

const router = Router();

router.get('/approvers', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name FROM users WHERE id != ?
  `).all(req.user.id);
  res.json(users);
});

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name, role, created_at FROM users
  `).all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '아이디, 비밀번호, 이름을 입력하세요.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run(username, hash, name, role || 'user');
    res.status(201).json({ message: '사용자가 등록되었습니다.' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    throw e;
  }
});

router.patch('/:id', (req, res) => {
  const { name, role, password } = req.body;
  const id = req.params.id;
  if (id === '1') {
    return res.status(400).json({ error: '기본 관리자 계정은 수정할 수 없습니다.' });
  }
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (password) {
    updates.push('password = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: '수정할 항목이 없습니다.' });
  }
  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: '수정되었습니다.' });
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  if (id === '1') {
    return res.status(400).json({ error: '기본 관리자 계정은 삭제할 수 없습니다.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: '삭제되었습니다.' });
});

export default router;
