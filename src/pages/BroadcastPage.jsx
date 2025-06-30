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
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const [meetingResponse, participantsResponse, agendaResponse] = await Promise.all([
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/participants`),
          axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/agenda-items`),
        ]);
        setMeeting(meetingResponse.data);
        setParticipants(participantsResponse.data);
        setAgendaItems(agendaResponse.data);
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
          {activeAgendaItem ? (
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