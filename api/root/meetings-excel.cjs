const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const multer = require('multer');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @api {get} /api/meetings/excel/export-template Экспорт шаблона заседания в Excel
 * @apiName ЭкспортШаблонаЗаседания
 * @apiGroup Excel-Заседания
 * @apiDescription Экспортирует шаблон для создания заседания в Excel-файл с тремя листами: `MeetingTemplate` (данные заседания и повестки), `Divisions` (список подразделений) и `Speakers` (список докладчиков). Лист `MeetingTemplate` содержит выпадающие списки для выбора подразделений и докладчиков, основанные на данных из листов `Divisions` и `Speakers`. Используется для подготовки шаблона для последующего импорта заседаний. Файл возвращается как вложение с именем `meeting_template.xlsx`.
 * @apiSuccess {File} meeting_template.xlsx Excel-файл с тремя листами:
 * @apiSuccess {Object} MeetingTemplate Лист с шаблоном заседания и повестки.
 * @apiSuccess {String} MeetingTemplate.Название Название заседания (например, "Тестовое заседание").
 * @apiSuccess {String} MeetingTemplate.Дата_начала Дата и время начала заседания (например, "03.06.2025 10:00").
 * @apiSuccess {String} MeetingTemplate.Дата_конца Дата и время окончания заседания (например, "03.06.2025 11:00").
 * @apiSuccess {String} MeetingTemplate.Подразделения Название подразделения (выпадающий список из листа `Divisions`).
 * @apiSuccess {Number} MeetingTemplate.Номер_вопроса Порядковый номер вопроса повестки (например, 1, 2).
 * @apiSuccess {String} MeetingTemplate.Вопрос_повестки Название вопроса повестки (например, "Тестовый вопрос 1").
 * @apiSuccess {String} MeetingTemplate.Докладчик Имя докладчика (выпадающий список из листа `Speakers`).
 * @apiSuccess {String} MeetingTemplate.Ссылка Ссылка на материалы вопроса (например, "https://example.com/1").
 * @apiSuccess {Object} Divisions Лист со списком подразделений.
 * @apiSuccess {String} Divisions.Название Название подразделения (например, "Отдел продаж").
 * @apiSuccess {Object} Speakers Лист со списком докладчиков.
 * @apiSuccess {String} Speakers.Подразделение Название подразделения докладчика.
 * @apiSuccess {String} Speakers.Пользователь Имя пользователя-докладчика.
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое подключения к PostgreSQL или проблеме с созданием файла.
 * @apiErrorExample {json} Пример ответа при ошибке:
 *     {
 *         "errors": ["Не удалось экспортировать шаблон заседания: <сообщение об ошибке>"]
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -o meeting_template.xlsx http://217.114.10.226:5000/api/meetings/excel/export-template
 */
router.get('/export-template', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany();
    const users = await prisma.user.findMany({
      include: { division: true },
    });

    const workbook = new ExcelJS.Workbook();
    const meetingSheet = workbook.addWorksheet('MeetingTemplate');
    const divisionSheet = workbook.addWorksheet('Divisions');
    const speakerSheet = workbook.addWorksheet('Speakers');

    meetingSheet.columns = [
      { header: 'Название', key: 'name', width: 20 },
      { header: 'Дата начала', key: 'startTime', width: 20 },
      { header: 'Дата конца', key: 'endTime', width: 20 },
      { header: 'Подразделения', key: 'divisions', width: 20 },
      { header: 'Номер вопроса', key: 'agendaNumber', width: 15 },
      { header: 'Вопрос повестки', key: 'agendaTitle', width: 40 },
      { header: 'Докладчик', key: 'speaker', width: 20 },
      { header: 'Ссылка', key: 'link', width: 30 },
    ];

    const exampleDate = new Date('2025-06-03T10:00:00');
    const exampleEndDate = new Date('2025-06-03T11:00:00');
    const exampleDivision1 = divisions.length > 0 ? divisions[0].name : 'Подразделение 1';
    const exampleDivision2 = divisions.length > 1 ? divisions[1].name : '';
    const exampleSpeaker1 = users.length > 0 && users[0].division ? users[0].name : 'Иван Иванов';
    const exampleSpeaker2 = users.length > 1 && users[1].division ? users[1].name : 'Петр Петров';

    meetingSheet.addRow({
      name: 'Тестовое заседание',
      startTime: exampleDate.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
      endTime: exampleEndDate.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
      divisions: exampleDivision1,
      agendaNumber: 1,
      agendaTitle: 'Тестовый вопрос 1',
      speaker: exampleSpeaker1,
      link: 'https://example.com/1',
    });

    meetingSheet.addRow({
      divisions: exampleDivision2,
      agendaNumber: 2,
      agendaTitle: 'Тестовый вопрос 2',
      speaker: exampleSpeaker2,
      link: 'https://example.com/2',
    });

    divisionSheet.columns = [
      { header: 'Название', key: 'name', width: 20 },
    ];
    divisions.forEach(division => {
      divisionSheet.addRow({ name: division.name });
    });

    speakerSheet.columns = [
      { header: 'Подразделение', key: 'division', width: 20 },
      { header: 'Пользователь', key: 'user', width: 20 },
    ];
    users.forEach(user => {
      if (user.division) {
        speakerSheet.addRow({
          division: user.division.name,
          user: user.name,
        });
      }
    });

    const divisionRange = 'Divisions!$A$2:$A$1048576';
    meetingSheet.getColumn('D').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [divisionRange],
          showDropDown: true,
        };
      }
    });

    meetingSheet.getColumn('G').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['Speakers!$B$2:$B$1048576'],
          showDropDown: true,
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename=meeting_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting meeting template:', error);
    res.status(500).json({ errors: ['Failed to export meeting template: ' + error.message] });
  }
});

/**
 * @api {post} /api/meetings/excel/import Импорт заседания из Excel-шаблона
 * @apiName ИмпортЗаседания
 * @apiGroup Excel-Заседания
 * @apiDescription Импортирует данные о заседании из загруженного Excel-файла, содержащего лист `MeetingTemplate` с информацией о заседании, подразделениях и повестке. Создаёт новое заседание с указанными параметрами, связывает его с подразделениями и добавляет элементы повестки с докладчиками. Файл загружается через `multipart/form-data` с полем `file`. Все операции выполняются в транзакции для обеспечения целостности данных.
 * @apiBody {File} file Excel-файл с листом `MeetingTemplate` (обязательное поле, загружается через `multipart/form-data`).
 * @apiBody {Object} file.MeetingTemplate Лист с данными заседания и повестки.
 * @apiBody {String} file.MeetingTemplate.Название Название заседания (обязательное поле, строка, например, "Тестовое заседание").
 * @apiBody {String} file.MeetingTemplate.Дата_начала Дата и время начала заседания (обязательное поле, строка в формате, распознаваемом `Date`, например, "03.06.2025 10:00").
 * @apiBody {String} file.MeetingTemplate.Дата_конца Дата и время окончания заседания (обязательное поле, строка в формате, распознаваемом `Date`).
 * @apiBody {String} [file.MeetingTemplate.Подразделения] Название подразделения, связанного с заседанием (обязательное поле хотя бы для одной строки, строка).
 * @apiBody {Number} [file.MeetingTemplate.Номер_вопроса] Порядковый номер вопроса повестки (обязательное поле для повестки, целое число, уникальное в рамках заседания).
 * @apiBody {String} [file.MeetingTemplate.Вопрос_повестки] Название вопроса повестки (обязательное поле для повестки, строка).
 * @apiBody {String} [file.MeetingTemplate.Докладчик] Имя докладчика (опционально, строка, должно соответствовать пользователю из подразделений заседания).
 * @apiBody {String} [file.MeetingTemplate.Ссылка] Ссылка на материалы вопроса (опционально, строка).
 * @apiSuccess {Boolean} success Статус операции. Возвращает `true` при успешном импорте.
 * @apiSuccess {Number} meetingId Идентификатор созданного заседания.
 * @apiSuccess {String[]} errors Пустой массив ошибок при успешном импорте.
 * @apiError (400) BadRequest Ошибка, если файл не загружен, отсутствует лист `MeetingTemplate`, лист пуст, данные некорректны (например, отсутствует название, невалидные даты, дублирующиеся номера повестки, несуществующие подразделения или докладчики).
 * @apiError (500) ServerError Ошибка сервера или базы данных, например, при сбое транзакции.
 * @apiErrorExample {json} Пример ответа при ошибке (нет файла):
 *     {
 *         "success": false,
 *         "errors": ["Файл не загружен"]
 *     }
 * @apiErrorExample {json} Пример ответа при ошибке (валидация):
 *     {
 *         "success": false,
 *         "errors": ["Название заседания обязательно в строке 2", "Хотя бы одно подразделение обязательно"]
 *     }
 * @apiErrorExample {json} Пример ответа при успешном импорте:
 *     {
 *         "success": true,
 *         "meetingId": 123,
 *         "errors": []
 *     }
 * @apiExample {curl} Пример запроса:
 *     curl -X POST -F "file=@meeting_template.xlsx" http://217.114.10.226:5000/api/meetings/excel/import
 */
router.post('/import', upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ errors: ['No file uploaded'] });
    }

    const file = req.files[0];
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });

    const meetingSheetName = workbook.SheetNames.includes('MeetingTemplate') ? 'MeetingTemplate' : null;
    if (!meetingSheetName) {
      return res.status(400).json({ errors: ['File must contain MeetingTemplate sheet'] });
    }

    const meetingSheet = workbook.Sheets[meetingSheetName];
    const meetingData = XLSX.utils.sheet_to_json(meetingSheet);

    if (meetingData.length === 0) {
      return res.status(400).json({ errors: ['MeetingTemplate sheet is empty'] });
    }

    const results = { success: false, errors: [] };
    let name, startTime, endTime;
    const divisionNames = new Set();
    const agendaItems = [];
    const agendaNumbers = new Set();

    console.log('Imported meeting data:', JSON.stringify(meetingData, null, 2));

    meetingData.forEach((row, index) => {
      if (index === 0) {
        name = row['Название']?.toString().trim();
        const startTimeStr = row['Дата начала']?.toString().trim();
        const endTimeStr = row['Дата конца']?.toString().trim();

        if (!name) {
          results.errors.push('Meeting name is required in row 2');
        }
        if (!startTimeStr) {
          results.errors.push('Start date is required in row 2');
        }
        if (!endTimeStr) {
          results.errors.push('End date is required in row 2');
        }

        if (startTimeStr && endTimeStr) {
          try {
            startTime = new Date(startTimeStr);
            endTime = new Date(endTimeStr);
            if (isNaN(startTime.getTime())) {
              results.errors.push(`Invalid start date format in row 2: ${startTimeStr}`);
            }
            if (isNaN(endTime.getTime())) {
              results.errors.push(`Invalid end date format in row 2: ${endTimeStr}`);
            }
            if (startTime >= endTime) {
              results.errors.push('End date must be after start date');
            }
          } catch (error) {
            results.errors.push(`Error parsing dates in row 2: ${error.message}`);
          }
        }
      }

      const division = row['Подразделения']?.toString().trim();
      if (division) {
        divisionNames.add(division);
      }

      const agendaNumber = row['Номер вопроса'];
      const agendaTitle = row['Вопрос повестки']?.toString().trim();
      const speaker = row['Докладчик']?.toString().trim();
      const link = row['Ссылка']?.toString().trim();

      if (agendaNumber && agendaTitle) {
        const number = parseInt(agendaNumber);
        if (isNaN(number)) {
          results.errors.push(`Invalid agenda number at row ${index + 2}: ${agendaNumber}`);
        } else if (agendaNumbers.has(number)) {
          results.errors.push(`Duplicate agenda number at row ${index + 2}: ${number}`);
        } else {
          agendaNumbers.add(number);
          agendaItems.push({ number, title: agendaTitle, speaker, link });
        }
      }
    });

    if (divisionNames.size === 0) {
      results.errors.push('At least one division is required');
    }

    if (agendaItems.length === 0) {
      results.errors.push('At least one agenda item is required');
    }

    if (results.errors.length > 0) {
      console.error('Validation errors:', results.errors);
      return res.status(400).json({ success: false, errors: results.errors });
    }

    const divisionIds = [];
    for (const divName of divisionNames) {
      const division = await prisma.division.findFirst({ where: { name: divName } });
      if (!division) {
        results.errors.push(`Division not found: ${divName}`);
      } else {
        divisionIds.push(division.id);
      }
    }

    const speakerIds = [];
    for (const item of agendaItems) {
      if (item.speaker) {
        const user = await prisma.user.findFirst({
          where: {
            name: item.speaker,
            division: { name: { in: Array.from(divisionNames) } },
          },
        });
        if (!user) {
          results.errors.push(`Speaker not found in specified divisions: ${item.speaker}`);
          speakerIds.push(null);
        } else {
          speakerIds.push(user.id);
        }
      } else {
        speakerIds.push(null);
      }
    }

    if (results.errors.length > 0) {
      console.error('Data validation errors:', results.errors);
      return res.status(400).json({ success: false, errors: results.errors });
    }

    await prisma.$transaction(async (tx) => {
      const existingMeeting = await tx.meeting.findFirst({
        where: { name, isArchived: false },
      });
      if (existingMeeting) {
        results.errors.push(`Meeting with name "${name}" already exists`);
        throw new Error('Duplicate meeting name');
      }

      const meeting = await tx.meeting.create({
        data: {
          name,
          startTime,
          endTime,
          status: 'WAITING',
          isArchived: false,
          divisions: {
            connect: divisionIds.map(id => ({ id })),
          },
          agendaItems: {
            create: agendaItems.map((item, index) => ({
              number: item.number,
              title: item.title,
              speakerId: speakerIds[index],
              link: item.link || null,
              voting: false,
              completed: false,
            })),
          },
        },
      });

      results.success = true;
      results.meetingId = meeting.id;
    });

    console.log('Meeting imported successfully:', { meetingId: results.meetingId });
    res.json({
      success: true,
      meetingId: results.meetingId,
      errors: [],
    });
  } catch (error) {
    console.error('Error importing meeting:', error.message);
    if (results.errors.length > 0) {
      return res.status(400).json({ success: false, errors: results.errors });
    }
    return res.status(500).json({ errors: [`Failed to import meeting: ${error.message}`] });
  }
});

module.exports = router;