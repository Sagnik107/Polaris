const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getPersonnel,
  getPersonnelStats,
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
  reassignPersonnel,
  deletePersonnel,
} = require('../controllers/personnelController');

const router = express.Router();

router.get('/stats', requireAuth, getPersonnelStats);
router.get('/', requireAuth, getPersonnel);
router.get('/:id', requireAuth, getPersonnelById);
router.post('/', requireAuth, requirePermission('personnel:crud'), createPersonnel);
router.put('/:id', requireAuth, updatePersonnel);
router.post('/:id/reassign', requireAuth, reassignPersonnel);
router.delete('/:id', requireAuth, requirePermission('personnel:crud'), deletePersonnel);

module.exports = router;

