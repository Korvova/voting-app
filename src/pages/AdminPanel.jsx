import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import UsersPage from './UsersPage';
import DivisionsPage from './DivisionsPage';
import MeetingsPage from './MeetingsPage';
import ControlPage from './ControlPage';
import MeetingControl from './MeetingControl';

function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="admin-panel">
      <header className="header">
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={onLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>
      <nav className="menu">
        <button
          className={location.pathname === '/admin/users' ? 'active' : ''}
          onClick={() => navigate('/admin/users')}
        >
          Пользователи
        </button>
        <button
          className={location.pathname === '/admin/divisions' ? 'active' : ''}
          onClick={() => navigate('/admin/divisions')}
        >
          Подразделения
        </button>
        <button
          className={location.pathname.startsWith('/admin/meetings') ? 'active' : ''}
          onClick={() => navigate('/admin/meetings')}
        >
          Заседания
        </button>
        <button
          className={location.pathname.startsWith('/admin/control') ? 'active' : ''}
          onClick={() => navigate('/admin/control')}
        >
          Пульт Заседания
        </button>
      </nav>
      <div className="content">
        <Routes>
          <Route path="/" element={<h2>Добро пожаловать, {user.email}!</h2>} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/divisions" element={<DivisionsPage />} />
          <Route path="/meetings/*" element={<MeetingsPage />} />
          <Route path="/control" element={<ControlPage />} />
          <Route path="/control/meeting/:id" element={<MeetingControl />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminPanel;