const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getExpeditions,
  getExpedition,
  createExpedition,
  updateExpedition,
  deleteExpedition,
} = require('../controllers/expeditionController');

const router = express.Router();

router.get('/', requireAuth, getExpeditions);
router.get('/:id', requireAuth, getExpedition);
router.post('/', requireAuth, requirePermission('expeditions:crud'), createExpedition);
router.put('/:id', requireAuth, requirePermission('expeditions:crud'), updateExpedition);
router.delete('/:id', requireAuth, requirePermission('expeditions:crud'), deleteExpedition);

module.exports = router;
