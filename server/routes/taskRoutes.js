const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

router.get('/', requireAuth, getTasks);
router.get('/:id', requireAuth, getTask);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);
router.delete('/:id', requireAuth, deleteTask);

module.exports = router;
