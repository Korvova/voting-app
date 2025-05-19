import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ProtocolPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);

  useEffect(() => {
    // Заглушка для загрузки данных заседания
    setMeeting({
      id: parseInt(id),
      name: 'Заседание 1',
      agendaItems: [
        { id: 1, number: 1, title: 'Вопрос 1', speaker: 'Иванов И.И.', votes: ['Вопрос 1, За - 25, Против - 1, Воздержались - 5, Не проголосовали - 1'] },
        { id: 2, number: 2, title: 'Вопрос 2', speaker: 'Петров П.П.', votes: ['Вопрос 2, За - 20, Против - 3, Воздержались - 4, Не проголосовали - 5'] },
      ],
    });
  }, [id]);

  if (!meeting) return <div>Загрузка...</div>;

  return (
    <div className="protocol-page">
      <h2>Протокол повестки: {meeting.name}</h2>
      <table className="protocol-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Вопрос</th>
            <th>Докладчик</th>
            <th>Итоги голосования</th>
          </tr>
        </thead>
        <tbody>
          {meeting.agendaItems.map(item => (
            <tr key={item.id}>
              <td>{item.number}</td>
              <td>{item.title}</td>
              <td>{item.speaker}</td>
              <td className="vote-results-column">{item.votes.length > 0 ? item.votes.join('\n') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProtocolPage;