const Incident = require('../models/Incident');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateIncidentCode } = require('../utils/idGenerator');
const { checkEmergencyEscalation } = require('../services/automationService');
const { emitToRoles, emitToAll } = require('../services/socketService');

const { mockIncidents, mockAlerts, mockPersonnel, mockBases } = require('../services/mockDataService');

// Get all incidents with search, status, severity, and type filtering
const getIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      severity = '',
      status = '',
      type = '',
      sort = '-createdAt',
    } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockIncidents];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (inc) =>
            (inc.title && inc.title.toLowerCase().includes(q)) ||
            (inc.description && inc.description.toLowerCase().includes(q)) ||
            (inc.incidentCode && inc.incidentCode.toLowerCase().includes(q)) ||
            (inc.incidentNumber && inc.incidentNumber.toLowerCase().includes(q)) ||
            (inc.baseName && inc.baseName.toLowerCase().includes(q)) ||
            (inc.location && inc.location.toLowerCase().includes(q))
        );
      }

      if (severity && severity !== 'All') {
        filtered = filtered.filter((inc) => inc.severity === severity);
      }

      if (status && status !== 'All') {
        if (status === 'Active') {
          filtered = filtered.filter((inc) => inc.status === 'Active' || inc.status === 'Reported' || inc.status === 'Assessing');
        } else {
          filtered = filtered.filter((inc) => inc.status === status);
        }
      }

      if (type && type !== 'All') {
        filtered = filtered.filter((inc) => inc.type === type);
      }

      return res.json({
        success: true,
        data: filtered,
        pagination: getPaginationMeta(filtered.length, parseInt(page), parseInt(limit)),
      });
    }

    const query = {};
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { incidentCode: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (severity && severity !== 'All') query.severity = severity;
    if (status && status !== 'All') {
      if (status === 'Active') {
        query.status = { $in: ['Active', 'Reported', 'Assessing'] };
      } else {
        query.status = status;
      }
    }
    if (type && type !== 'All') query.type = type;

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .populate('base', 'name code location')
      .populate('assignedTeam', 'name designation role')
      .populate('peopleAffected', 'name designation')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: incidents,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// Summary stats for Emergency Command Center
const getIncidentStats = async (req, res, next) => {
  try {
    let incidentList = [];
    if (require('mongoose').connection.readyState !== 1) {
      incidentList = mockIncidents;
    } else {
      incidentList = await Incident.find({}).lean();
    }

    const total = incidentList.length;
    const critical = incidentList.filter((i) => i.severity === 'Critical').length;
    const responding = incidentList.filter((i) => i.status === 'Responding').length;
    const active = incidentList.filter((i) => i.status === 'Active' || i.status === 'Reported' || i.status === 'Assessing').length;
    const resolved = incidentList.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;
    const dispatchedUnits = incidentList.filter((i) => i.dispatchDetails && (i.status === 'Responding' || i.status === 'Active')).length;

    res.json({
      success: true,
      data: {
        total,
        critical,
        responding,
        active,
        resolved,
        dispatchedUnits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single incident
const getIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const incident = mockIncidents.find(
        (i) => i._id === id || i.incidentCode === id || i.incidentNumber === id
      );
      if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
      return res.json({ success: true, data: incident });
    }

    const incident = await Incident.findById(id)
      .populate('base')
      .populate('assignedTeam', 'name designation role')
      .populate('peopleAffected', 'name')
      .populate('timeline.actor', 'name');

    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

// Declare new emergency incident
const createIncident = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type = 'Facility',
      severity = 'Critical',
      baseName = 'Maitri Station',
      baseId,
      location = '',
      requiredResources = [],
      assignedTeam = [],
      peopleAffected = [],
      status = 'Active',
    } = req.body;

    const actorName = req.user?.name || 'Commander Radhika Roy';
    const actorId = req.user?._id;

    if (require('mongoose').connection.readyState !== 1) {
      const code = `INC-2026-${String(mockIncidents.length + 1).padStart(3, '0')}`;
      const newIncident = {
        _id: `mock-inc-${Date.now()}`,
        incidentCode: code,
        incidentNumber: code,
        title: title || `${severity} ${type} Alert - ${baseName}`,
        description,
        type,
        severity,
        status,
        baseName,
        baseId: baseId || '67cda0000000000000000001',
        location: location || `${baseName} Sector Alpha`,
        reporterName: actorName,
        requiredResources: Array.isArray(requiredResources) ? requiredResources : [requiredResources].filter(Boolean),
        assignedTeam: Array.isArray(assignedTeam) ? assignedTeam : [],
        peopleAffected: Array.isArray(peopleAffected) ? peopleAffected : [],
        actions: [
          {
            description: `Emergency declaration protocol initiated for ${baseName}`,
            performedBy: actorName,
            timestamp: new Date().toISOString(),
          },
        ],
        timeline: [
          {
            status: 'Reported',
            note: 'Emergency incident declared and broadcast across station C2 network',
            actorName,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockIncidents.unshift(newIncident);

      // Create linked alert
      mockAlerts.unshift({
        _id: `alert-${Date.now()}`,
        title: `${severity.toUpperCase()}: ${newIncident.title}`,
        message: description,
        type: 'Emergency',
        severity: severity,
        module: 'Incidents',
        base: baseName,
        isRead: false,
        status: 'Active',
        telemetry: { incidentCode: code, base: baseName },
        createdAt: new Date().toISOString(),
      });

      emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer', 'ExpeditionManager'], 'emergency:created', { incident: newIncident });
      emitToAll('dashboard:statsUpdated', { module: 'emergency' });

      return res.status(201).json({ success: true, data: newIncident });
    }

    const code = await generateIncidentCode(Incident);
    const incident = await Incident.create({
      ...req.body,
      incidentCode: code,
      reportedBy: actorId,
      timeline: [
        {
          status: 'Reported',
          note: 'Emergency protocol declared',
          actor: actorId,
          actorName,
          timestamp: new Date(),
        },
      ],
    });

    await checkEmergencyEscalation(incident);
    await ActivityLog.create({
      actor: actorId,
      actorName,
      action: 'INCIDENT_CREATED',
      entityType: 'Incident',
      entityId: incident._id,
      description: `${incident.severity} ${incident.type} incident ${code} reported at ${baseName}`,
    });

    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer', 'ExpeditionManager'], 'emergency:created', { incident });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });

    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

// Specialized SOS Tactical Emergency Dispatch endpoint
const dispatchSosIncident = async (req, res, next) => {
  try {
    const {
      incidentId,
      title,
      description,
      type = 'Medical',
      severity = 'Critical',
      baseName = 'Maitri Station',
      location = '',
      leadResponder = 'Dr. Maya Patel',
      dispatchUnit = 'Mil Mi-8 Polar Medevac Helo Flight-01',
      eta = '15 Minutes',
      operationalNotes = '',
      requiredResources = ['Hyperbaric Trauma Pod', 'Emergency Blood Plasma', 'Crevasse Winch Rig'],
    } = req.body;

    const actorName = req.user?.name || 'Commander Radhika Roy';
    const timestamp = new Date().toISOString();

    if (require('mongoose').connection.readyState !== 1) {
      let targetIncident = null;

      if (incidentId) {
        targetIncident = mockIncidents.find(
          (i) => i._id === incidentId || i.incidentCode === incidentId || i.incidentNumber === incidentId
        );
      }

      if (!targetIncident) {
        const code = `INC-2026-${String(mockIncidents.length + 1).padStart(3, '0')}`;
        targetIncident = {
          _id: `mock-inc-${Date.now()}`,
          incidentCode: code,
          incidentNumber: code,
          title: title || `SOS TACTICAL DISPATCH: ${type} Emergency at ${baseName}`,
          description: description || `Immediate tactical response unit mobilized to ${location || baseName}.`,
          type,
          severity,
          status: 'Responding',
          baseName,
          baseId: '67cda0000000000000000001',
          location: location || `${baseName} Perimeter`,
          reporterName: actorName,
          requiredResources,
          assignedTeam: [
            { name: leadResponder, role: 'Lead Responder' },
            { name: 'Commander Radhika Roy', role: 'Incident Commander' },
          ],
          actions: [],
          timeline: [
            {
              status: 'Reported',
              note: 'Mayday / SOS beacon triggered',
              actorName,
              timestamp,
            },
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        mockIncidents.unshift(targetIncident);
      }

      // Update incident with dispatch details
      targetIncident.status = 'Responding';
      targetIncident.dispatchDetails = {
        unit: dispatchUnit,
        leadResponder,
        dispatchedAt: timestamp,
        status: 'Airborne / En Route',
        eta,
        notes: operationalNotes,
      };

      targetIncident.actions.unshift({
        description: `SOS DISPATCH: ${dispatchUnit} scrambled under command of ${leadResponder}. ETA: ${eta}.`,
        performedBy: actorName,
        timestamp,
      });

      targetIncident.timeline.push({
        status: 'Responding',
        note: `SOS Tactical Unit "${dispatchUnit}" deployed to ${targetIncident.location}`,
        actorName,
        timestamp,
      });

      // Insert high-priority emergency alert
      mockAlerts.unshift({
        _id: `alert-sos-${Date.now()}`,
        title: `🚨 SOS DISPATCH ACTIVE: ${dispatchUnit}`,
        message: `Field deployment en route to ${targetIncident.location} (${baseName}). Lead: ${leadResponder}. ETA: ${eta}.`,
        type: 'Emergency',
        severity: 'Critical',
        module: 'Incidents',
        base: baseName,
        isRead: false,
        status: 'Active',
        telemetry: {
          dispatchUnit,
          leadResponder,
          eta,
          dispatchedAt: timestamp,
        },
        createdAt: timestamp,
      });

      emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer', 'ExpeditionManager'], 'emergency:sosDispatched', {
        incident: targetIncident,
      });
      emitToAll('dashboard:statsUpdated', { module: 'emergency' });

      return res.status(200).json({
        success: true,
        data: targetIncident,
        message: `SOS Emergency Dispatch successful: ${dispatchUnit} en route.`,
      });
    }

    // Database mode
    let incident;
    if (incidentId) {
      incident = await Incident.findById(incidentId);
    }

    if (!incident) {
      const code = await generateIncidentCode(Incident);
      incident = await Incident.create({
        incidentCode: code,
        title: title || `SOS DISPATCH: ${type} at ${baseName}`,
        description,
        type,
        severity,
        status: 'Responding',
        location: location || baseName,
        reportedBy: req.user?._id,
        requiredResources,
        timeline: [
          {
            status: 'Reported',
            note: 'SOS Emergency Declared',
            actorName,
            timestamp: new Date(),
          },
          {
            status: 'Responding',
            note: `SOS Dispatch deployed: ${dispatchUnit} (Lead: ${leadResponder})`,
            actorName,
            timestamp: new Date(),
          },
        ],
      });
    } else {
      incident.status = 'Responding';
      incident.timeline.push({
        status: 'Responding',
        note: `SOS Dispatch deployed: ${dispatchUnit} (Lead: ${leadResponder})`,
        actor: req.user?._id,
        actorName,
        timestamp: new Date(),
      });
      await incident.save();
    }

    await ActivityLog.create({
      actor: req.user?._id,
      actorName,
      action: 'SOS_DISPATCHED',
      entityType: 'Incident',
      entityId: incident._id,
      description: `SOS Dispatch: ${dispatchUnit} deployed to ${incident.location} under ${leadResponder}`,
    });

    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer', 'ExpeditionManager'], 'emergency:sosDispatched', {
      incident,
    });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });

    res.status(200).json({
      success: true,
      data: incident,
      message: `SOS Emergency Dispatch successful: ${dispatchUnit} en route.`,
    });
  } catch (error) {
    next(error);
  }
};

// Update incident (log actions, change status, add mitigation notes)
const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = req.user?.name || 'Commander Radhika Roy';
    const actorId = req.user?._id;

    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockIncidents.findIndex(
        (i) => i._id === id || i.incidentCode === id || i.incidentNumber === id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Incident not found.' });

      const incident = mockIncidents[idx];
      const oldStatus = incident.status;

      // Handle adding individual action step
      if (req.body.action) {
        if (!incident.actions) incident.actions = [];
        incident.actions.unshift({
          description: req.body.action.description,
          performedBy: req.body.action.performedBy || actorName,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle timeline update on status change
      if (req.body.status && req.body.status !== oldStatus) {
        if (!incident.timeline) incident.timeline = [];
        incident.timeline.push({
          status: req.body.status,
          note: req.body.note || `Incident transition: ${oldStatus} → ${req.body.status}`,
          actorName,
          timestamp: new Date().toISOString(),
        });
      }

      // Merge remaining updates
      Object.assign(incident, req.body, { updatedAt: new Date().toISOString() });

      emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer'], 'emergency:updated', { incident });
      emitToAll('dashboard:statsUpdated', { module: 'emergency' });

      return res.json({ success: true, data: incident });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

    const oldStatus = incident.status;
    if (req.body.status && req.body.status !== oldStatus) {
      incident.timeline.push({
        status: req.body.status,
        note: req.body.note || `Status changed to ${req.body.status}`,
        actor: actorId,
        actorName,
        timestamp: new Date(),
      });
    }

    Object.assign(incident, req.body);
    await incident.save();

    await ActivityLog.create({
      actor: actorId,
      actorName,
      action: 'INCIDENT_UPDATED',
      entityType: 'Incident',
      entityId: incident._id,
      description: `Incident ${incident.incidentCode}: ${oldStatus} → ${incident.status}`,
    });

    emitToRoles(['SuperAdmin', 'MedicalOfficer', 'BaseOfficer'], 'emergency:updated', { incident });
    emitToAll('dashboard:statsUpdated', { module: 'emergency' });

    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncidents,
  getIncidentStats,
  getIncident,
  createIncident,
  dispatchSosIncident,
  updateIncident,
};
