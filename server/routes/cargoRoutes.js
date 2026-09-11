const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getCargos,
  getCargoStats,
  getCargo,
  createCargo,
  updateCargo,
  updateCargoStatus,
  deleteCargo,
} = require('../controllers/cargoController');

const router = express.Router();

router.get('/stats', requireAuth, getCargoStats);
router.get('/', requireAuth, getCargos);
router.get('/:id', requireAuth, getCargo);
router.post('/', requireAuth, requirePermission('cargo:crud'), createCargo);
router.put('/:id', requireAuth, requirePermission('cargo:crud'), updateCargo);
router.post('/:id/status', requireAuth, updateCargoStatus);
router.delete('/:id', requireAuth, requirePermission('cargo:crud'), deleteCargo);

module.exports = router;

