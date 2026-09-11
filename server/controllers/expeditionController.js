const Expedition = require('../models/Expedition');
const Personnel = require('../models/Personnel');
const Base = require('../models/Base');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { generateExpeditionCode } = require('../utils/idGenerator');
const { calculateReadinessScore } = require('../services/automationService');
const { emitToAll } = require('../services/socketService');
const { mockExpeditions, mockPersonnel, mockBases } = require('../services/mockDataService');

/**
 * Helper to compute progress and readiness on an expedition object
 */
const syncExpeditionMetrics = (exp) => {
  const milestones = exp.milestones || [];
  let score = 0;
  for (const m of milestones) {
    const s = (m.status || '').toLowerCase();
    if (s === 'completed') score += 1.0;
    else if (s === 'in_progress' || s === 'inprogress' || s === 'in progress') score += 0.5;
  }
  const progress = milestones.length > 0 ? Math.min(100, Math.round((score / milestones.length) * 100)) : 0;
  const readiness = calculateReadinessScore(exp);
  exp.progress = progress;
  exp.readinessScore = readiness;
  return { progress, readiness };
};

/**
 * GET /api/expeditions
 * Search, multi-filtering, sorting, and pagination
 */
const getExpeditions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      type = '',
      base = '',
      sort = '-createdAt',
    } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockExpeditions];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          e =>
            e.name?.toLowerCase().includes(q) ||
            e.code?.toLowerCase().includes(q) ||
            e.expeditionCode?.toLowerCase().includes(q) ||
            e.leader?.toLowerCase().includes(q) ||
            e.baseName?.toLowerCase().includes(q)
        );
      }

      if (status && status !== 'All') {
        filtered = filtered.filter(e => e.status?.toLowerCase() === status.toLowerCase());
      }

      if (type && type !== 'All') {
        filtered = filtered.filter(e => e.type?.toLowerCase() === type.toLowerCase());
      }

      if (base && base !== 'All') {
        filtered = filtered.filter(
          e =>
            e.baseName?.toLowerCase().includes(base.toLowerCase()) ||
            e.destinationBase?.name?.toLowerCase().includes(base.toLowerCase())
        );
      }

      // Sorting
      if (sort === '-createdAt' || sort === 'newest') {
        filtered.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
      } else if (sort === 'oldest') {
        filtered.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
      } else if (sort === '-readinessScore' || sort === 'readiness') {
        filtered.sort((a, b) => (b.readinessScore || 0) - (a.readinessScore || 0));
      } else if (sort === '-progress' || sort === 'progress') {
        filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      } else if (sort === 'name') {
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      // Ensure metrics are up to date
      filtered.forEach(syncExpeditionMetrics);

      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

      return res.json({
        success: true,
        data: paginated,
        pagination: getPaginationMeta(filtered.length, parseInt(page), parseInt(limit)),
      });
    }

    // MongoDB query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { expeditionCode: { $regex: search, $options: 'i' } },
        { leader: { $regex: search, $options: 'i' } },
        { baseName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (type && type !== 'All') query.type = type;
    if (base && base !== 'All') {
      const matchedBase = await Base.findOne({ name: { $regex: base, $options: 'i' } });
      if (matchedBase) {
        query.$or = [{ destinationBase: matchedBase._id }, { baseName: { $regex: base, $options: 'i' } }];
      } else {
        query.baseName = { $regex: base, $options: 'i' };
      }
    }

    const total = await Expedition.countDocuments(query);
    const expeditions = await Expedition.find(query)
      .populate('destinationBase', 'name code location coordinates')
      .populate('assignedPersonnel', 'name designation team status skills')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: expeditions,
      pagination: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expeditions/:id
 * Single expedition with deep population and activity timeline
 */
const getExpedition = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });
      syncExpeditionMetrics(exp);
      return res.json({ success: true, data: exp });
    }

    const expedition = await Expedition.findById(id)
      .populate('destinationBase')
      .populate('assignedPersonnel');

    if (!expedition) {
      return res.status(404).json({ success: false, message: 'Expedition not found.' });
    }

    // Attach real activity timeline from ActivityLog
    const timeline = await ActivityLog.find({
      entityType: 'Expedition',
      entityId: expedition._id,
    })
      .sort('-createdAt')
      .limit(20)
      .lean();

    const expObj = expedition.toObject();
    expObj.timeline = timeline;

    res.json({ success: true, data: expObj });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expeditions
 * Create new expedition with validation
 */
const createExpedition = async (req, res, next) => {
  try {
    const {
      name,
      expeditionCode,
      code,
      type = 'Antarctic',
      startDate,
      endDate,
      destinationBase,
      baseName,
      status = 'Planning',
      leader = '',
      description = '',
      objectives = [],
      budget = { allocated: 0, spent: 0 },
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Expedition name, start date, and end date are required.',
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot precede start date.',
      });
    }

    let finalCode = expeditionCode || code;
    if (!finalCode) {
      finalCode = `POL-EXP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    if (require('mongoose').connection.readyState !== 1) {
      const newExp = {
        _id: '67cda200000' + Math.floor(Math.random() * 10000).toString().padStart(13, '0'),
        code: finalCode,
        expeditionCode: finalCode,
        name,
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        destinationBase: destinationBase ? { _id: destinationBase, name: baseName || 'Bharati Station' } : null,
        baseName: baseName || 'Bharati Station',
        status,
        leader,
        description,
        objectives: Array.isArray(objectives) ? objectives : [objectives].filter(Boolean),
        budget: typeof budget === 'number' ? { allocated: budget, spent: 0 } : budget,
        assignedPersonnel: [],
        assignedResources: [],
        milestones: [
          {
            _id: 'milestone_' + Date.now(),
            title: 'Initial Staging & Equipment Clearance',
            dueDate: new Date(startDate).toISOString(),
            status: 'Pending',
          },
        ],
        readinessScore: 35,
        riskLevel: 'Low',
        progress: 0,
        aiRiskPrediction: 'New campaign logged. Awaiting field deployment window.',
        timeline: [
          {
            _id: 'tl_' + Date.now(),
            action: 'EXPEDITION_CREATED',
            description: `Expedition ${finalCode} "${name}" initialized.`,
            actorName: req.user?.name || 'Commander',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      };

      syncExpeditionMetrics(newExp);
      mockExpeditions.unshift(newExp);

      emitToAll('expedition:created', { expedition: newExp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.status(201).json({ success: true, data: newExp });
    }

    const expeditionData = {
      ...req.body,
      expeditionCode: finalCode,
      code: finalCode,
      status,
      type,
      budget: typeof budget === 'number' ? { allocated: budget, spent: 0 } : budget,
    };

    const expedition = await Expedition.create(expeditionData);
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'EXPEDITION_CREATED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Expedition ${finalCode} "${expedition.name}" established.`,
    });

    emitToAll('expedition:created', { expedition });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.status(201).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/expeditions/:id
 * Update expedition metadata
 */
const updateExpedition = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockExpeditions.findIndex(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      mockExpeditions[idx] = {
        ...mockExpeditions[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      // Add timeline entry
      if (!mockExpeditions[idx].timeline) mockExpeditions[idx].timeline = [];
      mockExpeditions[idx].timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'EXPEDITION_UPDATED',
        description: `Expedition parameters updated by ${req.user?.name || 'Operator'}.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(mockExpeditions[idx]);

      emitToAll('expedition:updated', { expedition: mockExpeditions[idx] });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: mockExpeditions[idx] });
    }

    const expedition = await Expedition.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'EXPEDITION_UPDATED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Expedition ${expedition.expeditionCode} details updated.`,
    });

    emitToAll('expedition:updated', { expedition });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/expeditions/:id
 * Delete expedition and unlink personnel
 */
const deleteExpedition = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockExpeditions.findIndex(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      const deleted = mockExpeditions.splice(idx, 1)[0];
      emitToAll('expedition:deleted', { expeditionId: id, code: deleted.code });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, message: 'Expedition archived and deleted.' });
    }

    const expedition = await Expedition.findByIdAndDelete(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    // Free any assigned personnel
    await Personnel.updateMany(
      { currentExpedition: expedition._id },
      { currentExpedition: null, status: 'Available' }
    );

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'EXPEDITION_DELETED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Expedition ${expedition.expeditionCode} archived.`,
    });

    emitToAll('expedition:deleted', { expeditionId: id, code: expedition.expeditionCode });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, message: 'Expedition deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expeditions/:id/personnel
 * Assign personnel to expedition
 */
const assignPersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { personnelId, person } = req.body;

    if (!personnelId && !person) {
      return res.status(400).json({ success: false, message: 'Personnel ID is required.' });
    }

    const targetId = personnelId || person?._id;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.assignedPersonnel) exp.assignedPersonnel = [];
      const exists = exp.assignedPersonnel.some(p => (p._id || p) === targetId);
      if (exists) {
        return res.status(400).json({ success: false, message: 'Personnel is already assigned to this expedition.' });
      }

      // Lookup from mockPersonnel or create record
      const fullPerson = person || mockPersonnel.find(p => p._id === targetId) || {
        _id: targetId,
        name: 'Assigned Specialist',
        designation: 'Field Researcher',
        team: 'Operations',
        status: 'Deployed',
        medicalClearance: 'Cleared',
      };

      exp.assignedPersonnel.push(fullPerson);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'PERSONNEL_ASSIGNED',
        description: `Assigned ${fullPerson.name} (${fullPerson.designation || 'Specialist'}) to mission roster.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Personnel assigned successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    if (expedition.assignedPersonnel.includes(targetId)) {
      return res.status(400).json({ success: false, message: 'Personnel already assigned.' });
    }

    expedition.assignedPersonnel.push(targetId);
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    const personnelDoc = await Personnel.findByIdAndUpdate(
      targetId,
      { currentExpedition: expedition._id, status: 'Deployed' },
      { new: true }
    );

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_ASSIGNED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Assigned ${personnelDoc?.name || 'Personnel'} to ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Personnel assigned successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/expeditions/:id/personnel/:personnelId
 * Unassign personnel from expedition
 */
const unassignPersonnel = async (req, res, next) => {
  try {
    const { id, personnelId } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.assignedPersonnel) exp.assignedPersonnel = [];
      const removedPerson = exp.assignedPersonnel.find(p => (p._id || p) === personnelId);
      exp.assignedPersonnel = exp.assignedPersonnel.filter(p => (p._id || p) !== personnelId);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'PERSONNEL_UNASSIGNED',
        description: `Unassigned ${removedPerson?.name || 'personnel'} from mission roster.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Personnel unassigned successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.assignedPersonnel = expedition.assignedPersonnel.filter(p => p.toString() !== personnelId);
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await Personnel.findByIdAndUpdate(personnelId, { currentExpedition: null, status: 'Available' });

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_UNASSIGNED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Unassigned personnel from ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Personnel unassigned successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expeditions/:id/resources
 * Assign resource/asset to expedition
 */
const assignResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { item, category = 'Equipment', refModel = 'Asset', refId, quantity = 1, notes = '' } = req.body;

    if (!item) {
      return res.status(400).json({ success: false, message: 'Resource item name is required.' });
    }

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.assignedResources) exp.assignedResources = [];
      const newRes = {
        _id: 'res_' + Date.now(),
        item,
        category,
        refModel,
        refId: refId || null,
        quantity: parseInt(quantity) || 1,
        notes,
      };
      exp.assignedResources.push(newRes);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'RESOURCE_ASSIGNED',
        description: `Allocated resource: ${item} (Qty: ${quantity}).`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Resource allocated successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.assignedResources.push({
      item,
      category,
      refModel,
      refId,
      quantity: parseInt(quantity) || 1,
      notes,
    });

    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'RESOURCE_ASSIGNED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Resource "${item}" (x${quantity}) assigned to ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Resource assigned successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/expeditions/:id/resources/:resourceId
 * Unassign resource from expedition
 */
const unassignResource = async (req, res, next) => {
  try {
    const { id, resourceId } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.assignedResources) exp.assignedResources = [];
      const removed = exp.assignedResources.find(r => r._id === resourceId);
      exp.assignedResources = exp.assignedResources.filter(r => r._id !== resourceId);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'RESOURCE_UNASSIGNED',
        description: `Removed resource ${removed?.item || ''} from mission manifest.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Resource unassigned successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.assignedResources = expedition.assignedResources.filter(r => r._id.toString() !== resourceId);
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'RESOURCE_UNASSIGNED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Resource removed from ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Resource unassigned successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expeditions/:id/milestones
 * Add milestone to expedition
 */
const addMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, dueDate, status = 'Pending' } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Milestone title and due date are required.' });
    }

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.milestones) exp.milestones = [];
      const newMilestone = {
        _id: 'm_' + Date.now(),
        title,
        dueDate: new Date(dueDate).toISOString(),
        status,
      };
      exp.milestones.push(newMilestone);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'MILESTONE_CREATED',
        description: `New milestone logged: "${title}".`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.status(201).json({ success: true, data: exp, message: 'Milestone added successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.milestones.push({ title, dueDate: new Date(dueDate), status });
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'MILESTONE_CREATED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Milestone "${title}" added to ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.status(201).json({ success: true, data: populated, message: 'Milestone created successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/expeditions/:id/milestones/:milestoneId
 * Update milestone title, dueDate, or status
 */
const updateMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const { title, dueDate, status } = req.body;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.milestones) exp.milestones = [];
      const m = exp.milestones.find(item => item._id === milestoneId);
      if (!m) return res.status(404).json({ success: false, message: 'Milestone not found.' });

      if (title !== undefined) m.title = title;
      if (dueDate !== undefined) m.dueDate = new Date(dueDate).toISOString();
      if (status !== undefined) m.status = status;

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: status === 'Completed' ? 'MILESTONE_COMPLETED' : 'MILESTONE_UPDATED',
        description: `Milestone "${m.title}" status changed to ${status || m.status}.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Milestone updated successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    const milestone = expedition.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    if (title !== undefined) milestone.title = title;
    if (dueDate !== undefined) milestone.dueDate = new Date(dueDate);
    if (status !== undefined) milestone.status = status;

    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: status === 'Completed' ? 'MILESTONE_COMPLETED' : 'MILESTONE_UPDATED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Milestone "${milestone.title}" set to ${status || milestone.status} on ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Milestone updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/expeditions/:id/milestones/:milestoneId
 * Delete milestone from expedition
 */
const deleteMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expedition not found.' });

      if (!exp.milestones) exp.milestones = [];
      const deleted = exp.milestones.find(m => m._id === milestoneId);
      exp.milestones = exp.milestones.filter(m => m._id !== milestoneId);

      if (!exp.timeline) exp.timeline = [];
      exp.timeline.unshift({
        _id: 'tl_' + Date.now(),
        action: 'MILESTONE_DELETED',
        description: `Milestone "${deleted?.title || ''}" removed from schedule.`,
        actorName: req.user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      });

      syncExpeditionMetrics(exp);
      emitToAll('expedition:updated', { expedition: exp });
      emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
      return res.json({ success: true, data: exp, message: 'Milestone deleted successfully.' });
    }

    const expedition = await Expedition.findById(id);
    if (!expedition) return res.status(404).json({ success: false, message: 'Expedition not found.' });

    expedition.milestones = expedition.milestones.filter(m => m._id.toString() !== milestoneId);
    expedition.readinessScore = calculateReadinessScore(expedition);
    await expedition.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'MILESTONE_DELETED',
      entityType: 'Expedition',
      entityId: expedition._id,
      description: `Milestone removed from ${expedition.expeditionCode}.`,
    });

    const populated = await Expedition.findById(id).populate('destinationBase').populate('assignedPersonnel');

    emitToAll('expedition:updated', { expedition: populated });
    emitToAll('dashboard:statsUpdated', { module: 'expeditions' });
    res.json({ success: true, data: populated, message: 'Milestone deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expeditions/:id/timeline
 * Get expedition activity history
 */
const getExpeditionTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const exp = mockExpeditions.find(e => e._id === id || e.code === id || e.expeditionCode === id);
      return res.json({ success: true, data: exp?.timeline || [] });
    }

    const logs = await ActivityLog.find({
      entityType: 'Expedition',
      entityId: id,
    })
      .sort('-createdAt')
      .limit(50);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpeditions,
  getExpedition,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  assignPersonnel,
  unassignPersonnel,
  assignResource,
  unassignResource,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  getExpeditionTimeline,
};
