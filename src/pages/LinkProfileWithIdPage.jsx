import { useState, useEffect } from 'react';
import axios from 'axios';

function LinkProfileWithIdPage() {
  const [deviceLinks, setDeviceLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [newLink, setNewLink] = useState({ userId: '', deviceId: '' });
  const [messages, setMessages] = useState({}); // Состояние для сообщений (ошибки/успех)

  // Загрузка списка связей и пользователей при монтировании
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [linksResponse, usersResponse] = await Promise.all([
          axios.get('http://217.114.10.226:5000/api/device-links'),
          axios.get('http://217.114.10.226:5000/api/users')
        ]);
        setDeviceLinks(linksResponse.data);
        setUsers(usersResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Добавление новой пустой строки
  const addNewLink = () => {
    setDeviceLinks([...deviceLinks, { id: null, userId: '', userName: '', deviceId: '' }]);
  };

  // Очистка сообщения через 3 секунды
  const clearMessage = (index) => {
    setTimeout(() => {
      setMessages(prev => ({ ...prev, [index]: null }));
    }, 3000);
  };

  // Обновление данных в строке
  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...deviceLinks];
    updatedLinks[index][field] = value;
    setDeviceLinks(updatedLinks);
  };

  // Сохранение связи
  const saveLink = async (index) => {
    const link = deviceLinks[index];
    if (!link.userId || !link.deviceId) {
      setMessages(prev => ({ ...prev, [index]: { type: 'error', text: 'Выберите пользователя и введите ID устройства' } }));
      clearMessage(index);
      return;
    }

    try {
      if (link.id) {
        // Обновление существующей связи
        await axios.put(`http://217.114.10.226:5000/api/device-links/${link.id}`, {
          userId: link.userId,
          deviceId: link.deviceId,
        });
        setMessages(prev => ({ ...prev, [index]: { type: 'success', text: 'Связь обновлена' } }));
      } else {
        // Создание новой связи
        const response = await axios.post('http://217.114.10.226:5000/api/device-links', {
          userId: link.userId,
          deviceId: link.deviceId,
        });
        const updatedLinks = [...deviceLinks];
        updatedLinks[index] = {
          id: response.data.id,
          userId: response.data.userId,
          userName: users.find(user => user.id === parseInt(link.userId))?.name || '',
          deviceId: response.data.deviceId,
        };
        setDeviceLinks(updatedLinks);
        setMessages(prev => ({ ...prev, [index]: { type: 'success', text: 'Связь создана' } }));
      }
      // Перезагрузка списка связей
      const response = await axios.get('http://217.114.10.226:5000/api/device-links');
      setDeviceLinks(response.data);
      clearMessage(index);
    } catch (error) {
      console.error('Error saving device link:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при сохранении связи';
      setMessages(prev => ({ ...prev, [index]: { type: 'error', text: errorMessage } }));
      clearMessage(index);
    }
  };

  // Удаление связи
  const deleteLink = async (index) => {
    const link = deviceLinks[index];
    if (link.id) {
      try {
        await axios.delete(`http://217.114.10.226:5000/api/device-links/${link.id}`);
        setMessages(prev => ({ ...prev, [index]: { type: 'success', text: 'Связь удалена' } }));
      } catch (error) {
        console.error('Error deleting device link:', error);
        setMessages(prev => ({ ...prev, [index]: { type: 'error', text: 'Ошибка при удалении связи' } }));
        clearMessage(index);
        return;
      }
    }
    const updatedLinks = deviceLinks.filter((_, i) => i !== index);
    setDeviceLinks(updatedLinks);
    clearMessage(index);
  };

  return (
    <div className="config-subpage">
      <h2>Связать профиль с ID</h2>
      <table className="procedures-table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>ID устройства</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {deviceLinks.map((link, index) => (
            <tr key={index}>
              <td>
                <select
                  value={link.userId || ''}
                  onChange={(e) => handleLinkChange(index, 'userId', e.target.value)}
                >
                  <option value="">Выберите пользователя</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={link.deviceId || ''}
                  onChange={(e) => handleLinkChange(index, 'deviceId', e.target.value)}
                  placeholder="Введите ID устройства"
                />
              </td>
              <td className="actions-column">
                <button onClick={() => saveLink(index)}>Сохранить</button>
                <button onClick={() => deleteLink(index)}>Удалить</button>
                {messages[index] && (
                  <span
                    style={{
                      color: messages[index].type === 'error' ? 'red' : 'green',
                      marginLeft: '10px',
                      fontSize: '12px',
                    }}
                  >
                    {messages[index].text}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-button" onClick={addNewLink}>+ Добавить связь</button>
    </div>
  );
}

export default LinkProfileWithIdPage;