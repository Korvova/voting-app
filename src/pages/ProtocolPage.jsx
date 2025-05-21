import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

function ProtocolPage({ user, onLogout }) {
  const { id } = useParams(); // Получаем ID заседания из URL
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        setLoading(true);
        // Загружаем данные о заседании
        const meetingResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}`);
        const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${id}/agenda-items`);
        const voteResultsResponse = await axios.get(`http://217.114.10.226:5000/api/vote-results?meetingId=${id}`);

        if (meetingResponse.data.status !== 'COMPLETED') {
          throw new Error('Заседание не завершено');
        }

        const agendaItemsWithVotes = agendaResponse.data.map(item => {
          const relatedVotes = voteResultsResponse.data
            .filter(vote => vote.agendaItemId === item.id && (vote.voteStatus === 'APPLIED' || vote.voteStatus === 'ENDED'))
            .map(vote => `${vote.question}, За - ${vote.votesFor}, Против - ${vote.votesAgainst}, Воздержались - ${vote.votesAbstain}, Не проголосовали - ${vote.votesAbsent}`);

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

        setMeeting({
          ...meetingResponse.data,
          agendaItems: agendaItemsWithVotes,
        });

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!meeting) return <div>Заседание не найдено</div>;

  return (
    <div className="protocol-page">
      <header className="header">
        <div className="user-info">
          <span>{user.email}</span> {/* Отображаем email пользователя */}
          <button onClick={onLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>
      <div className="content">
        <h1>Протокол заседания: {meeting.name}</h1>
        <Link to="/user" className="back-link" style={{ display: 'block', marginBottom: '20px' }}>
          Назад к списку заседаний
        </Link>
        <table className="protocol-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Номер</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Вопрос</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Докладчик</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Итоги голосования</th>
            </tr>
          </thead>
          <tbody>
            {meeting.agendaItems.map(item => (
              <tr key={item.number}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.number}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.title}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.speaker}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {item.votes.length > 0 ? item.votes.join('\n') : 'Голосование не проводилось'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProtocolPage;