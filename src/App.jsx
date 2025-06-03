import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import UserPage from './pages/UserPage';
import ProtocolPage from './pages/ProtocolPage';
import BroadcastPage from './pages/BroadcastPage'; // Импортируем новую страницу
import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loginError, setLoginError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const socket = io(`${protocol}://217.114.10.226:5000`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected in App.jsx');
    });

    socket.on('user-status-changed', (data) => {
      console.log('User status changed in App.jsx:', data);
      if (user && user.id === data.userId && !data.isOnline) {
        console.log('Current user disconnected by admin, logging out...');
        handleLogout();
        navigate('/');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate]);

  const handleLogin = async (userData) => {
    try {
      setLoginError(null);
      const response = await axios.post('http://217.114.10.226:5000/api/login', userData);
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        setLoginError(response.data.error);
        console.log('Login failed:', response.data.error);
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Произошла ошибка при входе');
      console.log('Login error:', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://217.114.10.226:5000/api/logout', { email: user.email });
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error.message);
      setUser(null);
    }
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.isAdmin ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/user" />
            )
          ) : (
            <LoginPage onLogin={handleLogin} loginError={loginError} />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          user && user.isAdmin ? (
            <AdminPanel user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" />
          )
        }
      >
        <Route path="protocol/:id" element={<ProtocolPage user={user} onLogout={handleLogout} />} />
      </Route>
      <Route
        path="/user/*"
        element={
          user && !user.isAdmin ? (
            <UserPage user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" />
          )
        }
      >
        <Route path="protocol/:id" element={<ProtocolPage user={user} onLogout={handleLogout} />} />
      </Route>
      <Route path="/broadcast/:meetingId" element={<BroadcastPage />} />
    </Routes>
  );
}

export default App;