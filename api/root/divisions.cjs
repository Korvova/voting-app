const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @api {get} /api/divisions Получение списка всех подразделений
 * @apiName ПолучениеПодразделений
 * @apiGroup Подразделения
 * @apiDescription Возвращает список всех подразделений, зарегистрированных в системе, с информацией о количестве пользователей в каждом подразделении. Используется для отображения структуры организации в интерфейсе администратора или для управления подразделениями.
 * @apiSuccess {Object[]} divisions Массив объектов подразделений.
 * @apiSuccess {Number} divisions.id Идентификатор подразделения (уникальный ключ записи в таблице `Division`).
 * @apiSuccess {String} divisions.name Название подразделения (например, "Отдел продаж").
 * @apiSuccess {Number} divisions.userCount Количество пользователей, привязанных к подразделению.
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/divisions
 */
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
    console.error('Ошибка при получении списка подразделений:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/divisions Создание нового подразделения
 * @apiName СозданиеПодразделения
 * @apiGroup Подразделения
 * @apiDescription Создаёт новое подразделение с указанным названием. Используется для добавления новых организационных единиц в систему, к которым могут быть привязаны пользователи и заседания.
 * @apiBody {String} name Название подразделения (обязательное поле, строка, например, "Отдел маркетинга").
 * @apiSuccess {Object} division Созданный объект подразделения.
 * @apiSuccess {Number} division.id Идентификатор подразделения.
 * @apiSuccess {String} division.name Название подразделения.
 * @apiSuccess {Date} division.createdAt Дата и время создания подразделения.
 * @apiSuccess {Date} division.updatedAt Дата и время последнего обновления.
 * @apiError (400) BadRequest Ошибка, если поле `name` отсутствует или некорректно, либо при нарушении ограничений базы данных (например, уникальности имени, если она настроена).
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Название подразделения обязательно"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"name":"Отдел маркетинга"}' http://217.114.10.226:5000/api/divisions
 */
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const division = await prisma.division.create({
      data: { name },
    });
    res.json(division);
  } catch (error) {
    console.error('Ошибка при создании подразделения:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/divisions/:id Обновление подразделения
 * @apiName ОбновлениеПодразделения
 * @apiGroup Подразделения
 * @apiDescription Обновляет название существующего подразделения по его идентификатору. Используется для изменения информации о подразделении, например, при переименовании отдела.
 * @apiParam {Number} id Идентификатор подразделения (параметр пути, целое число, соответствует `id` в таблице `Division`).
 * @apiBody {String} name Новое название подразделения (обязательное поле, строка).
 * @apiSuccess {Object} division Обновлённый объект подразделения.
 * @apiSuccess {Number} division.id Идентификатор подразделения.
 * @apiSuccess {String} division.name Название подразделения.
 * @apiSuccess {Date} division.createdAt Дата создания подразделения.
 * @apiSuccess {Date} division.updatedAt Дата последнего обновления.
 * @apiError (400) BadRequest Ошибка, если подразделение с указанным `id` не найдено, поле `name` отсутствует или некорректно, либо при нарушении ограничений базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Подразделение не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"name":"Отдел рекламы"}' http://217.114.10.226:5000/api/divisions/1
 */
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
    console.error('Ошибка при обновлении подразделения:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/divisions/:id Удаление подразделения
 * @apiName УдалениеПодразделения
 * @apiGroup Подразделения
 * @apiDescription Удаляет подразделение по его идентификатору. Используется для удаления организационной единицы из системы. Примечание: удаление может быть заблокировано, если подразделение связано с пользователями или заседаниями (ограничения внешнего ключа).
 * @apiParam {Number} id Идентификатор подразделения (параметр пути, целое число, соответствует `id` в таблице `Division`).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true`, если подразделение успешно удалено.
 * @apiError (400) BadRequest Ошибка, если подразделение с указанным `id` не найдено или удаление заблокировано из-за связанных записей (например, пользователей или заседаний).
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Подразделение не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X DELETE http://217.114.10.226:5000/api/divisions/1
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.division.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении подразделения:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;