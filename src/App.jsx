import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import UserPage from './pages/UserPage';
import ProtocolPage from './pages/ProtocolPage';
import './App.css';
import { useState } from 'react';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);

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
    setUser(null);
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
        />
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
          <Route path="protocol/:id" element={<ProtocolPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;