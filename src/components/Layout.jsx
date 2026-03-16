import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <h1 className="logo">문서 결재</h1>
        <nav className="nav">
          <NavLink to="/" end>문서 목록</NavLink>
          <NavLink to="/new">문서 작성</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">관리자</NavLink>}
        </nav>
        <div className="user-area">
          <span className="user-name">{user?.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
