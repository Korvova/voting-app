const express = require('express');
const router = express.Router();

// Calculate decision function
/**
 * Вычисляет решение для результата голосования на основе процедуры голосования.
 * @param {Object} prisma - Экземпляр PrismaClient для доступа к базе данных.
 * @param {Number} voteResultId - Идентификатор результата голосования.
 * @returns {Promise<String>} - Решение голосования (например, "Принято" или "Не принято").
 * @throws {Error} - Если результат голосования, процедура или условия некорректны.
 */
const calculateDecision = async (prisma, voteResultId) => {
  try {
    console.log('Calculating decision for voteResultId:', voteResultId);

    const voteResult = await prisma.voteResult.findUnique({
      where: { id: Number(voteResultId) },
      include: { meeting: { include: { divisions: true } } },
    });
    if (!voteResult) {
      throw new Error('VoteResult not found');
    }

    const meetingId = voteResult.meetingId;
    const votesFor = voteResult.votesFor;
    const votesAgainst = voteResult.votesAgainst;
    const votesAbstain = voteResult.votesAbstain;
    const votesAbsent = voteResult.votesAbsent;
    const procedureId = voteResult.procedureId;

    const participants = await prisma.user.findMany({
      where: {
        divisionId: { in: voteResult.meeting.divisions ? voteResult.meeting.divisions.map(d => d.id) : [] },
        isAdmin: false,
      },
    });
    const totalParticipants = participants.length;

    const onlineParticipants = await prisma.user.findMany({
      where: {
        divisionId: { in: voteResult.meeting.divisions ? voteResult.meeting.divisions.map(d => d.id) : [] },
        isAdmin: false,
        isOnline: true,
      },
    });
    const totalOnlineParticipants = onlineParticipants.length;

    const totalVotes = votesFor + votesAgainst + votesAbstain + votesAbsent;
    if (totalVotes > totalParticipants) {
      throw new Error(`Total votes (${totalVotes}) cannot exceed total participants (${totalParticipants})`);
    }

    const procedure = await prisma.voteProcedure.findUnique({
      where: { id: procedureId },
    });
    if (!procedure) {
      throw new Error('Procedure not found');
    }

    const conditions = procedure.conditions;
    const resultIfTrue = procedure.resultIfTrue;
    console.log('Extracted procedure data:', { conditions, resultIfTrue });

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      throw new Error('Procedure conditions are invalid or empty');
    }

    const totalVotesCount = votesFor + votesAgainst + votesAbstain;

    console.log('Prepared data:', { totalParticipants, totalOnlineParticipants, totalVotes: totalVotesCount, votesFor, votesAgainst, votesAbstain, votesAbsent });

    const evaluateExpression = (elements) => {
      const stack = [];
      const operators = [];

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const value = typeof element === 'string' ? element : element.value;
        const type = typeof element === 'string' ? 'select' : element.type;

        if (value === '(') {
          operators.push(value);
        } else if (value === ')') {
          while (operators.length > 0 && operators[operators.length - 1] !== '(') {
            const op = operators.pop();
            if (['И', 'Или', 'Иначе', 'Кроме', 'AND', 'OR'].includes(op)) {
              const b = stack.pop();
              const a = stack.pop();
              if (op === 'И' || op === 'AND') stack.push(a && b);
              else if (op === 'Или' || op === 'OR') stack.push(a || b);
              else if (op === 'Иначе') stack.push(a !== b);
              else if (op === 'Кроме') stack.push(a && !b);
            } else if (['>', '<', '>=', '<=', '='].includes(op)) {
              const b = stack.pop();
              const a = stack.pop();
              if (op === '>') stack.push(a > b);
              else if (op === '>=') stack.push(a >= b);
              else if (op === '<') stack.push(a < b);
              else if (op === '<=') stack.push(a <= b);
              else if (op === '=') stack.push(a == b);
            } else {
              const b = stack.pop();
              const a = stack.pop();
              if (op === '*') stack.push(a * b);
              else if (op === '+') stack.push(a + b);
              else if (op === '-') stack.push(a - b);
              else if (op === '/') stack.push(a / b);
            }
          }
          operators.pop();
        } else if (['И', 'Или', 'Иначе', 'Кроме', 'AND', 'OR', '>', '<', '>=', '<=', '=', '*', '+', '-', '/'].includes(value)) {
          while (
            operators.length > 0 &&
            operators[operators.length - 1] !== '(' &&
            (
              (['И', 'Или', 'Иначе', 'Кроме', 'AND', 'OR'].includes(value) && ['>', '<', '>=', '<=', '=', '*', '+', '-', '/'].includes(operators[operators.length - 1])) ||
              (['>', '<', '>=', '<=', '='].includes(value) && ['*', '+', '-', '/'].includes(operators[operators.length - 1]))
            )
          ) {
            const op = operators.pop();
            if (['И', 'Или', 'Иначе', 'Кроме', 'AND', 'OR'].includes(op)) {
              const b = stack.pop();
              const a = stack.pop();
              if (op === 'И' || op === 'AND') stack.push(a && b);
              else if (op === 'Или' || op === 'OR') stack.push(a || b);
              else if (op === 'Иначе') stack.push(a !== b);
              else if (op === 'Кроме') stack.push(a && !b);
            } else if (['>', '<', '>=', '<=', '='].includes(op)) {
              const b = stack.pop();
              const a = stack.pop();
              if (op === '>') stack.push(a > b);
              else if (op === '>=') stack.push(a >= b);
              else if (op === '<') stack.push(a < b);
              else if (op === '<=') stack.push(a <= b);
              else if (op === '=') stack.push(a === b);
            } else {
              const b = stack.pop();
              const a = stack.pop();
              if (op === '*') stack.push(a * b);
              else if (op === '+') stack.push(a + b);
              else if (op === '-') stack.push(a - b);
              else if (op === '/') stack.push(a / b);
            }
          }
          operators.push(value);
        } else {
          let numValue;
          if (value === 'Все пользователи заседания') {
            numValue = totalParticipants;
          } else if (value === 'Все пользователи онлайн') {
            numValue = totalOnlineParticipants;
          } else if (value === 'Всего голосов') {
            numValue = totalVotesCount;
          } else if (value === 'За') {
            numValue = votesFor;
          } else if (value === 'Против') {
            numValue = votesAgainst;
          } else if (value === 'Воздержались') {
            numValue = votesAbstain;
          } else if (value === 'Не голосовали') {
            numValue = votesAbsent;
          } else if (type === 'input') {
            numValue = parseFloat(value);
          }
          stack.push(numValue);
        }
      }

      while (operators.length > 0) {
        const op = operators.pop();
        if (op === '(') continue;
        if (['И', 'Или', 'Иначе', 'Кроме', 'AND', 'OR'].includes(op)) {
          const b = stack.pop();
          const a = stack.pop();
          if (op === 'И' || op === 'AND') stack.push(a && b);
          else if (op === 'Или' || op === 'OR') stack.push(a || b);
          else if (op === 'Иначе') stack.push(a !== b);
          else if (op === 'Кроме') stack.push(a && !b);
        } else if (['>', '<', '>=', '<=', '='].includes(op)) {
          const b = stack.pop();
          const a = stack.pop();
          if (op === '>') stack.push(a > b);
          else if (op === '>=') stack.push(a >= b);
          else if (op === '<') stack.push(a < b);
          else if (op === '<=') stack.push(a <= b);
          else if (op === '=') stack.push(a === b);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          if (op === '*') stack.push(a * b);
          else if (op === '+') stack.push(a + b);
          else if (op === '-') stack.push(a - b);
          else if (op === '/') stack.push(a / b);
        }
      }

      return stack.pop();
    };

    let finalConditionMet = true;

    for (let blockIndex = 0; blockIndex < conditions.length; blockIndex++) {
      const conditionBlock = conditions[blockIndex];
      const elements = conditionBlock.elements;
      console.log('Extracted elements:', elements);

      let condition1Met = evaluateExpression(elements);
      console.log('Condition 1 result:', condition1Met);

      let condition2Met = true;
      if (conditionBlock.operator && conditionBlock.elements2) {
        const elements2 = conditionBlock.elements2;
        console.log('Extracted elements2:', elements2);
        condition2Met = evaluateExpression(elements2);
        console.log('Condition 2 result:', condition2Met);

        if (conditionBlock.operator === "И" || conditionBlock.operator === "AND") {
          condition1Met = condition1Met && condition2Met;
        } else if (conditionBlock.operator === "Или" || conditionBlock.operator === "OR") {
          condition1Met = condition1Met || condition2Met;
        } else if (conditionBlock.operator === "Иначе") {
          condition1Met = condition1Met !== condition2Met;
        } else if (conditionBlock.operator === "Кроме") {
          condition1Met = condition1Met && !condition2Met;
        }
      }

      if (blockIndex === 0) {
        finalConditionMet = condition1Met;
      } else {
        const prevOperator = conditions[blockIndex - 1].operator;
        if (prevOperator === "И" || prevOperator === "AND") {
          finalConditionMet = finalConditionMet && condition1Met;
        } else if (prevOperator === "Или" || prevOperator === "OR") {
          finalConditionMet = finalConditionMet || condition1Met;
        } else if (prevOperator === "Иначе") {
          finalConditionMet = finalConditionMet !== condition1Met;
        } else if (prevOperator === "Кроме") {
          finalConditionMet = finalConditionMet && !condition1Met;
        }
      }
    }

    const decision = finalConditionMet ? resultIfTrue : (resultIfTrue === "Принято" ? "Не принято" : "Принято");
    console.log('Computed decision:', decision);

    return decision;
  } catch (error) {
    console.error('Ошибка при вычислении решения:', error.message);
    throw error;
  }
};

module.exports = (prisma, pgClient) => {
  /**
   * @api {post} /api/vote Запись голоса пользователя
   * @apiName ЗаписьГолоса
   * @apiGroup Голосование
   * @apiDescription Регистрирует голос пользователя для указанного элемента повестки дня. Обновляет соответствующий результат голосования и отправляет уведомление через канал `vote_result_channel`. Используется для фиксации выбора пользователя в голосовании.
   * @apiBody {String} userId Электронная почта пользователя (обязательное поле, например, "user@example.com").
   * @apiBody {Number} agendaItemId Идентификатор элемента повестки дня (обязательное поле, целое число, соответствует `id` в таблице `AgendaItem`).
   * @apiBody {String} choice Выбор пользователя (обязательное поле, одно из: `FOR`, `AGAINST`, `ABSTAIN`).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешной записи голоса.
   * @apiSuccess {Object} vote Объект созданного голоса.
   * @apiSuccess {Number} vote.id Идентификатор голоса.
   * @apiSuccess {Number} vote.userId Идентификатор пользователя.
   * @apiSuccess {Number} vote.agendaItemId Идентификатор элемента повестки.
   * @apiSuccess {String} vote.choice Выбор пользователя.
   * @apiSuccess {Date} vote.createdAt Дата и время создания голоса.
   * @apiError (400) BadRequest Ошибка, если переданы некорректные данные (например, неверный `choice`).
   * @apiError (404) NotFound Ошибка, если пользователь или элемент повестки не найдены.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Пользователь не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST -H "Content-Type: application/json" -d '{"userId":"1@1.ru","agendaItemId":576,"choice":"FOR"}' http://217.114.10.226:5000/api/vote
   */
  router.post('/vote', async (req, res) => {
    const { userId, agendaItemId, choice } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const vote = await prisma.vote.create({
        data: {
          userId: user.id,
          agendaItemId: parseInt(agendaItemId),
          choice,
        },
      });

      const voteResult = await prisma.voteResult.findFirst({
        where: { agendaItemId: parseInt(agendaItemId) },
        orderBy: { createdAt: 'desc' },
      });
      if (voteResult) {
        const updatedVoteResult = await prisma.voteResult.update({
          where: { id: voteResult.id },
          data: {
            votesFor: choice === 'FOR' ? voteResult.votesFor + 1 : voteResult.votesFor,
            votesAgainst: choice === 'AGAINST' ? voteResult.votesAgainst + 1 : voteResult.votesAgainst,
            votesAbstain: choice === 'ABSTAIN' ? voteResult.votesAbstain + 1 : voteResult.votesAbstain,
            votesAbsent: voteResult.votesAbsent > 0 ? voteResult.votesAbsent - 1 : 0,
          },
        });
        const payload = {
          ...updatedVoteResult,
          createdAt: updatedVoteResult.createdAt instanceof Date 
            ? updatedVoteResult.createdAt.toISOString()
            : updatedVoteResult.createdAt,
        };
        console.log('Payload for NOTIFY:', payload);
        await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
        res.json({ success: true, vote });
      } else {
        res.json({ success: true, vote });
      }
    } catch (error) {
      console.error('Ошибка при записи голоса:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/vote-by-result Запись голоса по идентификатору результата голосования
   * @apiName ЗаписьГолосаПоРезультату
   * @apiGroup Голосование
   * @apiDescription Регистрирует или обновляет голос пользователя для указанного результата голосования. Выполняется в транзакции для обеспечения целостности данных. Обновляет статистику голосов и отправляет уведомление через канал `vote_result_channel`. Используется для фиксации или изменения выбора пользователя в голосовании.
   * @apiBody {String} userId Электронная почта пользователя (обязательное поле).
   * @apiBody {Number} voteResultId Идентификатор результата голосования (обязательное поле, целое число, соответствует `id` в таблице `VoteResult`).
   * @apiBody {String} choice Выбор пользователя (обязательное поле, одно из: `FOR`, `AGAINST`, `ABSTAIN`).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешной записи.
   * @apiSuccess {Object} vote Объект созданного или обновлённого голоса.
   * @apiSuccess {Number} vote.id Идентификатор голоса.
   * @apiSuccess {Number} vote.userId Идентификатор пользователя.
   * @apiSuccess {Number} vote.agendaItemId Идентификатор элемента повестки.
   * @apiSuccess {Number} vote.voteResultId Идентификатор результата голосования.
   * @apiSuccess {String} vote.choice Выбор пользователя.
   * @apiSuccess {Date} vote.createdAt Дата и время создания или обновления голоса.
   * @apiError (400) BadRequest Ошибка, если переданы некорректные данные.
   * @apiError (404) NotFound Ошибка, если пользователь или результат голосования не найдены.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Результат голосования не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST -H "Content-Type: application/json" -d '{"userId":"1@1.ru","voteResultId":1,"choice":"FOR"}' http://217.114.10.226:5000/api/vote-by-result
   */
  router.post('/vote-by-result', async (req, res) => {
    const { userId, voteResultId, choice } = req.body;
    try {
      if (!userId || !voteResultId || !['FOR', 'AGAINST', 'ABSTAIN'].includes(choice)) {
        return res.status(400).json({ error: 'Invalid request data: userId, voteResultId, and valid choice are required' });
      }

      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const voteResult = await prisma.voteResult.findUnique({
        where: { id: parseInt(voteResultId) },
        include: { agendaItem: { include: { meeting: { include: { divisions: true } } } } },
      });
      if (!voteResult) {
        return res.status(404).json({ error: 'Vote result not found' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingVote = await tx.vote.findFirst({
          where: {
            userId: user.id,
            voteResultId: parseInt(voteResultId),
          },
        });

        let vote;
        if (existingVote) {
          vote = await tx.vote.update({
            where: { id: existingVote.id },
            data: {
              choice,
              createdAt: new Date(),
            },
          });
        } else {
          vote = await tx.vote.create({
            data: {
              userId: user.id,
              agendaItemId: voteResult.agendaItemId,
              voteResultId: parseInt(voteResultId),
              choice,
              createdAt: new Date(),
            },
          });
        }

        const votes = await tx.vote.findMany({
          where: { voteResultId: parseInt(voteResultId) },
        });

        const participants = await tx.user.findMany({
          where: {
            divisionId: { in: voteResult.agendaItem.meeting.divisions.map(d => d.id) },
            isAdmin: false,
          },
        });

        const votesFor = votes.filter(v => v.choice === 'FOR').length;
        const votesAgainst = votes.filter(v => v.choice === 'AGAINST').length;
        const votesAbstain = votes.filter(v => v.choice === 'ABSTAIN').length;
        const votedUserIds = [...new Set(votes.map(v => v.userId))];
        const votesAbsent = participants.length - votedUserIds.length;

        const updatedVoteResult = await tx.voteResult.update({
          where: { id: voteResult.id },
          data: {
            votesFor,
            votesAgainst,
            votesAbstain,
            votesAbsent,
          },
        });

        return { vote, updatedVoteResult };
      });

      const payload = {
        ...result.updatedVoteResult,
        createdAt: result.updatedVoteResult.createdAt instanceof Date 
          ? result.updatedVoteResult.createdAt.toISOString()
          : result.updatedVoteResult.createdAt,
      };
      console.log('Payload for NOTIFY:', payload);
      await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
      res.json({ success: true, vote: result.vote });
    } catch (error) {
      console.error('Ошибка при записи голоса:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @api {get} /api/vote-results/:agendaItemId Получение результата голосования по элементу повестки
   * @apiName ПолучениеРезультатаГолосования
   * @apiGroup Голосование
   * @apiDescription Возвращает последний результат голосования для указанного элемента повестки дня. Используется для отображения текущей статистики голосования.
   * @apiParam {Number} agendaItemId Идентификатор элемента повестки (параметр пути, целое число).
   * @apiSuccess {Object} voteResult Объект результата голосования.
   * @apiSuccess {Number} voteResult.id Идентификатор результата.
   * @apiSuccess {Number} voteResult.agendaItemId Идентификатор элемента повестки.
   * @apiSuccess {Number} [voteResult.meetingId] Идентификатор заседания.
   * @apiSuccess {String} voteResult.question Вопрос голосования.
   * @apiSuccess {Number} voteResult.votesFor Количество голосов "За".
   * @apiSuccess {Number} voteResult.votesAgainst Количество голосов "Против".
   * @apiSuccess {Number} voteResult.votesAbstain Количество голосов "Воздержались".
   * @apiSuccess {Number} voteResult.votesAbsent Количество не проголосовавших.
   * @apiSuccess {Date} voteResult.createdAt Дата и время создания.
   * @apiSuccess {Number} [voteResult.duration] Длительность голосования (в секундах).
   * @apiSuccess {String} voteResult.voteStatus Статус голосования (`PENDING`, `ENDED`, `APPLIED`, `CANCELLED`).
   * @apiSuccess {Number} [voteResult.procedureId] Идентификатор процедуры голосования.
   * @apiSuccess {String} [voteResult.decision] Решение голосования (например, "Принято").
   * @apiSuccess {String} voteResult.voteType Тип голосования (`OPEN` или `CLOSED`).
   * @apiError (404) NotFound Ошибка, если результат голосования не найден.
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Результат голосования не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/vote-results/576
   */
  router.get('/vote-results/:agendaItemId', async (req, res) => {
    const { agendaItemId } = req.params;
    try {
      const voteResult = await prisma.voteResult.findFirst({
        where: { agendaItemId: parseInt(agendaItemId) },
        orderBy: { createdAt: 'desc' },
      });
      if (!voteResult) {
        return res.status(404).json({ error: 'Vote result not found' });
      }
      res.json(voteResult);
    } catch (error) {
      console.error('Ошибка при получении результата голосования:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {get} /api/vote-results Получение всех результатов голосования
   * @apiName ПолучениеВсехРезультатовГолосования
   * @apiGroup Голосование
   * @apiDescription Возвращает список всех результатов голосования, с возможной фильтрацией по идентификатору заседания. Используется для анализа или отображения истории голосований.
   * @apiQuery {Number} [meetingId] Идентификатор заседания для фильтрации (опционально, целое число).
   * @apiSuccess {Object[]} voteResults Массив объектов результатов голосования.
   * @apiSuccess {Number} voteResults.id Идентификатор результата.
   * @apiSuccess {Number} voteResults.agendaItemId Идентификатор элемента повестки.
   * @apiSuccess {Number} [voteResults.meetingId] Идентификатор заседания.
   * @apiSuccess {String} voteResults.question Вопрос голосования.
   * @apiSuccess {Number} voteResults.votesFor Количество голосов "За".
   * @apiSuccess {Number} voteResults.votesAgainst Количество голосов "Против".
   * @apiSuccess {Number} voteResults.votesAbstain Количество голосов "Воздержались".
   * @apiSuccess {Number} voteResults.votesAbsent Количество не проголосовавших.
   * @apiSuccess {Date} voteResults.createdAt Дата и время создания.
   * @apiSuccess {Number} [voteResults.duration] Длительность голосования (в секундах).
   * @apiSuccess {String} voteResults.voteStatus Статус голосования.
   * @apiSuccess {Number} [voteResults.procedureId] Идентификатор процедуры голосования.
   * @apiSuccess {String} [voteResults.decision] Решение голосования.
   * @apiSuccess {String} voteResults.voteType Тип голосования (`OPEN` или `CLOSED`).
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке:
   *     {
   *         "error": "Внутренняя ошибка сервера"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl http://217.114.10.226:5000/api/vote-results?meetingId=119
   */
  router.get('/vote-results', async (req, res) => {
    const { meetingId } = req.query;
    try {
      const voteResults = await prisma.voteResult.findMany({
        where: meetingId ? { meetingId: parseInt(meetingId) } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      res.json(voteResults);
    } catch (error) {
      console.error('Ошибка при получении всех результатов голосования:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/vote-results/:id/apply Применение результата голосования
   * @apiName ПрименениеРезультатаГолосования
   * @apiGroup Голосование
   * @apiDescription Применяет результат голосования, устанавливая его статус в `APPLIED` и завершая голосование для связанного элемента повестки (`voting: false`). Отправляет уведомление через канал `vote_result_channel`. Используется для фиксации итогов голосования.
   * @apiParam {Number} id Идентификатор результата голосования (параметр пути, целое число).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном применении.
   * @apiError (404) NotFound Ошибка, если результат голосования не найден.
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Результат голосования не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST http://217.114.10.226:5000/api/vote-results/1/apply
   */
  router.post('/vote-results/:id/apply', async (req, res) => {
    const { id } = req.params;
    try {
      const voteResult = await prisma.voteResult.findUnique({
        where: { id: parseInt(id) },
      });
      if (!voteResult) {
        return res.status(404).json({ error: 'Vote result not found' });
      }

      await prisma.agendaItem.update({
        where: { id: voteResult.agendaItemId },
        data: { voting: false },
      });

      const updatedVoteResult = await prisma.voteResult.update({
        where: { id: parseInt(id) },
        data: { voteStatus: 'APPLIED' },
      });

      const payload = {
        ...updatedVoteResult,
        createdAt: updatedVoteResult.createdAt instanceof Date 
          ? updatedVoteResult.createdAt.toISOString()
          : updatedVoteResult.createdAt,
      };
      console.log('Payload for NOTIFY:', payload);
      await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при применении результата голосования:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/vote-results/:id/cancel Отмена результата голосования
   * @apiName ОтменаРезультатаГолосования
   * @apiGroup Голосование
   * @apiDescription Отменяет результат голосования, устанавливая его статус в `CANCELLED` и завершая голосование для связанного элемента повестки (`voting: false`). Отправляет уведомление через канал `vote_result_channel`. Используется для аннулирования голосования.
   * @apiParam {Number} id Идентификатор результата голосования (параметр пути, целое число).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешной отмене.
   * @apiError (404) NotFound Ошибка, если результат голосования не найден.
   * @apiError (500) ServerError Ошибка сервера или базы данных.
   * @apiErrorExample {json} Пример ответа при ошибке (404):
   *     {
   *         "error": "Результат голосования не найден"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST http://217.114.10.226:5000/api/vote-results/1/cancel
   */
  router.post('/vote-results/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
      const voteResult = await prisma.voteResult.findUnique({
        where: { id: parseInt(id) },
        include: { agendaItem: true },
      });
      if (!voteResult) {
        return res.status(404).json({ error: 'Vote result not found' });
      }

      await prisma.agendaItem.update({
        where: { id: voteResult.agendaItemId },
        data: { voting: false },
      });

      const updatedVoteResult = await prisma.voteResult.update({
        where: { id: parseInt(id) },
        data: { voteStatus: 'CANCELLED' },
      });

      const payload = {
        ...updatedVoteResult,
        createdAt: updatedVoteResult.createdAt.toISOString(),
      };
      await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при отмене результата голосования:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @api {post} /api/calculate-decision Вычисление решения голосования
   * @apiName ВычислениеРешенияГолосования
   * @apiGroup Голосование
   * @apiDescription Вычисляет решение для результата голосования на основе связанной процедуры голосования. Используется для определения итогов голосования (например, "Принято" или "Не принято").
   * @apiBody {Number} voteResultId Идентификатор результата голосования (обязательное поле, целое число).
   * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном вычислении.
   * @apiSuccess {String} decision Решение голосования (например, "Принято" или "Не принято").
   * @apiError (400) BadRequest Ошибка, если `voteResultId` отсутствует или некорректен.
   * @apiError (404) NotFound Ошибка, если результат голосования или процедура не найдены.
   * @apiErrorExample {json} Пример ответа при ошибке (400):
   *     {
   *         "error": "Неверные данные запроса: voteResultId обязателен"
   *     }
   * @apiExample {curl} Пример запроса:
   *     curl -X POST -H "Content-Type: application/json" -d '{"voteResultId":1}' http://217.114.10.226:5000/api/calculate-decision
   */
  router.post('/calculate-decision', async (req, res) => {
    const { voteResultId } = req.body;
    try {
      console.log('Received calculate-decision request data:', { voteResultId });

      if (!voteResultId) {
        throw new Error('Invalid request data: voteResultId is required');
      }

      const decision = await calculateDecision(prisma, voteResultId);
      res.json({ success: true, decision });
    } catch (error) {
      console.error('Ошибка при вычислении решения:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   /**
 * @api {post} /api/start-vote Запуск нового голосования
 * @apiName ЗапускГолосования
 * @apiGroup Голосование
 * @apiDescription Запускает новое голосование для указанного элемента повестки с заданным вопросом, длительностью и процедурой. Устанавливает `voting: true` для элемента повестки, создаёт результат голосования со статусом `PENDING` и отправляет уведомление через канал `vote_result_channel`. По истечении длительности голосование завершается, вычисляется решение, и отправляется уведомление со статусом `ENDED`. Если `procedureId` не указан, используется значение по умолчанию `10`, что может вызвать ошибку, если процедура с таким ID отсутствует.
 * @apiBody {Number} agendaItemId Идентификатор элемента повестки (обязательное поле, целое число).
 * @apiBody {String} question Вопрос голосования (обязательное поле, строка, например, "Утвердить бюджет?").
 * @apiBody {Number} duration Длительность голосования в секундах (обязательное поле, положительное целое число).
 * @apiBody {Number} [procedureId] Идентификатор процедуры голосования (опционально, целое число, по умолчанию `10`, если не указано; должно существовать в таблице `VoteProcedure`).
 * @apiBody {String} [voteType] Тип голосования (опционально, одно из: `OPEN`, `CLOSED`, по умолчанию `OPEN`).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном запуске.
 * @apiSuccess {Object} voteResult Созданный объект результата голосования.
 * @apiSuccess {Number} voteResult.id Идентификатор результата.
 * @apiSuccess {Number} voteResult.agendaItemId Идентификатор элемента повестки.
 * @apiSuccess {Number} voteResult.meetingId Идентификатор заседания.
 * @apiSuccess {String} voteResult.question Вопрос голосования.
 * @apiSuccess {Number} voteResult.votesFor Количество голосов "За" (0).
 * @apiSuccess {Number} voteResult.votesAgainst Количество голосов "Против" (0).
 * @apiSuccess {Number} voteResult.votesAbstain Количество голосов "Воздержались" (0).
 * @apiSuccess {Number} voteResult.votesAbsent Количество не проголосовавших (равно числу участников).
 * @apiSuccess {Date} voteResult.createdAt Дата и время создания.
 * @apiSuccess {Number} voteResult.duration Длительность голосования.
 * @apiSuccess {String} voteResult.voteStatus Статус голосования (`PENDING`).
 * @apiSuccess {Number} voteResult.procedureId Идентификатор процедуры.
 * @apiSuccess {String} voteResult.voteType Тип голосования.
 * @apiError (400) BadRequest Ошибка, если отсутствуют обязательные поля, данные некорректны, элемент повестки не найден, или процедура с `procedureId=10` (по умолчанию) отсутствует.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "success": false,
 *         "error": "Неверные данные запроса: agendaItemId, question и duration (положительное число) обязательны"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -H "Content-Type: application/json" -d '{"agendaItemId":576,"question":"Утвердить бюджет?","duration":300,"procedureId":10,"voteType":"OPEN"}' http://217.114.10.226:5000/api/start-vote
 */
router.post('/start-vote', async (req, res) => {
  const { agendaItemId, question, duration, procedureId, voteType } = req.body;
  try {
    console.log('Received start-vote request data:', { agendaItemId, question, duration, procedureId, voteType });

    if (!agendaItemId || !question || !duration || isNaN(duration) || duration <= 0) {
      throw new Error('Invalid request data: agendaItemId, question, and duration (positive number) are required');
    }

    const validVoteTypes = ['OPEN', 'CLOSED'];
    const finalVoteType = voteType && validVoteTypes.includes(voteType) ? voteType : 'OPEN';

    const finalProcedureId = procedureId ? parseInt(procedureId) : 10;

    const durationInMs = duration * 1000;
    const createdAt = new Date();

    const agendaItem = await prisma.agendaItem.findUnique({
      where: { id: Number(agendaItemId) },
      include: { 
        meeting: { 
          include: { divisions: true }
        }
      },
    });
    if (!agendaItem) {
      throw new Error('Agenda item not found');
    }
    if (!agendaItem.meeting) {
      throw new Error('Associated meeting not found for the agenda item');
    }

    await prisma.agendaItem.update({
      where: { id: Number(agendaItemId) },
      data: { voting: true },
    });

    const participants = await prisma.user.findMany({
      where: {
        divisionId: { in: agendaItem.meeting.divisions ? agendaItem.meeting.divisions.map(d => d.id) : [] },
        isAdmin: false,
      },
    });

    const voteResult = await prisma.voteResult.create({
      data: {
        agendaItemId: Number(agendaItemId),
        meetingId: agendaItem.meetingId,
        question,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        votesAbsent: participants.length,
        createdAt,
        duration,
        voteStatus: 'PENDING',
        procedureId: finalProcedureId,
        voteType: finalVoteType,
      },
    });

    const payload = {
      ...voteResult,
      duration,
      createdAt: createdAt.toISOString(),
      voteStatus: 'PENDING',
    };
    await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(payload)}'`);

    setTimeout(async () => {
      const finalVoteResult = await prisma.voteResult.findFirst({
        where: { agendaItemId: Number(agendaItemId) },
        orderBy: { createdAt: 'desc' },
        include: { meeting: { include: { divisions: true } } },
      });
      if (finalVoteResult) {
        const votes = await prisma.vote.findMany({
          where: { agendaItemId: Number(agendaItemId) },
        });
        const votedUserIds = [...new Set(votes.map(vote => vote.userId))];

        const participants = await prisma.user.findMany({
          where: {
            divisionId: { in: finalVoteResult.meeting.divisions ? finalVoteResult.meeting.divisions.map(d => d.id) : [] },
            isAdmin: false,
          },
        });

        let notVotedCount = 0;
        for (const participant of participants) {
          if (!votedUserIds.includes(participant.id)) {
            notVotedCount += 1;
          }
        }

        console.log('Total Participants:', participants.length, 'Voted Count:', votedUserIds.length, 'Not Voted Count:', notVotedCount);

        const decision = await calculateDecision(prisma, finalVoteResult.id);
        console.log('Decision calculated:', decision);

        const updatedVoteResult = await prisma.voteResult.update({
          where: { id: finalVoteResult.id },
          data: {
            voteStatus: 'ENDED',
            votesAbsent: notVotedCount,
            decision,
          },
        });

        await prisma.agendaItem.update({
          where: { id: Number(agendaItemId) },
          data: { voting: false },
        });

        const updatedPayload = {
          ...updatedVoteResult,
          createdAt: updatedVoteResult.createdAt.toISOString(),
        };
        await pgClient.query(`NOTIFY vote_result_channel, '${JSON.stringify(updatedPayload)}'`);
      }
    }, durationInMs);

    res.json({ success: true, voteResult });
  } catch (error) {
    console.error('Ошибка при запуске голосования:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

  router.prisma = prisma;
  return router;
};