import { useState, useEffect } from 'react';
import { users } from '../api';

export default function Admin() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'user' });
  const [editing, setEditing] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchUsers = () => {
    users.list().then(setList).catch(alert).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await users.create(form);
      setForm({ username: '', password: '', name: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitLoading(true);
    try {
      await users.update(editing.id, {
        name: editing.name,
        role: editing.role,
        ...(editing.password ? { password: editing.password } : {})
      });
      setEditing(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await users.delete(id);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page">
      <h2>사용자 관리</h2>
      <div className="admin-grid">
        <section className="admin-form">
          <h3>{editing ? '사용자 수정' : '사용자 등록'}</h3>
          {editing ? (
            <form onSubmit={handleUpdate}>
              <input value={editing.username} disabled placeholder="아이디" />
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="이름"
                required
              />
              <input
                type="password"
                value={editing.password || ''}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                placeholder="비밀번호 (변경 시에만)"
              />
              <select
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              >
                <option value="user">일반</option>
                <option value="admin">관리자</option>
              </select>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>수정</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreate}>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="아이디"
                required
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="비밀번호"
                required
              />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="이름"
                required
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="user">일반</option>
                <option value="admin">관리자</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>등록</button>
            </form>
          )}
        </section>
        <section className="admin-list">
          <h3>사용자 목록</h3>
          {loading ? (
            <p>로딩 중...</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>이름</th>
                  <th>역할</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.name}</td>
                    <td>{u.role === 'admin' ? '관리자' : '일반'}</td>
                    <td>
                      {u.id !== 1 && (
                        <>
                          <button className="btn btn-small" onClick={() => setEditing({ ...u })}>수정</button>
                          <button className="btn btn-small btn-danger" onClick={() => handleDelete(u.id)}>삭제</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
