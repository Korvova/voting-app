const express = require('express');
const router = express.Router();

/**
 * @api {get} /api/vote-procedures Получение списка всех процедур голосования
 * @apiName ПолучениеПроцедурГолосования
 * @apiGroup ПроцедурыГолосования
 * @apiDescription Возвращает список всех процедур голосования, зарегистрированных в системе. Используется для отображения доступных процедур в интерфейсе администратора или для выбора процедуры при настройке голосования.
 * @apiSuccess {Object[]} procedures Массив объектов процедур голосования.
 * @apiSuccess {Number} procedures.id Идентификатор процедуры (уникальный ключ записи в таблице `VoteProcedure`).
 * @apiSuccess {String} procedures.name Название процедуры (например, "Простое большинство").
 * @apiSuccess {Object} procedures.conditions Условия голосования в формате JSON (например, логические выражения для принятия решения).
 * @apiSuccess {String} procedures.resultIfTrue Результат при выполнении условий (например, `"Принято"` или `"Не принято"`).
 * @apiSuccess {Date} procedures.createdAt Дата и время создания процедуры.
 * @apiSuccess {Date} procedures.updatedAt Дата и время последнего обновления процедуры.
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/vote-procedures
 */
router.get('/vote-procedures', async (req, res) => {
  try {
    const procedures = await req.prisma.voteProcedure.findMany();
    res.json(procedures);
  } catch (error) {
    console.error('Ошибка при получении списка процедур голосования:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/vote-procedures Создание новой процедуры голосования
 * @apiName СозданиеПроцедурыГолосования
 * @apiGroup ПроцедурыГолосования
 * @apiDescription Создаёт новую процедуру голосования с указанными параметрами. Используется для добавления новых правил голосования в систему, которые могут быть применены к голосованиям.
 * @apiBody {String} name Название процедуры (обязательное поле, строка, например, "Простое большинство").
 * @apiBody {Object} conditions Условия голосования в формате JSON (обязательное поле, например, `{"elements":[{"value":"За","type":"select"},{"value":">","type":"operator"},{"value":50,"type":"input"}]}`).
 * @apiBody {String} resultIfTrue Результат при выполнении условий (обязательное поле, строка, например, `"Принято"`).
 * @apiSuccess {Object} procedure Созданный объект процедуры голосования.
 * @apiSuccess {Number} procedure.id Идентификатор процедуры.
 * @apiSuccess {String} procedure.name Название процедуры.
 * @apiSuccess {Object} procedure.conditions Условия голосования.
 * @apiSuccess {String} procedure.resultIfTrue Результат при выполнении условий.
 * @apiSuccess {Date} procedure.createdAt Дата и время создания.
 * @apiSuccess {Date} procedure.updatedAt Дата и время обновления.
 * @apiError (400) BadRequest Ошибка, если отсутствуют обязательные поля (`name`, `conditions`, `resultIfTrue`) или переданы некорректные данные.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Name, conditions и resultIfTrue обязательны"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"name":"Простое большинство","conditions":{"elements":[{"value":"За","type":"select"},{"value":">","type":"operator"},{"value":50,"type":"input"}]},"resultIfTrue":"Принято"}' http://217.114.10.226:5000/api/vote-procedures
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
    console.error('Ошибка при создании процедуры голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/vote-procedures/:id Обновление процедуры голосования
 * @apiName ОбновлениеПроцедурыГолосования
 * @apiGroup ПроцедурыГолосования
 * @apiDescription Обновляет существующую процедуру голосования по её идентификатору. Позволяет изменить название, условия и результат при выполнении условий. Используется для редактирования правил голосования.
 * @apiParam {Number} id Идентификатор процедуры голосования (параметр пути, целое число, соответствует `id` в таблице `VoteProcedure`).
 * @apiBody {String} [name] Название процедуры (опционально, строка).
 * @apiBody {Object} [conditions] Условия голосования в формате JSON (опционально, например, `{"elements":[{"value":"За","type":"select"},{"value":">","type":"operator"},{"value":60,"type":"input"}]}`).
 * @apiBody {String} [resultIfTrue] Результат при выполнении условий (опционально, строка).
 * @apiSuccess {Object} procedure Обновлённый объект процедуры голосования.
 * @apiSuccess {Number} procedure.id Идентификатор процедуры.
 * @apiSuccess {String} procedure.name Название процедуры.
 * @apiSuccess {Object} procedure.conditions Условия голосования.
 * @apiSuccess {String} procedure.resultIfTrue Результат при выполнении условий.
 * @apiSuccess {Date} procedure.createdAt Дата и время создания.
 * @apiSuccess {Date} procedure.updatedAt Дата и время обновления.
 * @apiError (400) BadRequest Ошибка, если процедура не найдена или переданы некорректные данные.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Процедура не найдена"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"name":"Обновлённое большинство","conditions":{"elements":[{"value":"За","type":"select"},{"value":">","type":"operator"},{"value":60,"type":"input"}]},"resultIfTrue":"Принято"}' http://217.114.10.226:5000/api/vote-procedures/10
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
    console.error('Ошибка при обновлении процедуры голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/vote-procedures/:id Удаление процедуры голосования
 * @apiName УдалениеПроцедурыГолосования
 * @apiGroup ПроцедурыГолосования
 * @apiDescription Удаляет процедуру голосования по её идентификатору. Используется для удаления ненужных или устаревших правил голосования. Примечание: удаление может быть заблокировано, если процедура связана с результатами голосования (`VoteResult`).
 * @apiParam {Number} id Идентификатор процедуры голосования (параметр пути, целое число).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном удалении.
 * @apiError (400) BadRequest Ошибка, если процедура не найдена или удаление заблокировано из-за связанных записей.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Процедура не найдена"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X DELETE http://217.114.10.226:5000/api/vote-procedures/10
 */
router.delete('/vote-procedures/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.voteProcedure.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении процедуры голосования:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {get} /api/vote-procedures/:id Получение процедуры голосования по идентификатору
 * @apiName ПолучениеПроцедурыГолосования
 * @apiGroup ПроцедурыГолосования
 * @apiDescription Возвращает информацию о конкретной процедуре голосования по её идентификатору. Используется для отображения деталей процедуры в интерфейсе.
 * @apiParam {Number} id Идентификатор процедуры голосования (параметр пути, целое число).
 * @apiSuccess {Object} procedure Объект процедуры голосования.
 * @apiSuccess {Number} procedure.id Идентификатор процедуры.
 * @apiSuccess {String} procedure.name Название процедуры.
 * @apiSuccess {Object} procedure.conditions Условия голосования в формате JSON.
 * @apiSuccess {String} procedure.resultIfTrue Результат при выполнении условий.
 * @apiSuccess {Date} procedure.createdAt Дата и время создания.
 * @apiSuccess {Date} procedure.updatedAt Дата и время обновления.
 * @apiError (404) NotFound Ошибка, если процедура не найдена.
 * @apiError (500) ServerError Ошибка сервера или базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Процедура не найдена"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/vote-procedures/10
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
    console.error('Ошибка при получении процедуры голосования:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};