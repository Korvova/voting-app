import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

function UsersPage({ user, onLogout }) {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [nearestMeeting, setNearestMeeting] = useState(null);
  const [vote, setVote] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [currentAgendaItem, setCurrentAgendaItem] = useState(null);

  useEffect(() => {
    const socket = io('http://217.114.10.226:5000');
    
    socket.on('new-vote-result', (voteData) => {
      setVote(voteData);
      setTimeLeft(Math.floor((new Date(voteData.createdAt).getTime() + voteData.duration - Date.now()) / 1000));
      setSelectedChoice(null);
      setVoteResults(null);
      // Найдём текущий вопрос повестки, который соответствует голосованию
      const agendaItem = activeMeeting?.agendaItems.find(item => item.title === voteData.question);
      setCurrentAgendaItem(agendaItem || null);
    });

    socket.on('vote-ended', () => {
      setVote(null);
      setTimeLeft(null);
      setSelectedChoice(null);
      setVoteResults(null);
      setCurrentAgendaItem(null);
    });

    socket.on('vote-applied', () => {
      // Автоматическое закрытие модального окна, когда админ нажимает "Применить"
      setVoteResults(null);
    });

    socket.on('meeting-ended', () => {
      // Обновляем статус заседания
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting =>
          meeting.id === activeMeeting?.id ? { ...meeting, status: 'COMPLETED' } : meeting
        )
      );
      setActiveMeeting(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeMeeting]);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      // Имитация результатов голосования
      setVoteResults({
        question: vote.question,
        votesFor: 15,
        votesAgainst: 5,
        votesAbstain: 6,
        votesNotVoted: 7,
      });
      setTimeLeft(null);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, vote]);

  useEffect(() => {
    // Заглушка для загрузки заседаний
    const allMeetings = [
      {
        id: 1,
        name: 'Заседание 1',
        startTime: '2025-05-20T10:00:00',
        endTime: '2025-05-20T12:00:00',
        status: 'IN_PROGRESS',
        agendaItems: [
          { number: 1, title: 'Вопрос повестки 1', speaker: 'Иванов И.И.', documentLink: 'https://example.com/doc1' },
          { number: 2, title: 'Вопрос повестки 2', speaker: 'Петров П.П.', documentLink: 'https://example.com/doc2' },
          { number: 3, title: 'Вопрос повестки 3', speaker: 'Сидоров М.Р.', documentLink: 'https://example.com/doc3' },
          { number: 4, title: 'Вопрос повестки 4', speaker: 'Корвова А.Б.', documentLink: 'https://example.com/doc4' },
        ],
        participantsOnline: 38,
        participantsTotal: 40,
        participants: [
          'Иванов Ф.О.', 'Петров И.Г.', 'Сидоров М.Р.', 'korvova', 'Смирнов А.В.', 'Козлов Д.Е.',
          'Михайлов И.П.', 'Новикова Е.С.', 'Фёдоров Г.А.', 'Морозова О.Н.', 'Васильев С.В.',
          'Попова Л.И.', 'Соколов М.Д.', 'Кузнецова Т.В.', 'Романов Е.В.'
        ],
      },
      {
        id: 2,
        name: 'Заседание 2',
        startTime: '2025-05-20T13:40:00',
        endTime: '2025-05-20T15:40:00',
        status: 'WAITING',
      },
    ];

    // Проверяем, участвует ли пользователь в заседаниях
    const userMeetings = allMeetings.filter(meeting => 
      meeting.participants && meeting.participants.some(participant => participant.includes(user.email.split('@')[0]))
    );

    const active = userMeetings.find(meeting => meeting.status === 'IN_PROGRESS');
    setActiveMeeting(active);

    if (!active) {
      const upcoming = userMeetings
        .filter(meeting => meeting.status === 'WAITING')
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
      setNearestMeeting(upcoming);
    }

    setMeetings(userMeetings);
  }, [user.email]);

  const handleVote = (choice) => {
    setSelectedChoice(choice);
    console.log('User voted:', choice);
  };

  const handleVoteResultsClose = () => {
    setVoteResults(null);
  };

  return (
    <div className="user-page">
      <header className="header">
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={onLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>
      <div className="content">
        {activeMeeting ? (
          <div className="meeting-container">
            <div className="agenda-section">
              <h1>{activeMeeting.name}</h1>
              <h2>Вопросы повестки:</h2>
              <table className="agenda-items-table">
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Вопрос</th>
                    <th>Докладчик</th>
                    <th>Ссылка на документ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMeeting.agendaItems.map(item => (
                    <tr key={item.number} className={currentAgendaItem && currentAgendaItem.number === item.number ? 'active-agenda-item' : ''}>
                      <td>{item.number}</td>
                      <td>{item.title}</td>
                      <td>{item.speaker}</td>
                      <td>
                        <a href={item.documentLink} target="_blank" rel="noopener noreferrer">Документ</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="participants-section">
              <div className="participants-block">
                <p>{activeMeeting.participantsOnline}/{activeMeeting.participantsTotal} участников</p>
                <h3>Список участников:</h3>
                <ul className="participants-list">
                  {activeMeeting.participants.map((participant, index) => (
                    <li key={index}>{participant}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : nearestMeeting ? (
          <p>Нет активных заседаний, ближайшее: {new Date(nearestMeeting.startTime).toLocaleString()}</p>
        ) : (
          <p>Нет активных заседаний</p>
        )}
        {meetings.some(meeting => meeting.status === 'COMPLETED') && (
          <Link to={`/user/protocol/${meetings.find(m => m.status === 'COMPLETED').id}`} className="protocol-link">
            Протокол повестки
          </Link>
        )}
      </div>

      {vote && timeLeft !== null && !voteResults && (
        <div className="modal">
          <div className="modal-content">
            <h3>{vote.question}</h3>
            <p>Осталось времени: {timeLeft} сек</p>
            <div className="vote-buttons">
              <button
                className={selectedChoice === 'FOR' ? 'vote-button-selected' : 'vote-button'}
                onClick={() => handleVote('FOR')}
                disabled={selectedChoice !== null}
              >
                За
              </button>
              <button
                className={selectedChoice === 'AGAINST' ? 'vote-button-selected' : 'vote-button'}
                onClick={() => handleVote('AGAINST')}
                disabled={selectedChoice !== null}
              >
                Против
              </button>
              <button
                className={selectedChoice === 'ABSTAIN' ? 'vote-button-selected' : 'vote-button'}
                onClick={() => handleVote('ABSTAIN')}
                disabled={selectedChoice !== null}
              >
                Воздержусь
              </button>
            </div>
          </div>
        </div>
      )}

      {voteResults && (
        <div className="modal">
          <div className="modal-content">
            <h3>Итоги голосования</h3>
            <p>Название вопроса: {voteResults.question}</p>
            <p>За: {voteResults.votesFor}</p>
            <p>Против: {voteResults.votesAgainst}</p>
            <p>Воздержались: {voteResults.votesAbstain}</p>
            <p>Не голосовали: {voteResults.votesNotVoted}</p>
            <button onClick={handleVoteResultsClose}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;