const express = require('express');
const router = express.Router();

module.exports = (prisma, pgClient) => {
  /**
   * @route GET /api/meetings
   * @desc Get all non-archived meetings
   */
  router.get('/', async (req, res) => {
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

  /**
   * @route GET /api/meetings/archived
   * @desc Get all archived meetings
   */
  router.get('/archived', async (req, res) => {
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

  /**
   * @route GET /api/meetings/active-for-user
   * @desc Get active meetings for a user
   */
  router.get('/active-for-user', async (req, res) => {
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
            include: { users: true },
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
            })),
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

  /**
   * @route GET /api/meetings/:id
   * @desc Get a meeting by ID
   */
  router.get('/:id', async (req, res) => {
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

  /**
   * @route POST /api/meetings
   * @desc Create a new meeting
   */
  router.post('/', async (req, res) => {
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

  /**
   * @route PUT /api/meetings/:id
   * @desc Update a meeting
   */
  router.put('/:id', async (req, res) => {
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

  /**
   * @route DELETE /api/meetings/:id
   * @desc Delete a meeting
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Deleting meeting ${id}`);
    try {
      const meeting = await prisma.meeting.findUnique({ 
        where: { id: parseInt(id) },
        include: { agendaItems: true }
      });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      await prisma.$transaction(async (prisma) => {
        const agendaItems = meeting.agendaItems;
        for (const agendaItem of agendaItems) {
          await prisma.vote.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
          await prisma.voteResult.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
        }
        await prisma.agendaItem.deleteMany({
          where: { meetingId: parseInt(id) },
        });
        await prisma.voteResult.deleteMany({
          where: { meetingId: parseInt(id) },
        });
        await prisma.meeting.delete({
          where: { id: parseInt(id) },
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/meetings/:id/archive
   * @desc Archive a meeting
   */
  router.post('/:id/archive', async (req, res) => {
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

  /**
   * @route POST /api/meetings/:id/status
   * @desc Update meeting status
   */
  router.post('/:id/status', async (req, res) => {
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
      console.error('Error updating meeting status:', error);
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};