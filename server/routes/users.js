import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware.js';

const router = Router();

router.get('/approvers', authMiddleware, async (req, res) => {
  const { rows } = await db.query('SELECT id, username, name FROM users WHERE id != $1', [req.user.id]);
  res.json(rows);
});

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT id, username, name, role, created_at FROM users');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '아이디, 비밀번호, 이름을 입력하세요.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    await db.query(`
      INSERT INTO users (username, password, name, role)
      VALUES ($1, $2, $3, $4)
    `, [username, hash, name, role || 'user']);
    res.status(201).json({ message: '사용자가 등록되었습니다.' });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    throw e;
  }
});

router.patch('/:id', async (req, res) => {
  const { name, role, password } = req.body;
  const id = req.params.id;
  if (id === '1') {
    return res.status(400).json({ error: '기본 관리자 계정은 수정할 수 없습니다.' });
  }
  const updates = [];
  const params = [];
  let idx = 1;
  if (name) { updates.push(`name = $${idx++}`); params.push(name); }
  if (role) { updates.push(`role = $${idx++}`); params.push(role); }
  if (password) {
    updates.push(`password = $${idx++}`);
    params.push(bcrypt.hashSync(password, 10));
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: '수정할 항목이 없습니다.' });
  }
  params.push(id);
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ message: '수정되었습니다.' });
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (id === '1') {
    return res.status(400).json({ error: '기본 관리자 계정은 삭제할 수 없습니다.' });
  }
  await db.query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ message: '삭제되었습니다.' });
});

export default router;
