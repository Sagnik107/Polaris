const Base = require('../models/Base');
const Personnel = require('../models/Personnel');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Cargo = require('../models/Cargo');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const { emitToAll } = require('../services/socketService');
const { mockBases, mockPersonnel, mockInventory, mockAssets, mockCargo, mockAlerts } = require('../services/mockDataService');

// Get all bases with optional search and operational status filtering
const getBases = async (req, res, next) => {
  try {
    const { search = '', status = '', type = '' } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockBases];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            (b.name && b.name.toLowerCase().includes(q)) ||
            (b.code && b.code.toLowerCase().includes(q)) ||
            (b.location && b.location.toLowerCase().includes(q)) ||
            (b.type && b.type.toLowerCase().includes(q))
        );
      }

      if (status && status !== 'All') {
        filtered = filtered.filter(
          (b) => b.operationalStatus === status || b.status === status
        );
      }

      if (type && type !== 'All') {
        filtered = filtered.filter((b) => b.type === type);
      }

      return res.json({ success: true, data: filtered });
    }

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.operationalStatus = status;
    if (type && type !== 'All') query.type = type;

    const bases = await Base.find(query).sort('name');
    res.json({ success: true, data: bases });
  } catch (error) {
    next(error);
  }
};

// Summary metrics for Polar Base Command
const getBaseStats = async (req, res, next) => {
  try {
    let bases = [];
    let crew = [];
    if (require('mongoose').connection.readyState !== 1) {
      bases = mockBases;
      crew = mockPersonnel;
    } else {
      bases = await Base.find({}).lean();
      crew = await Personnel.find({}).lean();
    }

    const totalBases = bases.length;
    const operational = bases.filter(
      (b) => b.operationalStatus === 'Operational' || b.status === 'Operational'
    ).length;
    const totalCapacity = bases.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    const totalPersonnel = bases.reduce((acc, b) => acc + (Number(b.currentPersonnel) || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalPersonnel / totalCapacity) * 100) : 0;

    // Average temperature
    const temps = bases
      .map((b) => b.weatherTelemetry?.temperature ?? b.temperature)
      .filter((t) => t !== undefined);
    const meanTemp =
      temps.length > 0
        ? (temps.reduce((acc, t) => acc + t, 0) / temps.length).toFixed(1)
        : -22.5;

    res.json({
      success: true,
      data: {
        totalBases,
        operational,
        totalCapacity,
        totalPersonnel,
        occupancyRate,
        meanTemp,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single base with aggregated linked resources (resident personnel, inventory, assets, cargo, alerts)
const getBase = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const base =
        mockBases.find((b) => b._id === req.params.id || b.code === req.params.id) ||
        mockBases[0];

      const baseId = base._id;
      const baseName = base.name;

      const personnel = mockPersonnel.filter(
        (p) => p.currentBase === baseId || (p.baseName && p.baseName.includes(base.name.split(' ')[0]))
      );
      const inventory = mockInventory.filter(
        (i) => i.base === baseId || (i.baseName && i.baseName.includes(base.name.split(' ')[0]))
      );
      const assets = mockAssets.filter(
        (a) => a.base === baseId || (a.baseName && a.baseName.includes(base.name.split(' ')[0]))
      );
      const cargo = mockCargo.filter(
        (c) =>
          c.destinationBase === baseId ||
          (c.destination && c.destination.includes(base.name.split(' ')[0])) ||
          (c.destinationBaseName && c.destinationBaseName.includes(base.name.split(' ')[0]))
      );
      const alerts = mockAlerts.filter(
        (al) => !al.isRead && (al.base === baseName || (al.base && al.base.includes(base.name.split(' ')[0])))
      );

      return res.json({
        success: true,
        data: {
          ...base,
          personnel,
          inventory,
          assets,
          cargo,
          alerts,
        },
      });
    }

    const base = await Base.findById(req.params.id);
    if (!base) return res.status(404).json({ success: false, message: 'Base not found.' });

    // Aggregate linked data
    const [personnel, inventory, assets, cargo, alerts] = await Promise.all([
      Personnel.find({ currentBase: base._id }).select('name status designation role rank department'),
      Inventory.find({ base: base._id }).select('itemName quantity minThreshold category unit'),
      Asset.find({ base: base._id }).select('assetName condition category status'),
      Cargo.find({ destinationBase: base._id, status: { $nin: ['Delivered'] } }).select('cargoCode status priority eta description'),
      Alert.find({ isRead: false }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        ...base.toObject(),
        personnel,
        inventory,
        assets,
        cargo,
        alerts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new polar outpost / station
const createBase = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;
    const code = req.body.code || `BASE-${String(mockBases.length + 1).padStart(2, '0')}`;

    const newBaseData = {
      _id: isMock ? `67cda00000000000000000${String(mockBases.length + 1).padStart(2, '0')}` : undefined,
      ...req.body,
      code,
      status: req.body.status || req.body.operationalStatus || 'Operational',
      operationalStatus: req.body.operationalStatus || req.body.status || 'Operational',
      capacity: Number(req.body.capacity) || 20,
      currentPersonnel: Number(req.body.currentPersonnel) || 0,
      elevationMeters: Number(req.body.elevationMeters) || 0,
      coordinates: req.body.coordinates || { lat: -72.0, lng: 20.0 },
      facilities: Array.isArray(req.body.facilities) ? req.body.facilities : (req.body.facilities || '').split(',').map((f) => f.trim()).filter(Boolean),
      weatherTelemetry: req.body.weatherTelemetry || {
        temperature: -24,
        windSpeed: '20 kt',
        windGust: '30 kt',
        baroPressure: '986 hPa',
        condition: 'Clear',
        humidity: '60%',
        visibility: '20 km',
      },
      commsStatus: req.body.commsStatus || 'Optimal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMock) {
      mockBases.push(newBaseData);
      emitToAll('dashboard:statsUpdated', { module: 'bases' });
      return res.status(201).json({ success: true, data: newBaseData });
    }

    const base = await Base.create(newBaseData);
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'BASE_CREATED',
      entityType: 'Base',
      entityId: base._id,
      description: `Station Outpost ${base.name} (${base.code}) provisioned`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'bases' });
    res.status(201).json({ success: true, data: base });
  } catch (error) {
    next(error);
  }
};

// Update base configuration and parameters
const updateBase = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockBases.findIndex(
        (b) => b._id === req.params.id || b.code === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Base not found.' });

      const updated = {
        ...mockBases[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      if (req.body.facilities && typeof req.body.facilities === 'string') {
        updated.facilities = req.body.facilities.split(',').map((f) => f.trim()).filter(Boolean);
      }

      mockBases[idx] = updated;
      emitToAll('dashboard:statsUpdated', { module: 'bases' });
      return res.json({ success: true, data: updated });
    }

    const base = await Base.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!base) return res.status(404).json({ success: false, message: 'Base not found.' });

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'BASE_UPDATED',
      entityType: 'Base',
      entityId: base._id,
      description: `Station Outpost ${base.name} parameters updated`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'bases' });

    res.json({ success: true, data: base });
  } catch (error) {
    next(error);
  }
};

// Delete base record
const deleteBase = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockBases.findIndex(
        (b) => b._id === req.params.id || b.code === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Base not found.' });

      const deleted = mockBases.splice(idx, 1)[0];
      emitToAll('dashboard:statsUpdated', { module: 'bases' });
      return res.json({ success: true, message: `Station ${deleted.name} (${deleted.code}) decommissioned.` });
    }

    const base = await Base.findByIdAndDelete(req.params.id);
    if (!base) return res.status(404).json({ success: false, message: 'Base not found.' });

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'BASE_DELETED',
      entityType: 'Base',
      entityId: base._id,
      description: `Station ${base.name} decommissioned`,
    });

    emitToAll('dashboard:statsUpdated', { module: 'bases' });
    res.json({ success: true, message: `Station ${base.name} decommissioned.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBases,
  getBaseStats,
  getBase,
  createBase,
  updateBase,
  deleteBase,
};

