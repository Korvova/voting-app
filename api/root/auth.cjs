const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @api {post} /api/login Авторизация пользователя
 * @apiName АвторизацияПользователя
 * @apiGroup Аутентификация
 * @apiDescription Выполняет авторизацию пользователя в системе, проверяя его email и пароль. При успешной авторизации устанавливает статус пользователя `isOnline` в значение `true`, что указывает на активную сессию. Если пользователь (не администратор) уже авторизован на другом устройстве, авторизация отклоняется. После успешной авторизации триггер PostgreSQL отправляет уведомление через канал `user_status_channel`. Используется для входа пользователей в интерфейс системы.
 * @apiBody {String} email Электронная почта пользователя (обязательное поле, должно соответствовать записи в таблице `User`, например, "user@example.com").
 * @apiBody {String} password Пароль пользователя (обязательное поле, должен совпадать с паролем в базе данных).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешной авторизации.
 * @apiSuccess {Object} user Данные авторизованного пользователя.
 * @apiSuccess {Number} user.id Идентификатор пользователя.
 * @apiSuccess {String} user.email Электронная почта пользователя.
 * @apiSuccess {String} user.name Имя пользователя.
 * @apiSuccess {Boolean} user.isAdmin Флаг, указывающий, является ли пользователь администратором (`true` — администратор, `false` — обычный пользователь).
 * @apiSuccess {Boolean} user.isOnline Статус активности пользователя (`true` после авторизации).
 * @apiError (401) Unauthorized Ошибка, если email не найден или пароль неверный.
 * @apiError (403) Forbidden Ошибка, если пользователь (не администратор) уже авторизован на другом устройстве (статус `isOnline: true`).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке (401):
 *     {
 *         "success": false,
 *         "error": "Неверный email или пароль"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (403):
 *     {
 *         "success": false,
 *         "error": "Пользователь авторизован на другом устройстве"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (500):
 *     {
 *         "success": false,
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"secure123"}' http://217.114.10.226:5000/api/login
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
 * @api {post} /api/logout Выход пользователя из системы
 * @apiName ВыходПользователя
 * @apiGroup Аутентификация
 * @apiDescription Завершает сессию пользователя, устанавливая его статус `isOnline` в значение `false`, что указывает на отсутствие активной сессии. После выхода триггер PostgreSQL отправляет уведомление через канал `user_status_channel`. Используется для выхода пользователей из интерфейса системы.
 * @apiBody {String} email Электронная почта пользователя (обязательное поле, должно соответствовать записи в таблице `User`, например, "user@example.com").
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном выходе.
 * @apiError (404) NotFound Ошибка, если пользователь с указанным email не найден.
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Пользователь не найден"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (500):
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"email":"user@example.com"}' http://217.114.10.226:5000/api/logout
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