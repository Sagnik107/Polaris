const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getInventory,
  getInventoryItem,
  createInventory,
  updateInventory,
  transferInventory,
  deleteInventory,
} = require('../controllers/inventoryController');

const router = express.Router();

router.get('/', requireAuth, getInventory);
router.get('/:id', requireAuth, getInventoryItem);
router.post('/', requireAuth, requirePermission('inventory:crud'), createInventory);
router.post('/transfer', requireAuth, transferInventory);
router.put('/:id', requireAuth, updateInventory);
router.delete('/:id', requireAuth, requirePermission('inventory:crud'), deleteInventory);

module.exports = router;
