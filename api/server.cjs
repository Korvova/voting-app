const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://217.114.10.226',
    methods: ['GET', 'POST'],
  },
});

const port = 5000;

app.use(cors());
app.use(express.json());

// Тестовый маршрут для проверки API
app.get('/api/poll', (req, res) => {
  res.json({ question: 'What is your favorite color?', options: ['Red', 'Blue', 'Green'] });
});

// Маршрут для запуска опроса админом
app.post('/api/start-poll', (req, res) => {
  const { question, options } = req.body;
  io.emit('start-poll', { question, options, duration: 15000 }); // Отправляем событие всем клиентам
  res.json({ success: true });
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});