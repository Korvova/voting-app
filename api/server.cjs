const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://217.114.10.226',
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();
const port = 5000;

app.use(cors());
app.use(express.json());

// Тестовый маршрут для проверки API
app.get('/api/poll', async (req, res) => {
  const poll = await prisma.poll.findFirst({
    include: { options: true },
  });
  if (poll) {
    res.json(poll);
  } else {
    res.status(404).json({ error: 'No poll found' });
  }
});

// Маршрут для запуска опроса админом
app.post('/api/start-poll', async (req, res) => {
  const { question, options } = req.body;
  io.emit('start-poll', { question, options, duration: 15000 });
  res.json({ success: true });
});

// Маршрут для голосования
app.post('/api/vote', async (req, res) => {
  const { optionId } = req.body;
  try {
    const option = await prisma.option.update({
      where: { id: Number(optionId) },
      data: { votes: { increment: 1 } },
    });
    io.emit('vote-changed', { optionId: option.id, votes: option.votes });
    res.json({ success: true, option });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid vote' });
  }
});

// Подписка на уведомления PostgreSQL
const pgClient = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/voting',
});
pgClient.connect();
pgClient.query('LISTEN option_changed');
pgClient.on('notification', async (msg) => {
  console.log('Received PostgreSQL notification:', msg);
  const data = JSON.parse(msg.payload);
  io.emit('vote-changed', { optionId: data.id, votes: data.votes });
});

// Socket.IO соединения
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('A client disconnected:', socket.id, 'Reason:', reason);
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});