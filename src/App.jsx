import React from 'react';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import PollModal from './components/PollModal';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pollData, setPollData] = useState(null);

  useEffect(() => {
    const socket = io('http://217.114.10.226:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socket.on('start-poll', (data) => {
      setPollData(data);
      setIsModalOpen(true);
    });

  
socket.on('vote-changed', (data) => {
  console.log('Received vote-changed event:', data);
  setPollData({ question: 'Vote Updated', options: ['Updated'] });
  setIsModalOpen(true);
});


    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setPollData(null);
  };

  return (
    <div className="container">
      <h1 className="title">RMS - Система голосования</h1>
      <div className="login-form">
        <input type="email" placeholder="Электронная почта" className="input" />
        <input type="password" placeholder="Пароль" className="input" />
        <a href="#" className="forgot-password">Напомнить пароль</a>
        <button className="login-button">Войти</button>
      </div>
      <PollModal
        isOpen={isModalOpen}
        question={pollData?.question || ''}
        options={pollData?.options || []}
        onClose={closeModal}
      />
    </div>
  );
}

export default App;