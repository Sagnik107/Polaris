const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const MovementLog = require('../models/MovementLog');
const { getPaginationMeta } = require('../utils/pagination');
const { checkLowStock } = require('../services/automationService');
const { emitToAll } = require('../services/socketService');
const { mockInventory } = require('../services/mockDataService');

/**
 * Helper to compute status string
 */
const computeInventoryStatus = (item) => {
  const qty = Number(item.quantity) || 0;
  const min = Number(item.minThreshold) || 10;
  if (qty === 0) return 'Depleted';
  if (qty <= Math.max(1, Math.floor(min * 0.5))) return 'Critical';
  if (qty <= min) return 'Low Stock';
  return 'In Stock';
};

/**
 * GET /api/inventory
 */
const getInventory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      base = '',
      status = '',
      lowStock = '',
      sort = '-updatedAt',
    } = req.query;

    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      let filtered = [...mockInventory];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((i) => {
          const skuMatch = (i.sku || i.itemCode || '').toLowerCase().includes(q);
          const nameMatch = (i.name || i.itemName || '').toLowerCase().includes(q);
          const baseMatch = (i.baseName || '').toLowerCase().includes(q);
          const locMatch = (i.locationDetails || '').toLowerCase().includes(q);
          const catMatch = (i.category || '').toLowerCase().includes(q);
          return skuMatch || nameMatch || baseMatch || locMatch || catMatch;
        });
      }

      if (category && category !== 'all') {
        filtered = filtered.filter(
          (i) => i.category?.toLowerCase() === category.toLowerCase()
        );
      }

      if (base && base !== 'all') {
        filtered = filtered.filter(
          (i) =>
            i.baseName?.toLowerCase().includes(base.toLowerCase()) ||
            i.base === base
        );
      }

      if (status && status !== 'all') {
        filtered = filtered.filter((i) => {
          const itemStatus = (i.status || computeInventoryStatus(i)).toLowerCase();
          return itemStatus.replace(/\s+/g, '') === status.toLowerCase().replace(/\s+/g, '');
        });
      }

      if (lowStock === 'true') {
        filtered = filtered.filter(
          (i) => (Number(i.quantity) || 0) <= (Number(i.minThreshold) || 10)
        );
      }

      // Sort
      if (sort === 'quantity' || sort === 'stock_asc') {
        filtered.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      } else if (sort === '-quantity' || sort === 'stock_desc') {
        filtered.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      } else if (sort === 'name' || sort === 'name_asc') {
        filtered.sort((a, b) => (a.name || a.itemName || '').localeCompare(b.name || b.itemName || ''));
      } else if (sort === 'threshold') {
        filtered.sort((a, b) => (b.minThreshold || 0) - (a.minThreshold || 0));
      } else {
        filtered.sort((a, b) => new Date(b.updatedAt || b.lastRestocked || 0) - new Date(a.updatedAt || a.lastRestocked || 0));
      }

      const p = parseInt(page, 10);
      const l = parseInt(limit, 10);
      const startIndex = (p - 1) * l;
      const paginated = filtered.slice(startIndex, startIndex + l);

      return res.json({
        success: true,
        data: paginated,
        pagination: getPaginationMeta(filtered.length, p, l),
      });
    }

    // Database Connected Query
    const query = {};
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { locationDetails: { $regex: search, $options: 'i' } },
        { baseName: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    if (base && base !== 'all') {
      query.$or = [{ base }, { baseName: { $regex: base, $options: 'i' } }];
    }
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minThreshold'] };
    }

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('base', 'name code')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: items,
      pagination: getPaginationMeta(total, parseInt(page, 10), parseInt(limit, 10)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/stats
 */
const getInventoryStats = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    let items = [];
    if (!isDbConnected) {
      items = mockInventory;
    } else {
      items = await Inventory.find({}).lean();
    }

    let totalUnits = 0;
    let lowStockCount = 0;
    let criticalCount = 0;
    let totalValuation = 0;
    const categoryCounts = {};
    const baseCounts = {};

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const min = Number(item.minThreshold) || 10;
      const cost = Number(item.unitCost) || 0;

      totalUnits += qty;
      totalValuation += qty * cost;

      if (qty <= Math.max(1, Math.floor(min * 0.5))) {
        criticalCount++;
      } else if (qty <= min) {
        lowStockCount++;
      }

      const cat = item.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const base = item.baseName || (item.base && item.base.name) || 'Main Depot';
      baseCounts[base] = (baseCounts[base] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalItems: items.length,
        totalUnits,
        lowStockCount,
        criticalCount,
        totalValuation: Math.round(totalValuation),
        categoryCounts,
        baseCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/:id
 */
const getInventoryItem = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const item = mockInventory.find(
        (i) => i._id === req.params.id || i.sku === req.params.id || i.itemCode === req.params.id
      );
      if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
      return res.json({ success: true, data: item });
    }

    const item = await Inventory.findById(req.params.id).populate('base', 'name code');
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory
 */
const createInventory = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    const {
      sku,
      itemCode,
      name,
      itemName,
      category,
      quantity = 0,
      unit = 'Units',
      minThreshold = 10,
      maxCapacity = 1000,
      base,
      baseName = 'Maitri Station',
      locationDetails = 'Depot Storage Wing',
      unitCost = 0,
      expiryDate = null,
      notes = '',
    } = req.body;

    const finalName = itemName || name;
    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    if (!isDbConnected) {
      const count = mockInventory.length;
      const code = sku || itemCode || `ITM-${String(count + 1).padStart(3, '0')}`;
      const newItem = {
        _id: '67cda400000' + Math.floor(Math.random() * 100000).toString().padStart(13, '0'),
        itemCode: code,
        sku: code,
        itemName: finalName,
        name: finalName,
        category: category || 'Consumables & Fuel',
        base: base || null,
        baseName: baseName || 'Maitri Station',
        locationDetails,
        quantity: Number(quantity) || 0,
        maxCapacity: Number(maxCapacity) || 1000,
        unit,
        minThreshold: Number(minThreshold) || 10,
        unitCost: Number(unitCost) || 0,
        status: computeInventoryStatus({ quantity, minThreshold }),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        lastRestocked: new Date().toISOString(),
        movementHistory: [
          {
            _id: 'mv-' + Date.now(),
            type: 'Addition',
            quantity: Number(quantity) || 0,
            fromBaseName: 'Initial Manifest Entry',
            toBaseName: baseName || 'Maitri Station',
            performedByName: req.user?.name || 'Quartermaster',
            notes: notes || 'Initial stock cataloging',
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockInventory.unshift(newItem);
      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      emitToAll('inventory:updated', { action: 'create', item: newItem });
      return res.status(201).json({ success: true, data: newItem });
    }

    const count = await Inventory.countDocuments();
    const code = sku || itemCode || `ITM-${String(count + 1).padStart(3, '0')}`;
    const status = computeInventoryStatus({ quantity, minThreshold });

    const item = await Inventory.create({
      ...req.body,
      itemCode: code,
      sku: code,
      itemName: finalName,
      name: finalName,
      status,
      lastRestocked: new Date(),
      movementHistory: [
        {
          type: 'Addition',
          quantity: Number(quantity) || 0,
          fromBaseName: 'Initial Manifest Entry',
          toBaseName: baseName || 'Maitri Station',
          performedBy: req.user?._id,
          performedByName: req.user?.name || 'System',
          notes: notes || 'Initial stock cataloging',
          timestamp: new Date(),
        },
      ],
    });

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'INVENTORY_CREATED',
        entityType: 'Inventory',
        entityId: item._id,
        description: `Inventory item "${item.itemName}" (${code}) added with ${quantity} ${unit}`,
      });
    }

    await checkLowStock(item);
    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    emitToAll('inventory:updated', { action: 'create', item });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/inventory/:id
 */
const updateInventory = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const index = mockInventory.findIndex(
        (i) => i._id === req.params.id || i.sku === req.params.id || i.itemCode === req.params.id
      );
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Inventory item not found.' });
      }

      const item = mockInventory[index];
      const oldQty = Number(item.quantity) || 0;
      const newQty = req.body.quantity !== undefined ? Number(req.body.quantity) : oldQty;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        item.movementHistory = item.movementHistory || [];
        item.movementHistory.unshift({
          _id: 'mv-' + Date.now(),
          type: diff > 0 ? 'Addition' : 'Consumption',
          quantity: Math.abs(diff),
          fromBaseName: diff < 0 ? (item.baseName || 'Depot') : 'Restock Flight Delivery',
          toBaseName: diff > 0 ? (item.baseName || 'Depot') : 'Field Operations / Waste',
          performedByName: req.user?.name || 'Operations Officer',
          notes: req.body.notes || `Stock ${diff > 0 ? 'replenishment' : 'usage'} adjustment (${Math.abs(diff)} ${item.unit || 'Units'})`,
          timestamp: new Date().toISOString(),
        });
        item.lastRestocked = diff > 0 ? new Date().toISOString() : item.lastRestocked;
      }

      Object.assign(item, req.body);
      item.quantity = newQty;
      item.status = computeInventoryStatus(item);
      item.updatedAt = new Date().toISOString();

      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      emitToAll('inventory:updated', { action: 'update', item });
      return res.json({ success: true, data: item });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });

    const oldQty = item.quantity;
    const newQty = req.body.quantity !== undefined ? Number(req.body.quantity) : oldQty;
    const diff = newQty - oldQty;

    if (diff !== 0) {
      item.movementHistory.push({
        type: diff > 0 ? 'Addition' : 'Consumption',
        quantity: Math.abs(diff),
        fromBaseName: diff < 0 ? (item.baseName || 'Station Depot') : 'Logistics Supply Delivery',
        toBaseName: diff > 0 ? (item.baseName || 'Station Depot') : 'Expedition Consumption',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Logistics Officer',
        notes: req.body.notes || `Stock ${diff > 0 ? 'addition' : 'consumption'} of ${Math.abs(diff)} ${item.unit}`,
        timestamp: new Date(),
      });
      if (diff > 0) item.lastRestocked = new Date();
    }

    Object.assign(item, req.body);
    item.quantity = newQty;
    item.status = computeInventoryStatus(item);
    await item.save();

    await checkLowStock(item);
    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'INVENTORY_UPDATED',
        entityType: 'Inventory',
        entityId: item._id,
        description: `${item.itemName} stock updated: ${oldQty} → ${item.quantity} ${item.unit}`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    emitToAll('inventory:updated', { action: 'update', item });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/:id/adjust
 * Quick stock +/- adjustment
 */
const adjustStock = async (req, res, next) => {
  try {
    const { delta, reason = 'Routine Stock Adjustment' } = req.body;
    const change = Number(delta);
    if (isNaN(change) || change === 0) {
      return res.status(400).json({ success: false, message: 'Valid non-zero adjustment delta required.' });
    }

    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const item = mockInventory.find(
        (i) => i._id === req.params.id || i.sku === req.params.id || i.itemCode === req.params.id
      );
      if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

      const oldQty = Number(item.quantity) || 0;
      const newQty = Math.max(0, oldQty + change);
      item.quantity = newQty;
      item.status = computeInventoryStatus(item);

      item.movementHistory = item.movementHistory || [];
      item.movementHistory.unshift({
        _id: 'mv-' + Date.now(),
        type: change > 0 ? 'Addition' : 'Consumption',
        quantity: Math.abs(change),
        fromBaseName: change < 0 ? item.baseName : 'Supply Delivery',
        toBaseName: change > 0 ? item.baseName : 'Operational Use',
        performedByName: req.user?.name || 'Quartermaster',
        notes: reason,
        timestamp: new Date().toISOString(),
      });

      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      emitToAll('inventory:updated', { action: 'adjust', item });
      return res.json({ success: true, data: item, message: `Stock adjusted by ${change > 0 ? '+' : ''}${change}` });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const oldQty = item.quantity;
    item.quantity = Math.max(0, oldQty + change);
    item.status = computeInventoryStatus(item);

    item.movementHistory.push({
      type: change > 0 ? 'Addition' : 'Consumption',
      quantity: Math.abs(change),
      fromBaseName: change < 0 ? item.baseName : 'Supply Delivery',
      toBaseName: change > 0 ? item.baseName : 'Operational Use',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Quartermaster',
      notes: reason,
      timestamp: new Date(),
    });

    await item.save();
    await checkLowStock(item);

    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    emitToAll('inventory:updated', { action: 'adjust', item });
    res.json({ success: true, data: item, message: `Stock adjusted by ${change > 0 ? '+' : ''}${change}` });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/transfer or POST /api/inventory/:id/transfer
 */
const transferInventory = async (req, res, next) => {
  try {
    const itemId = req.params.id || req.body.itemId;
    const { toBase, toBaseName = 'Bharati Station', quantity, notes = 'Inter-station logistics transfer' } = req.body;
    const transferQty = Number(quantity);

    if (!transferQty || transferQty <= 0) {
      return res.status(400).json({ success: false, message: 'Transfer quantity must be greater than zero.' });
    }

    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const sourceItem = mockInventory.find(
        (i) => i._id === itemId || i.sku === itemId || i.itemCode === itemId
      );
      if (!sourceItem) return res.status(404).json({ success: false, message: 'Source inventory item not found.' });
      if (sourceItem.quantity < transferQty) {
        return res.status(400).json({ success: false, message: `Insufficient stock (${sourceItem.quantity} ${sourceItem.unit} available).` });
      }

      sourceItem.quantity -= transferQty;
      sourceItem.status = computeInventoryStatus(sourceItem);
      sourceItem.movementHistory = sourceItem.movementHistory || [];
      sourceItem.movementHistory.unshift({
        _id: 'mv-' + Date.now(),
        type: 'Transfer Out',
        quantity: transferQty,
        fromBaseName: sourceItem.baseName,
        toBaseName,
        performedByName: req.user?.name || 'Logistics Coordinator',
        notes: notes || `Transfer to ${toBaseName}`,
        timestamp: new Date().toISOString(),
      });

      // Destination item
      let destItem = mockInventory.find(
        (i) => (i.name === sourceItem.name || i.itemName === sourceItem.itemName) && i.baseName === toBaseName
      );

      if (destItem) {
        destItem.quantity += transferQty;
        destItem.status = computeInventoryStatus(destItem);
        destItem.movementHistory = destItem.movementHistory || [];
        destItem.movementHistory.unshift({
          _id: 'mv-in-' + Date.now(),
          type: 'Transfer In',
          quantity: transferQty,
          fromBaseName: sourceItem.baseName,
          toBaseName,
          performedByName: req.user?.name || 'Logistics Coordinator',
          notes: notes || `Received from ${sourceItem.baseName}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        destItem = {
          ...sourceItem,
          _id: '67cda400000' + Math.floor(Math.random() * 100000).toString().padStart(13, '0'),
          sku: `${sourceItem.sku || sourceItem.itemCode}-T`,
          itemCode: `${sourceItem.sku || sourceItem.itemCode}-T`,
          baseName: toBaseName,
          base: toBase || null,
          quantity: transferQty,
          status: computeInventoryStatus({ quantity: transferQty, minThreshold: sourceItem.minThreshold }),
          movementHistory: [
            {
              _id: 'mv-in-' + Date.now(),
              type: 'Transfer In',
              quantity: transferQty,
              fromBaseName: sourceItem.baseName,
              toBaseName,
              performedByName: req.user?.name || 'Logistics Coordinator',
              notes: notes || `Received initial transfer from ${sourceItem.baseName}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
        mockInventory.unshift(destItem);
      }

      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      emitToAll('inventory:updated', { action: 'transfer', sourceItem, destItem });
      return res.json({
        success: true,
        message: `Successfully transferred ${transferQty} ${sourceItem.unit} to ${toBaseName}.`,
        data: { sourceItem, destItem },
      });
    }

    const item = await Inventory.findById(itemId).populate('base', 'name');
    if (!item) return res.status(404).json({ success: false, message: 'Source inventory item not found.' });
    if (item.quantity < transferQty) {
      return res.status(400).json({ success: false, message: `Insufficient stock (${item.quantity} ${item.unit} available).` });
    }

    item.quantity -= transferQty;
    item.status = computeInventoryStatus(item);
    item.movementHistory.push({
      type: 'Transfer Out',
      quantity: transferQty,
      toBase,
      fromBaseName: item.baseName || item.base?.name || 'Origin Base',
      toBaseName,
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Logistics Coordinator',
      notes,
      timestamp: new Date(),
    });
    await item.save();

    let receivingItem = await Inventory.findOne({
      $or: [{ itemName: item.itemName }, { name: item.name }],
      $or: [{ base: toBase }, { baseName: toBaseName }],
    });

    if (receivingItem) {
      receivingItem.quantity += transferQty;
      receivingItem.status = computeInventoryStatus(receivingItem);
      receivingItem.movementHistory.push({
        type: 'Transfer In',
        quantity: transferQty,
        fromBase: item.base?._id,
        fromBaseName: item.baseName || item.base?.name || 'Origin Base',
        toBaseName,
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Logistics Coordinator',
        notes,
        timestamp: new Date(),
      });
      await receivingItem.save();
    }

    if (req.user) {
      await MovementLog.create({
        entityType: 'Inventory',
        entityId: item._id,
        entityName: item.itemName || item.name,
        fromBase: item.base?._id,
        toBase,
        fromBaseName: item.baseName || item.base?.name || 'Origin Base',
        reason: notes,
        performedBy: req.user._id,
      });
    }

    await checkLowStock(item);
    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    emitToAll('inventory:updated', { action: 'transfer', item });
    res.json({
      success: true,
      message: `Successfully transferred ${transferQty} ${item.unit} to ${toBaseName}.`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/inventory/:id
 */
const deleteInventory = async (req, res, next) => {
  try {
    const isDbConnected = require('mongoose').connection.readyState === 1;

    if (!isDbConnected) {
      const index = mockInventory.findIndex(
        (i) => i._id === req.params.id || i.sku === req.params.id || i.itemCode === req.params.id
      );
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }
      const [deleted] = mockInventory.splice(index, 1);
      emitToAll('dashboard:statsUpdated', { module: 'inventory' });
      emitToAll('inventory:updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true, message: `Inventory item "${deleted.name || deleted.itemName}" deleted.` });
    }

    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (req.user) {
      await ActivityLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'INVENTORY_DELETED',
        entityType: 'Inventory',
        entityId: item._id,
        description: `Inventory item "${item.itemName}" (${item.itemCode || item.sku}) deleted`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'inventory' });
    emitToAll('inventory:updated', { action: 'delete', id: req.params.id });
    res.json({ success: true, message: 'Inventory item deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryStats,
  getInventoryItem,
  createInventory,
  updateInventory,
  adjustStock,
  transferInventory,
  deleteInventory,
};

