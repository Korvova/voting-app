const express = require('express');
const router = express.Router();

/**
 * @route GET /api/vote-procedures
 * @desc Get all vote procedures
 */
router.get('/vote-procedures', async (req, res) => {
  try {
    const procedures = await req.prisma.voteProcedure.findMany();
    res.json(procedures);
  } catch (error) {
    console.error('Error fetching vote procedures:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/vote-procedures
 * @desc Create a new vote procedure
 */
router.post('/vote-procedures', async (req, res) => {
  const { name, conditions, resultIfTrue } = req.body;
  try {
    if (!name || !conditions || !resultIfTrue) {
      return res.status(400).json({ error: 'Name, conditions, and resultIfTrue are required' });
    }
    const procedure = await req.prisma.voteProcedure.create({
      data: {
        name,
        conditions,
        resultIfTrue,
      },
    });
    res.json(procedure);
  } catch (error) {
    console.error('Error creating vote procedure:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route PUT /api/vote-procedures/:id
 * @desc Update a vote procedure
 */
router.put('/vote-procedures/:id', async (req, res) => {
  const { id } = req.params;
  const { name, conditions, resultIfTrue } = req.body;
  try {
    const procedure = await req.prisma.voteProcedure.update({
      where: { id: parseInt(id) },
      data: {
        name,
        conditions,
        resultIfTrue,
      },
    });
    res.json(procedure);
  } catch (error) {
    console.error('Error updating vote procedure:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/vote-procedures/:id
 * @desc Delete a vote procedure
 */
router.delete('/vote-procedures/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.voteProcedure.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote procedure:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /api/vote-procedures/:id
 * @desc Get a vote procedure by ID
 */
router.get('/vote-procedures/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const procedure = await req.prisma.voteProcedure.findUnique({
      where: { id: parseInt(id) },
    });
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json(procedure);
  } catch (error) {
    console.error('Error fetching vote procedure:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};