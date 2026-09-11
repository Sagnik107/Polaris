const cron = require('node-cron');
const Cargo = require('../models/Cargo');
const Task = require('../models/Task');
const Asset = require('../models/Asset');
const Inventory = require('../models/Inventory');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const { emitToRoles, emitToAll } = require('./socketService');

// ────────────────────────────────────────────
// WRITE-TRIGGERED AUTOMATIONS
// ────────────────────────────────────────────

const checkLowStock = async (inventoryItem) => {
  if (inventoryItem.quantity < inventoryItem.minThreshold) {
    const existing = await Alert.findOne({
      type: 'low_stock', sourceModule: 'inventory',
      sourceId: inventoryItem._id, isRead: false,
    });
    if (!existing) {
      const alert = await Alert.create({
        type: 'low_stock', severity: inventoryItem.quantity === 0 ? 'Critical' : 'High',
        sourceModule: 'inventory', sourceId: inventoryItem._id,
        message: `Low stock: ${inventoryItem.itemName} at ${inventoryItem.quantity} ${inventoryItem.unit} (threshold: ${inventoryItem.minThreshold})`,
        targetRoles: ['SuperAdmin', 'InventoryManager', 'BaseOfficer'],
        actionUrl: `/inventory/${inventoryItem._id}`,
      });
      emitToRoles(['SuperAdmin', 'InventoryManager', 'BaseOfficer'], 'inventory:lowStock', {
        alert, item: inventoryItem,
      });
      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      return alert;
    }
  }
  return null;
};

const checkCargoDeliveryEffects = async (cargo, userId) => {
  // When cargo is delivered, update related inventory
  if (cargo.status === 'Delivered' && cargo.destinationBase) {
    const inventoryItems = await Inventory.find({
      base: cargo.destinationBase,
      category: cargo.category,
    });
    // If matching inventory found, increment quantity
    if (inventoryItems.length > 0) {
      const item = inventoryItems[0];
      item.quantity += cargo.quantity;
      item.movementHistory.push({
        type: 'Cargo Delivery', quantity: cargo.quantity,
        notes: `Delivered from cargo ${cargo.cargoCode}`,
        performedBy: userId, timestamp: new Date(),
      });
      item.lastRestocked = new Date();
      await item.save();
    }
    // Clear any cargo delay alerts for this cargo
    await Alert.updateMany(
      { type: 'cargo_delay', sourceId: cargo._id, isRead: false },
      { isRead: true }
    );
  }
  emitToAll('dashboard:statsUpdated', { module: 'cargo' });
};

const checkEmergencyEscalation = async (incident) => {
  if (incident.severity === 'Critical' && incident.status === 'Reported') {
    const alert = await Alert.create({
      type: 'emergency', severity: 'Critical',
      sourceModule: 'incident', sourceId: incident._id,
      message: `CRITICAL INCIDENT: ${incident.type} at ${incident.location} — ${incident.description.substring(0, 100)}`,
      targetRoles: ['SuperAdmin', 'MedicalOfficer', 'ExpeditionManager', 'Viewer'],
      actionUrl: `/emergency/${incident._id}`,
    });
    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'ExpeditionManager', 'BaseOfficer', 'Viewer'], 'emergency:created', {
      alert, incident,
    });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });
    return alert;
  }
  return null;
};

const calculateReadinessScore = (expedition) => {
  let score = 0;
  let factors = 0;
  // Personnel assigned %
  const personnelTarget = 8;
  const personnelScore = Math.min((expedition.assignedPersonnel?.length || 0) / personnelTarget, 1) * 100;
  score += personnelScore * 0.35;
  factors++;
  // Resources assigned %
  const resourceTarget = 5;
  const resourceScore = Math.min((expedition.assignedResources?.length || 0) / resourceTarget, 1) * 100;
  score += resourceScore * 0.25;
  factors++;
  // Milestone completion & in-progress %
  if (expedition.milestones && expedition.milestones.length > 0) {
    let msScore = 0;
    for (const m of expedition.milestones) {
      const s = (m.status || '').toLowerCase();
      if (s === 'completed') msScore += 1.0;
      else if (s === 'in_progress' || s === 'inprogress' || s === 'in progress') msScore += 0.5;
    }
    const milestoneScore = (msScore / expedition.milestones.length) * 100;
    score += milestoneScore * 0.40;
  } else {
    score += 50 * 0.40;
  }
  return Math.round(score);
};

// ────────────────────────────────────────────
// SCHEDULED CRON AUTOMATIONS
// ────────────────────────────────────────────

const checkCargoDelays = async () => {
  const now = new Date();
  const delayedCargo = await Cargo.find({
    status: { $in: ['Planned', 'Packed', 'Dispatched', 'In Transit'] },
    expectedArrival: { $lt: now },
  });
  for (const cargo of delayedCargo) {
    if (cargo.status !== 'Delayed') {
      cargo.status = 'Delayed';
      cargo.trackingHistory.push({
        status: 'Delayed', location: cargo.currentLocation || cargo.origin,
        timestamp: now, notes: 'Auto-detected: past expected arrival date',
      });
      await cargo.save();
    }
    const existing = await Alert.findOne({
      type: 'cargo_delay', sourceId: cargo._id, isRead: false,
    });
    if (!existing) {
      await Alert.create({
        type: 'cargo_delay', severity: cargo.priority === 'High' ? 'High' : 'Medium',
        sourceModule: 'cargo', sourceId: cargo._id,
        message: `Cargo ${cargo.cargoCode} is delayed. Expected: ${cargo.expectedArrival.toISOString().split('T')[0]}`,
        targetRoles: ['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'],
        actionUrl: `/cargo/${cargo._id}`,
      });
    }
  }
  if (delayedCargo.length > 0) {
    emitToRoles(['SuperAdmin', 'LogisticsCoordinator'], 'cargo:statusUpdated', { count: delayedCargo.length });
    emitToAll('dashboard:statsUpdated', { module: 'cargo' });
  }
};

const checkOverdueTasks = async () => {
  const now = new Date();
  const overdue = await Task.find({
    status: { $nin: ['Completed', 'Overdue'] },
    deadline: { $lt: now },
  });
  for (const task of overdue) {
    task.status = 'Overdue';
    await task.save();
    const existing = await Alert.findOne({
      type: 'overdue_task', sourceId: task._id, isRead: false,
    });
    if (!existing) {
      await Alert.create({
        type: 'overdue_task', severity: task.priority === 'High' ? 'High' : 'Medium',
        sourceModule: 'task', sourceId: task._id,
        message: `Task "${task.title}" is overdue. Deadline: ${task.deadline.toISOString().split('T')[0]}`,
        targetRoles: ['SuperAdmin', 'ExpeditionManager'],
        actionUrl: `/tasks/${task._id}`,
      });
    }
  }
  if (overdue.length > 0) {
    emitToAll('task:statusChanged', { count: overdue.length });
    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
  }
};

const checkMaintenanceDue = async () => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueAssets = await Asset.find({
    nextMaintenanceDate: { $lte: sevenDays, $gte: now },
    maintenanceStatus: { $ne: 'In Maintenance' },
  });
  for (const asset of dueAssets) {
    asset.maintenanceStatus = 'Due Soon';
    await asset.save();
    const existing = await Alert.findOne({
      type: 'maintenance_due', sourceId: asset._id, isRead: false,
    });
    if (!existing) {
      await Alert.create({
        type: 'maintenance_due', severity: 'Medium',
        sourceModule: 'asset', sourceId: asset._id,
        message: `Asset "${asset.assetName}" maintenance due by ${asset.nextMaintenanceDate.toISOString().split('T')[0]}`,
        targetRoles: ['SuperAdmin', 'InventoryManager', 'BaseOfficer'],
        actionUrl: `/assets/${asset._id}`,
      });
    }
  }
};

const checkExpiringInventory = async () => {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiring = await Inventory.find({
    expiryDate: { $lte: thirtyDays, $gte: now },
  });
  for (const item of expiring) {
    const existing = await Alert.findOne({
      type: 'expiry_warning', sourceId: item._id, isRead: false,
    });
    if (!existing) {
      await Alert.create({
        type: 'expiry_warning', severity: 'Medium',
        sourceModule: 'inventory', sourceId: item._id,
        message: `${item.itemName} expires on ${item.expiryDate.toISOString().split('T')[0]}`,
        targetRoles: ['SuperAdmin', 'InventoryManager'],
        actionUrl: `/inventory/${item._id}`,
      });
    }
  }
};

const checkEmergencyEscalationScheduled = async () => {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const unassigned = await Incident.find({
    severity: 'Critical', status: 'Reported',
    createdAt: { $lt: fifteenMinAgo },
    escalated: { $ne: true },
  });
  for (const incident of unassigned) {
    incident.escalated = true;
    incident.timeline.push({
      status: 'Escalated', note: 'Auto-escalated: Critical incident unassigned for >15 minutes',
      timestamp: new Date(),
    });
    await incident.save();
    await Alert.create({
      type: 'emergency', severity: 'Critical',
      sourceModule: 'incident', sourceId: incident._id,
      message: `ESCALATION: Critical incident ${incident.incidentCode} unassigned for >15 minutes`,
      targetRoles: ['SuperAdmin', 'Viewer'],
      actionUrl: `/emergency/${incident._id}`,
    });
    emitToRoles(['SuperAdmin', 'Viewer'], 'emergency:updated', { incident });
  }
};

// ────────────────────────────────────────────
// INIT CRON JOBS
// ────────────────────────────────────────────

const initCronJobs = () => {
  // Hourly checks
  cron.schedule('0 * * * *', async () => {
    console.log('[POLARIS Cron] Running hourly checks...');
    await checkCargoDelays();
    await checkOverdueTasks();
    await checkEmergencyEscalationScheduled();
  });

  // Daily checks (6 AM)
  cron.schedule('0 6 * * *', async () => {
    console.log('[POLARIS Cron] Running daily checks...');
    await checkMaintenanceDue();
    await checkExpiringInventory();
  });

  console.log('[POLARIS] Automation cron jobs initialized');
};

module.exports = {
  initCronJobs,
  checkLowStock,
  checkCargoDeliveryEffects,
  checkEmergencyEscalation,
  calculateReadinessScore,
  checkCargoDelays,
  checkOverdueTasks,
  checkMaintenanceDue,
};
