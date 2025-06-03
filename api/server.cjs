const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

const path = require('path');
const fs = require('fs');

/**
 * Инициализация Express-приложения для обработки HTTP-запросов.
 * @type {Object}
 */
const app = express();

/**
 * Создание HTTP-сервера на основе Express-приложения.
 * @type {Object}
 */
const httpServer = createServer(app);

/**
 * Инициализация WebSocket-сервера с использованием Socket.IO.
 * Настроен с поддержкой CORS для указанного источника.
 * @type {Object}
 */
const io = new Server(httpServer, {
  cors: {
    origin: 'http://217.114.10.226',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
});

/**
 * Экземпляр PrismaClient для взаимодействия с базой данных через Prisma ORM.
 * @type {Object}
 */
const prisma = new PrismaClient();

/**
 * Порт, на котором запускается сервер.
 * @type {Number}
 */
const port = 5000;

// Request logging middleware
/**
 * Middleware для логирования входящих HTTP-запросов.
 * Выводит в консоль временную метку, метод запроса и URL.
 * @param {Object} req - Объект запроса.
 * @param {Object} res - Объект ответа.
 * @param {Function} next - Функция для передачи управления следующему middleware.
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Prisma middleware
/**
 * Middleware для прикрепления экземпляра PrismaClient к объекту запроса.
 * Добавляет `req.prisma` для доступа к базе данных в маршрутах.
 * Логирует успешное прикрепление Prisma.
 * @param {Object} req - Объект запроса.
 * @param {Object} res - Объект ответа.
 * @param {Function} next - Функция для передачи управления следующему middleware.
 */
app.use((req, res, next) => {
  req.prisma = prisma;
  console.log('Prisma прикреплён к запросу:', !!req.prisma);
  next();
});

// CORS configuration
/**
 * Middleware для настройки CORS (Cross-Origin Resource Sharing).
 * Разрешает запросы только с указанного источника, определяет допустимые методы и заголовки.
 * Поддерживает предварительные запросы (OPTIONS) с кодом состояния 204.
 */
app.use(cors({
  origin: 'http://217.114.10.226',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

/**
 * Middleware для парсинга тел запросов в формате JSON.
 */
app.use(express.json());

// PostgreSQL notifications
/**
 * Клиент PostgreSQL для подключения к базе данных и получения уведомлений.
 * Использует строку подключения для локальной базы `voting`.
 * @type {Object}
 */
const pgClient = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/voting',
});
pgClient.connect();

/**
 * Подписка на каналы PostgreSQL для получения уведомлений.
 * Слушает каналы `vote_result_channel`, `meeting_status_channel`, `user_status_channel`.
 */
pgClient.query('LISTEN vote_result_channel');
pgClient.query('LISTEN meeting_status_channel');
pgClient.query('LISTEN user_status_channel');

/**
 * Обработчик уведомлений PostgreSQL.
 * Парсит уведомления из каналов `vote_result_channel`, `meeting_status_channel`, `user_status_channel`
 * и транслирует их через WebSocket-события в реальном времени.
 * Логирует полученные данные и отправляемые события.
 */
pgClient.on('notification', (msg) => {
  if (msg.channel === 'vote_result_channel') {
    console.log('Получено уведомление PostgreSQL для vote_result_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.voteStatus === 'PENDING') {
      console.log('Отправка события new-vote-result:', data);
      io.emit('new-vote-result', { ...data, createdAt: new Date(data.createdAt).toISOString() });
    } else if (data.voteStatus === 'ENDED') {
      console.log('Отправка события vote-ended:', data);
      io.emit('vote-ended', data);
    } else if (data.voteStatus === 'APPLIED') {
      console.log('Отправка события vote-applied:', data);
      io.emit('vote-applied', data);
    } else if (data.voteStatus === 'CANCELLED') {
      console.log('Отправка события vote-cancelled:', data);
      io.emit('vote-cancelled', data);
    }
  } else if (msg.channel === 'meeting_status_channel') {
    console.log('Получено уведомление PostgreSQL для meeting_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.status) {
      io.emit('meeting-status-changed', data);
      if (data.status === 'COMPLETED') {
        io.emit('meeting-ended');
      }
    } else {
      console.log('Отправка события agenda-item-updated:', data);
      io.emit('agenda-item-updated', {
        id: data.id,
        meetingId: data.meetingId,
        activeIssue: data.activeIssue,
        completed: data.completed
      });
    }
  } else if (msg.channel === 'user_status_channel') {
    console.log('Получено уведомление PostgreSQL для user_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    io.emit('user-status-changed', { userId: data.id, isOnline: data.isOnline });
  }
});

// Health check
/**
 * @api {get} /api/health Проверка состояния сервера
 * @apiName ПроверкаСостояния
 * @apiGroup Система
 * @apiDescription Возвращает статус работы сервера. Используется для мониторинга доступности API и подтверждения, что сервер функционирует корректно.
 * @apiSuccess {Object} status Объект состояния сервера.
 * @apiSuccess {String} status.status Статус сервера (`ok` при успешной работе).
 * @apiSuccessExample {json} Пример успешного ответа:
 *     {
 *         "status": "ok"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
/**
 * Подключение маршрутов API из отдельных модулей.
 * Каждый модуль обрабатывает определённую часть функционала системы (аутентификация, пользователи, заседания и т.д.).
 * Некоторые модули принимают экземпляры `prisma` и/или `pgClient` для доступа к базе данных и уведомлениям.
 */
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
/**
 * Обработчик подключения клиентов через WebSocket с использованием Socket.IO.
 * Логирует события подключения и отключения клиентов для отладки.
 */
io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('Клиент отключился:', socket.id, 'Причина:', reason);
  });
});

// Static documentation
/**
 * Подача статической документации API из папки `../doc`.
 * Если папка не существует, выводится сообщение об ошибке в консоль.
 * Доступна по пути `/docs`.
 */
const docPath = path.join(__dirname, '../doc');
if (fs.existsSync(docPath)) {
  app.use('/docs', express.static(docPath));
} else {
  console.error(`Папка ${docPath} не существует`);
}

// Start server
/**
 * Запуск HTTP-сервера на указанном порту.
 * Выводит сообщение в консоль при успешном запуске.
 */
httpServer.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});