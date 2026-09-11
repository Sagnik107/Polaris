const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');

const router = express.Router();

router.get('/', requireAuth, requireRole('SuperAdmin'), getUsers);
router.post('/', requireAuth, requireRole('SuperAdmin'), createUser);
router.get('/:id', requireAuth, requireRole('SuperAdmin'), getUser);
router.put('/:id', requireAuth, requireRole('SuperAdmin'), updateUser);
router.post('/:id/reset-password', requireAuth, requireRole('SuperAdmin'), resetPassword);
router.delete('/:id', requireAuth, requireRole('SuperAdmin'), deleteUser);

module.exports = router;
