const Cargo = require('../models/Cargo');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateCargoCode } = require('../utils/idGenerator');
const { checkCargoDeliveryEffects } = require('../services/automationService');
const { emitToRoles, emitToAll } = require('../services/socketService');
const { mockCargo } = require('../services/mockDataService');

// Get all cargos with filtering, searching, sorting, pagination
const getCargos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      priority = '',
      category = '',
      destinationBase = '',
      sort = '-createdAt',
    } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockCargo];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            (c.cargoCode && c.cargoCode.toLowerCase().includes(q)) ||
            (c.trackingNumber && c.trackingNumber.toLowerCase().includes(q)) ||
            (c.description && c.description.toLowerCase().includes(q)) ||
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.origin && c.origin.toLowerCase().includes(q)) ||
            (c.destination && c.destination.toLowerCase().includes(q)) ||
            (c.carrier && c.carrier.toLowerCase().includes(q)) ||
            (c.barcodeValue && c.barcodeValue.toLowerCase().includes(q))
        );
      }

      if (status && status !== 'All') {
        filtered = filtered.filter((c) => c.status === status);
      }

      if (priority && priority !== 'All') {
        filtered = filtered.filter((c) => c.priority === priority);
      }

      if (category && category !== 'All') {
        filtered = filtered.filter((c) => c.category === category);
      }

      if (destinationBase && destinationBase !== 'All') {
        filtered = filtered.filter(
          (c) =>
            (c.destination && c.destination.toLowerCase().includes(destinationBase.toLowerCase())) ||
            (c.destinationBaseName && c.destinationBaseName.toLowerCase().includes(destinationBase.toLowerCase())) ||
            c.destinationBase === destinationBase
        );
      }

      // Sorting
      if (sort) {
        const field = sort.startsWith('-') ? sort.substring(1) : sort;
        const dir = sort.startsWith('-') ? -1 : 1;
        filtered.sort((a, b) => {
          let valA = a[field] ?? '';
          let valB = b[field] ?? '';
          if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
          return (valA - valB) * dir;
        });
      }

      const total = filtered.length;
      const p = parseInt(page);
      const l = parseInt(limit);
      const paginated = filtered.slice((p - 1) * l, p * l);

      return res.json({
        success: true,
        data: paginated,
        pagination: getPaginationMeta(total, p, l),
      });
    }

    // Database mode
    const query = {};
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { cargoCode: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { carrier: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (category && category !== 'All') query.category = category;
    if (destinationBase && destinationBase !== 'All') query.destinationBase = destinationBase;

    const total = await Cargo.countDocuments(query);
    const cargos = await Cargo.find(query)
      .populate('destinationBase', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: cargos,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// Summary stats for cargo overview KPI bar
const getCargoStats = async (req, res, next) => {
  try {
    let cargos = [];
    if (require('mongoose').connection.readyState !== 1) {
      cargos = mockCargo;
    } else {
      cargos = await Cargo.find({}).lean();
    }

    const totalShipments = cargos.length;
    const inTransit = cargos.filter((c) => c.status === 'In Transit' || c.status === 'Dispatched').length;
    const delayed = cargos.filter((c) => c.status === 'Delayed').length;
    const delivered = cargos.filter((c) => c.status === 'Delivered').length;
    const criticalUrgent = cargos.filter((c) => c.priority === 'Critical' || c.priority === 'Urgent').length;
    const totalWeightKg = cargos.reduce((acc, c) => acc + (Number(c.weightKg) || 0), 0);
    const totalTons = (totalWeightKg / 1000).toFixed(1);

    // Distribution by category
    const categoryCounts = {};
    cargos.forEach((c) => {
      const cat = c.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalShipments,
        inTransit,
        delayed,
        delivered,
        criticalUrgent,
        totalWeightKg,
        totalTons,
        categoryCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single cargo by ID or tracking code
const getCargo = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const crg =
        mockCargo.find((c) => c._id === req.params.id || c.cargoCode === req.params.id || c.trackingNumber === req.params.id) ||
        mockCargo[0];
      return res.json({ success: true, data: crg });
    }

    let cargo = await Cargo.findById(req.params.id)
      .populate('destinationBase')
      .populate('trackingHistory.updatedBy', 'name');

    if (!cargo) {
      cargo = await Cargo.findOne({
        $or: [{ cargoCode: req.params.id }, { trackingNumber: req.params.id }],
      }).populate('destinationBase').populate('trackingHistory.updatedBy', 'name');
    }

    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo consignment not found.' });
    res.json({ success: true, data: cargo });
  } catch (error) {
    next(error);
  }
};

// Create a new cargo consignment
const createCargo = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;
    const code = isMock
      ? `CRG-2026-${String(mockCargo.length + 1).padStart(3, '0')}`
      : await generateCargoCode(Cargo);

    const barcodeValue = req.body.barcodeValue || `POLARIS-${code}-${Date.now().toString(36).toUpperCase()}`;

    const newCargoData = {
      _id: isMock ? `67cda30000000000000000${String(mockCargo.length + 1).padStart(2, '0')}` : undefined,
      ...req.body,
      cargoCode: code,
      trackingNumber: req.body.trackingNumber || code,
      title: req.body.description || req.body.title || req.body.name,
      name: req.body.description || req.body.title || req.body.name,
      barcodeValue,
      status: req.body.status || 'Planned',
      priority: req.body.priority || 'Standard',
      currentLocation: req.body.currentLocation || req.body.origin || 'Staging Facility',
      batteryReserve: req.body.batteryReserve !== undefined ? Number(req.body.batteryReserve) : 100,
      shockGForce: req.body.shockGForce !== undefined ? Number(req.body.shockGForce) : 0.1,
      currentTemperature: req.body.currentTemperature !== undefined ? Number(req.body.currentTemperature) : -5.0,
      trackingHistory: [
        {
          _id: `th-${Date.now()}-0`,
          status: req.body.status || 'Planned',
          location: req.body.origin || 'Origin Facility',
          timestamp: new Date().toISOString(),
          updatedBy: req.user ? req.user._id : null,
          updatedByName: req.user ? req.user.name : 'Logistics Dispatcher',
          notes: req.body.notes || 'Consignment registered and manifest validated',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMock) {
      mockCargo.unshift(newCargoData);
      emitToAll('dashboard:statsUpdated', { module: 'cargo' });
      emitToAll('cargo:created', { cargo: newCargoData });
      return res.status(201).json({ success: true, data: newCargoData });
    }

    const cargo = await Cargo.create(newCargoData);
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CARGO_CREATED',
      entityType: 'Cargo',
      entityId: cargo._id,
      description: `Cargo ${code} "${cargo.description}" created`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
    emitToAll('cargo:created', { cargo });
    res.status(201).json({ success: true, data: cargo });
  } catch (error) {
    next(error);
  }
};

// Update entire cargo record / manifest
const updateCargo = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockCargo.findIndex(
        (c) => c._id === req.params.id || c.cargoCode === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Cargo not found.' });

      const oldStatus = mockCargo[idx].status;
      const updated = {
        ...mockCargo[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      if (req.body.description) {
        updated.title = req.body.description;
        updated.name = req.body.description;
      }

      if (req.body.status && req.body.status !== oldStatus) {
        updated.trackingHistory = updated.trackingHistory || [];
        updated.trackingHistory.push({
          _id: `th-${Date.now()}`,
          status: req.body.status,
          location: req.body.currentLocation || updated.currentLocation || updated.destination,
          timestamp: new Date().toISOString(),
          updatedBy: req.user ? req.user._id : null,
          updatedByName: req.user ? req.user.name : 'Field Operations',
          notes: req.body.notes || `Status updated from ${oldStatus} to ${req.body.status}`,
        });

        if (req.body.status === 'Delivered') {
          await checkCargoDeliveryEffects(updated, req.user ? req.user._id : 'admin');
        }

        emitToRoles(['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'], 'cargo:statusUpdated', {
          cargoCode: updated.cargoCode,
          status: req.body.status,
          oldStatus,
        });
      }

      mockCargo[idx] = updated;
      emitToAll('dashboard:statsUpdated', { module: 'cargo' });
      return res.json({ success: true, data: updated });
    }

    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found.' });

    const oldStatus = cargo.status;
    Object.assign(cargo, req.body);

    if (req.body.status && req.body.status !== oldStatus) {
      cargo.trackingHistory.push({
        status: req.body.status,
        location: req.body.currentLocation || cargo.currentLocation || cargo.destination,
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: req.body.notes || `Status updated to ${req.body.status}`,
      });

      if (req.body.status === 'Delivered') {
        await checkCargoDeliveryEffects(cargo, req.user._id);
      }

      emitToRoles(['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'], 'cargo:statusUpdated', {
        cargoCode: cargo.cargoCode,
        status: req.body.status,
        oldStatus,
      });
    }

    await cargo.save();
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CARGO_UPDATED',
      entityType: 'Cargo',
      entityId: cargo._id,
      description: `Cargo ${cargo.cargoCode} status: ${oldStatus} → ${cargo.status}`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
    res.json({ success: true, data: cargo });
  } catch (error) {
    next(error);
  }
};

// Specialized waypoint / status update action
const updateCargoStatus = async (req, res, next) => {
  try {
    const { status, location, notes, coordinates, currentTemperature, batteryReserve, shockGForce } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockCargo.findIndex(
        (c) => c._id === req.params.id || c.cargoCode === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Cargo consignment not found.' });

      const cargo = mockCargo[idx];
      const oldStatus = cargo.status;
      cargo.status = status;
      if (location) cargo.currentLocation = location;
      if (coordinates) cargo.currentCoordinates = coordinates;
      if (currentTemperature !== undefined) cargo.currentTemperature = Number(currentTemperature);
      if (batteryReserve !== undefined) cargo.batteryReserve = Number(batteryReserve);
      if (shockGForce !== undefined) cargo.shockGForce = Number(shockGForce);
      cargo.updatedAt = new Date().toISOString();

      cargo.trackingHistory = cargo.trackingHistory || [];
      cargo.trackingHistory.push({
        _id: `th-${Date.now()}`,
        status,
        location: location || cargo.currentLocation,
        timestamp: new Date().toISOString(),
        updatedBy: req.user ? req.user._id : null,
        updatedByName: req.user ? req.user.name : 'Station Officer',
        notes: notes || `Waypoint status changed to ${status}`,
      });

      if (status === 'Delivered') {
        await checkCargoDeliveryEffects(cargo, req.user ? req.user._id : 'admin');
      }

      emitToRoles(['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'], 'cargo:statusUpdated', {
        cargoCode: cargo.cargoCode,
        status,
        oldStatus,
      });
      emitToAll('dashboard:statsUpdated', { module: 'cargo' });

      return res.json({ success: true, data: cargo, message: `Status updated to ${status}` });
    }

    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo consignment not found.' });

    const oldStatus = cargo.status;
    cargo.status = status;
    if (location) cargo.currentLocation = location;
    if (coordinates) cargo.currentCoordinates = coordinates;
    if (currentTemperature !== undefined) cargo.currentTemperature = Number(currentTemperature);
    if (batteryReserve !== undefined) cargo.batteryReserve = Number(batteryReserve);
    if (shockGForce !== undefined) cargo.shockGForce = Number(shockGForce);

    cargo.trackingHistory.push({
      status,
      location: location || cargo.currentLocation || cargo.destination,
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: notes || `Status updated to ${status}`,
    });

    if (status === 'Delivered') {
      await checkCargoDeliveryEffects(cargo, req.user._id);
    }

    await cargo.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CARGO_STATUS_UPDATED',
      entityType: 'Cargo',
      entityId: cargo._id,
      description: `Cargo ${cargo.cargoCode} status: ${oldStatus} → ${status}`,
    });

    emitToRoles(['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'], 'cargo:statusUpdated', {
      cargoCode: cargo.cargoCode,
      status,
      oldStatus,
    });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });

    res.json({ success: true, data: cargo, message: `Status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

// Delete cargo consignment
const deleteCargo = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockCargo.findIndex(
        (c) => c._id === req.params.id || c.cargoCode === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Cargo not found.' });

      const deleted = mockCargo.splice(idx, 1)[0];
      emitToAll('dashboard:statsUpdated', { module: 'cargo' });
      return res.json({ success: true, message: `Consignment ${deleted.cargoCode} deleted.` });
    }

    const cargo = await Cargo.findByIdAndDelete(req.params.id);
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found.' });

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CARGO_DELETED',
      entityType: 'Cargo',
      entityId: cargo._id,
      description: `Cargo ${cargo.cargoCode} deleted`,
    });

    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
    res.json({ success: true, message: `Consignment ${cargo.cargoCode} deleted.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCargos,
  getCargoStats,
  getCargo,
  createCargo,
  updateCargo,
  updateCargoStatus,
  deleteCargo,
};

