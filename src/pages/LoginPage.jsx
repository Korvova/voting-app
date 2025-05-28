import { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLogin, loginError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <div className="app">
      <p className="title"> RMS - Система голосования </p>
      <h1 className="title">Вход</h1>
      <form className="login-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Войти</button>
      </form>
      {loginError && (
        <div className="error-message">
          <p>{loginError}</p>
        </div>
      )}
      <div className="forgot-password" onClick={() => setShowModal(true)}>
        Забыли пароль?
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Для восстановления пароля свяжитесь с администратором.</p>
            <button onClick={() => setShowModal(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;