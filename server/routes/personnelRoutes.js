const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getPersonnel,
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
} = require('../controllers/personnelController');

const router = express.Router();

router.get('/', requireAuth, getPersonnel);
router.get('/:id', requireAuth, getPersonnelById);
router.post('/', requireAuth, requirePermission('personnel:crud'), createPersonnel);
router.put('/:id', requireAuth, updatePersonnel);

module.exports = router;
