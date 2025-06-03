const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

/**
 * @route GET /api/users/export
 * @desc Export users to Excel
 * @access Public
 */
router.get('/export', async (req, res) => {
  try {
    // Получаем пользователей с данными о подразделении
    const users = await prisma.user.findMany({
      include: { division: true },
    });

    // Формируем данные для Excel
    const data = users.map(user => ({
      ФИО: user.name,
      Email: user.email,
      'Моб. Тел': user.phone || '',
      Подразделение: user.division ? user.division.name : 'Нет',
    }));

    // Создаём новый Excel-файл
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Генерируем бинарный буфер
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Устанавливаем заголовки для скачивания
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Отправляем файл
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});









const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route POST /api/users/import
 * @desc Import users from Excel
 * @access Public
 */
router.post('/import', upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files[0];
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }

    const results = { added: 0, updated: 0, errors: [] };

    for (const row of data) {
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
          const division = await prisma.division.findFirst({
            where: { name: divisionName },
          });
          if (!division) {
            results.errors.push(`Division not found: ${divisionName}`);
            continue;
          }
          divisionId = division.id;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: {
              name,
              phone,
              divisionId,
            },
          });
          results.updated++;
        } else {
          await prisma.user.create({
            data: {
              name,
              email,
              phone,
              divisionId,
              password: '123',
            },
          });
          results.added++;
        }
      } catch (error) {
        results.errors.push(`Error processing row ${JSON.stringify(row)}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      added: results.added,
      updated: results.updated,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error importing users:', error);
    res.status(500).json({ error: 'Failed to import users' });
  }
});










module.exports = router;