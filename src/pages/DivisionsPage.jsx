import { useState, useEffect } from 'react';

function DivisionsPage() {
  const [divisions, setDivisions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState(null);
  const [editDivision, setEditDivision] = useState(null);
  const [newDivision, setNewDivision] = useState({ name: '', users: [] });

  useEffect(() => {
    // Заглушка для загрузки подразделений
    setDivisions([
      { id: 1, name: 'Отдел 1', userCount: 3 },
    ]);
  }, []);

  const handleAddDivision = () => {
    setShowAddModal(true);
  };

  const handleEditDivision = (division) => {
    setEditDivision({ ...division, users: [] }); // Пока заглушка для пользователей
    setShowEditModal(true);
  };

  const handleDeleteDivision = (division) => {
    setDivisionToDelete(division);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setDivisions(divisions.filter(division => division.id !== divisionToDelete.id));
    setShowDeleteModal(false);
    setDivisionToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDivisionToDelete(null);
  };

  const handleModalClose = (type) => {
    if (type === 'add') {
      setShowAddModal(false);
      setNewDivision({ name: '', users: [] });
    } else if (type === 'edit') {
      setShowEditModal(false);
      setEditDivision(null);
    }
  };

  const handleModalApply = (type) => {
    if (type === 'add') {
      console.log('Adding division:', newDivision);
      setDivisions([...divisions, { ...newDivision, id: divisions.length + 1, userCount: newDivision.users.length }]);
      handleModalClose('add');
    } else if (type === 'edit') {
      console.log('Editing division:', editDivision);
      setDivisions(divisions.map(division => division.id === editDivision.id ? { ...editDivision, userCount: editDivision.users.length } : division));
      handleModalClose('edit');
    }
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;
    if (type === 'add') {
      setNewDivision({ ...newDivision, [name]: value });
    } else if (type === 'edit') {
      setEditDivision({ ...editDivision, [name]: value });
    }
  };

  const handleUserAdd = (userId, type) => {
    if (type === 'add') {
      setNewDivision({ ...newDivision, users: [...newDivision.users, userId] });
    } else if (type === 'edit') {
      setEditDivision({ ...editDivision, users: [...editDivision.users, userId] });
    }
  };

  const handleUserRemove = (userId, type) => {
    if (type === 'add') {
      setNewDivision({ ...newDivision, users: newDivision.users.filter(id => id !== userId) });
    } else if (type === 'edit') {
      setEditDivision({ ...editDivision, users: editDivision.users.filter(id => id !== userId) });
    }
  };

  return (
    <div className="divisions-page">
      <button className="add-button" onClick={handleAddDivision}>+ Добавить подразделение</button>
      <table className="divisions-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Кол-во пользователей</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {divisions.map(division => (
            <tr key={division.id}>
              <td onClick={() => handleEditDivision(division)} style={{ cursor: 'pointer' }}>{division.name}</td>
              <td>{division.userCount}</td>
              <td>
                <button className="delete-button" onClick={() => handleDeleteDivision(division)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Добавить подразделение</h3>
            <div className="form-group">
              <label>Название подразделения *</label>
              <input
                name="name"
                value={newDivision.name}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Добавить пользователя</label>
              <select onChange={(e) => handleUserAdd(e.target.value, 'add')}>
                <option value="">Выберите пользователя</option>
                <option value="1">Иванов И.И.</option>
                <option value="2">Петров П.П.</option>
              </select>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {newDivision.users.map(userId => (
                  <tr key={userId}>
                    <td>{userId === '1' ? 'Иванов И.И.' : 'Петров П.П.'}</td>
                    <td>{userId === '1' ? 'ivanov@example.com' : 'petrov@example.com'}</td>
                    <td>
                      <button onClick={() => handleUserRemove(userId, 'add')}>⛓️‍💥</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => handleModalApply('add')}>Применить</button>
            <button onClick={() => handleModalClose('add')}>Отмена</button>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Редактировать подразделение</h3>
            <div className="form-group">
              <label>Название подразделения *</label>
              <input
                name="name"
                value={editDivision.name}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Добавить пользователя</label>
              <select onChange={(e) => handleUserAdd(e.target.value, 'edit')}>
                <option value="">Выберите пользователя</option>
                <option value="1">Иванов И.И.</option>
                <option value="2">Петров П.П.</option>
              </select>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editDivision.users.map(userId => (
                  <tr key={userId}>
                    <td>{userId === '1' ? 'Иванов И.И.' : 'Петров П.П.'}</td>
                    <td>{userId === '1' ? 'ivanov@example.com' : 'petrov@example.com'}</td>
                    <td>
                      <button onClick={() => handleUserRemove(userId, 'edit')}>⛓️‍💥</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => handleModalApply('edit')}>Применить</button>
            <button onClick={() => handleModalClose('edit')}>Отмена</button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Вы уверены, что хотите удалить подразделение {divisionToDelete.name}?</p>
            <button onClick={confirmDelete}>Да</button>
            <button onClick={cancelDelete}>Нет</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DivisionsPage;