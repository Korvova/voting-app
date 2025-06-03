const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

const path = require('path');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://217.114.10.226',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
});

const prisma = new PrismaClient();
const port = 5000;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Prisma middleware
app.use((req, res, next) => {
  req.prisma = prisma;
  console.log('Prisma attached to request:', !!req.prisma);
  next();
});

// CORS configuration
app.use(cors({
  origin: 'http://217.114.10.226',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// PostgreSQL notifications
const pgClient = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/voting',
});
pgClient.connect();

pgClient.query('LISTEN vote_result_channel');
pgClient.query('LISTEN meeting_status_channel');
pgClient.query('LISTEN user_status_channel');

pgClient.on('notification', (msg) => {
  if (msg.channel === 'vote_result_channel') {
    console.log('Received PostgreSQL notification for vote_result_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.voteStatus === 'PENDING') {
      console.log('Emitting new-vote-result:', data);
      io.emit('new-vote-result', { ...data, createdAt: new Date(data.createdAt).toISOString() });
    } else if (data.voteStatus === 'ENDED') {
      console.log('Emitting vote-ended:', data);
      io.emit('vote-ended', data);
    } else if (data.voteStatus === 'APPLIED') {
      console.log('Emitting vote-applied:', data);
      io.emit('vote-applied', data);
    } else if (data.voteStatus === 'CANCELLED') {
      console.log('Emitting vote-cancelled:', data);
      io.emit('vote-cancelled', data);
    }
  } else if (msg.channel === 'meeting_status_channel') {
    console.log('Received PostgreSQL notification for meeting_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.status) {
      io.emit('meeting-status-changed', data);
      if (data.status === 'COMPLETED') {
        io.emit('meeting-ended');
      }
    } else {
      console.log('Emitting agenda-item-updated:', data);
      io.emit('agenda-item-updated', {
        id: data.id,
        meetingId: data.meetingId,
        activeIssue: data.activeIssue,
        completed: data.completed
      });
    }
  } else if (msg.channel === 'user_status_channel') {
    console.log('Received PostgreSQL notification for user_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    io.emit('user-status-changed', { userId: data.id, isOnline: data.isOnline });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/test', require(path.join(__dirname, 'root/test.cjs')));
app.use('/api', require('./root/auth.cjs'));
app.use('/api/users', require('./root/users.cjs')(prisma));
app.use('/api/divisions', require('./root/divisions.cjs'));
app.use('/api/meetings', require('./root/meetings.cjs')(prisma, pgClient));
app.use('/api/device-links', require('./root/device-links.cjs'));
app.use('/api-docs', require('./root/swagger.cjs'));
app.use('/api/users/excel', require('./root/excel.cjs'));
app.use('/api/meetings/excel', require('./root/meetings-excel.cjs'));
app.use('/api', require('./root/agenda-items.cjs')(prisma));
app.use('/api', require('./root/vote-procedures.cjs')(prisma));
app.use('/api', require('./root/vote-templates.cjs')(prisma));
app.use('/api', require('./root/vote.cjs')(prisma, pgClient));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('A client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Static documentation
const docPath = path.join(__dirname, '../doc');
if (fs.existsSync(docPath)) {
  app.use('/docs', express.static(docPath));
} else {
  console.error(`Directory ${docPath} does not exist`);
}

// Start server
httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});