const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getBases,
  getBaseStats,
  getBase,
  updateBase,
  createBase,
  deleteBase,
} = require('../controllers/baseController');

const router = express.Router();

router.get('/stats', requireAuth, getBaseStats);
router.get('/', requireAuth, getBases);
router.get('/:id', requireAuth, getBase);
router.post('/', requireAuth, requireRole('SuperAdmin'), createBase);
router.put('/:id', requireAuth, updateBase);
router.delete('/:id', requireAuth, requireRole('SuperAdmin'), deleteBase);

module.exports = router;

