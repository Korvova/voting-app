const express = require('express');
const router = express.Router();

// Calculate decision function
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
    console.error('Error calculating decision:', error.message);
    throw error;
  }
};

module.exports = (prisma, pgClient) => {
  /**
   * @route POST /api/vote
   * @desc Record a user's vote
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
      console.error('Error submitting vote:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/vote-by-result
   * @desc Record a vote by vote result ID
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
      console.error('Error submitting vote:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @route GET /api/vote-results/:agendaItemId
   * @desc Get vote result by agenda item ID
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
      console.error('Error fetching vote results:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @route GET /api/vote-results
   * @desc Get all vote results, optionally filtered by meetingId
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
      console.error('Error fetching all vote results:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/vote-results/:id/apply
   * @desc Apply a vote result
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
      console.error('Error applying vote results:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/vote-results/:id/cancel
   * @desc Cancel a vote result
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
      console.error('Error cancelling vote results:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/calculate-decision
   * @desc Calculate decision for a vote result
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
      console.error('Error calculating decision:', error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @route POST /api/start-vote
   * @desc Start a new vote for an agenda item
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
      console.error('Error starting vote:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.prisma = prisma;
  return router;
};