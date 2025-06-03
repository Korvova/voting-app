const express = require('express');
const router = express.Router();

/**
 * @api {get} /api/meetings/:id/agenda-items Получение списка элементов повестки  для заседания
 * @apiName ПолучениеЭлементовПовестки
 * @apiGroup Повестка
 * @apiDescription Возвращает список всех элементов повестки , связанных с указанным заседанием, упорядоченных по номеру (`number`). Используется для отображения повестки  в интерфейсе администратора или участника заседания. Каждый элемент включает информацию о докладчике, если он назначен.
 * @apiParam {Number} id Идентификатор заседания (параметр пути). Должен быть целым числом, соответствующим записи в таблице `Meeting` базы данных.
 * @apiSuccess {Object[]} agendaItems Массив объектов элементов повестки .
 * @apiSuccess {Number} agendaItems.id Идентификатор элемента повестки.
 * @apiSuccess {Number} agendaItems.number Порядковый номер элемента в повестке.
 * @apiSuccess {String} agendaItems.title Название или описание элемента повестки (например, "Обсуждение бюджета").
 * @apiSuccess {Number} [agendaItems.speakerId] Идентификатор докладчика (пользователя), если назначен, или `null`.
 * @apiSuccess {String} agendaItems.speaker Имя докладчика или строка `"Нет"`, если докладчик не назначен.
 * @apiSuccess {String} [agendaItems.link] Ссылка на материалы или документы, связанные с элементом повестки (может быть `null`).
 * @apiSuccess {Boolean} agendaItems.voting Указывает, активно ли голосование по этому элементу (`true` или `false`).
 * @apiSuccess {Boolean} agendaItems.completed Указывает, завершён ли элемент повестки (`true` или `false`).
 * @apiSuccess {Boolean} agendaItems.activeIssue Указывает, является ли элемент текущим активным вопросом (`true` или `false`).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL или неверном `id` заседания.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl http://217.114.10.226:5000/api/meetings/119/agenda-items
 */
router.get('/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  try {
    const agendaItems = await req.prisma.agendaItem.findMany({
      where: { meetingId: parseInt(id) },
      include: { speaker: true },
      orderBy: { number: 'asc' },
    });
    res.json(agendaItems.map(item => ({
      id: item.id,
      number: item.number,
      title: item.title,
      speakerId: item.speakerId,
      speaker: item.speaker ? item.speaker.name : 'Нет',
      link: item.link,
      voting: item.voting,
      completed: item.completed,
      activeIssue: item.activeIssue,
    })));
  } catch (error) {
    console.error('Error fetching agenda items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/meetings/:id/agenda-items Создание нового элемента повестки 
 * @apiName СозданиеЭлементаПовестки
 * @apiGroup Повестка
 * @apiDescription Создаёт новый элемент повестки  для указанного заседания. Используется для добавления вопросов или тем, которые будут обсуждаться на заседании. Обязательные поля: `number`, `title`.
 * @apiParam {Number} id Идентификатор заседания (параметр пути). Должен быть целым числом, соответствующим записи в таблице `Meeting`.
 * @apiBody {Number} number Порядковый номер элемента в повестке (целое число, например, 1, 2, 3).
 * @apiBody {String} title Название или описание элемента повестки (например, "Обсуждение бюджета").
 * @apiBody {Number} [speakerId] Идентификатор докладчика (пользователя), если назначен (опционально, целое число или `null`).
 * @apiBody {String} [link] Ссылка на материалы или документы, связанные с элементом повестки (опционально, может быть `null`).
 * @apiSuccess {Object} agendaItem Созданный объект элемента повестки.
 * @apiSuccess {Number} agendaItem.id Идентификатор элемента повестки.
 * @apiSuccess {Number} agendaItem.number Порядковый номер элемента.
 * @apiSuccess {String} agendaItem.title Название элемента.
 * @apiSuccess {Number} [agendaItem.speakerId] Идентификатор докладчика или `null`.
 * @apiSuccess {String} [agendaItem.link] Ссылка на материалы или `null`.
 * @apiSuccess {Boolean} agendaItem.voting Статус голосования (`false` по умолчанию).
 * @apiSuccess {Boolean} agendaItem.completed Статус завершения (`false` по умолчанию).
 * @apiSuccess {Number} agendaItem.meetingId Идентификатор заседания.
 * @apiSuccess {Date} agendaItem.createdAt Дата создания элемента.
 * @apiSuccess {Date} agendaItem.updatedAt Дата последнего обновления.
 * @apiError (400) BadRequest Ошибка, если переданы некорректные данные (например, отсутствуют `number` или `title`, или `meetingId` не существует).
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Некорректные данные или заседание не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"number":5,"title":"Новый вопрос","speakerId":26,"link":"https://example.com/doc"}' http://217.178.10.226:5000/api/meetings/119/agenda-items
 */
router.post('/meetings/:id/agenda-items', async (req, res) => {
  const { id } = req.params;
  const { number, title, speakerId, link } = req.body;
  console.log(`Adding agenda item:`, req.body);
  try {
    const agendaItem = await req.prisma.agendaItem.create({
      data: {
        meetingId: parseInt(id),
        number,
        title,
        speakerId: speakerId ? parseInt(speakerId) : null,
        link,
        voting: false,
        completed: false,
      },
    });
    res.json(agendaItem);
  } catch (error) {
    console.error('Error adding agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/meetings/:id/agenda-items/:itemId Обновление элемента повестки 
 * @apiName ОбновлениеЭлементаПовестки
 * @apiGroup Повестка
 * @apiDescription Обновляет существующий элемент повестки  для указанного заседания. Позволяет изменить номер, название, докладчика, ссылку, статус активности вопроса (`activeIssue`) или завершения (`completed`). Если обновляется `activeIssue` на `true`, все другие элементы повестки для этого заседания автоматически становятся неактивными (`activeIssue: false`).
 * @apiParam {Number} id Идентификатор заседания (параметр пути). Должен быть целым числом, соответствующим записи в `Meeting`.
 * @apiParam {Number} itemId Идентификатор элемента повестки (параметр пути). Должен быть целым числом, соответствующим записи в `AgendaItem`.
 * @apiBody {Number} number Порядковый номер элемента в повестке (целое число).
 * @apiBody {String} title Название или описание элемента повестки.
 * @apiBody {Number} [speakerId] Идентификатор докладчика (пользователя), если назначен (опционально, целое число или `null`).
 * @apiBody {String} [link] Ссылка на материалы (опционально, может быть `null`).
 * @apiBody {Boolean} [activeIssue] Указывает, является ли элемент активным вопросом (опционально, `true` или `false`).
 * @apiBody {Boolean} [completed] Указывает, завершён ли элемент (опционально, `true` или `false`).
 * @apiSuccess {Object} agendaItem Обновлённый объект элемента повестки.
 * @apiSuccess {Number} agendaItem.id Идентификатор элемента повестки.
 * @apiSuccess {Number} agendaItem.number Порядковый номер элемента.
 * @apiSuccess {String} agendaItem.title Название элемента.
 * @apiSuccess {Number} [agendaItem.speakerId] Идентификатор докладчика или `null`.
 * @apiSuccess {String} [agendaItem.link] Ссылка или `null`.
 * @apiSuccess {Boolean} agendaItem.voting Статус голосования.
 * @apiSuccess {Boolean} agendaItem.completed Статус завершения.
 * @apiSuccess {Boolean} agendaItem.activeIssue Статус активности вопроса.
 * @apiSuccess {Number} agendaItem.meetingId Идентификатор заседания.
 * @apiSuccess {Date} agendaItem.createdAt Дата создания.
 * @apiSuccess {Date} agendaItem.updatedAt Дата обновления.
 * @apiError (400) BadRequest Ошибка, если элемент или заседание не найдены, или переданы некорректные данные.
 * @apiError (500) ServerError Ошибка сервера при сбое транзакции.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Элемент повестки не найден"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"number":5,"title":"Обновлённый вопрос","speakerId":26,"activeIssue":true}' http://217.178.10.226:5000/api/meetings/119/agenda-items/560
 */
router.put('/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { number, title, speakerId, link, activeIssue, completed } = req.body;
  console.log(`Updating agenda item ${itemId} for meeting ${id}:`, req.body);
  try {
    const result = await req.prisma.$transaction([
      req.prisma.agendaItem.updateMany({
        where: {
          meetingId: parseInt(id),
          id: { not: parseInt(itemId) },
        },
        data: {
          activeIssue: false,
        },
      }),
      req.prisma.agendaItem.update({
        where: { id: parseInt(itemId), meetingId: parseInt(id) },
        data: {
          number,
          title,
          speakerId: speakerId ? parseInt(speakerId) : null,
          link,
          activeIssue: activeIssue !== undefined ? activeIssue : undefined,
          completed: completed !== undefined ? completed : undefined,
        },
      }),
    ]);

    res.json(result[1]);
  } catch (error) {
    console.error('Error updating agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/meetings/:id/agenda-items/:itemId Удаление элемента повестки 
 * @apiName УдалениеЭлементаПовестки
 * @apiGroup Повестка
 * @apiDescription Удаляет элемент повестки  по его идентификатору для указанного заседания. Используется для исключения вопросов из повестки. Перед удалением проверяется существование элемента.
 * @apiParam {Number} id Идентификатор заседания (параметр пути). Должен быть целым числом, соответствующим записи в `Meeting`.
 * @apiParam {Number} itemId Идентификатор элемента повестки (параметр пути). Должен быть целым числом, соответствующим записи в `AgendaItem`.
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true`, если элемент успешно удалён.
 * @apiError (404) NotFound Ошибка, если элемент повестки или заседание не найдены.
 * @apiError (400) BadRequest Ошибка, если произошёл сбой при удалении (например, из-за связанных данных).
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Элемент повестки не найден"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X DELETE http://217.178.10.226:5000/api/meetings/119/agenda-items/560
 */
router.delete('/meetings/:id/agenda-items/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  console.log(`Deleting agenda item ${itemId} for meeting ${id}`);
  try {
    const agendaItem = await req.prisma.agendaItem.findUnique({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    if (!agendaItem) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }
    await req.prisma.agendaItem.delete({
      where: { id: parseInt(itemId), meetingId: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting agenda item:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};