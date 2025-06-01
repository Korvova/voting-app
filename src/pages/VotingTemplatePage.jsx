import { useState, useEffect } from 'react';
import axios from 'axios';

function VotingTemplatePage() {
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '' });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Загрузка списка шаблонов
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/vote-templates');
        setTemplates(response.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Открытие модального окна для добавления
  const handleAddTemplate = () => {
    setNewTemplate({ title: '' });
    setEditingTemplate(null);
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Сохранение шаблона
  const handleSaveTemplate = async () => {
    // Проверка валидации
    if (!newTemplate.title) {
      setValidationError('Название шаблона обязательно.');
      return;
    }

    try {
      if (editingTemplate) {
        const response = await axios.put(
          `http://217.114.10.226:5000/api/vote-templates/${editingTemplate.id}`,
          newTemplate
        );
        setTemplates(templates.map(t => (t.id === editingTemplate.id ? response.data : t)));
      } else {
        const response = await axios.post('http://217.114.10.226:5000/api/vote-templates', newTemplate);
        setTemplates([...templates, response.data]);
      }
      setIsModalOpen(false);
      setValidationError(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  // Удаление шаблона
  const handleDeleteTemplate = async (id) => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/vote-templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // Редактирование шаблона
  const handleEditTemplate = (template) => {
    setNewTemplate({ title: template.title });
    setEditingTemplate(template);
    setValidationError(null);
    setIsModalOpen(true);
  };

  return (
    <div className="config-subpage">
      <h2>Шаблоны голосования</h2>
      <button className="add-button" onClick={handleAddTemplate}>
        + Добавить шаблон
      </button>
      <table className="procedures-table">
        <thead>
          <tr>
            <th>Название шаблона</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {templates.map(template => (
            <tr key={template.id}>
              <td>{template.title}</td>
              <td className="actions-column">
                <button onClick={() => handleEditTemplate(template)}>Редактировать</button>
                <button onClick={() => handleDeleteTemplate(template.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingTemplate ? 'Редактировать шаблон' : 'Добавить шаблон'}</h3>
            {validationError && (
              <div className="error-message">
                <p>{validationError}</p>
              </div>
            )}
            <div className="form-group">
              <label>Название шаблона</label>
              <input
                type="text"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                required
              />
            </div>
            <button onClick={handleSaveTemplate}>Сохранить</button>
            <button onClick={() => setIsModalOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VotingTemplatePage;