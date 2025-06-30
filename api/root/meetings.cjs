const express = require('express');
const router = express.Router();

module.exports = (prisma, pgClient) => {
  /**
   * @api {get} /api/meetings Получение списка всех неархивированных заседаний
   * @apiName ПолучениеНеархивированныхЗаседаний
   * @apiGroup Заседания
   * @apiDescription Возвращает список всех неархивированных заседаний с информацией о связанных подразделениях. Используется для отображения активных или предстоящих заседаний в интерфейсе администратора или пользователя.
   * @apiSuccess {Object[]} meetings Массив объектов заседаний.
   * @apiSuccess {Number} meetings.id Идентификатор заседания (уникальный ключ записи в таблице `Meeting`).
   * @apiSuccess {String} meetings.name Название заседания (например, "Совещание по бюджету").
   * @apiSuccess {String} meetings.startTime Дата и время начала заседания в формате ISO (например, "2025-06-03T10:00:00.000Z").
   * @apiSuccess {String} meetings.endTime Дата и время окончания заседания в формате ISO.
   * @apiSuccess {String} meetings.status Статус заседания (`WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {String} meetings.divisions Названия связанных подразделений, объединённые через запятую, или `"Нет"`, если подразделения отсутствуют.
   * @apiSuccess {Boolean} meetings.isArchived Флаг архивации (всегда `false` для этого маршрута).
   * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Внутренняя ошибка сервера"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/meetings
   */
  router.get('/', async (req, res) => {
    try {
      const meetings = await prisma.meeting.findMany({
        where: { isArchived: false },
        include: { divisions: true },
      });
      console.log('Fetched meetings on frontend:', meetings);
      res.json(meetings.map(meeting => ({
        id: meeting.id,
        name: meeting.name,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
        divisions: meeting.divisions.map(d => d.name).join(', ') || 'Нет',
        isArchived: meeting.isArchived,
      })));
    } catch (error) {
      console.error('Ошибка при получении списка заседаний:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {get} /api/meetings/archived Получение списка всех архивированных заседаний
   * @apiName ПолучениеАрхивированныхЗаседаний
   * @apiGroup Заседания
   * @apiDescription Возвращает список всех архивированных заседаний с информацией о связанных подразделениях. Используется для отображения завершённых или устаревших заседаний в интерфейсе.
   * @apiSuccess {Object[]} meetings Массив объектов заседаний.
   * @apiSuccess {Number} meetings.id Идентификатор заседания.
   * @apiSuccess {String} meetings.name Название заседания.
   * @apiSuccess {String} meetings.startTime Дата и время начала заседания в формате ISO.
   * @apiSuccess {String} meetings.endTime Дата и время окончания заседания в формате ISO.
   * @apiSuccess {String} meetings.status Статус заседания (`WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {String} meetings.divisions Названия связанных подразделений, объединённые через запятую, или `"Нет"`.
   * @apiSuccess {Boolean} meetings.isArchived Флаг архивации (всегда `true` для этого маршрута).
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Внутренняя ошибка сервера"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/meetings/archived
   */
  router.get('/archived', async (req, res) => {
    try {
      const meetings = await prisma.meeting.findMany({
        where: { isArchived: true },
        include: { divisions: true },
      });
      console.log('Fetched archived meetings:', meetings);
      res.json(meetings.map(meeting => ({
        id: meeting.id,
        name: meeting.name,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
        divisions: meeting.divisions.map(d => d.name).join(', ') || 'Нет',
        isArchived: meeting.isArchived,
      })));
    } catch (error) {
      console.error('Ошибка при получении списка архивированных заседаний:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {get} /api/meetings/active-for-user Получение активных заседаний для пользователя
   * @apiName ПолучениеАктивныхЗаседанийПользователя
   * @apiGroup Заседания
   * @apiDescription Возвращает список активных (неархивированных) заседаний, в которых участвует пользователь, определённый по его email. Заседания включают информацию о повестке, подразделениях и участниках. Пользователь считается участником, если его подразделение связано с заседанием.
   * @apiQuery {String} email Электронная почта пользователя (обязательное поле, например, "user@example.com").
   * @apiSuccess {Object[]} meetings Массив объектов заседаний.
   * @apiSuccess {Number} meetings.id Идентификатор заседания.
   * @apiSuccess {String} meetings.name Название заседания.
   * @apiSuccess {String} meetings.startTime Дата и время начала в формате ISO.
   * @apiSuccess {String} meetings.endTime Дата и время окончания в формате ISO.
   * @apiSuccess {String} meetings.status Статус заседания (`WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {Boolean} meetings.isArchived Флаг архивации (всегда `false`).
   * @apiSuccess {Object[]} meetings.agendaItems Массив элементов повестки.
   * @apiSuccess {Number} meetings.agendaItems.id Идентификатор элемента повестки.
   * @apiSuccess {Number} meetings.agendaItems.number Порядковый номер вопроса.
   * @apiSuccess {String} meetings.agendaItems.title Название вопроса.
   * @apiSuccess {String} meetings.agendaItems.speaker Имя докладчика или `"Нет"`.
   * @apiSuccess {String} [meetings.agendaItems.link] Ссылка на материалы (может быть `null`).
   * @apiSuccess {Boolean} meetings.agendaItems.voting Статус голосования.
   * @apiSuccess {Boolean} meetings.agendaItems.completed Статус завершения.
   * @apiSuccess {Boolean} meetings.agendaItems.activeIssue Статус активности вопроса.
   * @apiSuccess {Object[]} meetings.divisions Массив связанных подразделений.
   * @apiSuccess {Number} meetings.divisions.id Идентификатор подразделения.
   * @apiSuccess {String} meetings.divisions.name Название подразделения.
   * @apiSuccess {Object[]} meetings.divisions.users Пользователи подразделения.
   * @apiSuccess {Number} meetings.divisions.users.id Идентификатор пользователя.
   * @apiSuccess {String} meetings.divisions.users.name Имя пользователя.
   * @apiSuccess {String} meetings.divisions.users.email Электронная почта пользователя.
   * @apiError (404) NotFound Ошибка, если пользователь с указанным email не найден.
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Пользователь не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/meetings/active-for-user?email=1@1.ru
   */
  router.get('/active-for-user', async (req, res) => {
    const { email } = req.query;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { division: true },
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const meetings = await prisma.meeting.findMany({
        where: {
          isArchived: false,
        },
        include: {
          divisions: {
            include: { users: true },
          },
        },
      });

      const userMeetings = meetings.filter(meeting =>
        meeting.divisions.some(division => division.id === user.divisionId)
      );

      const meetingsWithAgenda = await Promise.all(
        userMeetings.map(async (meeting) => {
          const agendaItems = await prisma.agendaItem.findMany({
            where: { meetingId: meeting.id },
            include: { speaker: true },
            orderBy: { number: 'asc' },
          });
          return {
            ...meeting,
            agendaItems: agendaItems.map(item => ({
              id: item.id,
              number: item.number,
              title: item.title,
              speaker: item.speaker ? item.speaker.name : 'Нет',
              link: item.link,
              voting: item.voting,
              completed: item.completed,
              activeIssue: item.activeIssue,
            })),
            divisions: meeting.divisions.map(division => ({
              id: division.id,
              name: division.name,
              users: division.users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
              })),
            })),
          };
        })
      );

      console.log('Agenda items response:', JSON.stringify(meetingsWithAgenda, null, 2));
      res.json(meetingsWithAgenda);
    } catch (error) {
      console.error('Ошибка при получении активных заседаний для пользователя:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {get} /api/meetings/:id Получение заседания по идентификатору
   * @apiName ПолучениеЗаседания
   * @apiGroup Заседания
   * @apiDescription Возвращает информацию о конкретном заседании по его идентификатору, включая связанные подразделения и статистику участников. Используется для отображения деталей заседания в интерфейсе.
   * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число, соответствует `id` в таблице `Meeting`).
   * @apiSuccess {Object} meeting Объект заседания.
   * @apiSuccess {Number} meeting.id Идентификатор заседания.
   * @apiSuccess {String} meeting.name Название заседания.
   * @apiSuccess {String} meeting.startTime Дата и время начала в формате ISO.
   * @apiSuccess {String} meeting.endTime Дата и время окончания в формате ISO.
   * @apiSuccess {String} meeting.status Статус заседания (`WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {String} meeting.divisions Названия подразделений, объединённые через запятую, или `"Нет"`.
   * @apiSuccess {Boolean} meeting.isArchived Флаг архивации.
   * @apiSuccess {Number} meeting.participantsOnline Количество участников онлайн (заглушка, всегда 30).
   * @apiSuccess {Number} meeting.participantsTotal Общее количество участников (заглушка, всегда 36).
   * @apiError (404) NotFound Ошибка, если заседание с указанным `id` не найдено.
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Заседание не найдено"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/meetings/119
   */
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: parseInt(id) },
        include: { divisions: true },
      });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      res.json({
        id: meeting.id,
        name: meeting.name,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status: meeting.status,
        divisions: meeting.divisions.map(d => d.name).join(', ') || 'Нет',
        isArchived: meeting.isArchived,
        participantsOnline: 30,
        participantsTotal: 36,
      });
    } catch (error) {
      console.error('Ошибка при получении заседания:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/meetings Создание нового заседания
   * @apiName СозданиеЗаседания
   * @apiGroup Заседания
   * @apiDescription Создаёт новое заседание с указанными параметрами, включая название, даты, подразделения и повестку. Новое заседание получает статус `WAITING` и не архивируется. Используется для планирования новых заседаний в системе.
   * @apiBody {String} name Название заседания (обязательное поле, строка, например, "Совещание по бюджету").
   * @apiBody {String} startTime Дата и время начала заседания (обязательное поле, строка в формате, распознаваемом `Date`, например, "2025-06-03T10:00:00Z").
   * @apiBody {String} endTime Дата и время окончания заседания (обязательное поле, строка в формате, распознаваемом `Date`).
   * @apiBody {Number[]} [divisionIds] Массив идентификаторов подразделений, связанных с заседанием (опционально, массив целых чисел, соответствующих `id` в таблице `Division`).
   * @apiBody {Object[]} [agendaItems] Массив элементов повестки дня (опционально).
   * @apiBody {Number} agendaItems.number Порядковый номер вопроса (целое число).
   * @apiBody {String} agendaItems.title Название вопроса (строка).
   * @apiBody {Number} [agendaItems.speakerId] Идентификатор докладчика (целое число, соответствует `id` в таблице `User`, или `null`).
   * @apiBody {String} [agendaItems.link] Ссылка на материалы вопроса (строка или `null`).
   * @apiSuccess {Object} meeting Созданный объект заседания.
   * @apiSuccess {Number} meeting.id Идентификатор заседания.
   * @apiSuccess {String} meeting.name Название заседания.
   * @apiSuccess {String} meeting.startTime Дата и время начала.
   * @apiSuccess {String} meeting.endTime Дата и время окончания.
   * @apiSuccess {String} meeting.status Статус заседания (`WAITING`).
   * @apiSuccess {Boolean} meeting.isArchived Флаг архивации (`false`).
   * @apiError (400) BadRequest Ошибка, если переданы некорректные данные (например, отсутствуют обязательные поля, невалидные даты, или `divisionIds` не существуют).
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Некорректный формат даты startTime"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST -H "Content-Type: application/json" -d '{"name":"Новое заседание","startTime":"2025-06-03T10:00:00Z","endTime":"2025-06-03T12:00:00Z","divisionIds":[1,2],"agendaItems":[{"number":1,"title":"Вопрос 1","speakerId":26,"link":"https://example.com"}]}' http://217.114.10.226:5000/api/meetings
   */
  router.post('/', async (req, res) => {
    const { name, startTime, endTime, divisionIds, agendaItems } = req.body;
    console.log('Received meeting data:', req.body);
    try {
      const meeting = await prisma.meeting.create({
        data: {
          name,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'WAITING',
          isArchived: false,
          divisions: {
            connect: divisionIds && Array.isArray(divisionIds) ? divisionIds.map(id => ({ id: parseInt(id) })) : [],
          },
          agendaItems: {
            create: agendaItems && Array.isArray(agendaItems) ? agendaItems.map(item => ({
              number: item.number,
              title: item.title,
              speakerId: item.speakerId ? parseInt(item.speakerId) : null,
              link: item.link || null,
              voting: false,
              completed: false,
            })) : [],
          },
        },
      });
      res.json(meeting);
    } catch (error) {
      console.error('Ошибка при создании заседания:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @api {put} /api/meetings/:id Обновление заседания
   * @apiName ОбновлениеЗаседания
   * @apiGroup Заседания
   * @apiDescription Обновляет существующее заседание по его идентификатору, включая название, даты, подразделения, повестку и статус. Удаляет существующие элементы повестки и связанные голоса перед созданием новых. Выполняется в транзакции для обеспечения целостности данных.
   * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
   * @apiBody {String} name Название заседания (обязательное поле, строка).
   * @apiBody {String} startTime Дата и время начала (обязательное поле, строка в формате, распознаваемом `Date`).
   * @apiBody {String} endTime Дата и время окончания (обязательное поле, строка в формате, распознаваемом `Date`).
   * @apiBody {Number[]} [divisionIds] Массив идентификаторов подразделений (опционально, массив целых чисел).
   * @apiBody {Object[]} [agendaItems] Массив элементов повестки дня (опционально).
   * @apiBody {Number} agendaItems.number Порядковый номер вопроса (целое число).
   * @apiBody {String} agendaItems.title Название вопроса (строка).
   * @apiBody {Number} [agendaItems.speakerId] Идентификатор докладчика (целое число или `null`).
   * @apiBody {String} [agendaItems.link] Ссылка на материалы (строка или `null`).
   * @apiBody {String} [status] Статус заседания (опционально, одно из: `WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {Object} meeting Обновлённый объект заседания.
   * @apiSuccess {Number} meeting.id Идентификатор заседания.
   * @apiSuccess {String} meeting.name Название заседания.
   * @apiSuccess {String} meeting.startTime Дата и время начала.
   * @apiSuccess {String} meeting.endTime Дата и время окончания.
   * @apiSuccess {String} meeting.status Статус заседания.
   * @apiSuccess {Boolean} meeting.isArchived Флаг архивации (`false`).
   * @apiSuccess {Object[]} meeting.divisions Массив связанных подразделений.
   * @apiSuccess {Number} meeting.divisions.id Идентификатор подразделения.
   * @apiSuccess {String} meeting.divisions.name Название подразделения.
   * @apiSuccess {Object[]} meeting.agendaItems Массив элементов повестки.
   * @apiSuccess {Number} meeting.agendaItems.id Идентификатор элемента.
   * @apiSuccess {Number} meeting.agendaItems.number Номер вопроса.
   * @apiSuccess {String} meeting.agendaItems.title Название вопроса.
   * @apiSuccess {Number} [meeting.agendaItems.speakerId] Идентификатор докладчика.
   * @apiSuccess {String} [meeting.agendaItems.link] Ссылка на материалы.
   * @apiError (400) BadRequest Ошибка, если отсутствуют обязательные поля, невалидные данные (даты, статус, массивы) или связанные записи не могут быть удалены.
   * @apiError (404) NotFound Ошибка, если заседание не найдено.
   * @apiErrorExample {json} Пример ответа при ошибке (400):
   *     {
   *         "error": "Поля name, startTime и endTime обязательны"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X PUT -H "Content-Type: application/json" -d '{"name":"Обновлённое заседание","startTime":"2025-06-03T10:00:00Z","endTime":"2025-06-03T12:00:00Z","divisionIds":[1],"agendaItems":[{"number":1,"title":"Новый вопрос","speakerId":26}],"status":"IN_PROGRESS"}' http://217.114.10.226:5000/api/meetings/119
   */
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, startTime, endTime, divisionIds, agendaItems, status } = req.body;
    console.log('Received update meeting data:', req.body);
    try {
      // Валидация входных данных
      if (!name || !startTime || !endTime) {
        return res.status(400).json({ error: 'Поля name, startTime и endTime обязательны' });
      }
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Некорректный формат дат startTime или endTime' });
      }
      if (divisionIds && !Array.isArray(divisionIds)) {
        return res.status(400).json({ error: 'divisionIds должен быть массивом' });
      }
      if (agendaItems && !Array.isArray(agendaItems)) {
        return res.status(400).json({ error: 'agendaItems должен быть массивом' });
      }
      if (status && !['WAITING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
        return res.status(400).json({ error: 'Некорректный статус заседания. Допустимые значения: WAITING, IN_PROGRESS, COMPLETED' });
      }

      // Проверка существования заседания
      const meeting = await prisma.meeting.findUnique({ 
        where: { id: parseInt(id) },
        include: { agendaItems: true }
      });
      if (!meeting) {
        return res.status(404).json({ error: 'Заседание не найдено' });
      }

      // Удаление связанных данных и обновление в транзакции
      const updatedMeeting = await prisma.$transaction(async (tx) => {
        // Удаляем VoteResult и Vote для каждого agendaItem
        for (const agendaItem of meeting.agendaItems) {
          await tx.vote.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
          await tx.voteResult.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
        }
        // Удаляем agendaItems
        await tx.agendaItem.deleteMany({
          where: { meetingId: parseInt(id) },
        });
        // Обновляем заседание
        return await tx.meeting.update({
          where: { id: parseInt(id) },
          data: {
            name,
            startTime: startDate,
            endTime: endDate,
            status: status || meeting.status,
            isArchived: false,
            divisions: {
              set: [],
              connect: divisionIds ? divisionIds.map(id => ({ id: parseInt(id) })) : [],
            },
            agendaItems: {
              create: agendaItems ? agendaItems.map(item => ({
                number: item.number,
                title: item.title,
                speakerId: item.speakerId ? parseInt(item.speakerId) : null,
                link: item.link || null,
                voting: false,
                completed: false,
                activeIssue: false,
              })) : [],
            },
          },
          include: { divisions: true, agendaItems: true },
        });
      });

      res.json(updatedMeeting);
    } catch (error) {
      console.error('Ошибка при обновлении заседания:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @api {delete} /api/meetings/:id Удаление заседания
   * @apiName УдалениеЗаседания
   * @apiGroup Заседания
   * @apiDescription Удаляет заседание по его идентификатору, включая все связанные элементы повестки, голоса и результаты голосования. Выполняется в транзакции для обеспечения целостности данных. Используется для удаления ненужных или отменённых заседаний.
   * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном удалении.
   * @apiError (404) NotFound Ошибка, если заседание не найдено.
   * @apiError (400) BadRequest Ошибка, если удаление заблокировано из-за ошибок базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Заседание не найдено"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X DELETE http://217.114.10.226:5000/api/meetings/119
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Deleting meeting ${id}`);
    try {
      const meeting = await prisma.meeting.findUnique({ 
        where: { id: parseInt(id) },
        include: { agendaItems: true }
      });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      await prisma.$transaction(async (prisma) => {
        const agendaItems = meeting.agendaItems;
        for (const agendaItem of agendaItems) {
          await prisma.vote.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
          await prisma.voteResult.deleteMany({
            where: { agendaItemId: agendaItem.id },
          });
        }
        await prisma.agendaItem.deleteMany({
          where: { meetingId: parseInt(id) },
        });
        await prisma.voteResult.deleteMany({
          where: { meetingId: parseInt(id) },
        });
        await prisma.meeting.delete({
          where: { id: parseInt(id) },
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении заседания:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/meetings/:id/archive Архивирование заседания
   * @apiName АрхивированиеЗаседания
   * @apiGroup Заседания
   * @apiDescription Устанавливает флаг архивации (`isArchived: true`) для заседания по его идентификатору. Используется для перемещения завершённых или неактуальных заседаний в архив.
   * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
   * @apiSuccess {Object} meeting Обновлённый объект заседания.
   * @apiSuccess {Number} meeting.id Идентификатор заседания.
   * @apiSuccess {String} meeting.name Название заседания.
   * @apiSuccess {String} meeting.startTime Дата и время начала.
   * @apiSuccess {String} meeting.endTime Дата и время окончания.
   * @apiSuccess {String} meeting.status Статус заседания.
   * @apiSuccess {Boolean} meeting.isArchived Флаг архивации (`true`).
   * @apiError (400) BadRequest Ошибка, если заседание не найдено или обновление невозможно.
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Заседание не найдено"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST http://217.114.10.226:5000/api/meetings/119/archive
   */
  router.post('/:id/archive', async (req, res) => {
    const { id } = req.params;
    try {
      const meeting = await prisma.meeting.update({
        where: { id: parseInt(id) },
        data: { isArchived: true },
      });
      res.json(meeting);
    } catch (error) {
      console.error('Ошибка при архивировании заседания:', error);
      res.status(400).json({ error: error.message });
    }
  });


/**
 * @api {get} /api/meetings/:id/participants Получение списка участников заседания
 * @apiName ПолучениеУчастниковЗаседания
 * @apiGroup Заседания
 * @apiDescription Возвращает список пользователей, участвующих в заседании, на основе связанных подразделений. Включает только идентификатор, имя и статус онлайн/оффлайн.
 * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
 * @apiSuccess {Object[]} participants Массив объектов участников.
 * @apiSuccess {Number} participants.id Идентификатор пользователя.
 * @apiSuccess {String} participants.name Имя пользователя.
 * @apiSuccess {Boolean} participants.isOnline Статус пользователя (true, если онлайн).
 * @apiError (404) NotFound Ошибка, если заседание не найдено.
 * @apiError (500) ServerError Ошибка сервера или базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Заседание не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/meetings/118/participants
 */
router.get('/:id/participants', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            isOnline: true,
          },
        },
      },
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Заседание не найдено' });
    }
    res.json(meeting.participants);
  } catch (error) {
    console.error('Ошибка при получении участников заседания:', error);
    res.status(500).json({ error: 'Не удалось получить участников' });
  }
});









/**
 * @api {get} /api/meetings/:id/total-users Получение общего количества пользователей по подразделениям заседания
 * @apiName ПолучениеОбщегоКоличестваПользователей
 * @apiGroup Заседания
 * @apiDescription Возвращает общее количество пользователей, связанных с подразделениями (divisions) указанного заседания. Используется для отображения итогового числа участников на странице заседания.
 * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
 * @apiSuccess {Object} response Объект с общим количеством пользователей.
 * @apiSuccess {Number} response.totalUsers Общее количество пользователей.
 * @apiError (404) NotFound Ошибка, если заседание не найдено.
 * @apiError (500) ServerError Ошибка сервера или базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Заседание не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/meetings/118/total-users
 */
router.get('/:id/total-users', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) },
      include: { divisions: true },
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const divisionIds = meeting.divisions.map(d => d.id);
    const userCounts = await Promise.all(
      divisionIds.map(async (divisionId) => {
        const count = await prisma.user.count({
          where: { divisionId },
        });
        return count;
      })
    );
    const totalUsers = userCounts.reduce((sum, count) => sum + count, 0);
    res.json({ totalUsers });
  } catch (error) {
    console.error('Ошибка при подсчёте общего количества пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});






/**
 * @api {get} /api/meetings/:id/online-users Получение количества онлайн-пользователей по заседанию
 * @apiName ПолучениеОнлайнПользователей
 * @apiGroup Заседания
 * @apiDescription Возвращает количество пользователей с статусом `isOnline: true`, связанных с подразделениями (divisions) указанного заседания. Используется для отображения текущего числа присутствующих участников.
 * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
 * @apiSuccess {Object} response Объект с количеством онлайн-пользователей.
 * @apiSuccess {Number} response.onlineUsers Количество пользователей онлайн.
 * @apiError (404) NotFound Ошибка, если заседание не найдено.
 * @apiError (500) ServerError Ошибка сервера или базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Заседание не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/meetings/118/online-users
 */
router.get('/:id/online-users', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) },
      include: { divisions: true },
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const divisionIds = meeting.divisions.map(d => d.id);
    const onlineUsers = await prisma.user.count({
      where: {
        divisionId: { in: divisionIds },
        isOnline: true,
      },
    });
    res.json({ onlineUsers });
  } catch (error) {
    console.error('Ошибка при подсчёте онлайн-пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});







/**
 * @api {get} /api/meetings/:id/absent-users Получение списка отсутствующих пользователей по заседанию
 * @apiName ПолучениеОтсутствующихПользователей
 * @apiGroup Заседания
 * @apiDescription Возвращает массив имён пользователей, связанных с подразделениями (divisions) указанного заседания, у которых статус `isOnline: false`. Используется для отображения списка отсутствующих участников.
 * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
 * @apiSuccess {Object} response Объект с массивом имён отсутствующих пользователей.
 * @apiSuccess {String[]} absentUsers Массив имён пользователей с `isOnline: false`.
 * @apiError (404) NotFound Ошибка, если заседание не найдено.
 * @apiError (500) ServerError Ошибка сервера или базы данных.
 * @apiErrorExample {json} Пример ответа при ошибке (404):
 *     {
 *         "error": "Заседание не найдено"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl http://217.114.10.226:5000/api/meetings/118/absent-users
 */
router.get('/:id/absent-users', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) },
      include: { divisions: true },
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const divisionIds = meeting.divisions.map(d => d.id);
    const absentUsers = await prisma.user.findMany({
      where: {
        divisionId: { in: divisionIds },
        isOnline: false,
      },
      select: { name: true },
    });
    res.json({ absentUsers: absentUsers.map(user => user.name) });
  } catch (error) {
    console.error('Ошибка при получении списка отсутствующих пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});















  /**
   * @api {post} /api/meetings/:id/status Обновление статуса заседания
   * @apiName ОбновлениеСтатусаЗаседания
   * @apiGroup Заседания
   * @apiDescription Обновляет статус заседания по его идентификатору. Если статус меняется на `COMPLETED`, все элементы повестки дня помечаются как завершённые (`completed: true`). Отправляет уведомление через канал PostgreSQL `meeting_status_channel`. Используется для управления жизненным циклом заседания.
   * @apiParam {Number} id Идентификатор заседания (параметр пути, целое число).
   * @apiBody {String} status Новый статус заседания (обязательное поле, одно из: `WAITING`, `IN_PROGRESS`, `COMPLETED`).
   * @apiSuccess {Object} meeting Обновлённый объект заседания.
   * @apiSuccess {Number} meeting.id Идентификатор заседания.
   * @apiSuccess {String} meeting.name Название заседания.
   * @apiSuccess {String} meeting.startTime Дата и время начала.
   * @apiSuccess {String} meeting.endTime Дата и время окончания.
   * @apiSuccess {String} meeting.status Новый статус заседания.
   * @apiSuccess {Boolean} meeting.isArchived Флаг архивации.
   * @apiError (400) BadRequest Ошибка, если заседание не найдено, статус некорректен или обновление невозможно.
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Некорректный статус заседания"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST -H "Content-Type: application/json" -d '{"status":"IN_PROGRESS"}' http://217.114.10.226:5000/api/meetings/119/status
   */
  router.post('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const meeting = await prisma.meeting.update({
        where: { id: parseInt(id) },
        data: {
          status,
          agendaItems: status === 'COMPLETED' ? {
            updateMany: {
              where: { meetingId: parseInt(id) },
              data: { completed: true },
            },
          } : undefined,
        },
      });
      await pgClient.query(`NOTIFY meeting_status_channel, '${JSON.stringify({ id: parseInt(id), status })}'`);
      res.json(meeting);
    } catch (error) {
      console.error('Ошибка при обновлении статуса заседания:', error);
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};