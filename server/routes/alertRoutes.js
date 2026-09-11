const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getAlerts,
  getAlertStats,
  createAlert,
  resolveAlert,
  deleteAlert,
  markRead,
  markAllRead,
  getUnreadCount,
} = require('../controllers/alertController');

const router = express.Router();

router.get('/', requireAuth, getAlerts);
router.get('/stats', requireAuth, getAlertStats);
router.get('/unread-count', requireAuth, getUnreadCount);
router.post('/', requireAuth, createAlert);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);
router.put('/:id/resolve', requireAuth, resolveAlert);
router.delete('/:id', requireAuth, deleteAlert);

module.exports = router;
