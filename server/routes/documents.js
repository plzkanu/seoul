import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { authMiddleware } from '../middleware.js';
import { upload, UPLOAD_DIR } from '../upload.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { status, my } = req.query;
  let sql = `
    SELECT d.*, u.name as author_name, a.name as approver_name
    FROM documents d
    LEFT JOIN users u ON d.author_id = u.id
    LEFT JOIN users a ON d.approver_id = a.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (status) {
    sql += ` AND d.status = $${idx++}`;
    params.push(status);
  }
  if (my === 'true') {
    sql += ` AND d.author_id = $${idx++}`;
    params.push(req.user.id);
  }
  sql += ' ORDER BY d.created_at DESC';
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`
    SELECT d.*, u.name as author_name, a.name as approver_name
    FROM documents d
    LEFT JOIN users u ON d.author_id = u.id
    LEFT JOIN users a ON d.approver_id = a.id
    WHERE d.id = $1
  `, [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '조회 권한이 없습니다.' });
  }
  const { rows: attachments } = await db.query(
    'SELECT id, original_name, file_size, created_at FROM document_attachments WHERE document_id = $1 ORDER BY id',
    [req.params.id]
  );
  res.json({ ...doc, attachments });
});

router.post('/', async (req, res) => {
  const { title, content, approver_id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 입력하세요.' });
  }
  const { rows } = await db.query(`
    INSERT INTO documents (title, content, author_id, approver_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [title, content, req.user.id, approver_id || null]);
  res.status(201).json({ id: rows[0].id, message: '문서가 등록되었습니다.' });
});

router.post('/:id/attachments', upload.array('attachments'), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id) {
    return res.status(403).json({ error: '본인 문서에만 첨부할 수 있습니다.' });
  }
  if (doc.status !== 'draft') {
    return res.status(400).json({ error: '임시저장 문서에만 첨부할 수 있습니다.' });
  }
  const files = req.files || [];
  for (const f of files) {
    await db.query(`
      INSERT INTO document_attachments (document_id, filename, original_name, file_path, file_size)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, f.filename, f.originalname, f.filename, f.size]);
  }
  res.status(201).json({ message: `${files.length}개 파일이 첨부되었습니다.` });
});

router.get('/:id/attachments/:attachmentId/download', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.* FROM document_attachments a
    JOIN documents d ON a.document_id = d.id
    WHERE a.id = $1 AND a.document_id = $2
  `, [req.params.attachmentId, req.params.id]);
  const att = rows[0];
  if (!att) return res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
  const doc = (await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id])).rows[0];
  if (doc.author_id !== req.user.id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }
  res.download(path.join(UPLOAD_DIR, att.filename), att.original_name);
});

router.patch('/:id/approve', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.status !== 'pending') {
    return res.status(400).json({ error: '결재 대기 중인 문서만 결재할 수 있습니다.' });
  }
  if (doc.approver_id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '결재 권한이 없습니다.' });
  }
  await db.query(`
    UPDATE documents SET status = 'approved', approver_id = $1, approved_at = NOW(), updated_at = NOW()
    WHERE id = $2
  `, [req.user.id, req.params.id]);
  res.json({ message: '결재가 완료되었습니다.' });
});

router.patch('/:id/reject', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.status !== 'pending') {
    return res.status(400).json({ error: '결재 대기 중인 문서만 반려할 수 있습니다.' });
  }
  if (doc.approver_id && doc.approver_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '반려 권한이 없습니다.' });
  }
  await db.query(`
    UPDATE documents SET status = 'rejected', approver_id = $1, updated_at = NOW()
    WHERE id = $2
  `, [req.user.id, req.params.id]);
  res.json({ message: '문서가 반려되었습니다.' });
});

router.patch('/:id/submit', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id) {
    return res.status(403).json({ error: '본인 문서만 제출할 수 있습니다.' });
  }
  if (doc.status !== 'draft') {
    return res.status(400).json({ error: '임시저장 문서만 제출할 수 있습니다.' });
  }
  const { approver_id } = req.body;
  await db.query(`
    UPDATE documents SET status = 'pending', approver_id = $1, updated_at = NOW()
    WHERE id = $2
  `, [approver_id || null, req.params.id]);
  res.json({ message: '결재 요청이 제출되었습니다.' });
});

router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  if (doc.status === 'approved') {
    return res.status(400).json({ error: '승인된 문서는 삭제할 수 없습니다.' });
  }
  const { rows: atts } = await db.query('SELECT filename FROM document_attachments WHERE document_id = $1', [req.params.id]);
  for (const a of atts) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, a.filename)); } catch (_) {}
  }
  await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
  res.json({ message: '문서가 삭제되었습니다.' });
});

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, d.author_id FROM document_attachments a
    JOIN documents d ON a.document_id = d.id
    WHERE a.id = $1 AND a.document_id = $2
  `, [req.params.attachmentId, req.params.id]);
  const att = rows[0];
  if (!att) return res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
  if (att.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  try { fs.unlinkSync(path.join(UPLOAD_DIR, att.filename)); } catch (_) {}
  await db.query('DELETE FROM document_attachments WHERE id = $1', [req.params.attachmentId]);
  res.json({ message: '첨부파일이 삭제되었습니다.' });
});

export default router;
