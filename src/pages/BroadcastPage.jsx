import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function BroadcastPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await axios.get(`http://217.114.10.226:5000/api/meetings/${meetingId}`);
        setMeeting(response.data);
      } catch (error) {
        console.error('Error fetching meeting:', error.message);
      }
    };
    fetchMeeting();
  }, [meetingId]);

  if (!meeting) return <div>Загрузка...</div>;

  return (
    <div className="broadcast-page">
      <h2>{meeting.name}</h2>
    </div>
  );
}

export default BroadcastPage;