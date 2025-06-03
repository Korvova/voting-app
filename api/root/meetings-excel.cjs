const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const multer = require('multer');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route GET /api/meetings/excel/export-template
 * @desc Export meeting template to Excel with three sheets
 * @access Public
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
 * @route POST /api/meetings/excel/import
 * @desc Import a single meeting from Excel template
 * @access Public
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