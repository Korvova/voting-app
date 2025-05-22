import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

function UsersPage({ user, onLogout }) {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [nearestMeeting, setNearestMeeting] = useState(null);
  const [vote, setVote] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [currentAgendaItem, setCurrentAgendaItem] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [participants, setParticipants] = useState([]);

  const socketRef = useRef(null);
  const navigate = useNavigate();
  const redirectingRef = useRef(false);
  const location = useLocation();

  // Сбрасываем redirectingRef.current при возвращении на /user
  useEffect(() => {
    if (location.pathname === '/user') {
      redirectingRef.current = false; // Сбрасываем, чтобы редирект мог сработать снова
    }
    console.log('Current location:', location.pathname); // Логируем текущий маршрут
  }, [location.pathname]);

  // Загрузка данных о заседаниях и проверка активного голосования
  const fetchMeetings = async () => {
    try {
      const response = await axios.get('http://217.114.10.226:5000/api/meetings/active-for-user', {
        params: { email: user.email },
      });

      console.log('API response for meetings:', response.data); // Логируем данные от API

      const userMeetings = response.data.map(meeting => ({
        ...meeting,
        agendaItems: meeting.agendaItems.sort((a, b) => a.number - b.number),
      }));

      const active = userMeetings.find(meeting => meeting.status === 'IN_PROGRESS');

      console.log('Active meeting:', active); // Логируем активное заседание

      if (active) {
        setActiveMeeting(active);

        const allParticipants = active.divisions.flatMap(division => division.users);
        setParticipants(allParticipants);

        const latestVoteResult = await axios.get('http://217.114.10.226:5000/api/vote-results', {
          params: { meetingId: active.id },
        });

        const activeVote = latestVoteResult.data.find(vr => vr.voteStatus === 'PENDING' || vr.voteStatus === 'ENDED');

        if (activeVote) {
          if (activeVote.voteStatus === 'PENDING') {
            setVote(activeVote);
            setTimeLeft(activeVote.duration);
            setVoteResults(null);
            const agendaItem = active.agendaItems.find(item => item.id === activeVote.agendaItemId);
            setCurrentAgendaItem(agendaItem || null);
          } else if (activeVote.voteStatus === 'ENDED') {
            setVote(activeVote);
            setTimeLeft(null);
            setVoteResults({
              question: activeVote.question,
              votesFor: activeVote.votesFor,
              votesAgainst: activeVote.votesAgainst,
              votesAbstain: activeVote.votesAbstain,
              votesNotVoted: activeVote.votesAbsent,
            });
            setCurrentAgendaItem(null);
          } else {
            setVote(null);
            setVoteResults(null);
            setTimeLeft(null);
            setSelectedChoice(null);
            setCurrentAgendaItem(null);
          }
        } else {
          setVote(null);
          setVoteResults(null);
          setTimeLeft(null);
          setSelectedChoice(null);
          setCurrentAgendaItem(null);
        }
      } else {
        setVote(null);
        setVoteResults(null);
        setTimeLeft(null);
        setSelectedChoice(null);
        setCurrentAgendaItem(null);
        const upcoming = userMeetings
          .filter(meeting => meeting.status === 'WAITING')
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
        setNearestMeeting(upcoming);
      }

      setMeetings(userMeetings);
    } catch (error) {
      console.error('[fetchMeetings] Error fetching active meetings for user:', error.message);
    }
  };

  // Вызываем fetchMeetings при загрузке страницы
  useEffect(() => {
    if (user && user.email) {
      fetchMeetings();
    }
  }, [user]);

  // Инициализация Socket.IO с помощью useRef и useEffect
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    socketRef.current = io(`${protocol}://217.114.10.226:5000`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 5000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setSocketError(null);
      console.log('Socket.IO connected');
    });

    socket.on('connect_error', (error) => {
      setSocketError('Не удалось подключиться к серверу голосования. Пытаемся переподключиться...');
      console.log('Socket.IO connect error:', error);
    });

    socket.on('connect_timeout', () => {
      console.log('Socket.IO connect timeout');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('Socket.IO reconnect attempt:', attempt);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        socket.connect();
      }
    });

    socket.on('meeting-status-changed', (data) => {
      console.log('[Socket.IO] Meeting status changed, refreshing meetings at', new Date().toISOString());
      console.log('[Socket.IO] Meeting status changed data:', data);
      if (data.status === 'COMPLETED' && data.id && !redirectingRef.current) {
        redirectingRef.current = true;
        console.log('[Socket.IO] Meeting completed, navigating to /user/protocol/', data.id);
        navigate(`/user/protocol/${data.id}`);
      } else {
        fetchMeetings();
      }
    });

    socket.on('new-vote-result', (voteData) => {
      console.log('New vote result received:', voteData);
      if (voteData.voteStatus === 'PENDING') {
        setVote(voteData);
        setTimeLeft(voteData.duration);
        setVoteResults(null);
        const agendaItem = activeMeeting?.agendaItems.find(item => item.id === voteData.agendaItemId);
        setCurrentAgendaItem(agendaItem || null);
      }
      fetchMeetings();
    });

    socket.on('vote-ended', (finalVoteResult) => {
      console.log('Vote ended:', finalVoteResult);
      if (finalVoteResult.voteStatus === 'ENDED') {
        setVote(finalVoteResult);
        setVoteResults({
          question: finalVoteResult.question,
          votesFor: finalVoteResult.votesFor,
          votesAgainst: finalVoteResult.votesAgainst,
          votesAbstain: finalVoteResult.votesAbstain,
          votesNotVoted: finalVoteResult.votesAbsent,
        });
        setTimeLeft(null);
        setSelectedChoice(null);
        setCurrentAgendaItem(null);
      }
      console.log('[Socket.IO] Calling fetchMeetings after vote-ended');
      fetchMeetings();
    });

    socket.on('vote-applied', () => {
      console.log('Vote applied');
      setVoteResults(null);
      setVote(null);
      setTimeLeft(null);
      setSelectedChoice(null);
      setCurrentAgendaItem(null);
      fetchMeetings();
      setTimeout(() => {
        fetchMeetings();
      }, 2000);
    });

    socket.on('vote-cancelled', () => {
      console.log('Vote cancelled');
      setVoteResults(null);
      setVote(null);
      setTimeLeft(null);
      setSelectedChoice(null);
      setCurrentAgendaItem(null);
      fetchMeetings();
    });

    socket.on('meeting-ended', () => {
      console.log('Meeting ended');
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting =>
          meeting.id === activeMeeting?.id ? { ...meeting, status: 'COMPLETED' } : meeting
        ).sort((a, b) => a.number - b.number)
      );
      setActiveMeeting(null);
      setVote(null);
      setVoteResults(null);
      setTimeLeft(null);
      setSelectedChoice(null);
      setCurrentAgendaItem(null);
    });

    socket.on('agenda-item-updated', (agendaItemData) => {
      console.log('Agenda item updated:', agendaItemData);
      if (activeMeeting && activeMeeting.id === agendaItemData.meetingId) {
        setActiveMeeting(prev => ({
          ...prev,
          agendaItems: prev.agendaItems.map(item =>
            item.id === agendaItemData.id
              ? { ...item, activeIssue: agendaItemData.activeIssue, completed: agendaItemData.completed }
              : item
          ).sort((a, b) => a.number - b.number),
        }));
        fetchMeetings();
      }
    });

    return () => {
      console.log('[useEffect] Cleaning up Socket.IO listeners');
      socket.off('new-vote-result');
      socket.off('vote-ended');
      socket.off('vote-applied');
      socket.off('vote-cancelled');
      socket.off('meeting-ended');
      socket.off('agenda-item-updated');
      socketRef.current.disconnect();
      console.log('[useEffect] Socket.IO disconnected on cleanup');
    };
  }, []);

  // Визуальный обратный отсчёт
  useEffect(() => {
    let timer;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setTimeout(() => {
        const newTimeLeft = timeLeft - 1;
        setTimeLeft(newTimeLeft);
        if (newTimeLeft <= 0) {
          const fetchResults = async () => {
            try {
              const response = await axios.get(`http://217.114.10.226:5000/api/vote-results/${vote.agendaItemId}`);
              if (response.data.voteStatus === 'ENDED') {
                setVoteResults({
                  question: response.data.question,
                  votesFor: response.data.votesFor,
                  votesAgainst: response.data.votesAgainst,
                  votesAbstain: response.data.votesAbstain,
                  votesNotVoted: response.data.votesAbsent,
                });
                setVote({ ...vote, voteStatus: 'ENDED' });
              } else if (response.data.voteStatus === 'APPLIED' || response.data.voteStatus === 'CANCELLED') {
                setVoteResults(null);
                setVote(null);
                setTimeLeft(null);
                setSelectedChoice(null);
                setCurrentAgendaItem(null);
                fetchMeetings();
              }
            } catch (error) {
              console.error('[useEffect] Error fetching vote results:', error.message);
            }
          };
          fetchResults();
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, vote]);

  const handleVote = async (choice) => {
    setSelectedChoice(choice);
    try {
      await axios.post('http://217.114.10.226:5000/api/vote-by-result', {
        userId: user.email,
        voteResultId: vote.id,
        choice,
      });
    } catch (error) {
      console.error('[handleVote] Error submitting vote:', error.message);
    }
  };

  // Проверяем, если текущий маршрут — это протокол, показываем только Outlet
  if (location.pathname.startsWith('/user/protocol')) {
    return <Outlet />;
  }

  // Обычная разметка для /user
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
        {socketError && (
          <div className="error-message">
            <p>{socketError}</p>
          </div>
        )}
        {activeMeeting ? (
          <div className="meeting-container">
            <div className="agenda-section">
              <h1>{activeMeeting.name}</h1>
              <h2>Вопросы повестки:</h2>
              {activeMeeting.agendaItems && activeMeeting.agendaItems.length > 0 ? (
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
                      <tr
                        key={item.number}
                        className={
                          `${item.voting ? 'voting-active' : ''} ${
                            item.activeIssue ? 'active-agenda-item' : ''
                          } ${item.completed && !item.activeIssue ? 'voting-completed' : ''}`
                        }
                      >
                        <td>{item.number}</td>
                        <td>{item.title}</td>
                        <td>{item.speaker}</td>
                        <td>
                          {item.link && item.link !== '' ? (
                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                              Документ
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Вопросы повестки отсутствуют.</p>
              )}
            </div>
            <div className="participants-section">
              <div className="participants-block">
                <h3>Список участников</h3>
                <ul className="participants-list">
                  {participants.length > 0 ? (
                    participants.map(participant => (
                      <li key={participant.id}>{participant.name}</li>
                    ))
                  ) : (
                    <li>Участники отсутствуют</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : nearestMeeting ? (
          <p>Нет активных заседаний, ближайшее: {new Date(nearestMeeting.startTime).toLocaleString()}</p>
        ) : (
          <p>Нет активных заседаний</p>
        )}
      </div>
      {vote && (
        <div className="modal">
          <div className="modal-content">
            <h3>{vote.question}</h3>
            {vote.voteStatus === 'PENDING' && (
              <>
                {timeLeft !== null && timeLeft >= 0 ? (
                  <p>Осталось времени: {timeLeft} сек</p>
                ) : (
                  <p>Осталось времени: 0 сек</p>
                )}
                <div className="vote-buttons">
                  <button
                    className={selectedChoice === 'FOR' ? 'vote-button-selected' : 'vote-button'}
                    onClick={() => handleVote('FOR')}
                  >
                    За
                  </button>
                  <button
                    className={selectedChoice === 'AGAINST' ? 'vote-button-selected' : 'vote-button'}
                    onClick={() => handleVote('AGAINST')}
                  >
                    Против
                  </button>
                  <button
                    className={selectedChoice === 'ABSTAIN' ? 'vote-button-selected' : 'vote-button'}
                    onClick={() => handleVote('ABSTAIN')}
                  >
                    Воздержусь
                  </button>
                </div>
              </>
            )}
            {voteResults && vote.voteStatus === 'ENDED' && (
              <>
                <h3>Итоги голосования</h3>
                <p>Название вопроса: {voteResults.question}</p>
                <p>За: {voteResults.votesFor}</p>
                <p>Против: {voteResults.votesAgainst}</p>
                <p>Воздержались: {voteResults.votesAbstain}</p>
                <p>Не голосовали: {voteResults.votesNotVoted}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;