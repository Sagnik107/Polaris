const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getExpeditions,
  getExpedition,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  assignPersonnel,
  unassignPersonnel,
  assignResource,
  unassignResource,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  getExpeditionTimeline,
} = require('../controllers/expeditionController');

const router = express.Router();

router.get('/', requireAuth, getExpeditions);
router.get('/:id', requireAuth, getExpedition);
router.post('/', requireAuth, requirePermission('expeditions:crud'), createExpedition);
router.put('/:id', requireAuth, requirePermission('expeditions:crud'), updateExpedition);
router.delete('/:id', requireAuth, requirePermission('expeditions:crud'), deleteExpedition);

// Personnel Assignment
router.post('/:id/personnel', requireAuth, requirePermission('expeditions:crud'), assignPersonnel);
router.delete('/:id/personnel/:personnelId', requireAuth, requirePermission('expeditions:crud'), unassignPersonnel);

// Resource Assignment
router.post('/:id/resources', requireAuth, requirePermission('expeditions:crud'), assignResource);
router.delete('/:id/resources/:resourceId', requireAuth, requirePermission('expeditions:crud'), unassignResource);

// Milestones
router.post('/:id/milestones', requireAuth, requirePermission('expeditions:crud'), addMilestone);
router.put('/:id/milestones/:milestoneId', requireAuth, requirePermission('expeditions:crud'), updateMilestone);
router.delete('/:id/milestones/:milestoneId', requireAuth, requirePermission('expeditions:crud'), deleteMilestone);

// Timeline Activity
router.get('/:id/timeline', requireAuth, getExpeditionTimeline);

module.exports = router;

