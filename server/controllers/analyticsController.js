const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Personnel = require('../models/Personnel');
const Task = require('../models/Task');
const Incident = require('../models/Incident');

const getAnalytics = async (req, res, next) => {
  try {
    const { type } = req.params;
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
        return res.status(400).json({ success: false, message: 'Invalid analytics type.' });
    }
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

module.exports = { getAnalytics };
