const Personnel = require('../models/Personnel');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { emitToRoles } = require('../services/socketService');

const { mockPersonnel } = require('../services/mockDataService');

const getPersonnel = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockPersonnel, pagination: getPaginationMeta(mockPersonnel.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', status = '', base = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { participantId: { $regex: search, $options: 'i' } }, { designation: { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    if (base) query.currentBase = base;
    const total = await Personnel.countDocuments(query);
    const personnel = await Personnel.find(query).populate('currentBase', 'name code').populate('currentExpedition', 'name expeditionCode').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: personnel, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getPersonnelById = async (req, res, next) => {
  try {
    const person = await Personnel.findById(req.params.id).populate('currentBase').populate('currentExpedition');
    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });
    res.json({ success: true, data: person });
  } catch (error) { next(error); }
};

const createPersonnel = async (req, res, next) => {
  try {
    const count = await Personnel.countDocuments();
    const participantId = `PRS-${String(count + 1).padStart(4, '0')}`;
    const person = await Personnel.create({ ...req.body, participantId });
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'PERSONNEL_CREATED', entityType: 'Personnel', entityId: person._id, description: `Personnel ${person.name} (${participantId}) registered` });
    res.status(201).json({ success: true, data: person });
  } catch (error) { next(error); }
};

const updatePersonnel = async (req, res, next) => {
  try {
    const person = await Personnel.findById(req.params.id);
    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });
    const oldStatus = person.status;
    Object.assign(person, req.body);
    // Movement history on status change
    if (req.body.status && req.body.status !== oldStatus) {
      person.movementHistory.push({
        event: req.body.status === 'At Base' ? 'Check In' : req.body.status === 'Deployed' ? 'Deployment' : 'Transfer',
        location: req.body.location || person.currentBase?.toString() || 'Unknown',
        timestamp: new Date(), notes: `Status: ${oldStatus} → ${req.body.status}`,
      });
      emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:movement', {
        personnel: person.name, status: req.body.status, oldStatus,
      });
    }
    await person.save();
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'PERSONNEL_UPDATED', entityType: 'Personnel', entityId: person._id, description: `${person.name} status: ${oldStatus} → ${person.status}` });
    res.json({ success: true, data: person });
  } catch (error) { next(error); }
};

module.exports = { getPersonnel, getPersonnelById, createPersonnel, updatePersonnel };
