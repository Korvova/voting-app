import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './BroadcastPage.css';
import logo from '../../public/rms-logo.svg';

function BroadcastPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const meetingResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}`);
        const participantsResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}/participants`);
        setMeeting(meetingResponse.data);
        setParticipants(participantsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching meeting data:', error.message);
        setLoading(false);
      }
    };
    fetchMeetingData();
  }, [meetingId]);

  if (loading || !meeting) return <div>Загрузка...</div>;

  const totalParticipants = participants.length;
  const onlineParticipants = participants.filter(p => p.isOnline).length;

  return (
    <div className="broadcast-page">
      {meeting.status === 'WAITING' ? (
        <div className="registration-container">
          <img src={logo} alt="Logo" className="logo" />
          <h1 className="meeting-name">{meeting.name}</h1>
          <div className="registration-block">
            <h2 className="registration-text">РЕГИСТРАЦИЯ</h2>
            <p className="participant-count">ПО СПИСКУ: {totalParticipants}</p>
            <p className="attendance">Присутствуют {onlineParticipants} из {totalParticipants}</p>
            <p className="absent-text">Отсутствует:</p>
          </div>
        </div>
      ) : (
        <h2>{meeting.name}</h2>
      )}
    </div>
  );
}

export default BroadcastPage;