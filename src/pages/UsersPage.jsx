import { useState, useEffect } from 'react';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', divisionId: '', password: '' });

  useEffect(() => {
    // Заглушка для загрузки пользователей
    setUsers([
      { id: 1, name: 'Иванов И.И.', email: 'ivanov@example.com', phone: '+79991234567', division: 'Отдел 1' },
    ]);
  }, []);

  const handleAddUser = () => {
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setEditUser({ ...user });
    setShowEditModal(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setUsers(users.filter(user => user.id !== userToDelete.id));
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleModalClose = (type) => {
    if (type === 'add') {
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', divisionId: '', password: '' });
    } else if (type === 'edit') {
      setShowEditModal(false);
      setEditUser(null);
    }
  };

  const handleModalApply = (type) => {
    if (type === 'add') {
      console.log('Adding user:', newUser);
      setUsers([...users, { ...newUser, id: users.length + 1, division: newUser.divisionId || 'Нет' }]);
      handleModalClose('add');
    } else if (type === 'edit') {
      console.log('Editing user:', editUser);
      setUsers(users.map(user => (user.id === editUser.id ? { ...editUser, division: editUser.divisionId || 'Нет' } : user)));
      handleModalClose('edit');
    }
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;
    if (type === 'add') {
      setNewUser({ ...newUser, [name]: value });
    } else if (type === 'edit') {
      setEditUser({ ...editUser, [name]: value });
    }
  };

  return (
    <div className="users-page">
      <button className="add-button" onClick={handleAddUser}>+ Добавить пользователя</button>
      <table className="users-table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Email</th>
            <th>Моб. Тел</th>
            <th>Подразделение</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} onClick={() => handleEditUser(user)} style={{ cursor: 'pointer' }}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>{user.division}</td>
              <td>
                <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Добавить пользователя</h3>
            <div className="form-group">
              <label>ФИО *</label>
              <input
                name="name"
                value={newUser.name}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                name="email"
                type="email"
                value={newUser.email}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Моб. Тел *</label>
              <input
                name="phone"
                value={newUser.phone}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <div className="form-group">
              <label>Подразделение</label>
              <input
                name="divisionId"
                value={newUser.divisionId}
                onChange={(e) => handleInputChange(e, 'add')}
              />
            </div>
            <div className="form-group">
              <label>Пароль *</label>
              <input
                name="password"
                type="password"
                value={newUser.password}
                onChange={(e) => handleInputChange(e, 'add')}
                required
              />
            </div>
            <button onClick={() => handleModalApply('add')}>Применить</button>
            <button onClick={() => handleModalClose('add')}>Отмена</button>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Редактировать пользователя</h3>
            <div className="form-group">
              <label>ФИО *</label>
              <input
                name="name"
                value={editUser.name}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                name="email"
                type="email"
                value={editUser.email}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Моб. Тел *</label>
              <input
                name="phone"
                value={editUser.phone}
                onChange={(e) => handleInputChange(e, 'edit')}
                required
              />
            </div>
            <div className="form-group">
              <label>Подразделение</label>
              <input
                name="divisionId"
                value={editUser.divisionId}
                onChange={(e) => handleInputChange(e, 'edit')}
              />
            </div>
            <div className="form-group">
              <label>Пароль *</label>
              <input
                name="password"
                type="password"
                value={editUser.password || ''}
                onChange={(e) => handleInputChange(e, 'edit')}
              />
            </div>
            <button onClick={() => handleModalApply('edit')}>Применить</button>
            <button onClick={() => handleModalClose('edit')}>Отмена</button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Вы уверены, что хотите удалить пользователя {userToDelete.name}?</p>
            <button onClick={confirmDelete}>Да</button>
            <button onClick={cancelDelete}>Нет</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;