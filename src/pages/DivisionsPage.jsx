import { useState, useEffect } from 'react';
import axios from 'axios';

function DivisionsPage() {
  const [divisions, setDivisions] = useState([]);
  const [users, setUsers] = useState([]); // Список всех пользователей
  const [availableUsers, setAvailableUsers] = useState([]); // Пользователи без подразделения
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState(null);
  const [editDivision, setEditDivision] = useState(null);
  const [newDivision, setNewDivision] = useState({ name: '', users: [] });

  useEffect(() => {
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
        // Фильтруем пользователей, у которых нет подразделения
        setAvailableUsers(response.data.filter(user => !user.division || user.division === 'Нет'));
      } catch (error) {
        console.error('Error fetching users:', error.message);
      }
    };

    fetchDivisions();
    fetchUsers();
  }, []);

  const handleAddDivision = () => {
    setShowAddModal(true);
  };

  const handleEditDivision = async (division) => {
    try {
      // Получаем пользователей, привязанных к подразделению
      const response = await axios.get('http://217.114.10.226:5000/api/users');
      const divisionUsers = response.data
        .filter(user => user.division !== 'Нет' && user.division === division.name)
        .map(user => user.id.toString());
      setEditDivision({ ...division, users: divisionUsers });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching division users:', error.message);
      setEditDivision({ ...division, users: [] });
      setShowEditModal(true);
    }
  };

  const handleDeleteDivision = (division) => {
    setDivisionToDelete(division);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/divisions/${divisionToDelete.id}`);
      setDivisions(divisions.filter(division => division.id !== divisionToDelete.id));
      // Обновляем список доступных пользователей после удаления подразделения
      const response = await axios.get('http://217.114.10.226:5000/api/users');
      setUsers(response.data);
      setAvailableUsers(response.data.filter(user => !user.division || user.division === 'Нет'));
      setShowDeleteModal(false);
      setDivisionToDelete(null);
    } catch (error) {
      console.error('Error deleting division:', error.message);
    }
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

  const handleModalApply = async (type) => {
    if (type === 'add') {
      try {
        const response = await axios.post('http://217.114.10.226:5000/api/divisions', { name: newDivision.name });
        setDivisions([...divisions, { ...response.data, userCount: newDivision.users.length }]);
        // Назначить пользователей подразделению
        await Promise.all(newDivision.users.map(userId =>
          axios.put(`http://217.114.10.226:5000/api/users/${userId}`, { divisionId: response.data.id })
        ));
        // Обновляем список доступных пользователей
        const userResponse = await axios.get('http://217.114.10.226:5000/api/users');
        setUsers(userResponse.data);
        setAvailableUsers(userResponse.data.filter(user => !user.division || user.division === 'Нет'));
        handleModalClose('add');
      } catch (error) {
        console.error('Error adding division:', error.message);
      }
    } else if (type === 'edit') {
      try {
        const response = await axios.put(`http://217.114.10.226:5000/api/divisions/${editDivision.id}`, { name: editDivision.name });
        setDivisions(divisions.map(division => (division.id === editDivision.id ? { ...response.data, userCount: editDivision.users.length } : division)));
        // Назначить пользователей подразделению
        await Promise.all(editDivision.users.map(userId =>
          axios.put(`http://217.114.10.226:5000/api/users/${userId}`, { divisionId: editDivision.id })
        ));
        // Обновляем список доступных пользователей
        const userResponse = await axios.get('http://217.114.10.226:5000/api/users');
        setUsers(userResponse.data);
        setAvailableUsers(userResponse.data.filter(user => !user.division || user.division === 'Нет'));
        handleModalClose('edit');
      } catch (error) {
        console.error('Error editing division:', error.message);
      }
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
      if (!newDivision.users.includes(userId)) {
        setNewDivision({ ...newDivision, users: [...newDivision.users, userId] });
      }
    } else if (type === 'edit') {
      if (!editDivision.users.includes(userId)) {
        setEditDivision({ ...editDivision, users: [...editDivision.users, userId] });
      }
    }
  };

  const handleUserRemove = async (userId, type) => {
    try {
      // Отвязываем пользователя от подразделения
      await axios.put(`http://217.114.10.226:5000/api/users/${userId}`, { divisionId: null });
      if (type === 'add') {
        setNewDivision({ ...newDivision, users: newDivision.users.filter(id => id !== userId) });
      } else if (type === 'edit') {
        setEditDivision({ ...editDivision, users: editDivision.users.filter(id => id !== userId) });
      }
      // Обновляем список доступных пользователей
      const userResponse = await axios.get('http://217.114.10.226:5000/api/users');
      setUsers(userResponse.data);
      setAvailableUsers(userResponse.data.filter(user => !user.division || user.division === 'Нет'));
    } catch (error) {
      console.error('Error unassigning user:', error.message);
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
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
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
                {newDivision.users.map(userId => {
                  const user = users.find(u => u.id === parseInt(userId));
                  return (
                    <tr key={userId}>
                      <td>{user?.name || 'Неизвестный'}</td>
                      <td>{user?.email || 'Неизвестный'}</td>
                      <td>
                        <button onClick={() => handleUserRemove(userId, 'add')}>⛓️‍💥</button>
                      </td>
                    </tr>
                  );
                })}
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
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
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
                {editDivision.users.map(userId => {
                  const user = users.find(u => u.id === parseInt(userId));
                  return (
                    <tr key={userId}>
                      <td>{user?.name || 'Неизвестный'}</td>
                      <td>{user?.email || 'Неизвестный'}</td>
                      <td>
                        <button onClick={() => handleUserRemove(userId, 'edit')}>⛓️‍💥</button>
                      </td>
                    </tr>
                  );
                })}
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