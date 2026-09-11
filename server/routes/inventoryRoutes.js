const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getInventory,
  getInventoryStats,
  getInventoryItem,
  createInventory,
  updateInventory,
  adjustStock,
  transferInventory,
  deleteInventory,
} = require('../controllers/inventoryController');

const router = express.Router();

router.get('/', requireAuth, getInventory);
router.get('/stats', requireAuth, getInventoryStats);
router.get('/:id', requireAuth, getInventoryItem);
router.post('/', requireAuth, requirePermission('inventory:crud'), createInventory);
router.post('/transfer', requireAuth, transferInventory);
router.post('/:id/transfer', requireAuth, transferInventory);
router.post('/:id/adjust', requireAuth, adjustStock);
router.put('/:id', requireAuth, updateInventory);
router.delete('/:id', requireAuth, requirePermission('inventory:crud'), deleteInventory);

module.exports = router;

