const express = require('express');
const router = express.Router();

/**
 * @api {get} /api/vote-templates Получение списка всех шаблонов голосования
 * @apiName ПолучениеШаблоновГолосования
 * @apiGroup ШаблоныГолосования
 * @apiDescription Возвращает список всех шаблонов голосования, зарегистрированных в системе. Используется для отображения доступных шаблонов в интерфейсе администратора или для выбора шаблона при настройке голосования.
 * @apiSuccess {Object[]} templates Массив объектов шаблонов голосования.
 * @apiSuccess {Number} templates.id Идентификатор шаблона (уникальный ключ записи в таблице `VoteTemplate`).
 * @apiSuccess {String} templates.title Название шаблона (например, "Шаблон для общего собрания").
 * @apiSuccess {Date} templates.createdAt Дата и время создания шаблона.
 * @apiSuccess {Date} templates.updatedAt Дата и время последнего обновления шаблона.
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/vote-templates
 */
router.get('/vote-templates', async (req, res) => {
  try {
    const templates = await req.prisma.voteTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error('Ошибка при получении списка шаблонов голосования:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/vote-templates Создание нового шаблона голосования
 * @apiName СозданиеШаблонаГолосования
 * @apiGroup ШаблоныГолосования
 * @apiDescription Создаёт новый шаблон голосования с указанным названием. Используется для добавления новых шаблонов, которые могут быть использованы для настройки голосований.
 * @apiBody {String} title Название шаблона (обязательное поле, строка, например, "Шаблон для общего собрания").
 * @apiSuccess {Object} template Созданный объект шаблона голосования.
 * @apiSuccess {Number} template.id Идентификатор шаблона.
 * @apiSuccess {String} template.title Название шаблона.
 * @apiSuccess {Date} template.createdAt Дата и время создания.
 * @apiSuccess {Date} template.updatedAt Дата и время обновления.
 * @apiError (400) BadRequest Ошибка, если поле `title` отсутствует или некорректно.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Название обязательно"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"title":"Шаблон для собрания"}' http://217.114.10.226:5000/api/vote-templates
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
    console.error('Ошибка при создании шаблона голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/vote-templates/:id Обновление шаблона голосования
 * @apiName ОбновлениеШаблонаГолосования
 * @apiGroup ШаблоныГолосования
 * @apiDescription Обновляет название существующего шаблона голосования по его идентификатору. Используется для редактирования шаблонов в системе.
 * @apiParam {Number} id Идентификатор шаблона голосования (параметр пути, целое число, соответствует `id` в таблице `VoteTemplate`).
 * @apiBody {String} title Новое название шаблона (обязательное поле, строка).
 * @apiSuccess {Object} template Обновлённый объект шаблона голосования.
 * @apiSuccess {Number} template.id Идентификатор шаблона.
 * @apiSuccess {String} template.title Название шаблона.
 * @apiSuccess {Date} template.createdAt Дата и время создания.
 * @apiSuccess {Date} template.updatedAt Дата и время обновления.
 * @apiError (400) BadRequest Ошибка, если шаблон не найден или поле `title` некорректно.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Шаблон не найден"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"title":"Обновлённый шаблон"}' http://217.114.10.226:5000/api/vote-templates/1
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
    console.error('Ошибка при обновлении шаблона голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/vote-templates/:id Удаление шаблона голосования
 * @apiName УдалениеШаблонаГолосования
 * @apiGroup ШаблоныГолосования
 * @apiDescription Удаляет шаблон голосования по его идентификатору. Используется для удаления ненужных или устаревших шаблонов из системы.
 * @apiParam {Number} id Идентификатор шаблона голосования (параметр пути, целое число).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном удалении.
 * @apiError (400) BadRequest Ошибка, если шаблон не найден.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Шаблон не найден"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X DELETE http://217.114.10.226:5000/api/vote-templates/1
 */
router.delete('/vote-templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.voteTemplate.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении шаблона голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};