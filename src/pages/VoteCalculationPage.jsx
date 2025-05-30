import { useState, useEffect } from 'react';
import axios from 'axios';

function VoteCalculationPage() {
  const [procedures, setProcedures] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProcedure, setNewProcedure] = useState({
    name: '',
    conditions: [{ elements: [], operator: null, elements2: [] }],
    resultIfTrue: 'Принято',
  });
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Опции для выпадающих списков
  const conditionOptions = [
    'Все пользователи заседания',
    'Все пользователи онлайн',
    'Всего голосов',
    '%',
    'Число',
    '>',
    '<',
    '>=',
    '<=',
    '=',
    '*',
    '+',
    '-',
    '/',
    'За',
    'Против',
    'Воздержались',
    'Не голосовали',
    'И',
    'Или',
    'Иначе',
    'Кроме',
    '(',
    ')',
  ];

  const operatorOptions = ['И', 'Или', 'Иначе', 'Кроме'];

  // Валидация условий
  const validateConditions = (conditions) => {
    for (let blockIndex = 0; blockIndex < conditions.length; blockIndex++) {
      const block = conditions[blockIndex];
      const elements = block.elements;
      const elements2 = block.elements2 || [];

      // Проверка 1: Блок elements не должен быть пустым
      if (elements.length === 0) {
        return `Блок условий ${blockIndex + 1} (elements) пуст. Добавьте элементы.`;
      }

      // Проверка 2: Минимальная длина условия (хотя бы 3 элемента, например, "За > 0")
      if (elements.length < 3) {
        return `Блок условий ${blockIndex + 1} (elements) слишком короткий. Добавьте элементы (например, "За > 0").`;
      }

      // Проверка 3: Наличие хотя бы одного оператора сравнения в elements
      const hasComparisonOperator = elements.some(elem => {
        const value = typeof elem === 'string' ? elem : elem.value;
        return ['>', '<', '>=', '<=', '='].includes(value);
      });
      if (!hasComparisonOperator) {
        return `Блок условий ${blockIndex + 1} (elements) не содержит оператор сравнения (>, <, >=, <=, =).`;
      }

      // Проверка 4: Сбалансированность скобок в elements
      let openBrackets = 0;
      for (const elem of elements) {
        const value = typeof elem === 'string' ? elem : elem.value;
        if (value === '(') openBrackets++;
        if (value === ')') openBrackets--;
        if (openBrackets < 0) {
          return `Блок условий ${blockIndex + 1} (elements) содержит несбалансированные скобки: лишняя закрывающая скобка.`;
        }
      }
      if (openBrackets !== 0) {
        return `Блок условий ${blockIndex + 1} (elements) содержит несбалансированные скобки: не хватает закрывающих скобок.`;
      }

      // Проверка 5: Корректность последовательности в elements
      for (let i = 0; i < elements.length - 1; i++) {
        const current = typeof elements[i] === 'string' ? elements[i] : elements[i].value;
        const next = typeof elements[i + 1] === 'string' ? elements[i + 1] : elements[i + 1].value;
        const nextType = typeof elements[i + 1] === 'string' ? 'select' : elements[i + 1].type;

        if (['>', '<', '>=', '<=', '='].includes(current) && ['>', '<', '>=', '<=', '='].includes(next)) {
          return `Блок условий ${blockIndex + 1} (elements): два оператора сравнения подряд (${current} ${next}).`;
        }

        if (['И', 'Или', 'Иначе', 'Кроме'].includes(current) && ['И', 'Или', 'Иначе', 'Кроме'].includes(next)) {
          return `Блок условий ${blockIndex + 1} (elements): два логических оператора подряд (${current} ${next}).`;
        }

        if (['>', '<', '>=', '<=', '='].includes(current) && !['За', 'Против', 'Воздержались', 'Не голосовали', 'Все пользователи заседания', 'Все пользователи онлайн', 'Всего голосов', '%', 'Число'].includes(next)) {
          return `Блок условий ${blockIndex + 1} (elements): после оператора сравнения (${current}) должно идти значение.`;
        }

        if (['*', '+', '-', '/'].includes(current)) {
          const validNextValues = ['%', 'Число', 'Все пользователи заседания', 'Все пользователи онлайн', 'Всего голосов', 'За', 'Против', 'Воздержались', 'Не голосовали'];
          const isNextValid = nextType === 'input' || validNextValues.includes(next);
          if (!isNextValid) {
            return `Блок условий ${blockIndex + 1} (elements): после оператора (${current}) должно идти значение (% или Число).`;
          }
        }

        if (['*', '+', '-', '/'].includes(current) && ['*', '+', '-', '/'].includes(next)) {
          return `Блок условий ${blockIndex + 1} (elements): два арифметических оператора подряд (${current} ${next}).`;
        }
      }

      // Проверка для elements2, если он существует
      if (elements2.length > 0) {
        // Проверка 6: Минимальная длина elements2
        if (elements2.length < 3) {
          return `Блок условий ${blockIndex + 1} (elements2) слишком короткий. Добавьте элементы (например, "За > Против").`;
        }

        // Проверка 7: Наличие оператора сравнения в elements2
        const hasComparisonOperator2 = elements2.some(elem => {
          const value = typeof elem === 'string' ? elem : elem.value;
          return ['>', '<', '>=', '<=', '='].includes(value);
        });
        if (!hasComparisonOperator2) {
          return `Блок условий ${blockIndex + 1} (elements2) не содержит оператор сравнения (>, <, >=, <=, =).`;
        }

        // Проверка 8: Сбалансированность скобок в elements2
        let openBrackets2 = 0;
        for (const elem of elements2) {
          const value = typeof elem === 'string' ? elem : elem.value;
          if (value === '(') openBrackets2++;
          if (value === ')') openBrackets2--;
          if (openBrackets2 < 0) {
            return `Блок условий ${blockIndex + 1} (elements2) содержит несбалансированные скобки: лишняя закрывающая скобка.`;
          }
        }
        if (openBrackets2 !== 0) {
          return `Блок условий ${blockIndex + 1} (elements2) содержит несбалансированные скобки: не хватает закрывающих скобок.`;
        }

        // Проверка 9: Корректность последовательности в elements2
        for (let i = 0; i < elements2.length - 1; i++) {
          const current = typeof elements2[i] === 'string' ? elements2[i] : elements2[i].value;
          const next = typeof elements2[i + 1] === 'string' ? elements2[i + 1] : elements2[i + 1].value;
          const nextType = typeof elements2[i + 1] === 'string' ? 'select' : elements2[i + 1].type;

          if (['>', '<', '>=', '<=', '='].includes(current) && ['>', '<', '>=', '<=', '='].includes(next)) {
            return `Блок условий ${blockIndex + 1} (elements2): два оператора сравнения подряд (${current} ${next}).`;
          }

          if (['И', 'Или', 'Иначе', 'Кроме'].includes(current) && ['И', 'Или', 'Иначе', 'Кроме'].includes(next)) {
            return `Блок условий ${blockIndex + 1} (elements2): два логических оператора подряд (${current} ${next}).`;
          }

          if (['>', '<', '>=', '<=', '='].includes(current) && !['За', 'Против', 'Воздержались', 'Не голосовали', 'Все пользователи заседания', 'Все пользователи онлайн', 'Всего голосов', '%', 'Число'].includes(next)) {
            return `Блок условий ${blockIndex + 1} (elements2): после оператора сравнения (${current}) должно идти значение.`;
          }

          if (['*', '+', '-', '/'].includes(current)) {
            const validNextValues = ['%', 'Число', 'Все пользователи заседания', 'Все пользователи онлайн', 'Всего голосов', 'За', 'Против', 'Воздержались', 'Не голосовали'];
            const isNextValid = nextType === 'input' || validNextValues.includes(next);
            if (!isNextValid) {
              return `Блок условий ${blockIndex + 1} (elements2): после оператора (${current}) должно идти значение (% или Число).`;
            }
          }

          if (['*', '+', '-', '/'].includes(current) && ['*', '+', '-', '/'].includes(next)) {
            return `Блок условий ${blockIndex + 1} (elements2): два арифметических оператора подряд (${current} ${next}).`;
          }
        }

        // Проверка 10: Если есть elements2, должен быть указан operator
        if (!block.operator) {
          return `Блок условий ${blockIndex + 1}: не указан логический оператор между elements и elements2.`;
        }
      }
    }

    return null; // Нет ошибок
  };

  // Загрузка списка процедур
  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        const response = await axios.get('http://217.114.10.226:5000/api/vote-procedures');
        setProcedures(response.data);
      } catch (error) {
        console.error('Error fetching procedures:', error);
      }
    };
    fetchProcedures();
  }, []);

  // Открытие модального окна для добавления
  const handleAddProcedure = () => {
    setNewProcedure({
      name: '',
      conditions: [{ elements: [], operator: null, elements2: [] }],
      resultIfTrue: 'Принято',
    });
    setEditingProcedure(null);
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Сохранение процедуры
  const handleSaveProcedure = async () => {
    // Проверка валидации
    const error = validateConditions(newProcedure.conditions);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      if (editingProcedure) {
        const response = await axios.put(
          `http://217.114.10.226:5000/api/vote-procedures/${editingProcedure.id}`,
          newProcedure
        );
        setProcedures(procedures.map(p => (p.id === editingProcedure.id ? response.data : p)));
      } else {
        const response = await axios.post('http://217.114.10.226:5000/api/vote-procedures', newProcedure);
        setProcedures([...procedures, response.data]);
      }
      setIsModalOpen(false);
      setValidationError(null);
    } catch (error) {
      console.error('Error saving procedure:', error);
    }
  };

  // Удаление процедуры
  const handleDeleteProcedure = async (id) => {
    try {
      await axios.delete(`http://217.114.10.226:5000/api/vote-procedures/${id}`);
      setProcedures(procedures.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting procedure:', error);
    }
  };

  // Редактирование процедуры
  const handleEditProcedure = (procedure) => {
    // При редактировании добавляем elements2, если его нет, для совместимости
    const updatedConditions = procedure.conditions.map(condition => ({
      ...condition,
      elements2: condition.elements2 || [],
    }));
    setNewProcedure({
      ...procedure,
      conditions: updatedConditions,
    });
    setEditingProcedure(procedure);
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Добавление нового блока условий
  const handleAddConditionBlock = () => {
    setNewProcedure({
      ...newProcedure,
      conditions: [...newProcedure.conditions, { elements: [], operator: null, elements2: [] }],
    });
  };

  // Удаление блока условий
  const handleRemoveConditionBlock = (blockIndex) => {
    setNewProcedure({
      ...newProcedure,
      conditions: newProcedure.conditions.filter((_, index) => index !== blockIndex),
    });
  };

  // Добавление элемента в блок условий (elements или elements2)
  const handleAddElement = (blockIndex, isElements2 = false) => {
    const updatedConditions = [...newProcedure.conditions];
    if (isElements2) {
      updatedConditions[blockIndex].elements2.push({ type: 'select', value: conditionOptions[0] });
    } else {
      updatedConditions[blockIndex].elements.push({ type: 'select', value: conditionOptions[0] });
    }
    setNewProcedure({ ...newProcedure, conditions: updatedConditions });
  };

  // Удаление элемента из блока условий (elements или elements2)
  const handleRemoveElement = (blockIndex, elementIndex, isElements2 = false) => {
    const updatedConditions = [...newProcedure.conditions];
    if (isElements2) {
      updatedConditions[blockIndex].elements2.splice(elementIndex, 1);
    } else {
      updatedConditions[blockIndex].elements.splice(elementIndex, 1);
    }
    setNewProcedure({ ...newProcedure, conditions: updatedConditions });
  };

  // Изменение значения элемента (elements или elements2)
  const handleElementChange = (blockIndex, elementIndex, value, isElements2 = false) => {
    const updatedConditions = [...newProcedure.conditions];
    const targetArray = isElements2 ? updatedConditions[blockIndex].elements2 : updatedConditions[blockIndex].elements;
    const element = targetArray[elementIndex];
    if (element.type === 'select') {
      const newType = (value === '%' || value === 'Число') ? 'input' : 'select';
      targetArray[elementIndex] = {
        type: newType,
        value: newType === 'input' ? (value === '%' ? 50 : 0) : value,
      };
    } else {
      targetArray[elementIndex] = { type: 'input', value: parseFloat(value) };
    }
    setNewProcedure({ ...newProcedure, conditions: updatedConditions });
  };

  // Изменение логического оператора внутри блока (между elements и elements2)
  const handleOperatorChange = (blockIndex, value) => {
    const updatedConditions = [...newProcedure.conditions];
    updatedConditions[blockIndex].operator = value || null;
    setNewProcedure({ ...newProcedure, conditions: updatedConditions });
  };

  return (
    <div className="config-subpage">
      <h2>Процедура подсчета голосов</h2>
      <button className="add-button" onClick={handleAddProcedure}>
        + Добавить процедуру
      </button>
      <table className="procedures-table">
        <thead>
          <tr>
            <th>Название процедуры</th>
            <th>Условия</th>
            <th>Результат (если выполнено)</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {procedures.map(procedure => (
            <tr key={procedure.id}>
              <td>{procedure.name}</td>
              <td>
                {procedure.conditions.map((condition, index) => (
                  <span key={index}>
                    {condition.elements.map((elem, elemIndex) => (
                      <span key={elemIndex}>
                        {typeof elem === 'string' ? elem : elem.value}
                        {' '}
                      </span>
                    ))}
                    {condition.operator && condition.elements2 && condition.elements2.length > 0 && (
                      <>
                        {condition.operator}{' '}
                        {condition.elements2.map((elem, elemIndex) => (
                          <span key={elemIndex}>
                            {typeof elem === 'string' ? elem : elem.value}
                            {' '}
                          </span>
                        ))}
                      </>
                    )}
                  </span>
                ))}
              </td>
              <td>{procedure.resultIfTrue}</td>
              <td className="actions-column">
                <button onClick={() => handleEditProcedure(procedure)}>Редактировать</button>
                <button onClick={() => handleDeleteProcedure(procedure.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingProcedure ? 'Редактировать процедуру' : 'Добавить процедуру'}</h3>
            {validationError && (
              <div className="error-message">
                <p>{validationError}</p>
              </div>
            )}
            <div className="form-group">
              <label>Название процедуры</label>
              <input
                type="text"
                value={newProcedure.name}
                onChange={(e) => setNewProcedure({ ...newProcedure, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Результат, если условие выполнено</label>
              <select
                value={newProcedure.resultIfTrue}
                onChange={(e) => setNewProcedure({ ...newProcedure, resultIfTrue: e.target.value })}
              >
                <option value="Принято">Принято</option>
                <option value="Не принято">Не принято</option>
              </select>
            </div>
            <div className="form-group">
              <label>Условия</label>
              {newProcedure.conditions.map((condition, blockIndex) => (
                <div key={blockIndex} className="condition-block">
                  {/* Первый набор элементов (elements) */}
                  <div className="condition-elements">
                    <label>Условие 1</label>
                    {condition.elements.map((element, elementIndex) => (
                      <div key={elementIndex} className="condition-element">
                        {element.type === 'select' ? (
                          <select
                            value={element.value}
                            onChange={(e) => handleElementChange(blockIndex, elementIndex, e.target.value, false)}
                          >
                            {conditionOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={element.value}
                            onChange={(e) => handleElementChange(blockIndex, elementIndex, e.target.value, false)}
                            step="0.01"
                          />
                        )}
                        <button
                          className="delete-button"
                          onClick={() => handleRemoveElement(blockIndex, elementIndex, false)}
                        >
                          –
                        </button>
                      </div>
                    ))}
                    <button onClick={() => handleAddElement(blockIndex, false)}>+</button>
                  </div>

                  {/* Выбор оператора для связи с elements2 */}
                  <div className="form-group">
                    <label>Оператор</label>
                    <select
                      value={condition.operator || ''}
                      onChange={(e) => handleOperatorChange(blockIndex, e.target.value)}
                    >
                      <option value="">Выберите оператор</option>
                      {operatorOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Второй набор элементов (elements2), если оператор выбран */}
                  {condition.operator && (
                    <div className="condition-elements">
                      <label>Условие 2</label>
                      {condition.elements2.map((element, elementIndex) => (
                        <div key={elementIndex} className="condition-element">
                          {element.type === 'select' ? (
                            <select
                              value={element.value}
                              onChange={(e) => handleElementChange(blockIndex, elementIndex, e.target.value, true)}
                            >
                              {conditionOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={element.value}
                              onChange={(e) => handleElementChange(blockIndex, elementIndex, e.target.value, true)}
                              step="0.01"
                            />
                          )}
                          <button
                            className="delete-button"
                            onClick={() => handleRemoveElement(blockIndex, elementIndex, true)}
                          >
                            –
                          </button>
                        </div>
                      ))}
                      <button onClick={() => handleAddElement(blockIndex, true)}>+</button>
                    </div>
                  )}

                  <button
                    className="delete-button"
                    onClick={() => handleRemoveConditionBlock(blockIndex)}
                  >
                    Удалить блок
                  </button>
                </div>
              ))}
              <button onClick={handleAddConditionBlock}>Добавить условие</button>
            </div>
            <button onClick={handleSaveProcedure}>Сохранить</button>
            <button onClick={() => setIsModalOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoteCalculationPage;