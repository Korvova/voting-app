import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

function MeetingControl() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [status, setStatus] = useState('WAITING');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showStartWarningModal, setShowStartWarningModal] = useState(false);
  const [voteData, setVoteData] = useState({ question: '', duration: '' });
  const [activeVote, setActiveVote] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const socket = io('http://217.114.10.226:5000');

  useEffect(() => {
    // Заглушка для загрузки данных заседания
    setMeeting({
      id: parseInt(id),
      name: 'Заседание 1',
      participantsOnline: 30,
      participantsTotal: 36,
      agendaItems: [
        { id: 1, number: 1, title: 'Вопрос повестки 1', speaker: 'Иванов И.И.', votes: [], voting: false, completed: false },
        { id: 2, number: 2, title: 'Вопрос повестки 2', speaker: 'Петров П.П.', votes: [], voting: false, completed: false },
      ],
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      // Имитация результатов голосования
      setVoteResults({
        question: voteData.question,
        votesFor: 25,
        votesAgainst: 5,
        votesAbstain: 6,
        votesAbsent: 1,
      });
      setTimeLeft(null);
      socket.emit('vote-ended');
    }
    return () => clearTimeout(timer);
  }, [timeLeft, voteData.question, socket]);

  const handleStatusChange = () => {
    if (status === 'WAITING') {
      setStatus('IN_PROGRESS');
    } else if (status === 'IN_PROGRESS') {
      setStatus('COMPLETED');
      socket.emit('meeting-ended');
    }
  };

  const handleStartVote = (agendaItem) => {
    if (status === 'WAITING') {
      setShowStartWarningModal(true);
      return;
    }
    setActiveVote(agendaItem);
    setShowVoteModal(true);
    setMeeting({
      ...meeting,
      agendaItems: meeting.agendaItems.map(item =>
        item.id === agendaItem.id ? { ...item, voting: true } : item
      ),
    });
  };

  const handleEndVote = (agendaItem) => {
    setTimeLeft(null);
    setVoteResults(null);
    setActiveVote(null);
    setMeeting({
      ...meeting,
      agendaItems: meeting.agendaItems.map(item =>
        item.id === agendaItem.id ? { ...item, voting: false, completed: true } : item
      ),
    });
    socket.emit('vote-ended');
  };

  const handleVoteModalClose = () => {
    setShowVoteModal(false);
    setVoteData({ question: '', duration: '' });
  };

  const handleVoteModalApply = () => {
    console.log('Starting vote:', voteData);
    setTimeLeft(parseInt(voteData.duration));
    socket.emit('new-vote-result', {
      question: voteData.question,
      duration: parseInt(voteData.duration) * 1000, // В миллисекундах
      createdAt: new Date().toISOString(),
    });
    handleVoteModalClose();
  };

  const handleVoteResultsApply = () => {
    setMeeting({
      ...meeting,
      agendaItems: meeting.agendaItems.map(item =>
        item.id === activeVote.id
          ? {
              ...item,
              votes: [
                ...item.votes,
                `${voteResults.question}, За - ${voteResults.votesFor}, Против - ${voteResults.votesAgainst}, Воздержались - ${voteResults.votesAbstain}, Не проголосовали - ${voteResults.votesAbsent}`
              ],
            }
          : item
      ),
    });
    setVoteResults(null);
    setActiveVote(null);
    socket.emit('vote-applied');
  };

  const handleVoteResultsCancel = () => {
    setVoteResults(null);
    setActiveVote(null);
  };

  const handleVoteInputChange = (e) => {
    const { name, value } = e.target;
    setVoteData({ ...voteData, [name]: value });
  };

  const handleStartMeetingFromModal = () => {
    setStatus('IN_PROGRESS');
    setShowStartWarningModal(false);
  };

  const handleCancelStartWarning = () => {
    setShowStartWarningModal(false);
  };

  if (!meeting) return <div>Загрузка...</div>;

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
        <p>Количество участников онлайн: {meeting.participantsOnline}/{meeting.participantsTotal}</p>
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
              className={item.voting ? 'voting-active' : item.completed ? 'voting-completed' : ''}
            >
              <td>{item.number}</td>
              <td>{item.title}</td>
              <td>{item.speaker}</td>
              <td className="vote-results-column">{item.votes.length > 0 ? item.votes.join('\n') : '-'}</td>
              <td className="action-column">
                {!item.completed && (
                  <button
                    className={item.completed ? 'vote-button-completed' : 'vote-button'}
                    onClick={() => handleStartVote(item)}
                    disabled={status === 'COMPLETED' || item.completed}
                  >
                    ▷
                  </button>
                )}
                {item.voting && (
                  <button
                    className="end-vote-button"
                    onClick={() => handleEndVote(item)}
                  >
                    Завершить
                  </button>
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