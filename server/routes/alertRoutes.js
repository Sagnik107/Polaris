const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getAlerts,
  markRead,
  markAllRead,
  getUnreadCount,
} = require('../controllers/alertController');

const router = express.Router();

router.get('/', requireAuth, getAlerts);
router.get('/unread-count', requireAuth, getUnreadCount);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);

module.exports = router;
