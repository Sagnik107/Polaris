const Alert = require('../models/Alert');
const { getPaginationMeta } = require('../utils/pagination');

const { mockAlerts } = require('../services/mockDataService');

const getAlerts = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockAlerts, pagination: getPaginationMeta(mockAlerts.length, 1, 20) });
    }
    const { page = 1, limit = 20, type = '', severity = '', isRead = '' } = req.query;
    const query = { targetRoles: req.user.role };
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (isRead !== '') query.isRead = isRead === 'true';
    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query).sort('-createdAt').skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: alerts, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
};

const markAllRead = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      mockAlerts.forEach((m) => (m.isRead = true));
      return res.json({ success: true, message: 'All alerts marked as read.' });
    }
    await Alert.updateMany({ targetRoles: req.user.role, isRead: false }, { isRead: true, $addToSet: { readBy: req.user._id } });
    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      const unreadCount = mockAlerts.filter((m) => !m.isRead).length;
      return res.json({ success: true, data: { unreadCount } });
    }
    const count = await Alert.countDocuments({ targetRoles: req.user.role, isRead: false });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) { next(error); }
};

module.exports = { getAlerts, markRead, markAllRead, getUnreadCount };
