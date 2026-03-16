import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documents, users } from '../api';
import { useAuth } from '../context/AuthContext';

export default function DocumentForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [approverId, setApproverId] = useState('');
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    users.approvers().then(setUserList).catch(() => setUserList([]));
  }, []);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id } = await documents.create({
        title,
        content,
        approver_id: asDraft ? null : (approverId ? parseInt(approverId) : null)
      });
      if (selectedFiles.length > 0) {
        await documents.uploadAttachments(id, selectedFiles);
      }
      if (asDraft) {
        alert('임시저장되었습니다.');
        navigate('/');
      } else {
        await documents.submit(id, approverId ? parseInt(approverId) : null);
        alert('결재 요청이 제출되었습니다.');
        navigate('/');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>문서 작성</h2>
      <form className="doc-form" onSubmit={(e) => handleSubmit(e, false)}>
        <div className="form-group">
          <label>제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            required
          />
        </div>
        <div className="form-group">
          <label>내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문서 내용"
            rows={10}
            required
          />
        </div>
        <div className="form-group">
          <label>파일 첨부 (선택)</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip,.hwp"
            onChange={handleFileChange}
          />
          {selectedFiles.length > 0 && (
            <ul className="file-list">
              {selectedFiles.map((f, i) => (
                <li key={i}>
                  <span>{f.name}</span>
                  <span className="file-size">({(f.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" className="btn-remove" onClick={() => removeFile(i)} aria-label="제거">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="form-hint">최대 10MB, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, jpg, png, gif, zip, hwp</p>
        </div>
        <div className="form-group">
          <label>결재자 (선택)</label>
          <select
            value={approverId}
            onChange={(e) => setApproverId(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {userList.filter(u => u.id !== user?.id).map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={(e) => handleSubmit(e, true)} disabled={loading}>
            임시저장
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '제출 중...' : '결재 요청'}
          </button>
        </div>
      </form>
    </div>
  );
}
