const Expedition = require('../models/Expedition');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateExpeditionCode } = require('../utils/idGenerator');
const { calculateReadinessScore } = require('../services/automationService');
const { emitToAll } = require('../services/socketService');

const { mockExpeditions } = require('../services/mockDataService');

const getExpeditions = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockExpeditions, pagination: getPaginationMeta(mockExpeditions.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', status = '', type = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { expeditionCode: { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    if (type) query.type = type;
    const total = await Expedition.countDocuments(query);
    const expeditions = await Expedition.find(query).populate('destinationBase', 'name code').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: expeditions, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getExpedition = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find((e) => e._id === req.params.id) || mockExpeditions[0];
      return res.json({ success: true, data: exp });
    }
    const expedition = await Expedition.findById(req.params.id).populate('destinationBase').populate('assignedPersonnel');
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });
    res.json({ success: true, data: expedition });
  } catch (error) { next(error); }
};

const createExpedition = async (req, res, next) => {
  try {
    const code = await generateExpeditionCode(Expedition);
    
    if (require('mongoose').connection.readyState !== 1) {
      const newExp = {
        ...req.body,
        _id: '67cda200000' + Math.floor(Math.random() * 10000).toString().padStart(13, '0'),
        code,
        expeditionCode: code,
        status: req.body.status || 'Planning',
        readinessScore: Math.floor(Math.random() * 30 + 70),
        progress: 0,
        aiRiskPrediction: 'New mission established. Awaiting full sensor telemetry.',
        milestones: [],
        createdAt: new Date().toISOString()
      };
      mockExpeditions.push(newExp);
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.status(201).json({ success: true, data: newExp });
    }

    const expedition = await Expedition.create({ ...req.body, expeditionCode: code });
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'EXPEDITION_CREATED', entityType: 'Expedition', entityId: expedition._id,
      description: `Expedition ${code} "${expedition.name}" created`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.status(201).json({ success: true, data: expedition });
  } catch (error) { next(error); }
};

const updateExpedition = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockExpeditions.findIndex(e => e._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Expedition not found.' });
      mockExpeditions[idx] = { ...mockExpeditions[idx], ...req.body };
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: mockExpeditions[idx] });
    }

    const expedition = await Expedition.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'EXPEDITION_UPDATED', entityType: 'Expedition', entityId: expedition._id,
      description: `Expedition ${expedition.expeditionCode} updated`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: expedition });
  } catch (error) { next(error); }
};

const deleteExpedition = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockExpeditions.findIndex(e => e._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Expedition not found.' });
      mockExpeditions.splice(idx, 1);
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, message: 'Expedition deleted.' });
    }

    const expedition = await Expedition.findByIdAndDelete(req.params.id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });
    await ActivityLog.create({
      actor: req.user._id, actorName: req.user.name,
      action: 'EXPEDITION_DELETED', entityType: 'Expedition', entityId: expedition._id,
      description: `Expedition ${expedition.expeditionCode} deleted`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, message: 'Expedition deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getExpeditions, getExpedition, createExpedition, updateExpedition, deleteExpedition };
