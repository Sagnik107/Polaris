const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getCargos,
  getCargo,
  createCargo,
  updateCargo,
  deleteCargo,
} = require('../controllers/cargoController');

const router = express.Router();

router.get('/', requireAuth, getCargos);
router.get('/:id', requireAuth, getCargo);
router.post('/', requireAuth, requirePermission('cargo:crud'), createCargo);
router.put('/:id', requireAuth, requirePermission('cargo:crud'), updateCargo);
router.delete('/:id', requireAuth, requirePermission('cargo:crud'), deleteCargo);

module.exports = router;
