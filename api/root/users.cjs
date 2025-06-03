const express = require('express');
const router = express.Router();

/**
 * @api {post} /api/users/:id/disconnect Отключение пользователя
 * @apiName ОтключениеПользователя
 * @apiGroup Пользователи
 * @apiDescription Устанавливает статус пользователя `isOnline` в значение `false`, что означает, что пользователь больше не активен в системе (например, вышел из приложения). Этот маршрут используется для управления состоянием подключения пользователя.
 * @apiParam {Number} id Идентификатор пользователя (параметр пути). Должен быть целым числом, соответствующим записи в таблице `User` базы данных.
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true`, если отключение прошло успешно.
 * @apiSuccess {Object} user Обновлённый объект пользователя.
 * @apiSuccess {Number} user.id Идентификатор пользователя.
 * @apiSuccess {String} user.name Имя пользователя.
 * @apiSuccess {String} user.email Электронная почта пользователя.
 * @apiSuccess {String} [user.phone] Номер телефона пользователя (может быть `null`).
 * @apiSuccess {Boolean} user.isOnline Статус активности пользователя (`false` после отключения).
 * @apiSuccess {Number} [user.divisionId] Идентификатор подразделения, к которому привязан пользователь (может быть `null`).
 * @apiError (400) BadRequest Ошибка, если пользователь с указанным `id` не найден или передан некорректный `id`.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Пользователь не найден"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl -X POST http://217.114.10.226:5000/api/users/26/disconnect
 */
router.post('/:id/disconnect', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await req.prisma.user.update({
      where: { id: parseInt(id) },
      data: { isOnline: false },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Ошибка при отключении пользователя:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {get} /api/users Получение списка всех пользователей
 * @apiName ПолучениеПользователей
 * @apiGroup Пользователи
 * @apiDescription Возвращает список всех пользователей, зарегистрированных в системе, с информацией об их подразделениях. Используется для отображения пользователей в интерфейсе администратора или для анализа данных.
 * @apiSuccess {Object[]} users Массив объектов пользователей.
 * @apiSuccess {Number} users.id Идентификатор пользователя.
 * @apiSuccess {String} users.name Имя пользователя.
 * @apiSuccess {String} users.email Электронная почта пользователя.
 * @apiSuccess {String} [users.phone] Номер телефона пользователя (может быть `null`).
 * @apiSuccess {String} users.division Название подразделения, к которому привязан пользователь, или строка `"Нет"`, если подразделение не указано.
 * @apiSuccess {Boolean} users.isOnline Статус активности пользователя (`true` — онлайн, `false` — оффлайн).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Внутренняя ошибка сервера"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl http://217.114.10.226:5000/api/users
 */
router.get('/', async (req, res) => {
  try {
    const users = await req.prisma.user.findMany({
      include: { division: true },
    });
    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      division: user.division ? user.division.name : 'Нет',
      isOnline: user.isOnline
    })));
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/users Создание нового пользователя
 * @apiName СозданиеПользователя
 * @apiGroup Пользователи
 * @apiDescription Создаёт нового пользователя в системе с указанными данными. Используется для регистрации новых участников системы, таких как сотрудники или члены организации. Обязательные поля: `name`, `email`, `password`.
 * @apiBody {String} name Имя пользователя (например, "Иван Иванов").
 * @apiBody {String} email Уникальный адрес электронной почты пользователя (например, "ivan@example.com").
 * @apiBody {String} [phone] Номер телефона пользователя (опционально, может быть `null`).
 * @apiBody {Number} [divisionId] Идентификатор подразделения, к которому привязан пользователь (опционально, целое число или `null`).
 * @apiBody {String} password Пароль пользователя (хранится в зашифрованном виде в базе данных).
 * @apiSuccess {Object} user Созданный объект пользователя.
 * @apiSuccess {Number} user.id Идентификатор пользователя.
 * @apiSuccess {String} user.name Имя пользователя.
 * @apiSuccess {String} user.email Электронная почта пользователя.
 * @apiSuccess {String} [user.phone] Номер телефона пользователя.
 * @apiSuccess {Number} [user.divisionId] Идентификатор подразделения.
 * @apiError (400) BadRequest Ошибка, если переданы некорректные данные (например, email уже существует, отсутствует обязательное поле или `divisionId` невалиден).
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Электронная почта уже существует"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl -X POST -H "Content-Type: application/json" -d '{"name":"Иван Иванов","email":"ivan@example.com","phone":"1234567890","divisionId":1,"password":"secure123"}' http://217.114.10.226:5000/api/users
 */
router.post('/', async (req, res) => {
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await req.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password,
        divisionId: divisionId ? parseInt(divisionId) : null,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/users/:id Обновление данных пользователя
 * @apiName ОбновлениеПользователя
 * @apiGroup Пользователи
 * @apiDescription Обновляет данные существующего пользователя по его идентификатору. Позволяет изменить имя, email, телефон, подразделение или пароль. Все поля опциональны, обновляются только переданные в теле запроса.
 * @apiParam {Number} id Идентификатор пользователя (параметр пути). Должен быть целым числом, соответствующим записи в таблице `User`.
 * @apiBody {String} [name] Новое имя пользователя (опционально).
 * @apiBody {String} [email] Новый адрес электронной почты (опционально, должен быть уникальным).
 * @apiBody {String} [phone] Новый номер телефона (опционально, может быть `null`).
 * @apiBody {Number} [divisionId] Новый идентификатор подразделения (опционально, целое число или `null`).
 * @apiBody {String} [password] Новый пароль пользователя (опционально).
 * @apiSuccess {Object} user Обновлённый объект пользователя.
 * @apiSuccess {Number} user.id Идентификатор пользователя.
 * @apiSuccess {String} user.name Имя пользователя.
 * @apiSuccess {String} user.email Электронная почта пользователя.
 * @apiSuccess {String} [user.phone] Номер телефона пользователя.
 * @apiSuccess {Number} [user.divisionId] Идентификатор подразделения.
 * @apiError (400) BadRequest Ошибка, если пользователь с указанным `id` не найден, переданы некорректные данные (например, email уже используется) или `divisionId` невалиден.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Пользователь не найден"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl -X PUT -H "Content-Type: application/json" -d '{"name":"Иван Петров","email":"petrov@example.com"}' http://217.114.10.226:5000/api/users/26
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await req.prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone,
        divisionId: divisionId ? parseInt(divisionId) : null,
        password: password || undefined,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/users/:id Удаление пользователя
 * @apiName УдалениеПользователя
 * @apiGroup Пользователи
 * @apiDescription Удаляет пользователя из системы по его идентификатору. Используется для удаления учётной записи, например, при увольнении сотрудника или исключении участника.
 * @apiParam {Number} id Идентификатор пользователя (параметр пути). Должен быть целым числом, соответствующим записи в таблице `User`.
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true`, если пользователь успешно удалён.
 * @apiError (400) BadRequest Ошибка, если пользователь с указанным `id` не найден.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Пользователь не найден"
 *     }
 * @apiExample {curl} Пример использования:
 *     curl -X DELETE http://217.114.10.226:5000/api/users/26
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = (prisma) => {
  router.prisma = prisma;
  return router;
};