const express = require('express');
const router = express.Router();

/**
 * @route GET /api/vote-templates
 * @desc Get all vote templates
 */
router.get('/vote-templates', async (req, res) => {
  try {
    const templates = await req.prisma.voteTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching vote templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/vote-templates
 * @desc Create a new vote template
 */
router.post('/vote-templates', async (req, res) => {
  const { title } = req.body;
  try {
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const template = await req.prisma.voteTemplate.create({
      data: { title },
    });
    res.json(template);
  } catch (error) {
    console.error('Error creating vote template:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route PUT /api/vote-templates/:id
 * @desc Update a vote template
 */
router.put('/vote-templates/:id', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    const template = await req.prisma.voteTemplate.update({
      where: { id: parseInt(id) },
      data: { title },
    });
    res.json(template);
  } catch (error) {
    console.error('Error updating vote template:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/vote-templates/:id
 * @desc Delete a vote template
 */
router.delete('/vote-templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.voteTemplate.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote template:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};