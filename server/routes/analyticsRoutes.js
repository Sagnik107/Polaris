const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/', requireAuth, getAnalytics);
router.get('/:type', requireAuth, getAnalytics);

module.exports = router;
