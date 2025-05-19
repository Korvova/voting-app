import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null);
  const [newMeeting, setNewMeeting] = useState({
    name: '',
    startTime: '',
    endTime: '',
    divisions: [],
    agendaItems: [],
  });

  useEffect(() => {
    // Заглушка для загрузки заседаний
    setMeetings([
      {
        id: 1,
        name: 'Заседание 1',
        startTime: '2025-05-20 10:00',
        endTime: '2025-05-20 12:00',
        divisions: ['Отдел 1', 'Отдел 2'],
        resultLink: '/results/1',
      },
    ]);
  }, []);

  const handleAddMeeting = () => {
    setShowAddModal(true);
  };

  const handleEditMeeting = (meeting) => {
    setEditMeeting({ ...meeting });
    setShowEditModal(true);
  };

  const handleDeleteMeeting = (meeting) => {
    setMeetingToDelete(meeting);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setMeetings(meetings.filter(meeting => meeting.id !== meetingToDelete.id));
    setShowDeleteModal(false);
    setMeetingToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMeetingToDelete(null);
  };

  const handleArchiveMeeting = (meetingId) => {
    setMeetings(meetings.map(meeting =>
      meeting.id === meetingId ? { ...meeting, isArchived: true } : meeting
    ));
  };

  const handleModalClose = (type) => {
    if (type === 'add') {
      setShowAddModal(false);
      setNewMeeting({ name: '', startTime: '', endTime: '', divisions: [], agendaItems: [] });
    } else if (type === 'edit') {
      setShowEditModal(false);
      setEditMeeting(null);
    }
  };

  const handleModalApply = (type) => {
    if (type === 'add') {
      console.log('Adding meeting:', newMeeting);
      setMeetings([...meetings, {
        ...newMeeting,
        id: meetings.length + 1,
        divisions: newMeeting.divisions,
        resultLink: `/results/${meetings.length + 1}`,
      }]);
      handleModalClose('add');
    } else if (type === 'edit') {
      console.log('Editing meeting:', editMeeting);
      setMeetings(meetings.map(meeting => meeting.id === editMeeting.id ? { ...editMeeting } : meeting));
      handleModalClose('edit');
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
      setNewMeeting({ ...newMeeting, divisions: [...newMeeting.divisions, divisionId] });
    } else if (type === 'edit') {
      setEditMeeting({ ...editMeeting, divisions: [...editMeeting.divisions, divisionId] });
    }
  };

  const handleDivisionRemove = (divisionId, type) => {
    if (type === 'add') {
      setNewMeeting({ ...newMeeting, divisions: newMeeting.divisions.filter(id => id !== divisionId) });
    } else if (type === 'edit') {
      setEditMeeting({ ...editMeeting, divisions: editMeeting.divisions.filter(id => id !== divisionId) });
    }
  };

  const handleAgendaAdd = (type) => {
    if (type === 'add') {
      setNewMeeting({
        ...newMeeting,
        agendaItems: [...newMeeting.agendaItems, {
          number: newMeeting.agendaItems.length + 1,
          title: '',
          speakerId: '',
          link: '',
        }],
      });
    } else if (type === 'edit') {
      setEditMeeting({
        ...editMeeting,
        agendaItems: [...editMeeting.agendaItems, {
          number: editMeeting.agendaItems.length + 1,
          title: '',
          speakerId: '',
          link: '',
        }],
      });
    }
  };

  const handleAgendaRemove = (index, type) => {
    if (type === 'add') {
      setNewMeeting({
        ...newMeeting,
        agendaItems: newMeeting.agendaItems.filter((_, i) => i !== index),
      });
    } else if (type === 'edit') {
      setEditMeeting({
        ...editMeeting,
        agendaItems: editMeeting.agendaItems.filter((_, i) => i !== index),
      });
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
              <tr key={meeting.id} onClick={() => handleEditMeeting(meeting)} style={{ cursor: 'pointer' }}>
                <td>{meeting.name}</td>
                <td>{meeting.startTime}</td>
                <td>{meeting.endTime}</td>
              <td className="divisions-column">{meeting.divisions.join('\n') || 'Нет'}</td>
                <td><a href={meeting.resultLink}>Результат</a></td>
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
                <option value="Отдел 1">Отдел 1</option>
                <option value="Отдел 2">Отдел 2</option>
              </select>
            </div>
            <div className="divisions-list">
              {newMeeting.divisions.map(division => (
                <div key={division} className="division-item">
                  <span>{division}</span>
                  <button onClick={() => handleDivisionRemove(division, 'add')}>⛓️‍💥</button>
                </div>
              ))}
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
                        <option value="1">Иванов И.И.</option>
                        <option value="2">Петров П.П.</option>
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
                <option value="Отдел 1">Отдел 1</option>
                <option value="Отдел 2">Отдел 2</option>
              </select>
            </div>
            <div className="divisions-list">
              {editMeeting.divisions.map(division => (
                <div key={division} className="division-item">
                  <span>{division}</span>
                  <button onClick={() => handleDivisionRemove(division, 'edit')}>⛓️‍💥</button>
                </div>
              ))}
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
                        <option value="1">Иванов И.И.</option>
                        <option value="2">Петров П.П.</option>
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
            <p>Вы уверены, что хотите удалить заседание {meetingToDelete.name}?</p>
            <button onClick={confirmDelete}>Да</button>
            <button onClick={cancelDelete}>Нет</button>
          </div>
        </div>
      )}
    </>
  );
}

function MeetingsArchive() {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    // Заглушка для загрузки архивных заседаний
    setMeetings([
      {
        id: 1,
        name: 'Заседание 1',
        startTime: '2025-05-20 10:00',
        endTime: '2025-05-20 12:00',
        divisions: 'Отдел 1, Отдел 2',
        resultLink: '/results/1',
        isArchived: true,
      },
    ]);
  }, []);

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
          </tr>
        </thead>
        <tbody>
          {meetings.map(meeting => (
            meeting.isArchived && (
              <tr key={meeting.id}>
                <td>{meeting.name}</td>
                <td>{meeting.startTime}</td>
                <td>{meeting.endTime}</td>
               <td className="divisions-column">{meeting.divisions.join('\n') || 'Нет'}</td>
                <td><a href={meeting.resultLink}>Результат</a></td>
              </tr>
            )
          ))}
        </tbody>
      </table>
      <Link to="/admin/meetings" className="back-link">Назад к заседаниям</Link>
    </div>
  );
}

export default MeetingsPage;