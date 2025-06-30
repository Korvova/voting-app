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
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const [meetingResponse, participantsResponse, agendaResponse, voteResultResponse] = await Promise.all([
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/participants`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/agenda-items`),
          axios.get(`http://217.114.10.226:5000/api/vote-results?meetingId=${meetingId}`),
        ]);
        setMeeting(meetingResponse.data);
        setParticipants(participantsResponse.data);
        setAgendaItems(agendaResponse.data);
        const latestVote = voteResultResponse.data
          .filter(vr => ['PENDING', 'ENDED'].includes(vr.voteStatus)) // Оставляем только PENDING и ENDED для начальной загрузки
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setVoteResult(latestVote || null);
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
        // Сбрасываем voteResult при APPLIED, если есть активный AgendaItem
        const activeAgenda = agendaItems.find(item => item.activeIssue === true);
        if (activeAgenda) {
          setVoteResult(null); // Возвращаем фокус на activeAgendaItem
        } else {
          setVoteResult(voteData); // Оставляем результаты, если нет активного элемента
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meetingId]);

  if (loading || !meeting) return <div>Загрузка...</div>;

  const totalParticipants = participants.length;
  const onlineParticipants = participants.filter(p => p.isOnline).length;
  const activeAgendaItem = agendaItems.find(item => item.activeIssue === true);

  return (
    <div className="broadcast-page">
      <div className="registration-container">
        <img src={logo} alt="Logo" className="logo" />
        <h1 className="meeting-name">{meeting.name}</h1>
        <div className="registration-block">
          {voteResult && voteResult.voteStatus === 'PENDING' ? (
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
              <p className="vote-decision">Решение: {voteResult.decision || 'Не определено'}</p>
            </>
          ) : activeAgendaItem ? (
            <h2 className="registration-text">{activeAgendaItem.title}</h2>
          ) : (
            <>
              <h2 className="registration-text">РЕГИСТРАЦИЯ</h2>
              <p className="participant-count">ПО СПИСКУ: {totalParticipants}</p>
              <p className="attendance">Присутствуют {onlineParticipants} из {totalParticipants}</p>
              <p className="absent-text">Отсутствует:</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BroadcastPage;