import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documents } from '../api';

const STATUS_MAP = {
  draft: { label: '임시저장', class: 'status-draft' },
  pending: { label: '결재대기', class: 'status-pending' },
  approved: { label: '승인', class: 'status-approved' },
  rejected: { label: '반려', class: 'status-rejected' }
};

export default function DocumentList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', my: false });

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await documents.list(filter);
      setList(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filter.status, filter.my]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>문서 목록</h2>
        <Link to="/new" className="btn btn-primary">새 문서 작성</Link>
      </div>
      <div className="filters">
        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={filter.my}
            onChange={(e) => setFilter(f => ({ ...f, my: e.target.checked }))}
          />
          내 문서만
        </label>
      </div>
      {loading ? (
        <p>로딩 중...</p>
      ) : list.length === 0 ? (
        <p className="empty">등록된 문서가 없습니다.</p>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>제목</th>
              <th>작성자</th>
              <th>상태</th>
              <th>작성일</th>
            </tr>
          </thead>
          <tbody>
            {list.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <Link to={`/doc/${doc.id}`}>{doc.title}</Link>
                </td>
                <td>{doc.author_name}</td>
                <td>
                  <span className={`badge ${STATUS_MAP[doc.status]?.class || ''}`}>
                    {STATUS_MAP[doc.status]?.label || doc.status}
                  </span>
                </td>
                <td>{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
