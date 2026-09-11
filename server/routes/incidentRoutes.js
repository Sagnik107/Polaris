const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
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
router.post('/sos', requireAuth, requireRole('SuperAdmin', 'MedicalOfficer', 'BaseOfficer'), dispatchSosIncident);
router.post('/:id/dispatch', requireAuth, requireRole('SuperAdmin', 'MedicalOfficer', 'BaseOfficer'), dispatchSosIncident);
router.get('/:id', requireAuth, getIncident);
router.post('/', requireAuth, requireRole('SuperAdmin', 'MedicalOfficer', 'BaseOfficer'), createIncident);
router.put('/:id', requireAuth, requireRole('SuperAdmin', 'MedicalOfficer', 'BaseOfficer'), updateIncident);

module.exports = router;
