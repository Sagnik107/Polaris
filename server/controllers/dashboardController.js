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
const { mockExpeditions, mockCargo, mockAlerts, mockPersonnel, mockInventory, mockIncidents, mockTasks, mockBases, mockAssets } = require('../services/mockDataService');

const getDashboardSummary = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const activeExpeditions = mockExpeditions.filter(e => e.status === 'Active' || e.status === 'In Progress');
      activeExpeditions.forEach(e => {
        if (e.milestones && e.milestones.length > 0) {
          let score = 0;
          for (const m of e.milestones) {
            const s = (m.status || '').toLowerCase();
            if (s === 'completed') score += 1.0;
            else if (s === 'in_progress' || s === 'inprogress' || s === 'in progress') score += 0.5;
          }
          e.progress = Math.min(100, Math.round((score / e.milestones.length) * 100));
        }
      });
      const avgReadiness = activeExpeditions.length > 0 
        ? Math.round(activeExpeditions.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) / activeExpeditions.length) 
        : 87;
      
      const totalPersonnelAcrossBases = mockBases.reduce((acc, b) => acc + (b.currentPersonnel || 0), 0) || 124;
      const delayedCargoList = mockCargo.filter(c => c.status === 'Delayed');
      const inTransitCargoList = mockCargo.filter(c => c.status === 'InTransit' || c.status === 'In Transit');
      const criticalAlertsList = mockAlerts.filter(a => a.severity === 'Critical');

      // Accurate Inventory Sync
      const lowStockList = mockInventory.filter(
        i => i.status === 'Low Stock' || i.status === 'LowStock' || (i.quantity !== undefined && i.minThreshold !== undefined && Number(i.quantity) <= Number(i.minThreshold))
      );
      const fuelItems = mockInventory.filter(
        i => (i.category && i.category.toLowerCase().includes('fuel')) || (i.name && i.name.toLowerCase().includes('fuel')) || (i.itemName && i.itemName.toLowerCase().includes('fuel')) || (i.itemName && i.itemName.toLowerCase().includes('diesel'))
      );
      const totalFuelLiters = fuelItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      const medicalItems = mockInventory.filter(
        i => (i.category && i.category.toLowerCase().includes('medical')) || (i.itemName && i.itemName.toLowerCase().includes('plasma')) || (i.itemName && i.itemName.toLowerCase().includes('antibiotic'))
      );
      const totalMedicalUnits = medicalItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

      // Accurate Assets Sync
      const assetsList = mockAssets || [];
      const operationalAssets = assetsList.filter(a => a.status === 'Operational' || a.status === 'Active').length;

      return res.json({
        success: true,
        data: {
          kpis: {
            expeditions: activeExpeditions.length || 3,
            activeExpeditions: activeExpeditions.length || 3,
            totalExpeditions: mockExpeditions.length || 4,
            planningExpeditions: mockExpeditions.filter(e => e.status === 'Planning').length || 1,
            personnel: totalPersonnelAcrossBases,
            deployedPersonnel: totalPersonnelAcrossBases,
            totalPersonnel: totalPersonnelAcrossBases + 15,
            cargo: inTransitCargoList.length + delayedCargoList.length || 12,
            cargoInTransit: inTransitCargoList.length || 10,
            delayedCargo: delayedCargoList.length || 2,
            totalCargo: mockCargo.length || 14,
            alerts: mockAlerts.length || 4,
            criticalAlerts: criticalAlertsList.length || 1,
            unreadAlerts: mockAlerts.filter(a => !a.isRead).length || 3,
            activeEmergencies: mockIncidents.length || 1,
            lowStockItems: lowStockList.length,
            totalInventory: mockInventory.length,
            fuelReservesLiters: totalFuelLiters || 20900,
            medicalPlasmaUnits: totalMedicalUnits || 12,
            totalAssets: assetsList.length || 9,
            operationalAssets: operationalAssets || 8,
            overdueTasks: mockTasks.filter(t => t.status === 'Overdue').length || 1,
            totalTasks: mockTasks.length || 8,
          },
          readinessScore: avgReadiness,
          activeEmergencies: mockIncidents.length || 1,
          lowStockCount: lowStockList.length,
          delayedCargoCount: delayedCargoList.length || 2,
          overdueTasksCount: mockTasks.filter(t => t.status === 'Overdue').length || 1,
          inventoryMetrics: {
            totalItems: mockInventory.length,
            lowStockCount: lowStockList.length,
            fuelLiters: totalFuelLiters || 20900,
            medicalUnits: totalMedicalUnits || 12,
            lowStockItems: lowStockList,
          },
          assetMetrics: {
            total: assetsList.length || 9,
            operational: operationalAssets || 8,
            maintenance: assetsList.filter(a => a.status === 'Maintenance').length,
          },
          activeExpeditionsList: activeExpeditions,
          bases: mockBases,
          personnelByBase: mockBases.map(b => ({ _id: b.name, count: b.currentPersonnel })),
          cargoByStatus: [
            { _id: 'InTransit', count: inTransitCargoList.length || 2 },
            { _id: 'Delayed', count: delayedCargoList.length || 1 },
            { _id: 'Delivered', count: mockCargo.filter(c => c.status === 'Delivered').length || 1 },
          ],
          tasksByStatus: [
            { _id: 'InProgress', count: mockTasks.filter(t => t.status === 'InProgress').length || 1 },
            { _id: 'Overdue', count: mockTasks.filter(t => t.status === 'Overdue').length || 1 },
            { _id: 'Completed', count: mockTasks.filter(t => t.status === 'Completed').length || 2 },
          ],
          recentActivity: mockAlerts.slice(0, 10),
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
      rawExpeditions,
    ] = await Promise.all([
      Expedition.countDocuments({ status: { $in: ['Active', 'In Progress'] } }),
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
      Expedition.find({ status: { $in: ['Active', 'In Progress'] } }).populate('destinationBase').lean(),
    ]);

    const expeditions = (rawExpeditions || []).map(exp => {
      let score = 0;
      const milestones = exp.milestones || [];
      if (milestones.length > 0) {
        for (const m of milestones) {
          const s = (m.status || '').toLowerCase();
          if (s === 'completed') score += 1.0;
          else if (s === 'in_progress' || s === 'inprogress' || s === 'in progress') score += 0.5;
        }
        exp.progress = Math.min(100, Math.round((score / milestones.length) * 100));
      } else {
        exp.progress = exp.progress ?? 0;
      }
      exp.code = exp.code || exp.expeditionCode;
      return exp;
    });

    // Calculate dynamic readiness score from active expeditions
    let readinessScore = 87;
    if (expeditions && expeditions.length > 0) {
      const totalScore = expeditions.reduce((acc, exp) => acc + (exp.readinessScore || 80), 0);
      readinessScore = Math.round(totalScore / expeditions.length);
    }

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
          expeditions: activeExpeditions,
          activeExpeditions,
          planningExpeditions,
          totalExpeditions,
          personnel: deployedPersonnel || bases.reduce((acc, b) => acc + (b.currentPersonnel || 0), 0),
          deployedPersonnel,
          totalPersonnel,
          cargo: cargoInTransit + delayedCargo,
          cargoInTransit,
          totalCargo,
          delayedCargo,
          alerts: totalAlerts,
          criticalAlerts,
          unreadAlerts,
          lowStockItems,
          totalInventory,
          activeEmergencies,
          totalIncidents,
          overdueTasks,
          totalTasks,
          completedTasks,
        },
        readinessScore,
        activeEmergencies,
        lowStockCount: lowStockItems,
        delayedCargoCount: delayedCargo,
        overdueTasksCount: overdueTasks,
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
