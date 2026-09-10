const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
} = require('../controllers/incidentController');

const router = express.Router();

router.get('/', requireAuth, getIncidents);
router.get('/:id', requireAuth, getIncident);
router.post('/', requireAuth, createIncident);
router.put('/:id', requireAuth, updateIncident);

module.exports = router;
