import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status, my } = req.query;
  let sql = `
    SELECT d.*, u.name as author_name, a.name as approver_name
    FROM documents d
    LEFT JOIN users u ON d.author_id = u.id
    LEFT JOIN users a ON d.approver_id = a.id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ' AND d.status = ?';
    params.push(status);
  }
  if (my === 'true') {
    sql += ' AND d.author_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY d.created_at DESC';
  const docs = db.prepare(sql).all(...params);
  res.json(docs);
});

router.get('/:id', (req, res) => {
  const doc = db.prepare(`
    SELECT d.*, u.name as author_name, a.name as approver_name
    FROM documents d
    LEFT JOIN users u ON d.author_id = u.id
    LEFT JOIN users a ON d.approver_id = a.id
    WHERE d.id = ?
  `).get(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '조회 권한이 없습니다.' });
  }
  res.json(doc);
});

router.post('/', (req, res) => {
  const { title, content, approver_id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 입력하세요.' });
  }
  const result = db.prepare(`
    INSERT INTO documents (title, content, author_id, approver_id)
    VALUES (?, ?, ?, ?)
  `).run(title, content, req.user.id, approver_id || null);
  res.status(201).json({ id: result.lastInsertRowid, message: '문서가 등록되었습니다.' });
});

router.patch('/:id/approve', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.status !== 'pending') {
    return res.status(400).json({ error: '결재 대기 중인 문서만 결재할 수 있습니다.' });
  }
  if (doc.approver_id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '결재 권한이 없습니다.' });
  }
  db.prepare(`
    UPDATE documents SET status = 'approved', approver_id = ?, approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, req.params.id);
  res.json({ message: '결재가 완료되었습니다.' });
});

router.patch('/:id/reject', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.status !== 'pending') {
    return res.status(400).json({ error: '결재 대기 중인 문서만 반려할 수 있습니다.' });
  }
  if (doc.approver_id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '반려 권한이 없습니다.' });
  }
  db.prepare(`
    UPDATE documents SET status = 'rejected', approver_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, req.params.id);
  res.json({ message: '문서가 반려되었습니다.' });
});

router.patch('/:id/submit', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id) {
    return res.status(403).json({ error: '본인 문서만 제출할 수 있습니다.' });
  }
  if (doc.status !== 'draft') {
    return res.status(400).json({ error: '임시저장 문서만 제출할 수 있습니다.' });
  }
  const { approver_id } = req.body;
  db.prepare(`
    UPDATE documents SET status = 'pending', approver_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(approver_id || null, req.params.id);
  res.json({ message: '결재 요청이 제출되었습니다.' });
});

router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  if (doc.status === 'approved') {
    return res.status(400).json({ error: '승인된 문서는 삭제할 수 없습니다.' });
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ message: '문서가 삭제되었습니다.' });
});

export default router;
