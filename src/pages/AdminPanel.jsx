import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import UsersPage from './UsersPage';
import DivisionsPage from './DivisionsPage';
import MeetingsPage from './MeetingsPage';
import MeetingControlList from './MeetingControlList';
import MeetingControl from './MeetingControl';
import ConfigPage from './ConfigPage';
import VotingTemplatePage from './VotingTemplatePage';
import VoteCalculationPage from './VoteCalculationPage';
import BroadcastScreenPage from './BroadcastScreenPage';
import LinkProfileWithIdPage from './LinkProfileWithIdPage'; // Новый компонент
import ProtocolPage from './ProtocolPage';

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
        <button
          className={location.pathname.startsWith('/admin/config') ? 'active' : ''}
          onClick={() => navigate('/admin/config')}
        >
          Конфигурация
        </button>
      </nav>
      <div className="content">
        <Routes>
          <Route path="/" element={<h2>Добро пожаловать, {user.email}!</h2>} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/divisions" element={<DivisionsPage />} />
          <Route path="/meetings/*" element={<MeetingsPage />} />
          <Route path="/control" element={<MeetingControlList />} />
          <Route path="/control/meeting/:id" element={<MeetingControl />} />
          <Route path="/config" element={<ConfigPage />}>
            <Route index element={<Navigate to="/admin/config/voting-template" />} />
            <Route path="voting-template" element={<VotingTemplatePage />} />
            <Route path="vote-calculation" element={<VoteCalculationPage />} />
            <Route path="broadcast-screen" element={<BroadcastScreenPage />} />
            <Route path="link-profile-with-id" element={<LinkProfileWithIdPage />} /> {/* Новый маршрут */}
          </Route>
          <Route path="/protocol/:id" element={<ProtocolPage user={user} onLogout={onLogout} />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminPanel;