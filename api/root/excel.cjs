const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const multer = require('multer');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @api {get} /api/users/excel/export Экспорт пользователей и подразделений в Excel
 * @apiName ЭкспортПользователей
 * @apiGroup Excel
 * @apiDescription Экспортирует данные о пользователях и подразделениях в Excel-файл с двумя листами: `Users` (пользователи) и `Divisions` (подразделения). Лист `Users` содержит выпадающий список для выбора подразделений, основанный на данных из листа `Divisions`. Используется для создания шаблона или выгрузки данных для анализа. Файл возвращается как вложение с именем `users.xlsx`.
 * @apiSuccess {File} users.xlsx Excel-файл с двумя листами:
 * @apiSuccess {Object} Users Лист с данными пользователей.
 * @apiSuccess {String} Users.ФИО Имя пользователя (поле `name`).
 * @apiSuccess {String} Users.Email Электронная почта пользователя (поле `email`).
 * @apiSuccess {String} Users.Моб_Тел Номер телефона пользователя (может быть пустым).
 * @apiSuccess {String} Users.Подразделение Название подразделения или `"Нет"`, если не привязано.
 * @apiSuccess {Object} Divisions Лист с данными подразделений.
 * @apiSuccess {String} Divisions.Название Название подразделения (поле `name`).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL или проблеме с созданием файла.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "error": "Не удалось экспортировать пользователей"
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -o users.xlsx http://217.114.10.226:5000/api/users/excel/export
 */
router.get('/export', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { division: true },
    });

    const divisions = await prisma.division.findMany();

    const workbook = new ExcelJS.Workbook();
    const userSheet = workbook.addWorksheet('Users');
    const divisionSheet = workbook.addWorksheet('Divisions');

    userSheet.columns = [
      { header: 'ФИО', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Моб. Тел', key: 'phone', width: 15 },
      { header: 'Подразделение', key: 'division', width: 20 },
    ];

    users.forEach(user => {
      userSheet.addRow({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        division: user.division ? user.division.name : 'Нет',
      });
    });

    divisionSheet.columns = [
      { header: 'Название', key: 'name', width: 20 },
    ];

    divisions.forEach(division => {
      divisionSheet.addRow({ name: division.name });
    });
    divisionSheet.addRow({ name: 'Нет' });

    const divisionRange = 'Divisions!$A$2:$A$1048576';
    userSheet.getColumn('D').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [divisionRange],
          showDropDown: true,
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

/**
 * @api {post} /api/users/excel/import Импорт пользователей и подразделений из Excel
 * @apiName ИмпортПользователей
 * @apiGroup Excel
 * @apiDescription Импортирует данные о пользователях и подразделениях из загруженного Excel-файла, содержащего два листа: `Users` (пользователи) и `Divisions` (подразделения). Создаёт новые подразделения, если они отсутствуют, и добавляет или обновляет пользователей, связывая их с подразделениями. Файл загружается через `multipart/form-data` с полем `file`. Новые пользователи создаются с дефолтным паролем `"123"`.
 * @apiBody {File} file Excel-файл с листами `Users` и `Divisions` (обязательное поле, загружается через `multipart/form-data`).
 * @apiBody {Object} file.Users Лист с данными пользователей в Excel-файле.
 * @apiBody {String} file.Users.ФИО Имя пользователя (обязательное поле, строка).
 * @apiBody {String} file.Users.Email Электронная почта пользователя (обязательное поле, валидный email, например, "user@example.com").
 * @apiBody {String} [file.Users.Моб_Тел] Номер телефона пользователя (опционально, строка).
 * @apiBody {String} [file.Users.Подразделение] Название подразделения или `"Нет"` (опционально, строка).
 * @apiBody {Object} file.Divisions Лист с данными подразделений в Excel-файле.
 * @apiBody {String} file.Divisions.Название Название подразделения (обязательное поле, строка).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном импорте.
 * @apiSuccess {Number} addedUsers Количество созданных пользователей.
 * @apiSuccess {Number} updatedUsers Количество обновлённых пользователей.
 * @apiSuccess {Number} addedDivisions Количество созданных подразделений.
 * @apiSuccess {String[]} errors Массив сообщений об ошибках для отдельных строк, если они произошли.
 * @apiError (400) BadRequest Ошибка, если файл не загружен, отсутствуют листы `Users` или `Divisions`, лист `Users` пуст, или данные некорректны (например, невалидный email).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое транзакции.
 * @apiErrorExample {json} Пример ответа при ошибке (нет файла):
 *     {
 *         "error": "Файл не загружен"
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (некорректные листы):
 *     {
 *         "error": "Файл должен содержать листы Users и Divisions"
 *     }
 * @apiErrorExample {json} Пример ответа при успешном импорте с ошибками:
 *     {
 *         "success": true,
 *         "addedUsers": 2,
 *         "updatedUsers": 1,
 *         "addedDivisions": 1,
 *         "errors": ["Неверный формат email: invalid@"]
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -F "file=@users.xlsx" http://217.114.10.226:5000/api/users/excel/import
 */
router.post('/import', upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files[0];
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });

    const userSheetName = workbook.SheetNames.includes('Users') ? 'Users' : null;
    const divisionSheetName = workbook.SheetNames.includes('Divisions') ? 'Divisions' : null;

    if (!userSheetName || !divisionSheetName) {
      return res.status(400).json({ error: 'File must contain Users and Divisions sheets' });
    }

    const userSheet = workbook.Sheets[userSheetName];
    const divisionSheet = workbook.Sheets[divisionSheetName];

    const userData = XLSX.utils.sheet_to_json(userSheet);
    const divisionData = XLSX.utils.sheet_to_json(divisionSheet);

    if (userData.length === 0) {
      return res.status(400).json({ error: 'Users sheet is empty' });
    }

    const results = { addedUsers: 0, updatedUsers: 0, addedDivisions: 0, errors: [] };

    await prisma.$transaction(async (tx) => {
      const divisionMap = new Map();

      for (const row of divisionData) {
        const divisionName = row['Название']?.toString().trim();
        if (!divisionName || divisionName === 'Нет') continue;

        try {
          let division = await tx.division.findFirst({
            where: { name: divisionName },
          });

          if (!division) {
            division = await tx.division.create({
              data: { name: divisionName },
            });
            results.addedDivisions++;
          }

          divisionMap.set(divisionName, division.id);
        } catch (error) {
          results.errors.push(`Error processing division ${divisionName}: ${error.message}`);
        }
      }

      for (const row of userData) {
        try {
          const email = row['Email']?.toString().trim();
          const name = row['ФИО']?.toString().trim();
          const phone = row['Моб. Тел']?.toString().trim() || null;
          const divisionName = row['Подразделение']?.toString().trim();

          if (!email || !name) {
            results.errors.push(`Missing required fields for row: ${JSON.stringify(row)}`);
            continue;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            results.errors.push(`Invalid email format: ${email}`);
            continue;
          }

          let divisionId = null;
          if (divisionName && divisionName !== 'Нет') {
            divisionId = divisionMap.get(divisionName);
            if (!divisionId) {
              results.errors.push(`Division not found: ${divisionName}`);
              continue;
            }
          }

          const existingUser = await tx.user.findUnique({ where: { email } });

          if (existingUser) {
            await tx.user.update({
              where: { email },
              data: {
                name,
                phone,
                divisionId,
              },
            });
            results.updatedUsers++;
          } else {
            await tx.user.create({
              data: {
                name,
                email,
                phone,
                divisionId,
                password: '123',
              },
            });
            results.addedUsers++;
          }
        } catch (error) {
          results.errors.push(`Error processing user row ${JSON.stringify(row)}: ${error.message}`);
        }
      }
    });

    res.json({
      success: true,
      addedUsers: results.addedUsers,
      updatedUsers: results.updatedUsers,
      addedDivisions: results.addedDivisions,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error importing users:', error);
    res.status(500).json({ error: 'Failed to import users' });
  }
});

module.exports = router;