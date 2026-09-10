const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getBases,
  getBase,
  updateBase,
  createBase,
} = require('../controllers/baseController');

const router = express.Router();

router.get('/', requireAuth, getBases);
router.get('/:id', requireAuth, getBase);
router.post('/', requireAuth, requireRole('SuperAdmin'), createBase);
router.put('/:id', requireAuth, updateBase);

module.exports = router;
