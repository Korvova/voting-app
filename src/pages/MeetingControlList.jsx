import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function MeetingControlList() {
  const [meetings, setMeetings] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null); // Для хранения ошибок
  const [allVoteResults, setAllVoteResults] = useState([]); // Для хранения всех результатов голосования

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем все результаты голосования один раз
        const voteResultsResponse = await axios.get('http://217.114.10.226:5000/api/vote-results');
        setAllVoteResults(voteResultsResponse.data);

        // Загружаем неархивированные заседания
        const response = await axios.get('http://217.114.10.226:5000/api/meetings');
        console.log('Fetched meetings on frontend:', response.data);

        // Для каждого заседания формируем результаты голосования
        const meetingsWithResults = await Promise.all(
          response.data.map(async (meeting) => {
            const agendaResponse = await axios.get(`http://217.114.10.226:5000/api/meetings/${meeting.id}/agenda-items`);
            const agendaItems = agendaResponse.data;

            // Формируем строку с результатами голосования (по умолчанию пустая)
            let voteResultsString = '-';

            // Если есть вопросы повестки и заседание завершено, ищем результаты
            if (agendaItems.length > 0 && meeting.status === 'COMPLETED') {
              const voteResults = agendaItems
                .map(item => allVoteResults.find(result => result.agendaItemId === item.id))
                .filter(result => result !== undefined);

              // Формируем строку с результатами голосования
              voteResultsString = voteResults
                .map(result => `${result.question}, За - ${result.votesFor}, Против - ${result.votesAgainst}, Воздержались - ${result.votesAbstain}, Не проголосовали - ${result.votesAbsent}`)
                .join('\n') || '-';
            }

            return {
              ...meeting,
              voteResults: voteResultsString,
            };
          })
        );

        setMeetings(meetingsWithResults);
      } catch (error) {
        console.error('Error fetching meetings:', error.message);
        setErrorMessage('Ошибка загрузки списка заседаний.');
      }
    };

    fetchData();
  }, []);

  const handleArchiveMeeting = async (meetingId) => {
    try {
      await axios.post(`http://217.114.10.226:5000/api/meetings/${meetingId}/archive`);
      setMeetings(meetings.filter(meeting => meeting.id !== meetingId));
    } catch (error) {
      console.error('Error archiving meeting:', error.message);
      setErrorMessage('Ошибка при архивировании заседания.');
    }
  };

  return (
    <div className="meeting-control-list">
      <h2>Список заседаний для управления</h2>
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}
      <table className="meetings-table control-meetings-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Начало</th>
            <th>Конец</th>
            <th>Подразделения</th>
            <th>Статус</th>
            <th>Итоги голосования</th>
            <th>Действие</th>
            <th></th> {/* Колонка для кнопки архивирования */}
          </tr>
        </thead>
        <tbody>
          {meetings.map(meeting => (
            <tr
              key={meeting.id}
              className={
                meeting.status === 'COMPLETED'
                  ? 'completed-meeting'
                  : meeting.status === 'IN_PROGRESS'
                  ? 'in-progress-meeting'
                  : ''
              }
            >
              <td>{meeting.name}</td>
              <td>{meeting.startTime}</td>
              <td>{meeting.endTime}</td>
              <td className="divisions-column">{meeting.divisions || 'Нет'}</td>
              <td>{meeting.status}</td>
              <td className="vote-results-column">{meeting.voteResults}</td>
              <td>
                <Link to={`/admin/control/meeting/${meeting.id}`}>Управлять</Link>
              </td>
              <td>
                <button
                  className="archive-icon"
                  onClick={() => handleArchiveMeeting(meeting.id)}
                >
                  🗃️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MeetingControlList;