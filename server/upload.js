import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const baseName = path.basename(safeName, path.extname(safeName)).replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, baseName ? `${baseName}-${unique}` : unique);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif|zip|hwp)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('허용되지 않는 파일 형식입니다. (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, jpg, png, gif, zip, hwp)'));
  }
});

export { UPLOAD_DIR };
