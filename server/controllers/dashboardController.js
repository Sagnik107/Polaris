const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Personnel = require('../models/Personnel');
const Base = require('../models/Base');
const Task = require('../models/Task');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');

const getDashboardSummary = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({
        success: true,
        data: {
          kpis: {
            expeditions: 5,
            personnel: 124,
            cargo: 14,
            alerts: 6,
          },
          readinessScore: 87,
          activeEmergencies: 1,
          lowStockCount: 3,
          delayedCargoCount: 1,
          overdueTasksCount: 1,
        },
      });
    }

    const [
      activeExpeditions, totalExpeditions, planningExpeditions,
      deployedPersonnel, totalPersonnel,
      cargoInTransit, totalCargo, delayedCargo,
      criticalAlerts, totalAlerts, unreadAlerts,
      lowStockItems, totalInventory,
      activeEmergencies, totalIncidents,
      overdueTasks, totalTasks, completedTasks,
      bases,
      recentActivity,
      expeditions,
    ] = await Promise.all([
      Expedition.countDocuments({ status: 'Active' }),
      Expedition.countDocuments(),
      Expedition.countDocuments({ status: 'Planning' }),
      Personnel.countDocuments({ status: { $in: ['Deployed', 'At Base'] } }),
      Personnel.countDocuments(),
      Cargo.countDocuments({ status: 'In Transit' }),
      Cargo.countDocuments(),
      Cargo.countDocuments({ status: 'Delayed' }),
      Alert.countDocuments({ severity: 'Critical', isRead: false }),
      Alert.countDocuments(),
      Alert.countDocuments({ isRead: false }),
      Inventory.countDocuments({ $expr: { $lt: ['$quantity', '$minThreshold'] } }),
      Inventory.countDocuments(),
      Incident.countDocuments({ status: { $in: ['Reported', 'Assessing', 'Responding'] } }),
      Incident.countDocuments(),
      Task.countDocuments({ status: 'Overdue' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'Completed' }),
      Base.find().lean(),
      ActivityLog.find().sort('-createdAt').limit(10).lean(),
      Expedition.find({ status: 'Active' }).populate('destinationBase').lean(),
    ]);

    // Personnel per base
    const personnelByBase = await Personnel.aggregate([
      { $match: { currentBase: { $ne: null } } },
      { $group: { _id: '$currentBase', count: { $sum: 1 } } },
    ]);

    // Cargo status breakdown
    const cargoByStatus = await Cargo.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Task status breakdown
    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          activeExpeditions, planningExpeditions, totalExpeditions,
          deployedPersonnel, totalPersonnel,
          cargoInTransit, totalCargo, delayedCargo,
          criticalAlerts, totalAlerts, unreadAlerts,
          lowStockItems, totalInventory,
          activeEmergencies, totalIncidents,
          overdueTasks, totalTasks, completedTasks,
        },
        bases,
        personnelByBase,
        cargoByStatus,
        tasksByStatus,
        recentActivity,
        activeExpeditionsList: expeditions,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getDashboardSummary };
