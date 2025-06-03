const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @api {post} /api/login User login
 * @apiName Login
 * @apiGroup Authentication
 * @apiDescription Authenticates a user and sets their online status to true
 * @apiBody {String} email User email
 * @apiBody {String} password User password
 * @apiSuccess {Boolean} success Operation status
 * @apiSuccess {Object} user User details
 * @apiSuccess {Number} user.id User ID
 * @apiSuccess {String} user.email User email
 * @apiSuccess {Boolean} user.isAdmin Admin status
 * @apiError (401) Unauthorized Invalid email or password
 * @apiError (403) Forbidden User already logged in on another device (non-admin)
 * @apiError (500) ServerError Database or server error
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "Invalid email or password"
 *     }
 */
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

/**
 * @api {post} /api/logout User logout
 * @apiName Logout
 * @apiGroup Authentication
 * @apiDescription Выполняет выход пользователя из системы и устанавливает его статус онлайн в false.
 * @apiBody {String} email User email описание?
 * @apiSuccess {Boolean} success Operation status
 * @apiError (404) NotFound User not found
 * @apiError (500) ServerError Database or server error
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "User not found"
 *     }
 */
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