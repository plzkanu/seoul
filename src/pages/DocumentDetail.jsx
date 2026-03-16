import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documents, users } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP = {
  draft: { label: '임시저장', class: 'status-draft' },
  pending: { label: '결재대기', class: 'status-pending' },
  approved: { label: '승인', class: 'status-approved' },
  rejected: { label: '반려', class: 'status-rejected' }
};

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [userList, setUserList] = useState([]);
  const [submitApprover, setSubmitApprover] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    documents.get(id).then(setDoc).catch(() => alert('문서를 불러올 수 없습니다.')).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    users.approvers().then(setUserList).catch(() => setUserList([]));
  }, []);

  const canApprove = doc?.status === 'pending' && (doc.approver_id === user?.id || user?.role === 'admin' || !doc.approver_id);
  const canReject = canApprove;
  const canSubmit = doc?.status === 'draft' && doc.author_id === user?.id;
  const canAddAttachment = doc?.status === 'draft' && doc.author_id === user?.id;
  const canDelete = doc && (doc.author_id === user?.id || user?.role === 'admin') && doc.status !== 'approved';

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      await documents.uploadAttachments(id, files);
      setDoc(await documents.get(id));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!confirm('첨부파일을 삭제하시겠습니까?')) return;
    setActionLoading(true);
    try {
      await documents.deleteAttachment(id, attId);
      setDoc(await documents.get(id));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, approverId) => {
    setActionLoading(true);
    try {
      if (action === 'approve') await documents.approve(id);
      else if (action === 'reject') await documents.reject(id);
      else if (action === 'submit') {
        await documents.submit(id, approverId ? parseInt(approverId) : null);
      } else if (action === 'delete') {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await documents.delete(id);
        navigate('/');
        return;
      }
      setDoc(await documents.get(id));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page"><p>로딩 중...</p></div>;
  if (!doc) return <div className="page"><p>문서를 찾을 수 없습니다.</p></div>;

  return (
    <div className="page">
      <div className="doc-detail-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← 목록</button>
      </div>
      <article className="doc-detail">
        <div className="doc-meta">
          <h1>{doc.title}</h1>
          <span className={`badge ${STATUS_MAP[doc.status]?.class || ''}`}>
            {STATUS_MAP[doc.status]?.label || doc.status}
          </span>
        </div>
        <div className="doc-info">
          <span>작성자: {doc.author_name}</span>
          {doc.approver_name && <span>결재자: {doc.approver_name}</span>}
          <span>작성일: {new Date(doc.created_at).toLocaleString('ko-KR')}</span>
          {doc.approved_at && <span>결재일: {new Date(doc.approved_at).toLocaleString('ko-KR')}</span>}
        </div>
        <div className="doc-content">{doc.content}</div>
        <div className="doc-attachments">
          <h4>첨부파일</h4>
          {canAddAttachment && (
            <div className="attachment-upload">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip,.hwp"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && <span className="uploading">업로드 중...</span>}
            </div>
          )}
          {doc.attachments && doc.attachments.length > 0 ? (
            <ul>
              {doc.attachments.map((att) => (
                <li key={att.id}>
                  <button
                    type="button"
                    className="link-download"
                    onClick={() => documents.downloadAttachment(id, att.id, att.original_name)}
                  >
                    {att.original_name}
                  </button>
                  {att.file_size && <span className="file-size"> ({(att.file_size / 1024).toFixed(1)} KB)</span>}
                  {canAddAttachment && (
                    <button
                      type="button"
                      className="btn-remove btn-remove-small"
                      onClick={() => handleDeleteAttachment(att.id)}
                      disabled={actionLoading}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-attachments">첨부파일 없음</p>
          )}
        </div>
        <div className="doc-actions">
          {canSubmit && (
            <div className="submit-inline">
              <select value={submitApprover || doc.approver_id || ''} onChange={(e) => setSubmitApprover(e.target.value)}>
                <option value="">결재자 선택</option>
                {userList.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => handleAction('submit', submitApprover || doc.approver_id)} disabled={actionLoading}>
                결재 요청
              </button>
            </div>
          )}
          {canApprove && (
            <button className="btn btn-primary" onClick={() => handleAction('approve')} disabled={actionLoading}>
              승인
            </button>
          )}
          {canReject && (
            <button className="btn btn-danger" onClick={() => handleAction('reject')} disabled={actionLoading}>
              반려
            </button>
          )}
          {canDelete && (
            <button className="btn btn-ghost" onClick={() => handleAction('delete')} disabled={actionLoading}>
              삭제
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
