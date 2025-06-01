const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// API для управления подразделениями
router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.division.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;