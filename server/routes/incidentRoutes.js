const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getIncidents,
  getIncidentStats,
  getIncident,
  createIncident,
  dispatchSosIncident,
  updateIncident,
} = require('../controllers/incidentController');

const router = express.Router();

router.get('/', requireAuth, getIncidents);
router.get('/stats', requireAuth, getIncidentStats);
router.post('/sos', requireAuth, dispatchSosIncident);
router.post('/:id/dispatch', requireAuth, dispatchSosIncident);
router.get('/:id', requireAuth, getIncident);
router.post('/', requireAuth, createIncident);
router.put('/:id', requireAuth, updateIncident);

module.exports = router;
