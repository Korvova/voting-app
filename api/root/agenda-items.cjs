const express = require('express');
const router = express.Router();

/**
 * @route GET /api/meetings/:id/agenda-items
 * @desc Get all agenda items for a meeting
 */
router.get('/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  try {
    const agendaItems = await req.prisma.agendaItem.findMany({
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
    console.error('Error fetching agenda items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/meetings/:id/agenda-items
 * @desc Create a new agenda item
 */
router.post('/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  const { number, title, speakerId, link } = req.body;
  console.log(`Adding agenda item:`, req.body);
  try {
    const agendaItem = await req.prisma.agendaItem.create({
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

/**
 * @route PUT /api/meetings/:id/agenda-items/:itemId
 * @desc Update an agenda item
 */
router.put('/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { number, title, speakerId, link, activeIssue, completed } = req.body;
  console.log(`Updating agenda item ${itemId} for meeting ${id}:`, req.body);
  try {
    const result = await req.prisma.$transaction([
      req.prisma.agendaItem.updateMany({
        where: {
          meetingId: parseInt(id),
          id: { not: parseInt(itemId) },
        },
        data: {
          activeIssue: false,
        },
      }),
      req.prisma.agendaItem.update({
        where: { id: parseInt(itemId), meetingId: parseInt(id) },
        data: {
          number,
          title,
          speakerId: speakerId ? parseInt(speakerId) : null,
          link,
          activeIssue: activeIssue !== undefined ? activeIssue : undefined,
          completed: completed !== undefined ? completed : undefined,
        },
      }),
    ]);

    res.json(result[1]);
  } catch (error) {
    console.error('Error updating agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/meetings/:id/agenda-items/:itemId
 * @desc Delete an agenda item
 */
router.delete('/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  console.log(`Deleting agenda item ${itemId} for meeting ${id}`);
  try {
    const agendaItem = await req.prisma.agendaItem.findUnique({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    if (!agendaItem) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }
    await req.prisma.agendaItem.delete({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};