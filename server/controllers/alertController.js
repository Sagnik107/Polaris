const Alert = require('../models/Alert');
const { getPaginationMeta } = require('../utils/pagination');
const { mockAlerts } = require('../services/mockDataService');

const getAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type = '', severity = '', isRead = '', search = '', base = '' } = req.query;

    if (require('mongoose').connection.readyState !== 1) {
      let filtered = [...mockAlerts];
      if (severity && severity !== 'All') {
        filtered = filtered.filter((m) => m.severity.toLowerCase() === severity.toLowerCase());
      }
      if (type) {
        filtered = filtered.filter((m) => m.type.toLowerCase() === type.toLowerCase());
      }
      if (isRead !== '') {
        const readBool = isRead === 'true';
        filtered = filtered.filter((m) => m.isRead === readBool);
      }
      if (base && base !== 'ALL') {
        filtered = filtered.filter((m) => m.base?.toLowerCase().includes(base.toLowerCase()));
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((m) => m.title?.toLowerCase().includes(s) || m.message?.toLowerCase().includes(s));
      }
      return res.json({
        success: true,
        data: filtered,
        pagination: getPaginationMeta(filtered.length, parseInt(page), parseInt(limit)),
      });
    }

    const query = {};
    if (req.user?.role && req.user.role !== 'SuperAdmin') {
      query.targetRoles = req.user.role;
    }
    if (type) query.type = type;
    if (severity && severity !== 'All') query.severity = severity;
    if (isRead !== '') query.isRead = isRead === 'true';
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: alerts, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

const getAlertStats = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const total = mockAlerts.length;
      const critical = mockAlerts.filter((m) => m.severity === 'Critical' && m.status !== 'Resolved').length;
      const high = mockAlerts.filter((m) => m.severity === 'High' && m.status !== 'Resolved').length;
      const warning = mockAlerts.filter((m) => m.severity === 'Warning' && m.status !== 'Resolved').length;
      const unread = mockAlerts.filter((m) => !m.isRead).length;
      const resolved = mockAlerts.filter((m) => m.status === 'Resolved').length;

      return res.json({
        success: true,
        data: {
          total,
          critical,
          high,
          warning,
          unread,
          resolved,
          uptimeScore: 99.8,
          mttaMinutes: 1.4,
        },
      });
    }

    const total = await Alert.countDocuments();
    const critical = await Alert.countDocuments({ severity: 'Critical', isRead: false });
    const high = await Alert.countDocuments({ severity: 'High', isRead: false });
    const warning = await Alert.countDocuments({ severity: 'Low' });
    const unread = await Alert.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: {
        total,
        critical,
        high,
        warning,
        unread,
        resolved: total - unread,
        uptimeScore: 99.8,
        mttaMinutes: 1.4,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createAlert = async (req, res, next) => {
  try {
    const { title, message, severity = 'High', type = 'Drill', module = 'System', base = 'Maitri Station', telemetry = {} } = req.body;

    const newAlertObj = {
      _id: '67cda9' + Date.now().toString(16).padStart(18, '0'),
      title: title || `${severity.toUpperCase()} ALERT: Triggered via Polar C2`,
      message: message || 'Simulated Emergency Drill protocol activated by station commander.',
      type,
      severity,
      module,
      base,
      isRead: false,
      status: 'Active',
      telemetry: telemetry || { ambient: '-42°C', systemState: 'Drill Protocol' },
      createdAt: new Date(),
    };

    if (require('mongoose').connection.readyState !== 1) {
      mockAlerts.unshift(newAlertObj);
      const io = req.app.get('io');
      if (io) io.emit('alert:new', newAlertObj);
      return res.status(201).json({ success: true, data: newAlertObj });
    }

    const alert = new Alert({
      type: 'emergency',
      severity,
      sourceModule: module.toLowerCase() === 'incidents' ? 'incident' : 'system',
      message: `${title}: ${message}`,
      targetRoles: ['SuperAdmin', 'StationCommander', 'ExpeditionManager', 'LogisticsCoordinator'],
      isRead: false,
    });
    await alert.save();

    const io = req.app.get('io');
    if (io) io.emit('alert:new', alert);

    res.status(201).json({ success: true, data: newAlertObj });
  } catch (error) {
    next(error);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    if (require('mongoose').connection.readyState !== 1) {
      const a = mockAlerts.find((m) => m._id === id);
      if (a) {
        a.status = 'Resolved';
        a.isRead = true;
        a.resolvedAt = new Date();
        a.resolutionNote = resolutionNote || 'Incident resolved and logged in Polar Station SITREP.';
      }
      return res.json({ success: true, data: a });
    }

    const alert = await Alert.findById(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    alert.isRead = true;
    await alert.save();
    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const a = mockAlerts.find((m) => m._id === req.params.id);
      if (a) a.isRead = true;
      return res.json({ success: true, data: a });
    }
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    alert.isRead = true;
    if (!alert.readBy.includes(req.user._id)) alert.readBy.push(req.user._id);
    await alert.save();
    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      mockAlerts.forEach((m) => (m.isRead = true));
      return res.json({ success: true, message: 'All alerts marked as read.' });
    }
    await Alert.updateMany({ targetRoles: req.user.role, isRead: false }, { isRead: true, $addToSet: { readBy: req.user._id } });
    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (error) {
    next(error);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockAlerts.findIndex((m) => m._id === id);
      if (idx !== -1) mockAlerts.splice(idx, 1);
      return res.json({ success: true, message: 'Alert dismissed.' });
    }
    await Alert.findByIdAndDelete(id);
    res.json({ success: true, message: 'Alert dismissed.' });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const unreadCount = mockAlerts.filter((m) => !m.isRead).length;
      return res.json({ success: true, data: { unreadCount } });
    }
    const count = await Alert.countDocuments({ targetRoles: req.user.role, isRead: false });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertStats,
  createAlert,
  resolveAlert,
  deleteAlert,
  markRead,
  markAllRead,
  getUnreadCount,
};
