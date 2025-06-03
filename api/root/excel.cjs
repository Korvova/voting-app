const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const multer = require('multer');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route GET /api/users/excel/export
 * @desc Export users and divisions to Excel with two sheets and dropdown in Users
 * @access Public
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
 * @route POST /api/users/excel/import
 * @desc Import users and divisions from Excel with two sheets
 * @access Public
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