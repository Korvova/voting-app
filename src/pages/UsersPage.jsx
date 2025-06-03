import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PollModal from '../components/PollModal';
import '../App.css';
import io from 'socket.io-client';
import DisconnectModal from '../components/DisconnectModal';
import './UsersPage.css';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [userToDisconnect, setUserToDisconnect] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', divisionId: '', password: '' });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    socketRef.current = io(`${protocol}://217.114.10.226:5000`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 5000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('user-status-changed', (data) => {
      console.log('User status changed:', data);
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === data.userId ? { ...u, isOnline: data.isOnline } : u))
      );
    });

    fetchUsers();
    fetchDivisions();

    return () => {
      socket.off('user-status-changed');
      socketRef.current.disconnect();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://217.114.10.226:5000/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error.message);
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await axios.get('http://217.114.10.226:5000/api/divisions');
      setDivisions(response.data);
    } catch (error) {
      console.error('Error fetching divisions:', error.message);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const response = await axios.get('http://217.114.10.226:5000/api/users/excel/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting users:', error.message);
      alert('Ошибка при экспорте пользователей');
    }
  };

  const handleImportFromExcel = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xlsx')) {
      alert('Выберите файл формата .xlsx');
      fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://217.114.10.226:5000/api/users/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { addedUsers, updatedUsers, addedDivisions, errors } = response.data;
      let message = `Импорт завершен: добавлено ${addedUsers} пользователей, обновлено ${updatedUsers} пользователей, добавлено ${addedDivisions} подразделений.`;
      if (errors.length > 0) {
        message += `\nОшибки:\n${errors.join('\n')}`;
      }
      alert(message);

      fetchUsers();
      fetchDivisions();
    } catch (error) {
      console.error('Error importing users:', error.message);
      alert('Ошибка при импорте пользователей');
    } finally {
      setIsImporting(false);
      fileInputRef.current.value = '';
    }
  };

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

  const handleDisconnectUser = (user) => {
    setUserToDisconnect(user);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    try {
      await axios.post(`http://217.114.10.226:5000/api/users/${userToDisconnect.id}/disconnect`);
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userToDisconnect.id ? { ...u, isOnline: false } : u))
      );
      setShowDisconnectModal(false);
      setUserToDisconnect(null);
    } catch (error) {
      console.error('Error disconnecting user:', error.message);
    }
  };

  const cancelDisconnect = () => {
    setShowDisconnectModal(false);
    setUserToDisconnect(null);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/users/${userToDelete.id}`);
      setUsers(users.filter((user) => user.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error.message);
    }
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

  const handleModalApply = async (type) => {
    if (type === 'add') {
      try {
        const response = await axios.post('http://217.114.10.226:5000/api/users', {
          ...newUser,
          divisionId: newUser.divisionId ? parseInt(newUser.divisionId) : null,
        });
        setUsers([...users, { ...response.data, division: newUser.divisionId ? divisions.find((d) => d.id === parseInt(newUser.divisionId))?.name : 'Нет' }]);
        handleModalClose('add');
      } catch (error) {
        console.error('Error adding user:', error.message);
      }
    } else if (type === 'edit') {
      try {
        const response = await axios.put(`http://217.114.10.226:5000/api/users/${editUser.id}`, {
          ...editUser,
          divisionId: editUser.divisionId ? parseInt(editUser.divisionId) : null,
        });
        setUsers(users.map((user) => (user.id === editUser.id ? { ...response.data, division: editUser.divisionId ? divisions.find((d) => d.id === parseInt(editUser.divisionId))?.name : 'Нет' } : user)));
        handleModalClose('edit');
      } catch (error) {
        console.error('Error editing user:', error.message);
      }
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
      <div className="excel-buttons">
        <button className="small-button" onClick={handleExportToExcel}>
          📤Экспорт в Excel
        </button>
        <button className="small-button" onClick={handleImportFromExcel} disabled={isImporting}>
          {isImporting ? 'Идёт импорт...' : '📥Импорт из Excel'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div className="button-group">
        <button className="add-button" onClick={handleAddUser}>
          + Добавить пользователя
        </button>
      </div>
      <table className="users-table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Email</th>
            <th>Моб. Тел</th>
            <th>Подразделение</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} onClick={() => handleEditUser(user)} style={{ cursor: 'pointer' }}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>{user.division}</td>
              <td>
                <span
                  className={`status-icon ${user.isOnline ? 'online' : 'offline'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDisconnectUser(user);
                  }}
                >
                  ●
                </span>
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user);
                  }}
                >
                  X
                </button>
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
              <select
                name="divisionId"
                value={newUser.divisionId}
                onChange={(e) => handleInputChange(e, 'add')}
              >
                <option value="">Без подразделения</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
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
              <select
                name="divisionId"
                value={editUser.divisionId || ''}
                onChange={(e) => handleInputChange(e, 'edit')}
              >
                <option value="">Без подразделения</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
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

      {showDisconnectModal && (
        <DisconnectModal
          isOpen={showDisconnectModal}
          userName={userToDisconnect?.name}
          onConfirm={confirmDisconnect}
          onCancel={cancelDisconnect}
        />
      )}
    </div>
  );
}

export default UsersPage;