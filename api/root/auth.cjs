const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// API для авторизации
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    // Проверяем, авторизован ли пользователь (не админ)
    if (!user.isAdmin && user.isOnline) {
      return res.status(403).json({ success: false, error: 'Пользователь авторизован на другом устройстве' });
    }
    // Обновляем статус пользователя на онлайн (триггер автоматически отправит уведомление)
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isOnline: true },
    });
    // Возвращаем id пользователя в ответе
    res.json({ success: true, user: { id: updatedUser.id, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API для выхода из авторизации
router.post('/logout', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Обновляем статус пользователя на оффлайн (триггер автоматически отправит уведомление)
    await prisma.user.update({
      where: { email },
      data: { isOnline: false },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;