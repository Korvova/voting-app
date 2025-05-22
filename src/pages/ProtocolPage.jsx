import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Регистрируем шрифт
Font.register({
  family: 'Roboto',
  src: '/fonts/Roboto-Regular.ttf',
});

// Стили для PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableHeader: {
    backgroundColor: '#16A085',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  voteResult: {
    marginBottom: 5,
  },
  maxVote: {
    backgroundColor: '#006400', // Тёмно-зеленый
    color: 'white',
    padding: 2,
  },
});

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
            .map(vote => ({
              question: vote.question,
              results: `За - ${vote.votesFor} | Против - ${vote.votesAgainst} | Воздержались - ${vote.votesAbstain} | Не проголосовали - ${vote.votesAbsent}`,
              votesFor: vote.votesFor,
              votesAgainst: vote.votesAgainst,
              votesAbstain: vote.votesAbstain,
              votesAbsent: vote.votesAbsent,
            }));

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

  // Компонент PDF-документа
  const MyDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Протокол заседания: {meeting.name}</Text>
        <View style={styles.table}>
          {/* Заголовки таблицы */}
          <View style={styles.tableRow}>
            <View style={[styles.tableCol, { width: 30 }, styles.tableHeader]}>
              <Text>Номер</Text>
            </View>
            <View style={[styles.tableCol, { width: 100 }, styles.tableHeader]}>
              <Text>Вопрос</Text>
            </View>
            <View style={[styles.tableCol, { width: 80 }, styles.tableHeader]}>
              <Text>Докладчик</Text>
            </View>
            <View style={[styles.tableCol, { width: 300 }, styles.tableHeader]}>
              <Text>Итоги голосования</Text>
            </View>
          </View>
          {/* Строки таблицы */}
          {meeting.agendaItems.map(item => (
            <View style={styles.tableRow} key={item.number}>
              <View style={[styles.tableCol, { width: 30 }]}>
                <Text style={styles.tableCell}>{item.number}</Text>
              </View>
              <View style={[styles.tableCol, { width: 100 }]}>
                <Text style={styles.tableCell}>{item.title}</Text>
              </View>
              <View style={[styles.tableCol, { width: 80 }]}>
                <Text style={styles.tableCell}>{item.speaker}</Text>
              </View>
              <View style={[styles.tableCol, { width: 300 }]}>
                {item.votes.length > 0 ? (
                  item.votes.map((vote, index) => {
                    const maxVotes = Math.max(vote.votesFor, vote.votesAgainst, vote.votesAbstain, vote.votesAbsent);
                    const results = vote.results.split(' | ').map((part, idx) => {
                      const value = parseInt(part.split(' - ')[1]);
                      const isMax = value === maxVotes && value > 0;
                      return (
                        <Text key={idx} style={[styles.tableCell, isMax ? styles.maxVote : {}]}>
                          {part}{idx < 3 ? ' | ' : ''}
                        </Text>
                      );
                    });

                    return (
                      <View key={index} style={styles.voteResult}>
                        <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{vote.question}</Text>
                        <Text>{results}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.tableCell}>Голосование не проводилось</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

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
                  {item.votes.length > 0 ? (
                    item.votes.map((vote, index) => {
                      const maxVotes = Math.max(vote.votesFor, vote.votesAgainst, vote.votesAbstain, vote.votesAbsent);
                      return (
                        <div key={index}>
                          <strong>{vote.question}</strong>
                          <br />
                          {vote.results.split(' | ').map((part, idx) => {
                            const value = parseInt(part.split(' - ')[1]);
                            const isMax = value === maxVotes && value > 0;
                            return (
                              <span key={idx} style={isMax ? { backgroundColor: '#006400', color: 'white', padding: '2px' } : {}}>
                                {part}{idx < 3 ? ' | ' : ''}
                              </span>
                            );
                          })}
                          {index < item.votes.length - 1 && <br />}
                        </div>
                      );
                    })
                  ) : 'Голосование не проводилось'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link
          to={user.isAdmin ? "/admin/meetings" : "/user"}
          className="back-link"
          style={{ display: 'block', margin: '20px 0' }}
        >
          Назад к списку заседаний
        </Link>
        <PDFDownloadLink document={<MyDocument />} fileName={`protocol_${id}.pdf`}>
          {({ blob, url, loading, error }) =>
            loading ? (
              'Генерация PDF...'
            ) : (
              <button
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Скачать PDF
              </button>
            )
          }
        </PDFDownloadLink>
      </div>
    </div>
  );
}

export default ProtocolPage;