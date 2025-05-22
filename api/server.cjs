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
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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
  }
});

// Слушаем канал meeting_status_channel
pgClient.query('LISTEN meeting_status_channel');
pgClient.on('notification', async (msg) => {
  if (msg.channel === 'meeting_status_channel') {
    console.log('Received PostgreSQL notification for meeting_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    io.emit('meeting-status-changed', data);
    if (data.status === 'COMPLETED') {
      io.emit('meeting-ended');
    }
  }
});



// Слушаем канал meeting_status_channel
pgClient.query('LISTEN meeting_status_channel');
pgClient.on('notification', async (msg) => {
  if (msg.channel === 'meeting_status_channel') {
    console.log('Received PostgreSQL notification for meeting_status_channel:', msg.payload);
    const data = JSON.parse(msg.payload);
    if (data.status) { // Уведомление для Meeting
      io.emit('meeting-status-changed', data);
      if (data.status === 'COMPLETED') {
        io.emit('meeting-ended');
      }
    } else { // Уведомление для AgendaItem
      console.log('Emitting agenda-item-updated:', data);
      io.emit('agenda-item-updated', {
        id: data.id,
        meetingId: data.meetingId,
        activeIssue: data.activeIssue,
        completed: data.completed
      });
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

// API для управления заседаниями (исключая архивные)
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { isArchived: false },
      include: { divisions: true },
    });
    console.log('Fetched meetings on frontend:', meetings);
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
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// API для управления заседаниями (только архивные)
app.get('/api/meetings/archived', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { isArchived: true },
      include: { divisions: true },
    });
    console.log('Fetched archived meetings:', meetings);
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
    console.error('Error fetching archived meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// API для получения активных заседаний для пользователя
app.get('/api/meetings/active-for-user', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { division: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        isArchived: false,
      },
      include: {
        divisions: {
          include: { users: true }, // Подтягиваем пользователей для каждой Division
        },
      },
    });

    const userMeetings = meetings.filter(meeting =>
      meeting.divisions.some(division => division.id === user.divisionId)
    );

    const meetingsWithAgenda = await Promise.all(
      userMeetings.map(async (meeting) => {
        const agendaItems = await prisma.agendaItem.findMany({
          where: { meetingId: meeting.id },
          include: { speaker: true },
          orderBy: { number: 'asc' },
        });
        return {
          ...meeting,
          agendaItems: agendaItems.map(item => ({
            id: item.id,
            number: item.number,
            title: item.title,
            speaker: item.speaker ? item.speaker.name : 'Нет',
            link: item.link,
            voting: item.voting,
            completed: item.completed,
            activeIssue: item.activeIssue,
          })),
          divisions: meeting.divisions.map(division => ({
            id: division.id,
            name: division.name,
            users: division.users.map(user => ({
              id: user.id,
              name: user.name,
              email: user.email,
            })),
          })), // Возвращаем divisions как массив объектов с пользователями
        };
      })
    );

    console.log('Agenda items response:', JSON.stringify(meetingsWithAgenda, null, 2));
    res.json(meetingsWithAgenda);
  } catch (error) {
    console.error('Error fetching active meetings for user:', error);
    res.status(500).json({ error: error.message });
  }
});








app.get('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) },
      include: { divisions: true },
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json({
      id: meeting.id,
      name: meeting.name,
      startTime: meeting.startTime.toISOString(),
      endTime: meeting.endTime.toISOString(),
      status: meeting.status,
      divisions: meeting.divisions.map(d => d.name).join(', ') || 'Нет',
      isArchived: meeting.isArchived,
      participantsOnline: 30,
      participantsTotal: 36,
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  const { name, startTime, endTime, divisionIds, agendaItems } = req.body;
  console.log('Received meeting data:', req.body);
  try {
    const meeting = await prisma.meeting.create({
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'WAITING',
        isArchived: false,
        divisions: {
          connect: divisionIds && Array.isArray(divisionIds) ? divisionIds.map(id => ({ id: parseInt(id) })) : [],
        },
        agendaItems: {
          create: agendaItems && Array.isArray(agendaItems) ? agendaItems.map(item => ({
            number: item.number,
            title: item.title,
            speakerId: item.speakerId ? parseInt(item.speakerId) : null,
            link: item.link || null,
            voting: false,
            completed: false,
          })) : [],
        },
      },
    });
    res.json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, startTime, endTime, divisionIds, agendaItems } = req.body;
  console.log('Received update meeting data:', req.body);
  try {
    await prisma.agendaItem.deleteMany({ where: { meetingId: parseInt(id) } });
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isArchived: false,
        divisions: {
          set: [],
          connect: divisionIds && Array.isArray(divisionIds) ? divisionIds.map(id => ({ id: parseInt(id) })) : [],
        },
        agendaItems: {
          create: agendaItems && Array.isArray(agendaItems) ? agendaItems.map(item => ({
            number: item.number,
            title: item.title,
            speakerId: item.speakerId ? parseInt(item.speakerId) : null,
            link: item.link || null,
            voting: false,
            completed: false,
          })) : [],
        },
      },
    });
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Deleting meeting ${id}`);
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: parseInt(id) } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    await prisma.agendaItem.deleteMany({ where: { meetingId: parseInt(id) } });
    await prisma.meeting.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
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

// API для записи голоса пользователя
app.post('/api/vote', async (req, res) => {
  const { userId, agendaItemId, choice } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vote = await prisma.vote.create({
      data: {
        userId: user.id,
        agendaItemId: parseInt(agendaItemId),
        choice,
      },
    });

    const voteResult = await prisma.voteResult.findFirst({
      where: { agendaItemId: parseInt(agendaItemId) },
      orderBy: { createdAt: 'desc' },
    });
    if (voteResult) {
      const updatedVoteResult = await prisma.voteResult.update({
        where: { id: voteResult.id },
        data: {
          votesFor: choice === 'FOR' ? voteResult.votesFor + 1 : voteResult.votesFor,
          votesAgainst: choice === 'AGAINST' ? voteResult.votesAgainst + 1 : voteResult.votesAgainst,
          votesAbstain: choice === 'ABSTAIN' ? voteResult.votesAbstain + 1 : voteResult.votesAbstain,
          votesAbsent: voteResult.votesAbsent > 0 ? voteResult.votesAbsent - 1 : 0,
        },
      });
      // Унифицируем формат createdAt
      const payload = {
        ...updatedVoteResult,
        createdAt: updatedVoteResult.createdAt.toISOString(),
      };
      await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
    }

    res.json({ success: true, vote });
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(400).json({ error: error.message });
  }
});





    //.................. Api для голосования


app.post('/api/vote-by-result', async (req, res) => {
  const { userId, voteResultId, choice } = req.body;
  try {
    // Проверяем входные данные
    if (!userId || !voteResultId || !['FOR', 'AGAINST', 'ABSTAIN'].includes(choice)) {
      return res.status(400).json({ error: 'Invalid request data: userId, voteResultId, and valid choice are required' });
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({ where: { email: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Находим голосование
    const voteResult = await prisma.voteResult.findUnique({
      where: { id: parseInt(voteResultId) },
      include: { agendaItem: { include: { meeting: { include: { divisions: true } } } } },
    });
    if (!voteResult) {
      return res.status(404).json({ error: 'Vote result not found' });
    }

    // Используем транзакцию для атомарного обновления
    const result = await prisma.$transaction(async (prisma) => {
      // Проверяем, есть ли уже голос пользователя для этого VoteResult
      const existingVote = await prisma.vote.findFirst({
        where: {
          userId: user.id,
          voteResultId: parseInt(voteResultId),
        },
      });

      let vote;
      if (existingVote) {
        // Если голос существует, обновляем его
        vote = await prisma.vote.update({
          where: { id: existingVote.id },
          data: {
            choice,
            createdAt: new Date(),
          },
        });
      } else {
        // Если голоса нет, создаём новый
        vote = await prisma.vote.create({
          data: {
            userId: user.id,
            agendaItemId: voteResult.agendaItemId,
            voteResultId: parseInt(voteResultId),
            choice,
            createdAt: new Date(),
          },
        });
      }

      // Пересчитываем счётчики в VoteResult
      const votes = await prisma.vote.findMany({
        where: { voteResultId: parseInt(voteResultId) },
      });

      const participants = await prisma.user.findMany({
        where: {
          divisionId: { in: voteResult.agendaItem.meeting.divisions.map(d => d.id) },
          isAdmin: false,
        },
      });

      const votesFor = votes.filter(v => v.choice === 'FOR').length;
      const votesAgainst = votes.filter(v => v.choice === 'AGAINST').length;
      const votesAbstain = votes.filter(v => v.choice === 'ABSTAIN').length;
      const votedUserIds = [...new Set(votes.map(v => v.userId))];
      const votesAbsent = participants.length - votedUserIds.length;

      const updatedVoteResult = await prisma.voteResult.update({
        where: { id: voteResult.id },
        data: {
          votesFor,
          votesAgainst,
          votesAbstain,
          votesAbsent,
        },
      });

      return { vote, updatedVoteResult };
    });

    // Отправляем уведомление через Socket.IO
    const payload = {
      ...result.updatedVoteResult,
      createdAt: result.updatedVoteResult.createdAt.toISOString(),
    };
    await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);

    res.json({ success: true, vote: result.vote });
  } catch (error) {
    console.error('Error submitting vote:', error);
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
      orderBy: { number: 'asc' },
    
    });
    res.json(agendaItems.map(item => ({
      id: item.id,
      number: item.number,
      title: item.title,
      speakerId: item.speakerId,
      speaker: item.speaker ? item.speaker.name : 'Нет',
      link: item.link,
      voting: item.voting,
      completed: item.completed,
      activeIssue: item.activeIssue,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  const { number, title, speakerId, link } = req.body;
  console.log(`Adding agenda item:`, req.body);
  try {
    const agendaItem = await prisma.agendaItem.create({
      data: {
        meetingId: parseInt(id),
        number,
        title,
        speakerId: speakerId ? parseInt(speakerId) : null,
        link,
        voting: false,
        completed: false,
      },
    });
    res.json(agendaItem);
  } catch (error) {
    console.error('Error adding agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});








app.put('/api/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { number, title, speakerId, link, activeIssue, completed } = req.body;
  console.log(`Updating agenda item ${itemId} for meeting ${id}:`, req.body);
  try {
    // Начинаем транзакцию
    const result = await prisma.$transaction([
      // Сбрасываем activeIssue для всех других вопросов текущего заседания
      prisma.agendaItem.updateMany({
        where: {
          meetingId: parseInt(id),
          id: { not: parseInt(itemId) }, // Исключаем текущий вопрос
        },
        data: {
          activeIssue: false,
        },
      }),
      // Обновляем текущий вопрос
      prisma.agendaItem.update({
        where: { id: parseInt(itemId), meetingId: parseInt(id) },
        data: {
          number,
          title,
          speakerId: speakerId ? parseInt(speakerId) : null,
          link,
          activeIssue: activeIssue !== undefined ? activeIssue : undefined,
          completed: completed !== undefined ? completed : undefined, // Добавляем поддержку completed
        },
      }),
    ]);

    res.json(result[1]); // Возвращаем обновлённый вопрос
  } catch (error) {
    console.error('Error updating agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});















app.delete('/api/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  console.log(`Deleting agenda item ${itemId} for meeting ${id}`);
  try {
    const agendaItem = await prisma.agendaItem.findUnique({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    if (!agendaItem) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }
    await prisma.agendaItem.delete({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

// API для запуска голосования
app.post('/api/start-vote', async (req, res) => {
  const { agendaItemId, question, duration } = req.body;
  try {
    console.log('Received start-vote request data:', { agendaItemId, question, duration });

    if (!agendaItemId || !question || !duration || isNaN(duration) || duration <= 0) {
      throw new Error('Invalid request data: agendaItemId, question, and duration (positive number) are required');
    }

    const durationInMs = duration * 1000;
    const createdAt = new Date();

    const agendaItem = await prisma.agendaItem.findUnique({
      where: { id: Number(agendaItemId) },
      include: { 
        meeting: { 
          include: { divisions: true }
        }
      },
    });
    if (!agendaItem) {
      throw new Error('Agenda item not found');
    }
    if (!agendaItem.meeting) {
      throw new Error('Associated meeting not found for the agenda item');
    }

    await prisma.agendaItem.update({
      where: { id: Number(agendaItemId) },
      data: { voting: true },
    });

    const participants = await prisma.user.findMany({
      where: {
        divisionId: { in: agendaItem.meeting.divisions ? agendaItem.meeting.divisions.map(d => d.id) : [] },
        isAdmin: false,
      },
    });

    const voteResult = await prisma.voteResult.create({
      data: {
        agendaItemId: Number(agendaItemId),
        meetingId: agendaItem.meetingId,
        question,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        votesAbsent: participants.length,
        createdAt: createdAt,
        duration: duration,
        voteStatus: 'PENDING',
      },
    });

    const payload = {
      ...voteResult,
      duration: duration,
      createdAt: createdAt.toISOString(),
      voteStatus: 'PENDING',
    };
    await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);

    setTimeout(async () => {
      const finalVoteResult = await prisma.voteResult.findFirst({
        where: { agendaItemId: Number(agendaItemId) },
        orderBy: { createdAt: 'desc' },
        include: { meeting: { include: { divisions: true } } },
      });
      if (finalVoteResult) {
        const votes = await prisma.vote.findMany({
          where: { agendaItemId: Number(agendaItemId) },
        });
        const votedUserIds = [...new Set(votes.map(vote => vote.userId))];

        const participants = await prisma.user.findMany({
          where: {
            divisionId: { in: finalVoteResult.meeting.divisions ? finalVoteResult.meeting.divisions.map(d => d.id) : [] },
            isAdmin: false,
          },
        });

        let notVotedCount = 0;
        for (const participant of participants) {
          if (!votedUserIds.includes(participant.id)) {
            notVotedCount += 1;
          }
        }

        console.log('Total Participants:', participants.length, 'Voted Count:', votedUserIds.length, 'Not Voted Count:', notVotedCount);

        const updatedVoteResult = await prisma.voteResult.update({
          where: { id: finalVoteResult.id },
          data: {
            voteStatus: 'ENDED',
            votesAbsent: notVotedCount,
          },
        });

        await prisma.agendaItem.update({
          where: { id: Number(agendaItemId) },
          data: { voting: false },
        });

        // Унифицируем формат createdAt
        const updatedPayload = {
          ...updatedVoteResult,
          createdAt: updatedVoteResult.createdAt.toISOString(),
        };
        await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(updatedPayload)}'`);
      }
    }, durationInMs);

    res.json({ success: true, voteResult });
  } catch (error) {
    console.error('Error starting vote:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// API для применения результатов голосования
app.post('/api/vote-results/:id/apply', async (req, res) => {
  const { id } = req.params;
  try {
    const voteResult = await prisma.voteResult.findUnique({
      where: { id: parseInt(id) },
    });
    if (!voteResult) {
      return res.status(404).json({ error: 'Vote result not found' });
    }

    await prisma.agendaItem.update({
      where: { id: voteResult.agendaItemId },
      data: { voting: false },
    });

    const updatedVoteResult = await prisma.voteResult.update({
      where: { id: parseInt(id) },
      data: { voteStatus: 'APPLIED' },
    });

    // Унифицируем формат createdAt
    const payload = {
      ...updatedVoteResult,
      createdAt: updatedVoteResult.createdAt.toISOString(),
    };
    await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error applying vote results:', error);
    res.status(500).json({ error: error.message });
  }
});

// API для изменения статуса заседания
app.post('/api/meetings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: { 
        status,
        agendaItems: status === 'COMPLETED' ? {
          updateMany: {
            where: { meetingId: parseInt(id) },
            data: { completed: true },
          },
        } : undefined,
      },
    });
    await pgClient.query(`NOTIFY meeting_status_channel, '${JSON.stringify({ id: parseInt(id), status })}'`);
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API закрытия окна
app.post('/api/vote-results/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const voteResult = await prisma.voteResult.findUnique({
      where: { id: parseInt(id) },
    });
    if (!voteResult) {
      return res.status(404).json({ error: 'Vote result not found' });
    }

    await prisma.agendaItem.update({
      where: { id: voteResult.agendaItemId },
      data: { voting: false },
    });

    const updatedVoteResult = await prisma.voteResult.update({
      where: { id: parseInt(id) },
      data: { voteStatus: 'CANCELLED' },
    });

    // Унифицируем формат createdAt
    const payload = {
      ...updatedVoteResult,
      createdAt: updatedVoteResult.createdAt.toISOString(),
    };
    await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling vote results:', error);
    res.status(500).json({ error: error.message });
  }
});

// API для получения результатов голосования
app.get('/api/vote-results/:agendaItemId', async (req, res) => {
  const { agendaItemId } = req.params;
  try {
    const voteResult = await prisma.voteResult.findFirst({
      where: { agendaItemId: parseInt(agendaItemId) },
      orderBy: { createdAt: 'desc' },
    });
    if (!voteResult) {
      return res.status(404).json({ error: 'Vote result not found' });
    }
    res.json(voteResult);
  } catch (error) {
    console.error('Error fetching vote results:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vote-results', async (req, res) => {
  const { meetingId } = req.query;
  try {
    const voteResults = await prisma.voteResult.findMany({
      where: meetingId ? { meetingId: parseInt(meetingId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(voteResults);
  } catch (error) {
    console.error('Error fetching all vote results:', error);
    res.status(500).json({ error: error.message });
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