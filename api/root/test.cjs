// routes/test.js
const express = require('express');
const router = express.Router();

// GET /api/test
router.get('/', (req, res) => {
  res.json({ message: 'привет' });
});

module.exports = router;
