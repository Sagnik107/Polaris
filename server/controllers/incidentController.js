const Incident = require('../models/Incident');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateIncidentCode } = require('../utils/idGenerator');
const { checkEmergencyEscalation } = require('../services/automationService');
const { emitToRoles, emitToAll } = require('../services/socketService');

const { mockIncidents } = require('../services/mockDataService');

const getIncidents = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockIncidents, pagination: getPaginationMeta(mockIncidents.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', severity = '', status = '', type = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.$or = [{ description: { $regex: search, $options: 'i' } }, { incidentCode: { $regex: search, $options: 'i' } }];
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (type) query.type = type;
    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query).populate('base', 'name').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: incidents, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('base').populate('assignedTeam', 'name designation').populate('peopleAffected', 'name').populate('timeline.actor', 'name');
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

const createIncident = async (req, res, next) => {
  try {
    const code = await generateIncidentCode(Incident);
    const incident = await Incident.create({
      ...req.body, incidentCode: code, reportedBy: req.user._id,
      timeline: [{ status: 'Reported', note: 'Incident reported', actor: req.user._id, actorName: req.user.name, timestamp: new Date() }],
    });
    await checkEmergencyEscalation(incident);
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'INCIDENT_CREATED', entityType: 'Incident', entityId: incident._id, description: `${incident.severity} ${incident.type} incident ${code} reported` });
    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer', 'ExpeditionManager'], 'emergency:created', { incident });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });
    res.status(201).json({ success: true, data: incident });
  } catch (error) { next(error); }
};

const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
    const oldStatus = incident.status;
    if (req.body.status && req.body.status !== oldStatus) {
      incident.timeline.push({ status: req.body.status, note: req.body.note || `Status changed to ${req.body.status}`, actor: req.user._id, actorName: req.user.name, timestamp: new Date() });
    }
    Object.assign(incident, req.body);
    await incident.save();
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'INCIDENT_UPDATED', entityType: 'Incident', entityId: incident._id, description: `Incident ${incident.incidentCode}: ${oldStatus} → ${incident.status}` });
    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer'], 'emergency:updated', { incident });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });
    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

module.exports = { getIncidents, getIncident, createIncident, updateIncident };
