import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

function MeetingsPage() {
  return (
    <div className="meetings-page">
      <Routes>
        <Route path="/" element={<MeetingsList />} />
        <Route path="/archive" element={<MeetingsArchive />} />
      </Routes>
    </div>
  );
}

function MeetingsList() {
  const [meetings, setMeetings] = useState([]);
  const [divisions, setDivisions] = useState([]); // Список подразделений
  const [users, setUsers] = useState([]); // Список всех пользователей
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false); // Для ошибки с докладчиком
  const [errorMessage, setErrorMessage] = useState(''); // Сообщение об ошибке
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null);
  const [newMeeting, setNewMeeting] = useState({
    name: '',
    startTime: '',
    endTime: '',
    divisionIds: [], // Храним ID подразделений
    agendaItems: [],
  });
  const [tempMeetingId, setTempMeetingId] = useState(null); // Временный ID для нового заседания
  const [isDeletingTempMeeting, setIsDeletingTempMeeting] = useState(false); // Флаг для предотвращения повторного удаления
  const [isSaved, setIsSaved] = useState(false); // Флаг для отслеживания успешного сохранения

  useEffect(() => {
    // Получение списка заседаний через API
    const fetchMeetings = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/meetings');
        console.log('Fetched meetings on frontend:', response.data);
        setMeetings(response.data);
        console.log('Updated meetings state:', response.data); // Логируем состояние после обновления
      } catch (error) {
        console.error('Error fetching meetings:', error.message);
      }
    };

    // Получение списка подразделений через API
    const fetchDivisions = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/divisions');
        setDivisions(response.data);
      } catch (error) {
        console.error('Error fetching divisions:', error.message);
      }
    };

    // Получение списка пользователей через API
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error.message);
      }
    };

    fetchMeetings();
    fetchDivisions();
    fetchUsers();
  }, []);

  // Фильтрация пользователей для докладчиков (только из выбранных подразделений)
  const getAvailableSpeakers = (selectedDivisionIds) => {
    if (!selectedDivisionIds || selectedDivisionIds.length === 0) return [];
    const selectedDivisionNames = divisions
      .filter(division => selectedDivisionIds.includes(division.id.toString()))
      .map(division => division.name);
    return users.filter(user => selectedDivisionNames.includes(user.division));
  };

  const handleAddMeeting = async () => {
    // Создаём временное заседание без повесток, чтобы сохранить ID
    try {
      const response = await axios.post('http://217.114.10.226:5000/api/meetings', {
        name: newMeeting.name || 'Временное заседание',
        startTime: newMeeting.startTime ? new Date(newMeeting.startTime).toISOString() : new Date().toISOString(),
        endTime: newMeeting.endTime ? new Date(newMeeting.endTime).toISOString() : new Date().toISOString(),
        divisionIds: newMeeting.divisionIds, // Отправляем ID подразделений
      });
      setTempMeetingId(response.data.id);
      setShowAddModal(true);
    } catch (error) {
      console.error('Error creating temporary meeting:', error.message);
    }
  };

  const handleEditMeeting = async (meeting) => {
    try {
      // Получаем повестки для заседания
      const response = await axios.get(`http://217.114.10.226:5000/api/meetings/${meeting.id}/agenda-items`);
      // Получаем ID подразделений из их названий
      const divisionNames = meeting.divisions ? meeting.divisions.split(', ') : [];
      const divisionIds = divisions
        .filter(division => divisionNames.includes(division.name))
        .map(division => division.id.toString());
      setEditMeeting({
        ...meeting,
        startTime: meeting.startTime.slice(0, 16),
        endTime: meeting.endTime.slice(0, 16),
        divisionIds: divisionIds,
        agendaItems: response.data.map(item => ({
          id: item.id, // Сохраняем ID для обновления
          number: item.number,
          title: item.title,
          speakerId: item.speakerId ? item.speakerId.toString() : '',
          link: item.link || '',
        })),
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching agenda items:', error.message);
      setEditMeeting({
        ...meeting,
        startTime: meeting.startTime.slice(0, 16),
        endTime: meeting.endTime.slice(0, 16),
        divisionIds: [],
        agendaItems: [],
      });
      setShowEditModal(true);
    }
  };

  const handleDeleteMeeting = (meeting) => {
    setMeetingToDelete(meeting);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/meetings/${meetingToDelete.id}`);
      setMeetings(meetings.filter(meeting => meeting.id !== meetingToDelete.id));
      setShowDeleteModal(false); // Закрываем модальное окно
      setMeetingToDelete(null);
    } catch (error) {
      console.error('Error deleting meeting:', error.message);
      setShowDeleteModal(false); // Закрываем модальное окно даже при ошибке
      setMeetingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMeetingToDelete(null);
  };

  const handleArchiveMeeting = async (meetingId) => {
    try {
      await axios.post(`http://217.114.10.226:5000/api/meetings/${meetingId}/archive`);
      setMeetings(meetings.map(meeting =>
        meeting.id === meetingId ? { ...meeting, isArchived: true } : meeting
      ));
    } catch (error) {
      console.error('Error archiving meeting:', error.message);
    }
  };

  const handleModalClose = (type) => {
    if (type === 'add') {
      // Удаляем временное заседание, только если оно не было сохранено
      if (tempMeetingId && !isDeletingTempMeeting && !isSaved) {
        setIsDeletingTempMeeting(true); // Устанавливаем флаг, чтобы избежать повторных запросов
        axios.delete(`http://217.114.10.226:5000/api/meetings/${tempMeetingId}`).catch(error => {
          console.error('Error deleting temporary meeting:', error.message);
        }).finally(() => {
          setIsDeletingTempMeeting(false); // Сбрасываем флаг после завершения
        });
      }
      setShowAddModal(false);
      setNewMeeting({ name: '', startTime: '', endTime: '', divisionIds: [], agendaItems: [] });
      setTempMeetingId(null);
      setIsSaved(false); // Сбрасываем флаг после закрытия
    } else if (type === 'edit') {
      setShowEditModal(false);
      setEditMeeting(null);
      setIsSaved(false); // Сбрасываем флаг после закрытия
    } else if (type === 'error') {
      setShowErrorModal(false);
      setErrorMessage('');
    }
  };

  const handleModalApply = async (type) => {
    if (type === 'add') {
      console.log('Sending new meeting data:', newMeeting);
      try {
        // Обновляем временное заседание
        const response = await axios.put(`http://217.114.10.226:5000/api/meetings/${tempMeetingId}`, {
          ...newMeeting,
          startTime: newMeeting.startTime ? new Date(newMeeting.startTime).toISOString() : null,
          endTime: newMeeting.endTime ? new Date(newMeeting.endTime).toISOString() : null,
          divisionIds: newMeeting.divisionIds, // Отправляем ID подразделений
        });
        const updatedMeeting = {
          ...response.data,
          divisions: divisions
            .filter(division => newMeeting.divisionIds.includes(division.id.toString()))
            .map(division => division.name)
            .join(', ') || 'Нет',
          resultLink: `/admin/control/meeting/${response.data.id}`,
        };
        console.log('Meeting saved successfully:', updatedMeeting);

        // Даём серверу время на сохранение данных
        await new Promise(resolve => setTimeout(resolve, 500));

        // Загружаем обновлённый список заседаний с сервера
        const fetchMeetingsResponse = await axios.get('http://217.114.10.226:5000/api/meetings');
        setMeetings(fetchMeetingsResponse.data);
        console.log('Updated meetings list after save:', fetchMeetingsResponse.data);

        // Закрываем модальное окно без удаления заседания
        setShowAddModal(false);
        setNewMeeting({ name: '', startTime: '', endTime: '', divisionIds: [], agendaItems: [] });
        setTempMeetingId(null);
        setIsSaved(false);
      } catch (error) {
        console.error('Error updating meeting:', error.message);
      }
    } else if (type === 'edit') {
      console.log('Sending edit meeting data:', editMeeting);
      // Проверяем статус заседания перед редактированием
      if (editMeeting.status === 'COMPLETED') {
        setErrorMessage('Нельзя редактировать завершённое заседание.');
        setShowErrorModal(true);
        return;
      }
      try {
        const response = await axios.put(`http://217.114.10.226:5000/api/meetings/${editMeeting.id}`, {
          ...editMeeting,
          startTime: editMeeting.startTime ? new Date(editMeeting.startTime).toISOString() : null,
          endTime: editMeeting.endTime ? new Date(editMeeting.endTime).toISOString() : null,
          divisionIds: editMeeting.divisionIds, // Отправляем ID подразделений
        });
        const updatedMeeting = {
          ...response.data,
          divisions: divisions
            .filter(division => editMeeting.divisionIds.includes(division.id.toString()))
            .map(division => division.name)
            .join(', ') || 'Нет',
          resultLink: `/admin/control/meeting/${editMeeting.id}`,
        };
        console.log('Meeting edited successfully:', updatedMeeting);

        // Даём серверу время на сохранение данных
        await new Promise(resolve => setTimeout(resolve, 500));

        // Загружаем обновлённый список заседаний с сервера
        const fetchMeetingsResponse = await axios.get('http://217.114.10.226:5000/api/meetings');
        setMeetings(fetchMeetingsResponse.data);
        console.log('Updated meetings list after edit:', fetchMeetingsResponse.data);

        // Закрываем модальное окно без удаления заседания
        setShowEditModal(false);
        setEditMeeting(null);
        setIsSaved(false);
      } catch (error) {
        console.error('Error editing meeting:', error.message);
      }
    }
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;
    if (type === 'add') {
      setNewMeeting({ ...newMeeting, [name]: value });
    } else if (type === 'edit') {
      setEditMeeting({ ...editMeeting, [name]: value });
    }
  };

  const handleDivisionAdd = (divisionId, type) => {
    if (type === 'add') {
      if (!newMeeting.divisionIds.includes(divisionId)) {
        setNewMeeting({ ...newMeeting, divisionIds: [...newMeeting.divisionIds, divisionId] });
      }
    } else if (type === 'edit') {
      if (!editMeeting.divisionIds.includes(divisionId)) {
        setEditMeeting({ ...editMeeting, divisionIds: [...editMeeting.divisionIds, divisionId] });
      }
    }
  };

  const handleDivisionRemove = (divisionId, type) => {
    const selectedDivisionIds = type === 'add' ? newMeeting.divisionIds : editMeeting.divisionIds;
    const agendaItems = type === 'add' ? newMeeting.agendaItems : editMeeting.agendaItems;

    // Проверяем, есть ли докладчики из этого подразделения
    const speakersFromDivision = getAvailableSpeakers([divisionId]);
    const speakerIdsFromDivision = speakersFromDivision.map(user => user.id.toString());
    const hasActiveSpeaker = agendaItems.some(item => speakerIdsFromDivision.includes(item.speakerId));

    if (hasActiveSpeaker) {
      setErrorMessage('Нельзя удалить подразделения с активным докладчиком. Замените докладчика.');
      setShowErrorModal(true);
      return;
    }

    if (type === 'add') {
      setNewMeeting({ ...newMeeting, divisionIds: selectedDivisionIds.filter(id => id !== divisionId) });
    } else if (type === 'edit') {
      setEditMeeting({ ...editMeeting, divisionIds: selectedDivisionIds.filter(id => id !== divisionId) });
    }
  };

  const handleAgendaAdd = async (type) => {
    if (type === 'add') {
      try {
        const response = await axios.post(`http://217.114.10.226:5000/api/meetings/${tempMeetingId}/agenda-items`, {
          number: newMeeting.agendaItems.length + 1,
          title: '',
          speakerId: null,
          link: '',
        });
        setNewMeeting({
          ...newMeeting,
          agendaItems: [...newMeeting.agendaItems, {
            id: response.data.id,
            number: response.data.number,
            title: response.data.title,
            speakerId: response.data.speakerId ? response.data.speakerId.toString() : '',
            link: response.data.link || '',
          }],
        });
      } catch (error) {
        console.error('Error adding agenda item:', error.message);
      }
    } else if (type === 'edit') {
      try {
        const response = await axios.post(`http://217.114.10.226:5000/api/meetings/${editMeeting.id}/agenda-items`, {
          number: editMeeting.agendaItems.length + 1,
          title: '',
          speakerId: null,
          link: '',
        });
        setEditMeeting({
          ...editMeeting,
          agendaItems: [...editMeeting.agendaItems, {
            id: response.data.id,
            number: response.data.number,
            title: response.data.title,
            speakerId: response.data.speakerId ? response.data.speakerId.toString() : '',
            link: response.data.link || '',
          }],
        });
      } catch (error) {
        console.error('Error adding agenda item:', error.message);
      }
    }
  };

  const handleAgendaRemove = async (index, type) => {
    if (type === 'add') {
      const itemId = newMeeting.agendaItems[index].id;
      try {
        await axios.delete(`http://217.114.10.226:5000/api/meetings/${tempMeetingId}/agenda-items/${itemId}`);
        setNewMeeting({
          ...newMeeting,
          agendaItems: newMeeting.agendaItems.filter((_, i) => i !== index),
        });
      } catch (error) {
        console.error('Error deleting agenda item:', error.message);
      }
    } else if (type === 'edit') {
      const itemId = editMeeting.agendaItems[index].id;
      try {
        await axios.delete(`http://217.114.10.226:5000/api/meetings/${editMeeting.id}/agenda-items/${itemId}`);
        setEditMeeting({
          ...editMeeting,
          agendaItems: editMeeting.agendaItems.filter((_, i) => i !== index),
        });
      } catch (error) {
        console.error('Error deleting agenda item:', error.message);
      }
    }
  };

  const handleAgendaChange = (index, field, value, type) => {
    if (type === 'add') {
      setNewMeeting({
        ...newMeeting,
        agendaItems: newMeeting.agendaItems.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      });
    } else if (type === 'edit') {
      setEditMeeting({
        ...editMeeting,
        agendaItems: editMeeting.agendaItems.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      });
    }
  };

  return (
    <>
      <div className="meetings-header">
        <button className="add-button" onClick={handleAddMeeting}>+ Добавить заседание</button>
        <Link to="/admin/meetings/archive" className="archive-link">Архив заседаний</Link>
      </div>
      <table className="meetings-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Начало</th>
            <th>Конец</th>
            <th>Подразделения</th>
            <th>Результат</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {meetings.map(meeting => (
            !meeting.isArchived && (
              <tr
                key={meeting.id}
                onClick={() => {
                  if (meeting.status !== 'COMPLETED') {
                    handleEditMeeting(meeting);
                  }
                }}
                style={{ cursor: meeting.status !== 'COMPLETED' ? 'pointer' : 'default' }}
                className={meeting.status === 'COMPLETED' ? 'completed-meeting' : ''}
              >
                <td>{meeting.name}</td>
                <td>{meeting.startTime}</td>
                <td>{meeting.endTime}</td>
                <td className="divisions-column">{meeting.divisions || 'Нет'}</td>
                <td>
                  {meeting.status === 'COMPLETED' ? (
                    <Link to={`/admin/protocol/${meeting.id}`}>Результат</Link>
                  ) : (
                    'Ждет запуска'
                  )}
                </td>
                <td>
                  <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting); }}>X</button>
                </td>
                <td>
                  <button className="archive-icon" onClick={(e) => { e.stopPropagation(); handleArchiveMeeting(meeting.id); }}>🗃️</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Добавить заседание</h3>
            <div className="form-group">
              <label>Наименование заседания *</label>
              <input
                name="name"
                value={newMeeting.name}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Время и дата начала *</label>
              <input
                name="startTime"
                type="datetime-local"
                value={newMeeting.startTime}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Время и дата окончания *</label>
              <input
                name="endTime"
                type="datetime-local"
                value={newMeeting.endTime}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Подразделение</label>
              <select onChange={(e) => handleDivisionAdd(e.target.value, 'add')}>
                <option value="">Выберите подразделение</option>
                {divisions.map(division => (
                  <option key={division.id} value={division.id}>{division.name}</option>
                ))}
              </select>
            </div>
            <div className="divisions-list">
              {newMeeting.divisionIds.map(divisionId => {
                const division = divisions.find(d => d.id.toString() === divisionId);
                return (
                  <div key={divisionId} className="division-item">
                    <span>{division ? division.name : 'Неизвестное подразделение'}</span>
                    <button onClick={() => handleDivisionRemove(divisionId, 'add')}>⛓️‍💥</button>
                  </div>
                );
              })}
            </div>
            <h4>Вопросы повестки</h4>
            <table className="agenda-table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Наименование</th>
                  <th>Докладчик</th>
                  <th>Ссылка</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {newMeeting.agendaItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.number}</td>
                    <td>
                      <input
                        value={item.title}
                        onChange={(e) => handleAgendaChange(index, 'title', e.target.value, 'add')}
                      />
                    </td>
                    <td>
                      <select
                        value={item.speakerId}
                        onChange={(e) => handleAgendaChange(index, 'speakerId', e.target.value, 'add')}
                      >
                        <option value="">Выберите докладчика</option>
                        {getAvailableSpeakers(newMeeting.divisionIds).map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={item.link}
                        onChange={(e) => handleAgendaChange(index, 'link', e.target.value, 'add')}
                      />
                    </td>
                    <td>
                      <button className="delete-button" onClick={() => handleAgendaRemove(index, 'add')}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-buttons">
              <button className="add-agenda-button" onClick={() => handleAgendaAdd('add')}>+ Добавить вопрос</button>
              <div className="action-buttons">
                <button onClick={() => handleModalApply('add')}>Сохранить</button>
                <button onClick={() => handleModalClose('add')}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Редактировать заседание</h3>
            <div className="form-group">
              <label>Наименование заседания *</label>
              <input
                name="name"
                value={editMeeting.name}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Время и дата начала *</label>
              <input
                name="startTime"
                type="datetime-local"
                value={editMeeting.startTime}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Время и дата окончания *</label>
              <input
                name="endTime"
                type="datetime-local"
                value={editMeeting.endTime}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Подразделение</label>
              <select onChange={(e) => handleDivisionAdd(e.target.value, 'edit')}>
                <option value="">Выберите подразделение</option>
                {divisions.map(division => (
                  <option key={division.id} value={division.id}>{division.name}</option>
                ))}
              </select>
            </div>
            <div className="divisions-list">
              {editMeeting.divisionIds.map(divisionId => {
                const division = divisions.find(d => d.id.toString() === divisionId);
                return (
                  <div key={divisionId} className="division-item">
                    <span>{division ? division.name : 'Неизвестное подразделение'}</span>
                    <button onClick={() => handleDivisionRemove(divisionId, 'edit')}>⛓️‍💥</button>
                  </div>
                );
              })}
            </div>
            <h4>Вопросы повестки</h4>
            <table className="agenda-table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Наименование</th>
                  <th>Докладчик</th>
                  <th>Ссылка</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editMeeting.agendaItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.number}</td>
                    <td>
                      <input
                        value={item.title}
                        onChange={(e) => handleAgendaChange(index, 'title', e.target.value, 'edit')}
                      />
                    </td>
                    <td>
                      <select
                        value={item.speakerId}
                        onChange={(e) => handleAgendaChange(index, 'speakerId', e.target.value, 'edit')}
                      >
                        <option value="">Выберите докладчика</option>
                        {getAvailableSpeakers(editMeeting.divisionIds).map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={item.link}
                        onChange={(e) => handleAgendaChange(index, 'link', e.target.value, 'edit')}
                      />
                    </td>
                    <td>
                      <button className="delete-button" onClick={() => handleAgendaRemove(index, 'edit')}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-buttons">
              <button className="add-agenda-button" onClick={() => handleAgendaAdd('edit')}>+ Добавить вопрос</button>
              <div className="action-buttons">
                <button onClick={() => handleModalApply('edit')}>Сохранить</button>
                <button onClick={() => handleModalClose('edit')}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Вы уверены, что хотите удалить заседание {meetingToDelete?.name}?</p>
            <button onClick={confirmDelete}>Да</button>
            <button onClick={cancelDelete}>Нет</button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal">
          <div className="modal-content">
            <p>{errorMessage}</p>
            <button onClick={() => handleModalClose('error')}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}

function MeetingsArchive() {
  const [meetings, setMeetings] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Модальное окно для удаления
  const [meetingToDelete, setMeetingToDelete] = useState(null); // Заседание, которое будем удалять

  useEffect(() => {
    // Получение списка архивных заседаний через API
    const fetchMeetings = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/meetings/archived');
        setMeetings(response.data);
      } catch (error) {
        console.error('Error fetching archived meetings:', error.message);
      }
    };

    fetchMeetings();
  }, []);

  const handleDeleteMeeting = (meeting) => {
    setMeetingToDelete(meeting);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/meetings/${meetingToDelete.id}`);
      setMeetings(meetings.filter(meeting => meeting.id !== meetingToDelete.id));
      setShowDeleteModal(false);
      setMeetingToDelete(null);
    } catch (error) {
      console.error('Error deleting archived meeting:', error.message);
      setShowDeleteModal(false);
      setMeetingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMeetingToDelete(null);
  };

  return (
    <div className="meetings-archive">
      <h2>Архив заседаний</h2>
      <table className="meetings-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Начало</th>
            <th>Конец</th>
            <th>Подразделения</th>
            <th>Результат</th>
            <th></th> {/* Добавляем колонку для кнопки удаления */}
          </tr>
        </thead>
        <tbody>
          {meetings.map(meeting => (
            <tr
              key={meeting.id}
              className={meeting.status === 'COMPLETED' ? 'completed-meeting' : ''}
            >
              <td>{meeting.name}</td>
              <td>{meeting.startTime}</td>
              <td>{meeting.endTime}</td>
              <td className="divisions-column">{meeting.divisions || 'Нет'}</td>
              <td>
                {meeting.status === 'COMPLETED' ? (
                  <Link to={`/admin/protocol/${meeting.id}`}>Результат</Link>
                ) : (
                  'Ждет запуска'
                )}
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting); }}
                >
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link to="/admin/meetings" className="back-link">Назад к заседаниям</Link>

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Вы уверены, что хотите удалить заседание {meetingToDelete?.name}?</p>
            <button onClick={confirmDelete}>Да</button>
            <button onClick={cancelDelete}>Нет</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingsPage;