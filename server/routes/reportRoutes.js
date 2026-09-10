const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { generateReport } = require('../controllers/reportController');

const router = express.Router();

router.get('/', requireAuth, generateReport);

module.exports = router;
