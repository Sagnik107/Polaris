const Asset = require('../models/Asset');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');

const { mockAssets } = require('../services/mockDataService');

const getAssets = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockAssets, pagination: getPaginationMeta(mockAssets.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', category = '', condition = '', base = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.$or = [{ assetName: { $regex: search, $options: 'i' } }, { assetCode: { $regex: search, $options: 'i' } }];
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (base) query.base = base;
    const total = await Asset.countDocuments(query);
    const assets = await Asset.find(query).populate('base', 'name code').populate('assignedTo', 'name').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: assets, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('base', 'name code').populate('assignedTo', 'name');
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};

const createAsset = async (req, res, next) => {
  try {
    const count = await Asset.countDocuments();
    const assetCode = `AST-${String(count + 1).padStart(4, '0')}`;
    const asset = await Asset.create({ ...req.body, assetCode });
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'ASSET_CREATED', entityType: 'Asset', entityId: asset._id, description: `Asset "${asset.assetName}" (${assetCode}) created` });
    res.status(201).json({ success: true, data: asset });
  } catch (error) { next(error); }
};

const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    // If maintenance logged, add to history
    if (req.body.maintenanceLog) {
      asset.maintenanceHistory.push(req.body.maintenanceLog);
      asset.maintenanceStatus = 'Up to Date';
      if (req.body.maintenanceLog.nextDueDate) {
        asset.nextMaintenanceDate = req.body.maintenanceLog.nextDueDate;
      }
      delete req.body.maintenanceLog;
    }
    Object.assign(asset, req.body);
    await asset.save();
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'ASSET_UPDATED', entityType: 'Asset', entityId: asset._id, description: `Asset "${asset.assetName}" updated` });
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};

const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    res.json({ success: true, message: 'Asset deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getAssets, getAsset, createAsset, updateAsset, deleteAsset };
