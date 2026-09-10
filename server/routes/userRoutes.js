const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', requireAuth, requireRole('SuperAdmin'), getUsers);
router.get('/:id', requireAuth, getUser);
router.put('/:id', requireAuth, requireRole('SuperAdmin'), updateUser);
router.delete('/:id', requireAuth, requireRole('SuperAdmin'), deleteUser);

module.exports = router;
