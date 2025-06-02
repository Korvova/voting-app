const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Получение списка всех связей
router.get('/', async (req, res) => {
  try {
    const deviceLinks = await prisma.deviceLink.findMany({
      include: { user: true },
    });
    res.json(deviceLinks.map(link => ({
      id: link.id,
      userId: link.userId,
      userName: link.user.name,
      deviceId: link.deviceId,
    })));
  } catch (error) {
    console.error('Error fetching device links:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создание новой связи
router.post('/', async (req, res) => {
  const { userId, deviceId } = req.body;
  try {
    if (!userId || !deviceId) {
      return res.status(400).json({ error: 'userId and deviceId are required' });
    }

    // Проверяем, существует ли уже связь для этого userId
    const existingLink = await prisma.deviceLink.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (existingLink) {
      // Если связь уже существует, возвращаем ошибку
      return res.status(400).json({ error: 'Пользователь уже связан с другим ID' });
    }

    // Создаём новую связь
    const deviceLink = await prisma.deviceLink.create({
      data: {
        userId: parseInt(userId),
        deviceId,
      },
    });

    res.json(deviceLink);
  } catch (error) {
    console.error('Error creating device link:', error);
    if (error.code === 'P2002') {
      // Ошибка уникальности
      if (error.meta?.target?.includes('userId')) {
        res.status(400).json({ error: 'Пользователь уже связан с другим ID' });
      } else if (error.meta?.target?.includes('deviceId')) {
        res.status(400).json({ error: 'Этот ID устройства уже используется другим пользователем' });
      } else {
        res.status(400).json({ error: 'Ошибка уникальности данных' });
      }
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Обновление существующей связи
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, deviceId } = req.body;
  try {
    const deviceLink = await prisma.deviceLink.update({
      where: { id: parseInt(id) },
      data: {
        userId: userId ? parseInt(userId) : undefined,
        deviceId: deviceId || undefined,
      },
    });
    res.json(deviceLink);
  } catch (error) {
    console.error('Error updating device link:', error);
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('userId')) {
        res.status(400).json({ error: 'Пользователь уже связан с другим ID' });
      } else if (error.meta?.target?.includes('deviceId')) {
        res.status(400).json({ error: 'Этот ID устройства уже используется другим пользователем' });
      } else {
        res.status(400).json({ error: 'Ошибка уникальности данных' });
      }
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Удаление связи
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.deviceLink.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting device link:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;