const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @api {get} /api/device-links Получение списка всех связей устройств с пользователями
 * @apiName ПолучениеСвязейУстройств
 * @apiGroup СвязиУстройств
 * @apiDescription Возвращает список всех связей между пользователями и идентификаторами устройств, зарегистрированных в системе. Используется для управления привязкой устройств к пользователям, например, для отслеживания авторизаций на конкретных устройствах. Каждый элемент включает информацию о пользователе и его устройстве.
 * @apiSuccess {Object[]} deviceLinks Массив объектов связей устройств.
 * @apiSuccess {Number} deviceLinks.id Идентификатор связи (уникальный ключ записи в таблице `DeviceLink`).
 * @apiSuccess {Number} deviceLinks.userId Идентификатор пользователя, связанного с устройством (соответствует `id` в таблице `User`).
 * @apiSuccess {String} deviceLinks.userName Имя пользователя, связанного с устройством.
 * @apiSuccess {String} deviceLinks.deviceId Уникальный идентификатор устройства (например, UUID или MAC-адрес).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/device-links
 */
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

/**
 * @api {post} /api/device-links Создание новой связи устройства с пользователем
 * @apiName СозданиеСвязиУстройства
 * @apiGroup СвязиУстройств
 * @apiDescription Создаёт новую связь между пользователем и идентификатором устройства. Используется для привязки устройства (например, компьютера или телефона) к учётной записи пользователя, чтобы ограничить авторизацию только с зарегистрированных устройств. Каждый пользователь может быть связан только с одним устройством, и каждое устройство — только с одним пользователем (ограничения уникальности `userId` и `deviceId`).
 * @apiBody {Number} userId Идентификатор пользователя (обязательное поле, целое число, должно соответствовать `id` в таблице `User`).
 * @apiBody {String} deviceId Уникальный идентификатор устройства (обязательное поле, строка, например, UUID или MAC-адрес).
 * @apiSuccess {Object} deviceLink Созданный объект связи устройства.
 * @apiSuccess {Number} deviceLink.id Идентификатор связи.
 * @apiSuccess {Number} deviceLink.userId Идентификатор пользователя.
 * @apiSuccess {String} deviceLink.deviceId Идентификатор устройства.
 * @apiSuccess {Date} deviceLink.createdAt Дата создания связи.
 * @apiSuccess {Date} deviceLink.updatedAt Дата последнего обновления связи.
 * @apiError (400) BadRequest Ошибка, если отсутствуют `userId` или `deviceId`, пользователь уже связан с другим устройством, устройство уже привязано к другому пользователю, или `userId` не существует.
 * @apiErrorExample {json} Пример ответа при ошибке (отсутствие обязательных полей):
 *     {
 *         "error": "userId и deviceId обязательны"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (пользователь уже связан):
 *     {
 *         "error": "Пользователь уже связан с другим ID"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (устройство уже привязано):
 *     {
 *         "error": "Этот ID устройства уже используется другим пользователем"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"userId":26,"deviceId":"abc123-device"}' http://217.114.10.226:5000/api/device-links
 */
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

/**
 * @api {put} /api/device-links/:id Обновление связи устройства с пользователем
 * @apiName ОбновлениеСвязиУстройства
 * @apiGroup СвязиУстройств
 * @apiDescription Обновляет существующую связь между пользователем и устройством по идентификатору связи. Позволяет изменить `userId` или `deviceId`, если они переданы в теле запроса. Используется для замены устройства, привязанного к пользователю, или изменения пользователя для устройства, с учётом ограничений уникальности.
 * @apiParam {Number} id Идентификатор связи (параметр пути, целое число, соответствует `id` в таблице `DeviceLink`).
 * @apiBody {Number} [userId] Новый идентификатор пользователя (опционально, целое число, должно соответствовать `id` в таблице `User`).
 * @apiBody {String} [deviceId] Новый идентификатор устройства (опционально, строка, например, UUID).
 * @apiSuccess {Object} deviceLink Обновлённый объект связи устройства.
 * @apiSuccess {Number} deviceLink.id Идентификатор связи.
 * @apiSuccess {Number} deviceLink.userId Идентификатор пользователя.
 * @apiSuccess {String} deviceLink.deviceId Идентификатор устройства.
 * @apiSuccess {Date} deviceLink.createdAt Дата создания связи.
 * @apiSuccess {Date} deviceLink.updatedAt Дата последнего обновления связи.
 * @apiError (400) BadRequest Ошибка, если связь с указанным `id` не найдена, пользователь уже связан с другим устройством, устройство уже привязано к другому пользователю, или `userId` не существует.
 * @apiErrorExample {json} Пример ответа при ошибке (пользователь уже связан):
 *     {
 *         "error": "Пользователь уже связан с другим ID"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (устройство уже привязано):
 *     {
 *         "error": "Этот ID устройства уже используется другим пользователем"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (связь не найдена):
 *     {
 *         "error": "Связь не найдена"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"deviceId":"new-device-456"}' http://217.114.10.226:5000/api/device-links/1
 */
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

/**
 * @api {delete} /api/device-links/:id Удаление связи устройства с пользователем
 * @apiName УдалениеСвязиУстройства
 * @apiGroup СвязиУстройств
 * @apiDescription Удаляет существующую связь между пользователем и устройством по идентификатору связи. Используется для отвязки устройства от учётной записи пользователя, например, при замене устройства или деактивации учётной записи.
 * @apiParam {Number} id Идентификатор связи (параметр пути, целое число, соответствует `id` в таблице `DeviceLink`).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true`, если связь успешно удалена.
 * @apiError (400) BadRequest Ошибка, если связь с указанным `id` не найдена или произошёл сбой при удалении.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Связь не найдена"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X DELETE http://217.114.10.226:5000/api/device-links/1
 */
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