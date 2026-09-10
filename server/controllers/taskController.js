const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { emitToAll } = require('../services/socketService');

const { mockTasks } = require('../services/mockDataService');

const getTasks = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockTasks, pagination: getPaginationMeta(mockTasks.length, 1, 20) });
    }
    const { page = 1, limit = 20, search = '', status = '', priority = '', expedition = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (expedition) query.expedition = expedition;
    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query).populate('assignedTo', 'name').populate('expedition', 'name expeditionCode').populate('base', 'name').sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: tasks, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo', 'name').populate('expedition').populate('base').populate('comments.author', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    res.json({ success: true, data: task });
  } catch (error) { next(error); }
};

const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user._id, status: req.body.assignedTo ? 'Assigned' : 'Pending' });
    await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'TASK_CREATED', entityType: 'Task', entityId: task._id, description: `Task "${task.title}" created` });
    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    res.status(201).json({ success: true, data: task });
  } catch (error) { next(error); }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const oldStatus = task.status;
    if (req.body.comment) {
      task.comments.push({ author: req.user._id, authorName: req.user.name, text: req.body.comment, timestamp: new Date() });
      delete req.body.comment;
    }
    Object.assign(task, req.body);
    await task.save();
    if (req.body.status && req.body.status !== oldStatus) {
      emitToAll('task:statusChanged', { taskId: task._id, title: task.title, status: req.body.status, oldStatus });
      await ActivityLog.create({ actor: req.user._id, actorName: req.user.name, action: 'TASK_STATUS_CHANGED', entityType: 'Task', entityId: task._id, description: `Task "${task.title}": ${oldStatus} → ${task.status}` });
    }
    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    res.json({ success: true, data: task });
  } catch (error) { next(error); }
};

const deleteTask = async (req, res, next) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
