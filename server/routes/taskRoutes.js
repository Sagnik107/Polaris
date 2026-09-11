const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getTasks,
  getTaskStats,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

router.get('/', requireAuth, getTasks);
router.get('/stats', requireAuth, getTaskStats);
router.get('/:id', requireAuth, getTask);
router.post('/', requireAuth, requirePermission('tasks:create'), createTask);
router.put('/:id', requireAuth, requirePermission('tasks:update'), updateTask);
router.delete('/:id', requireAuth, requirePermission('tasks:crud'), deleteTask);

module.exports = router;

