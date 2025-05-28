const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/:id/disconnect', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isOnline: false },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;