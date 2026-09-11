const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const {
  getAssets,
  getAssetStats,
  getAsset,
  createAsset,
  updateAsset,
  logMaintenance,
  deleteAsset,
} = require('../controllers/assetController');

const router = express.Router();

router.get('/', requireAuth, getAssets);
router.get('/stats', requireAuth, getAssetStats);
router.get('/:id', requireAuth, getAsset);
router.post('/', requireAuth, requirePermission('assets:crud'), createAsset);
router.post('/:id/maintenance', requireAuth, logMaintenance);
router.put('/:id', requireAuth, updateAsset);
router.delete('/:id', requireAuth, requirePermission('assets:crud'), deleteAsset);

module.exports = router;

