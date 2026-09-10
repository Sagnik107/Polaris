const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  register, login, getMe, updateMe, changePassword, refreshTokenHandler, logout,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register',
  requireAuth, requireRole('SuperAdmin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['SuperAdmin', 'ExpeditionManager', 'LogisticsCoordinator', 'InventoryManager', 'BaseOfficer', 'MedicalOfficer', 'PersonnelManager', 'Viewer']),
  ],
  validate, register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, login
);

router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.put('/change-password', requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate, changePassword
);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', requireAuth, logout);

module.exports = router;
