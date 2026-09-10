const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const MovementLog = require('../models/MovementLog');
const { getPaginationMeta } = require('../utils/pagination');
const { checkLowStock } = require('../services/automationService');
const { emitToAll } = require('../services/socketService');

const { mockInventory } = require('../services/mockDataService');

const getInventory = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockInventory, pagination: getPaginationMeta(mockInventory.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', category = '', base = '', lowStock = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.itemName = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (base) query.base = base;
    if (lowStock === 'true') query.$expr = { $lt: ['$quantity', '$minThreshold'] };
    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query).populate('base', 'name code').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: items, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id).populate('base', 'name code');
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const createInventory = async (req, res, next) => {
  try {
    const count = await Inventory.countDocuments();
    const itemCode = `ITM-${String(count + 1).padStart(3, '0')}`;
    const item = await Inventory.create({ ...req.body, itemCode });
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'INVENTORY_CREATED', entityType: 'Inventory', entityId: item._id,
      description: `Inventory item "${item.itemName}" (${itemCode}) added`,
    });
    await checkLowStock(item);
    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
};

const updateInventory = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    const oldQty = item.quantity;
    Object.assign(item, req.body);
    // Add movement history if quantity changed
    if (req.body.quantity !== undefined && req.body.quantity !== oldQty) {
      const diff = req.body.quantity - oldQty;
      item.movementHistory.push({
        type: diff > 0 ? 'Addition' : 'Consumption',
        quantity: Math.abs(diff),
        performedBy: req.user._id,
        notes: req.body.notes || `Quantity ${diff > 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)}`,
        timestamp: new Date(),
      });
    }
    await item.save();
    // Check low stock automation
    await checkLowStock(item);
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'INVENTORY_UPDATED', entityType: 'Inventory', entityId: item._id,
      description: `${item.itemName} quantity: ${oldQty} → ${item.quantity}`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const transferInventory = async (req, res, next) => {
  try {
    const { toBase, quantity, notes } = req.body;
    const item = await Inventory.findById(req.params.id).populate('base', 'name');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (item.quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock for transfer.' });
    item.quantity -= quantity;
    item.movementHistory.push({
      type: 'Transfer Out', quantity, toBase,
      performedBy: req.user._id, notes: notes || 'Stock transfer',
      timestamp: new Date(),
    });
    await item.save();
    // Create or update receiving base inventory
    let receivingItem = await Inventory.findOne({ itemName: item.itemName, base: toBase });
    if (receivingItem) {
      receivingItem.quantity += quantity;
      receivingItem.movementHistory.push({
        type: 'Transfer In', quantity, fromBase: item.base._id,
        performedBy: req.user._id, notes: notes || 'Stock transfer received',
        timestamp: new Date(),
      });
      await receivingItem.save();
    }
    await MovementLog.create({
      entityType: 'Inventory', entityId: item._id, entityName: item.itemName,
      fromBase: item.base._id, toBase, fromBaseName: item.base.name,
      reason: notes || 'Stock transfer', performedBy: req.user._id,
    });
    await checkLowStock(item);
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'INVENTORY_TRANSFERRED', entityType: 'Inventory', entityId: item._id,
      description: `${quantity} ${item.unit} of ${item.itemName} transferred`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const deleteInventory = async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, message: 'Inventory item deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getInventory, getInventoryItem, createInventory, updateInventory, transferInventory, deleteInventory };
