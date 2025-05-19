import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ControlPage() {
  const [meetings, setMeetings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Заглушка для загрузки заседаний
    setMeetings([
      {
        id: 1,
        name: 'Заседание 1',
        startTime: '2025-05-20 10:00',
        endTime: '2025-05-20 12:00',
        status: 'WAITING',
        isArchived: false,
      },
    ]);
  }, []);

  const handleArchiveMeeting = (meetingId) => {
    setMeetings(meetings.map(meeting =>
      meeting.id === meetingId ? { ...meeting, isArchived: true } : meeting
    ));
  };

  const handleMeetingClick = (meetingId) => {
    navigate(`/admin/control/meeting/${meetingId}`);
  };

  return (
    <div className="control-page">
      <h2>Пульт Заседания</h2>
      <table className="control-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Дата начала</th>
            <th>Дата окончания</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {meetings.map(meeting => (
            !meeting.isArchived && (
              <tr key={meeting.id} onClick={() => handleMeetingClick(meeting.id)} style={{ cursor: 'pointer' }}>
                <td>{meeting.name}</td>
                <td>{meeting.startTime}</td>
                <td>{meeting.endTime}</td>
                <td>{meeting.status === 'WAITING' ? 'Ждёт' : meeting.status === 'IN_PROGRESS' ? 'Идёт' : 'Завершено'}</td>
                <td>
                  <button className="archive-icon" onClick={(e) => { e.stopPropagation(); handleArchiveMeeting(meeting.id); }}>🗃️</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ControlPage;