import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

function MeetingControl() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [status, setStatus] = useState('WAITING');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showStartWarningModal, setShowStartWarningModal] = useState(false);
  const [voteData, setVoteData] = useState({ question: '', duration: '' });
  const [activeVote, setActiveVote] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [voteResultsError, setVoteResultsError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const socket = io('http://217.114.10.226:5000');

  // Загрузка данных о заседании
  const fetchMeeting = async () => {
    try {
      const response = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}`);
      const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items`);
      console.log('Agenda items from API:', agendaResponse.data);
      const voteResultsResponse = await axios.get(`http://217.114.10.226:5000/api/vote-results?meetingId=${id}`);

      const agendaItemsWithVotes = agendaResponse.data.map(item => {
        const relatedVotes = voteResultsResponse.data
          .filter(vote => vote.agendaItemId === item.id && vote.voteStatus === 'APPLIED')
          .map(vote => ({
            question: vote.question,
            results: `За - ${vote.votesFor}, Против - ${vote.votesAgainst}, Воздержались - ${vote.votesAbstain}, Не проголосовали - ${vote.votesAbsent}`
          })); // Разделяем название и результаты

        return {
          id: item.id,
          number: item.number,
          title: item.title,
          speaker: item.speaker,
          votes: relatedVotes,
          voting: item.voting,
          completed: item.completed,
          activeIssue: item.activeIssue,
        };
      }).sort((a, b) => a.number - b.number);

      console.log('Agenda items with activeIssue:', agendaItemsWithVotes.map(item => ({
        id: item.id,
        number: item.number,
        activeIssue: item.activeIssue,
      })));

      const endedVote = voteResultsResponse.data.find(vote => vote.voteStatus === 'ENDED');
      if (endedVote) {
        setVoteResults({
          id: endedVote.id,
          question: endedVote.question,
          votesFor: endedVote.votesFor,
          votesAgainst: endedVote.votesAgainst,
          votesAbstain: endedVote.votesAbstain,
          votesAbsent: endedVote.votesAbsent,
        });
        const relatedAgendaItem = agendaItemsWithVotes.find(item => item.id === endedVote.agendaItemId);
        if (relatedAgendaItem) {
          setActiveVote(relatedAgendaItem);
        }
      }

      setMeeting({
        ...response.data,
        agendaItems: agendaItemsWithVotes,
      });
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching meeting:', error.message);
    }
  };

  useEffect(() => {
    fetchMeeting();
    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Подписка на события Socket.IO
  useEffect(() => {
    socket.on('new-vote-result', (voteData) => {
      console.log('Received new-vote-result:', voteData);
      setTimeLeft(voteData.duration);
      const fetchMeeting = async () => {
        try {
          const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items`);
          setMeeting(prev => ({
            ...prev,
            agendaItems: agendaResponse.data.map(item => ({
              id: item.id,
              number: item.number,
              title: item.title,
              speaker: item.speaker,
              votes: prev.agendaItems.find(i => i.id === item.id)?.votes || [],
              voting: item.voting,
              completed: item.completed,
              activeIssue: item.activeIssue,
            })).sort((a, b) => a.number - b.number),
          }));
        } catch (error) {
          console.error('Error fetching meeting:', error.message);
        }
      };
      fetchMeeting();
    });

    socket.on('vote-ended', async () => {
      console.log('Vote ended');
      setTimeLeft(null);
      if (activeVote) {
        try {
          const response = await axios.get(`http://217.114.10.226:5000/api/vote-results/${activeVote.id}`);
          setVoteResults({
            id: response.data.id,
            question: response.data.question,
            votesFor: response.data.votesFor,
            votesAgainst: response.data.votesAgainst,
            votesAbstain: response.data.votesAbstain,
            votesAbsent: response.data.votesAbsent,
          });
          setVoteResultsError(null);
          const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items`);
          setMeeting(prev => ({
            ...prev,
            agendaItems: agendaResponse.data.map(item => ({
              id: item.id,
              number: item.number,
              title: item.title,
              speaker: item.speaker,
              votes: prev.agendaItems.find(i => i.id === item.id)?.votes || [],
              voting: item.voting,
              completed: item.completed,
              activeIssue: item.activeIssue,
            })).sort((a, b) => a.number - b.number),
          }));
        } catch (error) {
          console.error('Error fetching vote results:', error.message);
          setVoteResultsError('Не удалось загрузить результаты голосования');
        }
      }
    });

    socket.on('vote-applied', () => {
      console.log('Vote applied');
      setVoteResults(null);
      setActiveVote(null);
      setVoteResultsError(null);
      const fetchMeeting = async () => {
        try {
          const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items`);
          setMeeting(prev => ({
            ...prev,
            agendaItems: agendaResponse.data.map(item => ({
              id: item.id,
              number: item.number,
              title: item.title,
              speaker: item.speaker,
              votes: prev.agendaItems.find(i => i.id === item.id)?.votes || [],
              voting: item.voting,
              completed: item.completed,
              activeIssue: item.activeIssue,
            })).sort((a, b) => a.number - b.number),
          }));
        } catch (error) {
          console.error('Error fetching meeting:', error.message);
        }
      };
      fetchMeeting();
    });

    socket.on('meeting-ended', () => {
      console.log('Meeting ended');
      setStatus('COMPLETED');
      setMeeting({
        ...meeting,
        agendaItems: meeting.agendaItems.map(item => ({
          ...item,
          voting: false,
          completed: true,
          activeIssue: false,
        })),
      });
    });

    return () => {
      socket.off('new-vote-result');
      socket.off('vote-ended');
      socket.off('vote-applied');
      socket.off('meeting-ended');
    };
  }, [socket, activeVote, meeting, id]);

  // Визуальный обратный отсчёт
  useEffect(() => {
    let timer;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Изменение статуса заседания
  const handleStatusChange = async () => {
    try {
      if (status === 'WAITING') {
        await axios.post(`http://217.114.10.226:5000/api/meetings/${id}/status`, { status: 'IN_PROGRESS' });
        setStatus('IN_PROGRESS');
      } else if (status === 'IN_PROGRESS') {
        await axios.post(`http://217.114.10.226:5000/api/meetings/${id}/status`, { status: 'COMPLETED' });
        setStatus('COMPLETED');
        socket.emit('meeting-ended');
      }
    } catch (error) {
      console.error('Error changing meeting status:', error.message);
    }
  };

  // Запуск голосования
  const handleStartVote = async (agendaItem) => {
    if (status === 'WAITING') {
      setShowStartWarningModal(true);
      return;
    }
    setActiveVote(agendaItem);
    await axios.put(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items/${agendaItem.id}`, {
      number: agendaItem.number,
      title: agendaItem.title,
      speakerId: agendaItem.speakerId,
      link: agendaItem.link,
      activeIssue: true,
    });
    await fetchMeeting();
    setShowVoteModal(true);
    setMeeting(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.map(item =>
        item.id === agendaItem.id ? { ...item, voting: true, activeIssue: true } : { ...item, activeIssue: false }
      ),
    }));
  };

  // Завершение текущего вопроса повестки
  const handleEndVote = async (agendaItem) => {
    try {
      setTimeLeft(null);
      setActiveVote(null);
      setVoteResults(null);
      socket.emit('vote-ended');
      // Обновляем completed и activeIssue на сервере
      await axios.put(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items/${agendaItem.id}`, {
        number: agendaItem.number,
        title: agendaItem.title,
        speakerId: agendaItem.speakerId,
        link: agendaItem.link,
        activeIssue: false,
        completed: true,
      });
      await fetchMeeting(); // Обновляем данные
      setMeeting(prev => ({
        ...prev,
        agendaItems: prev.agendaItems.map(item =>
          item.id === agendaItem.id ? { ...item, voting: false, completed: true, activeIssue: false } : item
        ),
      }));
    } catch (error) {
      console.error('Error ending vote:', error.message);
    }
  };

  // Закрытие модального окна для запуска голосования
  const handleVoteModalClose = () => {
    setShowVoteModal(false);
    setVoteData({ question: '', duration: '' });
  };

  // Запуск голосования (отправка события)
  const handleVoteModalApply = async () => {
    if (!activeVote || !activeVote.id) {
      alert('Ошибка: не выбран вопрос повестки.');
      return;
    }
    if (!voteData.question) {
      alert('Пожалуйста, укажите вопрос голосования.');
      return;
    }
    if (!voteData.duration || parseInt(voteData.duration) <= 0) {
      alert('Пожалуйста, укажите время голосования (больше 0 секунд).');
      return;
    }
    try {
      const duration = parseInt(voteData.duration);
      console.log('Sending start-vote request:', { agendaItemId: activeVote.id, question: voteData.question, duration });
      await axios.post('http://217.114.10.226:5000/api/start-vote', {
        agendaItemId: activeVote.id,
        question: voteData.question,
        duration: duration,
      });
      setTimeLeft(duration);
      socket.emit('new-vote-result', {
        agendaItemId: activeVote.id,
        question: voteData.question,
        duration: duration,
        createdAt: new Date().toISOString(),
      });
      handleVoteModalClose();
      await fetchMeeting();
    } catch (error) {
      console.error('Error starting vote:', error.message);
    }
  };

  // Применение результатов голосования
  const handleVoteResultsApply = async () => {
    try {
      setMeeting({
        ...meeting,
        agendaItems: meeting.agendaItems.map(item =>
          item.id === activeVote.id
            ? {
                ...item,
                votes: [
                  ...item.votes,
                  { question: voteResults.question, results: `За - ${voteResults.votesFor}, Против - ${voteResults.votesAgainst}, Воздержались - ${voteResults.votesAbstain}, Не проголосовали - ${voteResults.votesAbsent}` }
                ],
              }
            : item
        ),
      });
      setVoteResults(null);
      setActiveVote(null);
      await axios.post(`http://217.114.10.226:5000/api/vote-results/${voteResults.id}/apply`);
      await fetchMeeting();
    } catch (error) {
      console.error('Error applying vote results:', error.message);
    }
  };

  // Отмена результатов голосования
  const handleVoteResultsCancel = async () => {
    try {
      if (voteResults && voteResults.id) {
        await axios.post(`http://217.114.10.226:5000/api/vote-results/${voteResults.id}/cancel`);
      }
      setVoteResults(null);
      setActiveVote(null);
      setVoteResultsError(null);
      await fetchMeeting();
    } catch (error) {
      console.error('Error cancelling vote:', error.message);
      setVoteResultsError('Не удалось отменить голосование');
    }
  };

  // Обработка ввода данных для голосования
  const handleVoteInputChange = (e) => {
    const { name, value } = e.target;
    setVoteData({ ...voteData, [name]: value });
  };

  // Запуск заседания из модального окна предупреждения
  const handleStartMeetingFromModal = () => {
    setStatus('IN_PROGRESS');
    setShowStartWarningModal(false);
  };

  // Отмена предупреждения о запуске
  const handleCancelStartWarning = () => {
    setShowStartWarningModal(false);
  };

  if (!meeting) return <div>Загрузка...</div>;

  console.log('Agenda items in render:', meeting.agendaItems);

  return (
    <div className="meeting-control">
      <h2>{meeting.name}</h2>
      <div className="meeting-actions">
        <button
          className={`start-meeting-button ${status === 'WAITING' ? 'start' : status === 'IN_PROGRESS' ? 'end' : 'completed'}`}
          onClick={handleStatusChange}
        >
          {status === 'WAITING' ? '▶ Начать заседание' : status === 'IN_PROGRESS' ? '⏹ Завершить заседание' : '✔ Завершено'}
        </button>
      </div>
      <table className="agenda-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Вопрос</th>
            <th>Докладчик</th>
            <th>Итоги голосования</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {meeting.agendaItems.map(item => (
            <tr
              key={item.id}
              className={`${item.voting ? 'voting-active' : item.completed ? 'voting-completed' : ''} ${item.activeIssue ? 'active-agenda-item' : ''}`}
            >
              <td>{item.number}</td>
              <td>{item.title}</td>
              <td>{item.speaker}</td>
              <td className="vote-results-column">
                {item.votes.length > 0 ? (
                  item.votes.map((vote, index) => (
                    <div key={index}>
                      <strong>{vote.question}</strong>
                      <br />
                      {vote.results}
                      {index < item.votes.length - 1 && <br />} {/* Добавляем перенос строки между голосованиями */}
                    </div>
                  ))
                ) : '-'}
              </td>
              <td className="action-column">
                {!item.completed && (
                  <>
                    <button
                      className={item.completed ? 'vote-button-completed' : 'vote-button'}
                      onClick={() => handleStartVote(item)}
                      disabled={status === 'COMPLETED' || item.completed}
                    >
                      ▷
                    </button>
                    {item.activeIssue && (
                      <button
                        className="end-vote-button"
                        onClick={() => handleEndVote(item)}
                      >
                        Завершить
                      </button>
                    )}
                  </>
                )}
                {item.completed && (
                  <span className="completed-text">
                    ⏹ Завершено
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {timeLeft !== null && (
        <div className="vote-timer">
          <p>Идёт голосование: Таймер обратного отсчёта: {timeLeft} сек</p>
        </div>
      )}

      {voteResultsError && (
        <div className="vote-results-error">
          <p>{voteResultsError}</p>
        </div>
      )}

      {voteResults && (
        <div className="vote-results">
          <h3>Итоги голосования</h3>
          <p>Название вопроса: {voteResults.question}</p>
          <p>За: {voteResults.votesFor}</p>
          <p>Против: {voteResults.votesAgainst}</p>
          <p>Воздержались: {voteResults.votesAbstain}</p>
          <p>Не проголосовали: {voteResults.votesAbsent}</p>
          <div className="action-buttons">
            <button onClick={handleVoteResultsApply}>Применить</button>
            <button onClick={handleVoteResultsCancel}>Отмена</button>
          </div>
        </div>
      )}

      {showVoteModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Запуск голосования</h3>
            <div className="form-group">
              <label>Вопрос голосования *</label>
              <input
                name="question"
                value={voteData.question}
                onChange={handleVoteInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Время (сек) *</label>
              <input
                name="duration"
                type="number"
                value={voteData.duration}
                onChange={handleVoteInputChange}
                required
              />
            </div>
            <button onClick={handleVoteModalApply}>Запуск</button>
            <button onClick={handleVoteModalClose}>Отмена</button>
          </div>
        </div>
      )}

      {showStartWarningModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Вначале запустите заседание</p>
            <button className="start-warning-button" onClick={handleStartMeetingFromModal}>Запустить</button>
            <button onClick={handleCancelStartWarning}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingControl;