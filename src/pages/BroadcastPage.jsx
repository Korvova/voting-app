import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './BroadcastPage.css';
import logo from '../../public/rms-logo.svg';

function BroadcastPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);
  const [voteResult, setVoteResult] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [absentUsers, setAbsentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const [meetingResponse, participantsResponse, agendaResponse, voteResultResponse, totalUsersResponse, onlineUsersResponse, absentUsersResponse] = await Promise.all([
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/participants`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/agenda-items`),
          axios.get(`http://217.114.10.226:5000/api/vote-results?meetingId=${meetingId}`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/total-users`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/online-users`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/absent-users`),
        ]);
        setMeeting(meetingResponse.data);
        setParticipants(participantsResponse.data);
        setAgendaItems(agendaResponse.data);
        const latestVote = voteResultResponse.data
          .filter(vr => ['PENDING', 'ENDED'].includes(vr.voteStatus))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setVoteResult(latestVote || null);
        setTotalUsers(totalUsersResponse.data.totalUsers || 0);
        setOnlineUsers(onlineUsersResponse.data.onlineUsers || 0);
        setAbsentUsers(absentUsersResponse.data.absentUsers || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching meeting data:', error.message);
        setLoading(false);
      }
    };
    fetchMeetingData();

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
      console.log('Socket.IO connected in BroadcastPage');
    });

    socket.on('agenda-item-updated', (agendaItemData) => {
      console.log('Agenda item updated in BroadcastPage:', agendaItemData);
      if (agendaItemData.meetingId === parseInt(meetingId)) {
        setAgendaItems(prevItems =>
          prevItems.map(item =>
            item.id === agendaItemData.id
              ? { ...item, activeIssue: agendaItemData.activeIssue, completed: agendaItemData.completed }
              : item
          )
        );
      }
    });

    socket.on('new-vote-result', (voteData) => {
      console.log('New vote result in BroadcastPage:', voteData);
      if (voteData.meetingId === parseInt(meetingId)) {
        setVoteResult(voteData);
      }
    });

    socket.on('vote-ended', (voteData) => {
      console.log('Vote ended in BroadcastPage:', voteData);
      if (voteData.meetingId === parseInt(meetingId)) {
        setVoteResult(voteData);
      }
    });

    socket.on('vote-applied', (voteData) => {
      console.log('Vote applied in BroadcastPage:', voteData);
      if (voteData.meetingId === parseInt(meetingId)) {
        const activeAgenda = agendaItems.find(item => item.activeIssue === true);
        if (activeAgenda) {
          setVoteResult(null); // Возвращаем фокус на activeAgendaItem
        } else {
          setVoteResult(voteData); // Оставляем результаты, если нет активного элемента
        }
      }
    });

    socket.on('user-status-changed', (data) => {
      console.log('User status changed in BroadcastPage:', data);
      if (participants.some(p => p.id === data.userId)) {
        setParticipants(prev =>
          prev.map(p => p.id === data.userId ? { ...p, isOnline: data.isOnline } : p)
        );
        // Обновляем absentUsers через API после изменения статуса
        axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/absent-users`)
          .then(response => setAbsentUsers(response.data.absentUsers || []))
          .catch(error => console.error('Error fetching absent users:', error.message));
      }
    });

    socket.on('meeting-status-changed', (data) => {
      console.log('Meeting status changed in BroadcastPage:', data);
      if (data.id === parseInt(meetingId)) {
        setMeeting(prev => prev ? { ...prev, status: data.status } : prev);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meetingId]);

  if (loading || !meeting) return <div>Загрузка...</div>;

  const activeAgendaItem = agendaItems.find(item => item.activeIssue === true);

  return (
    <div className="broadcast-page">
      <div className="registration-container">
        <img src={logo} alt="Logo" className="logo" />
        <h1 className="meeting-name">{meeting.name}</h1>
        <div className="registration-block">
          {meeting.status === 'COMPLETED' ? (
            <h2 className="registration-text" style={{ textAlign: 'center' }}>Завершено</h2>
          ) : voteResult && voteResult.voteStatus === 'PENDING' ? (
            <>
              <h2 className="registration-text" style={{ textAlign: 'center' }}>Идёт голосование</h2>
              <p className="vote-question">{voteResult.question}</p>
              <div className="vote-stats">
                <p>За: {voteResult.votesFor}</p>
                <p>Против: {voteResult.votesAgainst}</p>
                <p>Воздержались: {voteResult.votesAbstain}</p>
                <p>Не проголосовали: {voteResult.votesAbsent}</p>
              </div>
            </>
          ) : voteResult && voteResult.voteStatus === 'ENDED' ? (
            <>
              <p className="vote-question">{voteResult.question}</p>
              <div className="vote-stats">
                <p>За: {voteResult.votesFor}</p>
                <p>Против: {voteResult.votesAgainst}</p>
                <p>Воздержались: {voteResult.votesAbstain}</p>
                <p>Не проголосовали: {voteResult.votesAbsent}</p>
              </div>
              <p className="vote-decision">Решение: {voteResult.decision || 'Не определено'}</p>
            </>
          ) : activeAgendaItem ? (
            <h2 className="registration-text">{activeAgendaItem.title}</h2>
          ) : (
            <>
              <h2 className="registration-text">РЕГИСТРАЦИЯ</h2>
              <p className="participant-count">ПО СПИСКУ: {totalUsers}</p>
              <p className="attendance">Присутствуют {onlineUsers} из {totalUsers}</p>
              <p className="absent-text">Отсутствует: {absentUsers.join(', ') || '-'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BroadcastPage;