const Personnel = require('../models/Personnel');
const Base = require('../models/Base');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { emitToRoles, emitToAll } = require('../services/socketService');
const { mockPersonnel, mockBases } = require('../services/mockDataService');

// Get all personnel with search, department, base, status, and shift filters
const getPersonnel = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 30,
      search = '',
      department = '',
      status = '',
      base = '',
      shift = '',
      sort = 'name',
    } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockPersonnel];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
            (p.participantId && p.participantId.toLowerCase().includes(q)) ||
            (p.designation && p.designation.toLowerCase().includes(q)) ||
            (p.role && p.role.toLowerCase().includes(q)) ||
            (p.rank && p.rank.toLowerCase().includes(q)) ||
            (p.baseName && p.baseName.toLowerCase().includes(q)) ||
            (p.skills && p.skills.some((s) => s.toLowerCase().includes(q))) ||
            (p.certifications && p.certifications.some((c) => c.toLowerCase().includes(q)))
        );
      }

      if (department && department !== 'All') {
        filtered = filtered.filter((p) => p.department === department);
      }

      if (status && status !== 'All') {
        filtered = filtered.filter((p) => p.status === status);
      }

      if (shift && shift !== 'All') {
        filtered = filtered.filter((p) => p.shift && p.shift.includes(shift));
      }

      if (base && base !== 'All') {
        filtered = filtered.filter(
          (p) =>
            (p.baseName && p.baseName.toLowerCase().includes(base.toLowerCase())) ||
            p.currentBase === base
        );
      }

      // Sorting
      if (sort) {
        const field = sort.startsWith('-') ? sort.substring(1) : sort;
        const dir = sort.startsWith('-') ? -1 : 1;
        filtered.sort((a, b) => {
          let valA = a[field] ?? '';
          let valB = b[field] ?? '';
          if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
          return (valA - valB) * dir;
        });
      }

      const total = filtered.length;
      const p = parseInt(page);
      const l = parseInt(limit);
      const paginated = filtered.slice((p - 1) * l, p * l);

      return res.json({
        success: true,
        data: paginated,
        pagination: getPaginationMeta(total, p, l),
      });
    }

    // Database mode
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { participantId: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
      ];
    }
    if (department && department !== 'All') query.department = department;
    if (status && status !== 'All') query.status = status;
    if (base && base !== 'All') query.currentBase = base;
    if (shift && shift !== 'All') query.shift = { $regex: shift, $options: 'i' };

    const total = await Personnel.countDocuments(query);
    const personnel = await Personnel.find(query)
      .populate('currentBase', 'name code')
      .populate('currentExpedition', 'name expeditionCode')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: personnel,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// Summary metrics for Personnel roster
const getPersonnelStats = async (req, res, next) => {
  try {
    let crew = [];
    if (require('mongoose').connection.readyState !== 1) {
      crew = mockPersonnel;
    } else {
      crew = await Personnel.find({}).lean();
    }

    const totalCrew = crew.length;
    const deployed = crew.filter((p) => p.status === 'Deployed').length;
    const atBase = crew.filter((p) => p.status === 'At Base' || p.status === 'Active').length;
    const inTransit = crew.filter((p) => p.status === 'In Transit').length;
    const cleared = crew.filter((p) => p.medicalClearance === 'Cleared').length;
    const medicalClearanceRate = totalCrew > 0 ? Math.round((cleared / totalCrew) * 100) : 100;

    // Breakdown by department
    const departmentCounts = {};
    crew.forEach((p) => {
      const dept = p.department || 'General';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Breakdown by station base
    const baseCounts = {};
    crew.forEach((p) => {
      const b = p.baseName || 'Unassigned';
      baseCounts[b] = (baseCounts[b] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalCrew,
        deployed,
        atBase,
        inTransit,
        medicalClearanceRate,
        departmentCounts,
        baseCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single personnel record by ID or participant ID
const getPersonnelById = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const person =
        mockPersonnel.find(
          (p) =>
            p._id === req.params.id ||
            p.participantId === req.params.id ||
            p.employeeId === req.params.id
        ) || mockPersonnel[0];
      return res.json({ success: true, data: person });
    }

    let person = await Personnel.findById(req.params.id)
      .populate('currentBase')
      .populate('currentExpedition');

    if (!person) {
      person = await Personnel.findOne({
        $or: [{ participantId: req.params.id }, { employeeId: req.params.id }],
      }).populate('currentBase').populate('currentExpedition');
    }

    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });
    res.json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
};

// Create a new personnel member
const createPersonnel = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;
    const nextNum = isMock ? mockPersonnel.length + 101 : (await Personnel.countDocuments()) + 101;
    const participantId = `POL-${String(nextNum).padStart(4, '0')}`;
    const employeeId = req.body.employeeId || participantId;

    const newPersonData = {
      _id: isMock ? `67cda60000000000000000${String(mockPersonnel.length + 1).padStart(2, '0')}` : undefined,
      ...req.body,
      participantId,
      employeeId,
      designation: req.body.designation || req.body.role || 'Polar Operations Specialist',
      role: req.body.role || req.body.designation || 'Specialist',
      rank: req.body.rank || 'Specialist',
      department: req.body.department || 'Science',
      shift: req.body.shift || 'Alpha (Day)',
      status: req.body.status || 'Active',
      medicalClearance: req.body.medicalClearance || 'Cleared',
      bloodGroup: req.body.bloodGroup || 'O+',
      baseName: req.body.baseName || 'Maitri Station',
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills || '').split(',').map((s) => s.trim()).filter(Boolean),
      certifications: Array.isArray(req.body.certifications)
        ? req.body.certifications
        : (req.body.certifications || '').split(',').map((c) => c.trim()).filter(Boolean).length > 0
        ? (req.body.certifications || '').split(',').map((c) => c.trim()).filter(Boolean)
        : ['Polar Survival V4'],
      movementHistory: [
        {
          _id: `mh-${Date.now()}`,
          event: 'Check In',
          location: req.body.baseName || 'Maitri Station',
          baseName: req.body.baseName || 'Maitri Station',
          timestamp: new Date().toISOString(),
          updatedBy: req.user ? req.user.name : 'Station Officer',
          notes: 'Initial station deployment authorized and medical checklist filed',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMock) {
      mockPersonnel.unshift(newPersonData);
      emitToAll('dashboard:statsUpdated', { module: 'personnel' });
      emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:created', { personnel: newPersonData });
      return res.status(201).json({ success: true, data: newPersonData });
    }

    const person = await Personnel.create(newPersonData);
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_CREATED',
      entityType: 'Personnel',
      entityId: person._id,
      description: `Personnel ${person.name} (${participantId}) onboarded`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'personnel' });
    emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:created', { personnel: person });
    res.status(201).json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
};

// Update personnel details
const updatePersonnel = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockPersonnel.findIndex(
        (p) => p._id === req.params.id || p.participantId === req.params.id || p.employeeId === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Personnel not found.' });

      const oldStatus = mockPersonnel[idx].status;
      const updated = {
        ...mockPersonnel[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      if (req.body.skills) {
        updated.skills = Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (req.body.certifications) {
        updated.certifications = Array.isArray(req.body.certifications) ? req.body.certifications : (req.body.certifications || '').split(',').map((c) => c.trim()).filter(Boolean);
      }

      if (req.body.status && req.body.status !== oldStatus) {
        updated.movementHistory = updated.movementHistory || [];
        updated.movementHistory.push({
          _id: `mh-${Date.now()}`,
          event: req.body.status === 'At Base' ? 'Check In' : req.body.status === 'Deployed' ? 'Deployment' : 'Status Change',
          location: req.body.location || updated.baseName || 'Station Compound',
          baseName: updated.baseName,
          timestamp: new Date().toISOString(),
          updatedBy: req.user ? req.user.name : 'Station Officer',
          notes: req.body.notes || `Status transitioned from ${oldStatus} to ${req.body.status}`,
        });

        emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:movement', {
          personnel: updated.name,
          status: req.body.status,
          oldStatus,
        });
      }

      mockPersonnel[idx] = updated;
      emitToAll('dashboard:statsUpdated', { module: 'personnel' });
      return res.json({ success: true, data: updated });
    }

    const person = await Personnel.findById(req.params.id);
    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });

    const oldStatus = person.status;
    Object.assign(person, req.body);

    if (req.body.status && req.body.status !== oldStatus) {
      person.movementHistory.push({
        event: req.body.status === 'At Base' ? 'Check In' : req.body.status === 'Deployed' ? 'Deployment' : 'Status Change',
        location: req.body.location || person.baseName || 'Station',
        baseName: person.baseName,
        timestamp: new Date(),
        updatedBy: req.user.name,
        notes: req.body.notes || `Status: ${oldStatus} → ${req.body.status}`,
      });
      emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:movement', {
        personnel: person.name,
        status: req.body.status,
        oldStatus,
      });
    }

    await person.save();
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_UPDATED',
      entityType: 'Personnel',
      entityId: person._id,
      description: `${person.name} record updated: status ${oldStatus} → ${person.status}`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'personnel' });
    res.json({ success: true, data: person });
  } catch (error) {
    next(error);
  }
};

// Transfer / Reassign personnel between stations or expeditions
const reassignPersonnel = async (req, res, next) => {
  try {
    const { targetBase, targetBaseName, notes } = req.body;
    if (!targetBase && !targetBaseName) {
      return res.status(400).json({ success: false, message: 'Target base is required for reassignment.' });
    }

    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockPersonnel.findIndex(
        (p) => p._id === req.params.id || p.participantId === req.params.id || p.employeeId === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Personnel not found.' });

      const person = mockPersonnel[idx];
      const prevBase = person.baseName;
      const newBaseName = targetBaseName || targetBase;

      person.baseName = newBaseName;
      person.currentBase = targetBase;
      person.status = 'In Transit';
      person.updatedAt = new Date().toISOString();

      person.movementHistory = person.movementHistory || [];
      person.movementHistory.push({
        _id: `mh-${Date.now()}`,
        event: 'Transfer',
        location: `${prevBase} → ${newBaseName}`,
        baseName: newBaseName,
        timestamp: new Date().toISOString(),
        updatedBy: req.user ? req.user.name : 'Operations Command',
        notes: notes || `Reassigned from ${prevBase} to ${newBaseName}. Transfer en-route.`,
      });

      emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:movement', {
        personnel: person.name,
        status: 'In Transit',
        transfer: `${prevBase} → ${newBaseName}`,
      });
      emitToAll('dashboard:statsUpdated', { module: 'personnel' });

      return res.json({
        success: true,
        data: person,
        message: `${person.name} successfully reassigned to ${newBaseName}`,
      });
    }

    const person = await Personnel.findById(req.params.id);
    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });

    const prevBase = person.baseName;
    const newBaseName = targetBaseName || targetBase;

    person.baseName = newBaseName;
    person.currentBase = targetBase;
    person.status = 'In Transit';

    person.movementHistory.push({
      event: 'Transfer',
      location: `${prevBase} → ${newBaseName}`,
      baseName: newBaseName,
      timestamp: new Date(),
      updatedBy: req.user.name,
      notes: notes || `Reassigned to ${newBaseName}`,
    });

    await person.save();
    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_REASSIGNED',
      entityType: 'Personnel',
      entityId: person._id,
      description: `${person.name} reassigned from ${prevBase} to ${newBaseName}`,
    });

    emitToRoles(['SuperAdmin', 'PersonnelManager', 'BaseOfficer'], 'personnel:movement', {
      personnel: person.name,
      status: 'In Transit',
      transfer: `${prevBase} → ${newBaseName}`,
    });
    emitToAll('dashboard:statsUpdated', { module: 'personnel' });

    res.json({
      success: true,
      data: person,
      message: `${person.name} successfully reassigned to ${newBaseName}`,
    });
  } catch (error) {
    next(error);
  }
};

// Delete personnel record
const deletePersonnel = async (req, res, next) => {
  try {
    const isMock = require('mongoose').connection.readyState !== 1;

    if (isMock) {
      const idx = mockPersonnel.findIndex(
        (p) => p._id === req.params.id || p.participantId === req.params.id || p.employeeId === req.params.id
      );
      if (idx === -1) return res.status(404).json({ success: false, message: 'Personnel not found.' });

      const deleted = mockPersonnel.splice(idx, 1)[0];
      emitToAll('dashboard:statsUpdated', { module: 'personnel' });
      return res.json({ success: true, message: `Personnel record ${deleted.name} (${deleted.employeeId}) removed.` });
    }

    const person = await Personnel.findByIdAndDelete(req.params.id);
    if (!person) return res.status(404).json({ success: false, message: 'Personnel not found.' });

    await ActivityLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PERSONNEL_DELETED',
      entityType: 'Personnel',
      entityId: person._id,
      description: `Personnel ${person.name} (${person.participantId}) deleted`,
    });

    emitToAll('dashboard:statsUpdated', { module: 'personnel' });
    res.json({ success: true, message: `Personnel record ${person.name} removed.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPersonnel,
  getPersonnelStats,
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
  reassignPersonnel,
  deletePersonnel,
};

