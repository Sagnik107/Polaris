const { v4: uuidv4 } = require('crypto');
const Cargo = require('../models/Cargo');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateCargoCode } = require('../utils/idGenerator');
const { checkCargoDeliveryEffects } = require('../services/automationService');
const { emitToRoles, emitToAll } = require('../services/socketService');

const { mockCargo } = require('../services/mockDataService');

const getCargos = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockCargo, pagination: getPaginationMeta(mockCargo.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', status = '', priority = '', category = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.$or = [{ description: { $regex: search, $options: 'i' } }, { cargoCode: { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    const total = await Cargo.countDocuments(query);
    const cargos = await Cargo.find(query).populate('destinationBase', 'name').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: cargos, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getCargo = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const crg = mockCargo.find((c) => c._id === req.params.id) || mockCargo[0];
      return res.json({ success: true, data: crg });
    }
    const cargo = await Cargo.findById(req.params.id).populate('destinationBase').populate('trackingHistory.updatedBy', 'name');
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found.' });
    res.json({ success: true, data: cargo });
  } catch (error) { next(error); }
};

const createCargo = async (req, res, next) => {
  try {
    const code = await generateCargoCode(Cargo);
    const barcodeValue = require('crypto').randomUUID();
    const cargo = await Cargo.create({
      ...req.body, cargoCode: code, barcodeValue,
      trackingHistory: [{
        status: 'Planned', location: req.body.origin,
        timestamp: new Date(), updatedBy: req.user._id,
        notes: 'Cargo registered',
      }],
    });
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'CARGO_CREATED', entityType: 'Cargo', entityId: cargo._id,
      description: `Cargo ${code} "${cargo.description}" created`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
    res.status(201).json({ success: true, data: cargo });
  } catch (error) { next(error); }
};

const updateCargo = async (req, res, next) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found.' });
    const oldStatus = cargo.status;
    Object.assign(cargo, req.body);
    // If status changed, add tracking history
    if (req.body.status && req.body.status !== oldStatus) {
      cargo.trackingHistory.push({
        status: req.body.status,
        location: req.body.currentLocation || cargo.currentLocation || cargo.destination,
        timestamp: new Date(), updatedBy: req.user._id,
        notes: req.body.notes || `Status updated to ${req.body.status}`,
      });
      // Cross-module effects for delivery
      if (req.body.status === 'Delivered') {
        await checkCargoDeliveryEffects(cargo, req.user._id);
      }
      emitToRoles(['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'], 'cargo:statusUpdated', {
        cargoCode: cargo.cargoCode, status: req.body.status, oldStatus,
      });
    }
    await cargo.save();
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'CARGO_UPDATED', entityType: 'Cargo', entityId: cargo._id,
      description: `Cargo ${cargo.cargoCode} status: ${oldStatus} → ${cargo.status}`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
    res.json({ success: true, data: cargo });
  } catch (error) { next(error); }
};

const deleteCargo = async (req, res, next) => {
  try {
    const cargo = await Cargo.findByIdAndDelete(req.params.id);
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found.' });
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'CARGO_DELETED', entityType: 'Cargo', entityId: cargo._id,
      description: `Cargo ${cargo.cargoCode} deleted`,
    });
    res.json({ success: true, message: 'Cargo deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getCargos, getCargo, createCargo, updateCargo, deleteCargo };
