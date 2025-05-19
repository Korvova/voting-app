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

// Подписка на уведомления PostgreSQL
const pgClient = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/voting',
});
pgClient.connect();

// Слушаем канал vote_result_channel
pgClient.query('LISTEN vote_result_channel');
pgClient.on('notification', async (msg) => {
  if (msg.channel === 'vote_result_channel') {
    console.log('Received PostgreSQL notification for vote_result_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    io.emit('new-vote-result', { ...data, createdAt: new Date(data.createdAt).toISOString() });
  }
});

// Слушаем канал meeting_status_channel
pgClient.query('LISTEN meeting_status_channel');
pgClient.on('notification', async (msg) => {
  if (msg.channel === 'meeting_status_channel') {
    console.log('Received PostgreSQL notification for meeting_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.status === 'COMPLETED') {
      io.emit('meeting-ended');
    }
  }
});

// Тестовый маршрут для проверки API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API для авторизации
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    res.json({ success: true, user: { email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API для управления пользователями
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { division: true },
    });
    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      division: user.division ? user.division.name : 'Нет',
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password,
        divisionId: divisionId ? parseInt(divisionId) : null,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone,
        divisionId: divisionId ? parseInt(divisionId) : null,
        password: password || undefined,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API для управления подразделениями
app.get('/api/divisions', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      include: { users: true },
    });
    res.json(divisions.map(division => ({
      id: division.id,
      name: division.name,
      userCount: division.users.length,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/divisions', async (req, res) => {
  const { name } = req.body;
  try {
    const division = await prisma.division.create({
      data: { name },
    });
    res.json(division);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/divisions/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const division = await prisma.division.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.json(division);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/divisions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.division.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API для управления заседаниями
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      include: { divisions: true },
    });
    res.json(meetings.map(meeting => ({
      id: meeting.id,
      name: meeting.name,
      startTime: meeting.startTime.toISOString(),
      endTime: meeting.endTime.toISOString(),
      status: meeting.status,
      divisions: meeting.divisions.map(d => d.name).join(', ') || 'Нет',
      isArchived: meeting.isArchived,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  const { name, startTime, endTime, divisions, agendaItems } = req.body;
  try {
    const meeting = await prisma.meeting.create({
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'WAITING',
        divisions: {
          connect: divisions.map(division => ({ name: division })),
        },
        agendaItems: {
          create: agendaItems.map(item => ({
            number: item.number,
            title: item.title,
            speakerId: item.speakerId ? parseInt(item.speakerId) : null,
            link: item.link || null,
          })),
        },
      },
    });
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, startTime, endTime, divisions, agendaItems } = req.body;
  try {
    // Удаляем старые повестки и создаём новые
    await prisma.agendaItem.deleteMany({ where: { meetingId: parseInt(id) } });
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        divisions: {
          set: divisions.map(division => ({ name: division })),
        },
        agendaItems: {
          create: agendaItems.map(item => ({
            number: item.number,
            title: item.title,
            speakerId: item.speakerId ? parseInt(item.speakerId) : null,
            link: item.link || null,
          })),
        },
      },
    });
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.meeting.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/meetings/:id/archive', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: { isArchived: true },
    });
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API для получения повесток
app.get('/api/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  try {
    const agendaItems = await prisma.agendaItem.findMany({
      where: { meetingId: parseInt(id) },
      include: { speaker: true },
    });
    res.json(agendaItems.map(item => ({
      id: item.id,
      number: item.number,
      title: item.title,
      speakerId: item.speakerId,
      speaker: item.speaker ? item.speaker.name : 'Нет',
      link: item.link,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API для запуска голосования
app.post('/api/start-vote', async (req, res) => {
  const { agendaItemId, question, duration } = req.body;
  try {
    const voteResult = await prisma.voteResult.create({
      data: {
        agendaItemId: Number(agendaItemId),
        question,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        votesAbsent: 0,
      },
    });
    io.emit('new-vote-result', { ...voteResult, duration }); // Уведомление для модального окна
    res.json({ success: true, voteResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// API для записи голоса пользователя
app.post('/api/vote', async (req, res) => {
  const { userId, agendaItemId, choice } = req.body;
  try {
    const vote = await prisma.vote.create({
      data: {
        userId: parseInt(userId),
        agendaItemId: parseInt(agendaItemId),
        choice,
      },
    });
    // Обновляем результаты голосования
    const voteResult = await prisma.voteResult.findFirst({
      where: { agendaItemId: parseInt(agendaItemId) },
      orderBy: { createdAt: 'desc' },
    });
    if (voteResult) {
      await prisma.voteResult.update({
        where: { id: voteResult.id },
        data: {
          votesFor: choice === 'FOR' ? voteResult.votesFor + 1 : voteResult.votesFor,
          votesAgainst: choice === 'AGAINST' ? voteResult.votesAgainst + 1 : voteResult.votesAgainst,
          votesAbstain: choice === 'ABSTAIN' ? voteResult.votesAbstain + 1 : voteResult.votesAbstain,
          votesAbsent: voteResult.votesAbsent,
        },
      });
    }
    res.json({ success: true, vote });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API для изменения статуса заседания
app.post('/api/meetings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
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