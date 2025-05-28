import { Link, Outlet, useLocation } from 'react-router-dom';

function ConfigPage() {
  const location = useLocation();

  return (
    <div className="config-page">
      <nav className="config-menu">
        <Link
          to="/admin/config/voting-template"
          className={location.pathname === '/admin/config/voting-template' ? 'active' : ''}
        >
          Шаблон голосования
        </Link>
        <Link
          to="/admin/config/vote-calculation"
          className={location.pathname === '/admin/config/vote-calculation' ? 'active' : ''}
        >
          Процедура подсчета голосов
        </Link>
        <Link
          to="/admin/config/broadcast-screen"
          className={location.pathname === '/admin/config/broadcast-screen' ? 'active' : ''}
        >
          Экран трансляции
        </Link>
        <Link
          to="/admin/config/link-profile-with-id"
          className={location.pathname === '/admin/config/link-profile-with-id' ? 'active' : ''}
        >
          Связать профиль с ID
        </Link>
      </nav>
      <div className="config-content">
        <Outlet />
      </div>
    </div>
  );
}

export default ConfigPage;