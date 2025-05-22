import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import UserPage from './pages/UserPage';
import ProtocolPage from './pages/ProtocolPage';

import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // Восстанавливаем user из localStorage при загрузке, если он там есть
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Сохраняем user в localStorage при его изменении
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogin = async (userData) => {
    try {
      const response = await axios.post('http://217.114.10.226:5000/api/login', userData);
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        console.log('Login failed:', response.data.error);
      }
    } catch (error) {
      console.log('Login error:', error.message);
    }
  };

  const handleLogout = () => {
    setUser(null); // Очищаем user, localStorage обновится через useEffect
  };

  return (
    <Router>
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
              <LoginPage onLogin={handleLogin} />
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
      </Routes>
    </Router>
  );
}

export default App;