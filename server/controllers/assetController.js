const Asset = require('../models/Asset');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { emitToAll } = require('../services/socketService');
const { mockAssets } = require('../services/mockDataService');

/**
 * Helper to compute maintenance status based on next maintenance date
 */
const computeAssetMaintenanceStatus = (asset) => {
  if (asset.status === 'Under Maintenance' || asset.status === 'Maintenance') {
    return 'In Maintenance';
  }
  if (!asset.nextMaintenanceDate) return 'Up to Date';
  const now = new Date();
  const nextDate = new Date(asset.nextMaintenanceDate);
  const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 14) return 'Due Soon';
  return 'Up to Date';
};

/**
 * GET /api/assets
 */
const getAssets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      condition = '',
      status = '',
      base = '',
      sort = '-createdAt',
    } = req.query;

    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      let filtered = [...mockAssets];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((a) => {
          const tagMatch = (a.assetTag || a.assetCode || '').toLowerCase().includes(q);
          const nameMatch = (a.assetName || a.name || '').toLowerCase().includes(q);
          const modelMatch = (a.model || '').toLowerCase().includes(q);
          const serialMatch = (a.serialNumber || '').toLowerCase().includes(q);
          const baseMatch = (a.baseName || '').toLowerCase().includes(q);
          const opMatch = (a.assignedPersonnelName || '').toLowerCase().includes(q);
          return tagMatch || nameMatch || modelMatch || serialMatch || baseMatch || opMatch;
        });
      }

      if (category && category !== 'all') {
        filtered = filtered.filter(
          (a) => a.category?.toLowerCase() === category.toLowerCase()
        );
      }

      if (condition && condition !== 'all') {
        filtered = filtered.filter(
          (a) => a.condition?.toLowerCase() === condition.toLowerCase()
        );
      }

      if (status && status !== 'all') {
        filtered = filtered.filter(
          (a) => a.status?.toLowerCase() === status.toLowerCase()
        );
      }

      if (base && base !== 'all') {
        filtered = filtered.filter(
          (a) =>
            a.baseName?.toLowerCase().includes(base.toLowerCase()) ||
            a.base === base
        );
      }

      // Sort
      if (sort === 'name') {
        filtered.sort((a, b) => (a.name || a.assetName || '').localeCompare(b.name || b.assetName || ''));
      } else if (sort === 'service_due') {
        filtered.sort((a, b) => new Date(a.nextMaintenanceDate || '2099-01-01') - new Date(b.nextMaintenanceDate || '2099-01-01'));
      } else {
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      // Update maintenance statuses
      filtered.forEach((a) => {
        a.maintenanceStatus = computeAssetMaintenanceStatus(a);
      });

      const p = parseInt(page, 10);
      const l = parseInt(limit, 10);
      const startIndex = (p - 1) * l;
      const paginated = filtered.slice(startIndex, startIndex + l);

      return res.json({
        success: true,
        data: paginated,
        pagination: getPaginationMeta(filtered.length, p, l),
      });
    }

    // Database Connected Query
    const query = {};
    if (search) {
      query.$or = [
        { assetName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { assetCode: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { baseName: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    if (condition && condition !== 'all') {
      query.condition = condition;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (base && base !== 'all') {
      query.$or = [{ base }, { baseName: { $regex: base, $options: 'i' } }];
    }

    const total = await Asset.countDocuments(query);
    const assets = await Asset.find(query)
      .populate('base', 'name code')
      .populate('assignedTo', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: assets,
      pagination: getPaginationMeta(total, parseInt(page, 10), parseInt(limit, 10)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/assets/stats
 */
const getAssetStats = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;
    let assets = [];
    if (!isDbConnected) {
      assets = mockAssets;
    } else {
      assets = await Asset.find({}).lean();
    }

    let operationalCount = 0;
    let inMaintenanceCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    assets.forEach((a) => {
      const ms = computeAssetMaintenanceStatus(a);
      if (a.status === 'Operational') operationalCount++;
      if (a.status === 'Under Maintenance' || a.status === 'Maintenance') inMaintenanceCount++;
      if (ms === 'Overdue') overdueCount++;
      if (ms === 'Due Soon') dueSoonCount++;
    });

    res.json({
      success: true,
      data: {
        totalAssets: assets.length,
        operationalCount,
        inMaintenanceCount,
        overdueCount,
        dueSoonCount,
        operationalRate: assets.length > 0 ? Math.round((operationalCount / assets.length) * 100) : 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/assets/:id
 */
const getAsset = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const asset = mockAssets.find(
        (a) => a._id === req.params.id || a.assetTag === req.params.id || a.assetCode === req.params.id
      );
      if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
      asset.maintenanceStatus = computeAssetMaintenanceStatus(asset);
      return res.json({ success: true, data: asset });
    }

    const asset = await Asset.findById(req.params.id)
      .populate('base', 'name code')
      .populate('assignedTo', 'name');
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/assets
 */
const createAsset = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    const {
      name,
      assetName,
      assetTag,
      assetCode,
      category,
      base,
      baseName = 'Bharati Station',
      model = '',
      serialNumber = '',
      condition = 'Good',
      status = 'Operational',
      assignedPersonnelName = 'Unassigned',
      maintenanceIntervalDays = 90,
      nextMaintenanceDate,
      specifications = {},
    } = req.body;

    const finalName = assetName || name;
    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }

    if (!isDbConnected) {
      const count = mockAssets.length;
      const code = assetTag || assetCode || `AST-${String(count + 1).padStart(4, '0')}`;
      const defaultNextDate = nextMaintenanceDate || new Date(Date.now() + maintenanceIntervalDays * 86400000).toISOString();

      const newAsset = {
        _id: '67cda500000' + Math.floor(Math.random() * 100000).toString().padStart(13, '0'),
        assetCode: code,
        assetTag: code,
        name: finalName,
        assetName: finalName,
        category: category || 'Vehicle',
        base: base || null,
        baseName: baseName || 'Bharati Station',
        model,
        serialNumber,
        condition,
        status,
        assignedPersonnelName,
        maintenanceIntervalDays: Number(maintenanceIntervalDays) || 90,
        nextMaintenanceDate: defaultNextDate,
        lastMaintenanceDate: new Date().toISOString(),
        maintenanceStatus: 'Up to Date',
        specifications,
        maintenanceHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAssets.unshift(newAsset);
      emitToAll('dashboard:statsUpdated', { module: 'assets' });
      emitToAll('assets:updated', { action: 'create', asset: newAsset });
      return res.status(201).json({ success: true, data: newAsset });
    }

    const count = await Asset.countDocuments();
    const code = assetTag || assetCode || `AST-${String(count + 1).padStart(4, '0')}`;
    const defaultNextDate = nextMaintenanceDate || new Date(Date.now() + (maintenanceIntervalDays || 90) * 86400000);

    const asset = await Asset.create({
      ...req.body,
      assetCode: code,
      assetTag: code,
      assetName: finalName,
      name: finalName,
      nextMaintenanceDate: defaultNextDate,
      lastMaintenanceDate: new Date(),
    });

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: asset._id,
        description: `Asset "${asset.assetName}" (${code}) registered`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'assets' });
    emitToAll('assets:updated', { action: 'create', asset });
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/assets/:id
 */
const updateAsset = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const index = mockAssets.findIndex(
        (a) => a._id === req.params.id || a.assetTag === req.params.id || a.assetCode === req.params.id
      );
      if (index === -1) return res.status(404).json({ success: false, message: 'Asset not found.' });

      const asset = mockAssets[index];
      Object.assign(asset, req.body);
      asset.maintenanceStatus = computeAssetMaintenanceStatus(asset);
      asset.updatedAt = new Date().toISOString();

      emitToAll('dashboard:statsUpdated', { module: 'assets' });
      emitToAll('assets:updated', { action: 'update', asset });
      return res.json({ success: true, data: asset });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    Object.assign(asset, req.body);
    await asset.save();

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'ASSET_UPDATED',
        entityType: 'Asset',
        entityId: asset._id,
        description: `Asset "${asset.assetName}" details updated`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'assets' });
    emitToAll('assets:updated', { action: 'update', asset });
    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/assets/:id/maintenance
 * Record a maintenance event and update asset schedule
 */
const logMaintenance = async (req, res, next) => {
  try {
    const {
      type = 'Routine',
      notes,
      performedBy = 'Station Engineering Team',
      cost = 0,
      nextMaintenanceDate,
      condition = 'Good',
    } = req.body;

    if (!notes) {
      return res.status(400).json({ success: false, message: 'Maintenance notes/description required.' });
    }

    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const asset = mockAssets.find(
        (a) => a._id === req.params.id || a.assetTag === req.params.id || a.assetCode === req.params.id
      );
      if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

      const serviceEntry = {
        _id: 'mnt-' + Date.now(),
        date: new Date().toISOString(),
        type,
        notes,
        performedBy: performedBy || req.user?.name || 'Station Engineer',
        cost: Number(cost) || 0,
      };

      asset.maintenanceHistory = asset.maintenanceHistory || [];
      asset.maintenanceHistory.unshift(serviceEntry);

      asset.status = 'Operational';
      asset.condition = condition;
      asset.lastMaintenanceDate = new Date().toISOString();
      if (nextMaintenanceDate) {
        asset.nextMaintenanceDate = new Date(nextMaintenanceDate).toISOString();
      } else {
        const days = asset.maintenanceIntervalDays || 90;
        asset.nextMaintenanceDate = new Date(Date.now() + days * 86400000).toISOString();
      }
      asset.maintenanceStatus = 'Up to Date';

      emitToAll('dashboard:statsUpdated', { module: 'assets' });
      emitToAll('assets:updated', { action: 'maintenance', asset });
      return res.json({
        success: true,
        message: `Maintenance service logged for ${asset.name || asset.assetName}.`,
        data: asset,
      });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    const serviceEntry = {
      date: new Date(),
      type,
      notes,
      performedBy: performedBy || req.user?.name || 'Station Engineer',
      cost: Number(cost) || 0,
    };

    asset.maintenanceHistory.push(serviceEntry);
    asset.status = 'Operational';
    asset.condition = condition;
    asset.lastMaintenanceDate = new Date();
    if (nextMaintenanceDate) {
      asset.nextMaintenanceDate = new Date(nextMaintenanceDate);
    } else {
      const days = asset.maintenanceIntervalDays || 90;
      asset.nextMaintenanceDate = new Date(Date.now() + days * 86400000);
    }
    asset.maintenanceStatus = 'Up to Date';
    await asset.save();

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'ASSET_MAINTENANCE_LOGGED',
        entityType: 'Asset',
        entityId: asset._id,
        description: `Service [${type}] logged for ${asset.assetName}: ${notes}`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'assets' });
    emitToAll('assets:updated', { action: 'maintenance', asset });
    res.json({
      success: true,
      message: `Maintenance service logged for ${asset.assetName}.`,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/assets/:id
 */
const deleteAsset = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const index = mockAssets.findIndex(
        (a) => a._id === req.params.id || a.assetTag === req.params.id || a.assetCode === req.params.id
      );
      if (index === -1) return res.status(404).json({ success: false, message: 'Asset not found.' });

      const [deleted] = mockAssets.splice(index, 1);
      emitToAll('dashboard:statsUpdated', { module: 'assets' });
      emitToAll('assets:updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true, message: `Asset "${deleted.name || deleted.assetName}" deleted.` });
    }

    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'ASSET_DELETED',
        entityType: 'Asset',
        entityId: asset._id,
        description: `Asset "${asset.assetName}" deleted`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'assets' });
    emitToAll('assets:updated', { action: 'delete', id: req.params.id });
    res.json({ success: true, message: 'Asset deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  getAssetStats,
  getAsset,
  createAsset,
  updateAsset,
  logMaintenance,
  deleteAsset,
};

