const mongoose = require('mongoose');
const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Personnel = require('../models/Personnel');
const Task = require('../models/Task');
const Incident = require('../models/Incident');

const mockAnalyticsOverview = {
  readinessTrend: [
    { month: 'Oct', score: 68, benchmark: 65 },
    { month: 'Nov', score: 74, benchmark: 70 },
    { month: 'Dec', score: 79, benchmark: 72 },
    { month: 'Jan', score: 82, benchmark: 75 },
    { month: 'Feb', score: 85, benchmark: 78 },
    { month: 'Mar', score: 88, benchmark: 80 },
  ],
  fuelReserves: [
    { base: 'Maitri', stock: 18500, min: 12000, capacity: 35000, unit: 'Liters' },
    { base: 'Bharati', stock: 28000, min: 8000, capacity: 45000, unit: 'Liters' },
    { base: 'Himadri', stock: 6500, min: 3000, capacity: 12000, unit: 'Liters' },
  ],
  cargoStatus: [
    { name: 'Delivered', value: 38, color: '#31d49a' },
    { name: 'In Transit', value: 14, color: '#28a9f5' },
    { name: 'Loading', value: 6, color: '#7bd0ff' },
    { name: 'Delayed / Grounded', value: 3, color: '#ff6678' },
  ],
  baseThreats: [
    { base: 'Maitri Station', critical: 1, high: 1, warning: 0 },
    { base: 'Bharati Station', critical: 1, high: 1, warning: 1 },
    { base: 'Himadri Station', critical: 0, high: 0, warning: 1 },
  ],
  hourlyAlertVolume: [
    { time: '00:00', critical: 0, high: 1, warning: 0 },
    { time: '04:00', critical: 0, high: 0, warning: 1 },
    { time: '08:00', critical: 1, high: 1, warning: 0 },
    { time: '12:00', critical: 0, high: 2, warning: 1 },
    { time: '16:00', critical: 2, high: 1, warning: 1 },
    { time: '20:00', critical: 1, high: 0, warning: 2 },
  ],
  kpis: {
    mttrHours: 4.2,
    turbineUptimePercent: 99.4,
    medicalCompliancePercent: 100,
    mttaMinutes: 1.4,
    sensorAccuracyPercent: 99.8,
  },
};

const getAnalytics = async (req, res, next) => {
  try {
    const type = req.params.type || req.query.type || 'overview';

    if (mongoose.connection.readyState !== 1 || type === 'overview' || type === 'all') {
      return res.json({ success: true, data: mockAnalyticsOverview });
    }

    let data;
    switch (type) {
      case 'expeditions': {
        data = await Expedition.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        break;
      }
      case 'cargo': {
        const byStatus = await Cargo.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const byCategory = await Cargo.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
        const byPriority = await Cargo.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);
        data = { byStatus, byCategory, byPriority };
        break;
      }
      case 'inventory': {
        const byCategory = await Inventory.aggregate([{ $group: { _id: '$category', totalQty: { $sum: '$quantity' }, count: { $sum: 1 } } }]);
        const lowStock = await Inventory.countDocuments({ $expr: { $lt: ['$quantity', '$minThreshold'] } });
        data = { byCategory, lowStockCount: lowStock };
        break;
      }
      case 'assets': {
        data = await Asset.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]);
        break;
      }
      case 'personnel': {
        const byStatus = await Personnel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const byBase = await Personnel.aggregate([
          { $match: { currentBase: { $ne: null } } },
          { $lookup: { from: 'bases', localField: 'currentBase', foreignField: '_id', as: 'base' } },
          { $unwind: '$base' },
          { $group: { _id: '$base.name', count: { $sum: 1 } } },
        ]);
        data = { byStatus, byBase };
        break;
      }
      case 'tasks': {
        data = await Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        break;
      }
      case 'incidents': {
        const bySeverity = await Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]);
        const byType = await Incident.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
        data = { bySeverity, byType };
        break;
      }
      default:
        data = mockAnalyticsOverview;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
