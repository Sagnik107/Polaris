const Task = require('../models/Task');
const Personnel = require('../models/Personnel');
const ActivityLog = require('../models/ActivityLog');
const { getPaginationMeta } = require('../utils/pagination');
const { emitToAll } = require('../services/socketService');
const { mockTasks } = require('../services/mockDataService');

// In-memory activity log fallback for mock/disconnected mode
const mockTaskActivities = [
  {
    _id: 'act-001',
    actorName: 'Commander Radhika Roy',
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: '67cda7000000000000000001',
    description: 'Task "Emergency Generator Fuel Line Inspection" created and assigned to Vikram Sengupta',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'act-002',
    actorName: 'Vikram Sengupta',
    action: 'TASK_STATUS_CHANGED',
    entityType: 'Task',
    entityId: '67cda7000000000000000001',
    description: 'Task status updated: Pending → In Progress',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'act-003',
    actorName: 'Dr. Maya Patel',
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: '67cda7000000000000000002',
    description: 'Task "Quarterly Inventory Audit - Medical Cryo Vault" created',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'act-004',
    actorName: 'System Monitor',
    action: 'TASK_STATUS_CHANGED',
    entityType: 'Task',
    entityId: '67cda7000000000000000002',
    description: 'Task marked Overdue (past deadline)',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

const getTaskStats = async (req, res, next) => {
  try {
    await autoDetectOverdue();
    let tasksList = [];
    if (require('mongoose').connection.readyState !== 1) {
      tasksList = mockTasks;
    } else {
      tasksList = await Task.find({}).lean();
    }

    const total = tasksList.length;
    const pending = tasksList.filter(t => t.status === 'Pending' || t.status === 'Todo' || t.status === 'Assigned').length;
    const inProgress = tasksList.filter(t => (t.status === 'In Progress' || t.status === 'InProgress') && (t.status !== 'Overdue')).length;
    const overdue = tasksList.filter(t => {
      if (t.status === 'Completed') return false;
      if (t.status === 'Overdue') return true;
      const d = t.deadline || t.dueDate;
      return d ? new Date(d) < new Date() : false;
    }).length;
    const completed = tasksList.filter(t => t.status === 'Completed').length;
    const critical = tasksList.filter(t => t.priority === 'Critical').length;
    const high = tasksList.filter(t => t.priority === 'High').length;

    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        overdue,
        completed,
        critical,
        high,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Auto-detect and transition overdue tasks
const autoDetectOverdue = async () => {
  const now = new Date();
  if (require('mongoose').connection.readyState === 1) {
    const overdueTasks = await Task.find({
      status: { $in: ['Pending', 'In Progress', 'Assigned', 'Todo', 'InProgress'] },
      deadline: { $lt: now },
    });

    if (overdueTasks.length > 0) {
      await Task.updateMany(
        {
          _id: { $in: overdueTasks.map((t) => t._id) },
        },
        { $set: { status: 'Overdue' } }
      );

      for (const t of overdueTasks) {
        await ActivityLog.create({
          actor: t.createdBy || t.assignedTo || null,
          actorName: 'System Monitor',
          action: 'TASK_STATUS_CHANGED',
          entityType: 'Task',
          entityId: t._id,
          description: `Task "${t.title}" automatically transitioned to Overdue`,
        }).catch(() => {});
      }

      emitToAll('task:statusChanged', { count: overdueTasks.length, status: 'Overdue' });
      emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    }
  } else {
    // In-memory mock check
    mockTasks.forEach((t) => {
      if (t.deadline && new Date(t.deadline) < now && t.status !== 'Completed' && t.status !== 'Overdue') {
        const oldStatus = t.status;
        t.status = 'Overdue';
        mockTaskActivities.unshift({
          _id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          actorName: 'System Monitor',
          action: 'TASK_STATUS_CHANGED',
          entityType: 'Task',
          entityId: t._id,
          description: `Task "${t.title}": ${oldStatus} → Overdue`,
          createdAt: new Date().toISOString(),
        });
      }
    });
  }
};

const getTasks = async (req, res, next) => {
  try {
    // 1. Run automatic overdue detection before fetching
    await autoDetectOverdue();

    // 2. Mock mode fallback if Mongo is not connected
    if (require('mongoose').connection.readyState !== 1) {
      const { search = '', status = '', priority = '', assignee = '', expedition = '', base = '' } = req.query;
      let filtered = [...mockTasks];

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title?.toLowerCase().includes(s) ||
            t.description?.toLowerCase().includes(s) ||
            t.assignedToName?.toLowerCase().includes(s)
        );
      }
      if (status && status !== 'All') {
        filtered = filtered.filter((t) => t.status === status);
      }
      if (priority && priority !== 'All') {
        filtered = filtered.filter((t) => t.priority === priority);
      }
      if (assignee && assignee !== 'All') {
        filtered = filtered.filter(
          (t) =>
            t.assignedTo === assignee ||
            t.assignedTo?._id === assignee ||
            t.assignedToName?.toLowerCase() === assignee.toLowerCase()
        );
      }
      if (expedition && expedition !== 'All') {
        filtered = filtered.filter(
          (t) => t.expedition === expedition || t.expedition?._id === expedition
        );
      }
      if (base && base !== 'All') {
        filtered = filtered.filter((t) => t.base === base || t.base?._id === base);
      }

      return res.json({
        success: true,
        data: filtered,
        pagination: getPaginationMeta(filtered.length, 1, 50),
      });
    }

    // 3. Database query mode
    const {
      page = 1,
      limit = 50,
      search = '',
      status = '',
      priority = '',
      assignee = '',
      expedition = '',
      base = '',
      sort = '-createdAt',
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { assignedToName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (assignee && assignee !== 'All') {
      query.$or = [{ assignedTo: assignee }, { assignedToName: { $regex: assignee, $options: 'i' } }];
    }
    if (expedition && expedition !== 'All') query.expedition = expedition;
    if (base && base !== 'All') query.base = base;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name designation participantId email')
      .populate('expedition', 'name expeditionCode type status')
      .populate('base', 'name code location operationalStatus')
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: tasks, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    await autoDetectOverdue();

    if (require('mongoose').connection.readyState !== 1) {
      const task = mockTasks.find((t) => t._id === req.params.id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
      const activities = mockTaskActivities.filter((a) => a.entityId === task._id);
      return res.json({ success: true, data: { ...task, activityHistory: activities } });
    }

    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name designation participantId email')
      .populate('expedition', 'name expeditionCode type status')
      .populate('base', 'name code location operationalStatus')
      .populate('createdBy', 'name email role')
      .populate('comments.author', 'name email role');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Fetch activity history for task
    const activityHistory = await ActivityLog.find({
      entityType: 'Task',
      entityId: task._id,
    })
      .sort('-createdAt')
      .lean();

    const taskObj = task.toObject();
    taskObj.activityHistory = activityHistory;

    res.json({ success: true, data: taskObj });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      priority = 'Medium',
      deadline,
      dueDate,
      assignedTo,
      assignedToName,
      expedition,
      base,
      status = 'Pending',
    } = req.body;

    const resolvedDeadline = deadline || dueDate;
    if (!resolvedDeadline) {
      return res.status(400).json({ success: false, message: 'Deadline is required.' });
    }

    let finalAssignedToName = assignedToName || '';

    // If assignedTo ID is given but no name, attempt lookup
    if (assignedTo && !finalAssignedToName && require('mongoose').connection.readyState === 1) {
      const person = await Personnel.findById(assignedTo);
      if (person) finalAssignedToName = person.name;
    }

    // Normalized initial status: Pending unless specified In Progress
    const initialStatus = status === 'In Progress' ? 'In Progress' : 'Pending';

    if (require('mongoose').connection.readyState !== 1) {
      const newTask = {
        _id: `mock-${Date.now()}`,
        title,
        description: description || '',
        priority,
        deadline: new Date(resolvedDeadline).toISOString(),
        status: initialStatus,
        assignedTo: assignedTo || null,
        assignedToName: finalAssignedToName,
        expedition: expedition || null,
        base: base || null,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockTasks.unshift(newTask);

      mockTaskActivities.unshift({
        _id: `act-${Date.now()}`,
        actorName: req.user?.name || 'Operator',
        action: 'TASK_CREATED',
        entityType: 'Task',
        entityId: newTask._id,
        description: `Task "${newTask.title}" created (${newTask.priority} priority)`,
        createdAt: new Date().toISOString(),
      });

      emitToAll('dashboard:statsUpdated', { module: 'tasks' });
      return res.status(201).json({ success: true, data: newTask });
    }

    const task = await Task.create({
      title,
      description: description || '',
      priority,
      deadline: resolvedDeadline,
      assignedTo: assignedTo || null,
      assignedToName: finalAssignedToName,
      expedition: expedition || null,
      base: base || null,
      status: initialStatus,
      createdBy: req.user?._id,
    });

    await ActivityLog.create({
      actor: req.user?._id,
      actorName: req.user?.name || 'Operator',
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task._id,
      description: `Task "${task.title}" created (${task.priority} priority)`,
    });

    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle dueDate -> deadline alias
    if (req.body.dueDate && !req.body.deadline) {
      req.body.deadline = req.body.dueDate;
    }

    // Normalize status string if needed
    if (req.body.status === 'Todo' || req.body.status === 'Assigned') {
      req.body.status = 'Pending';
    } else if (req.body.status === 'InProgress') {
      req.body.status = 'In Progress';
    }

    if (require('mongoose').connection.readyState !== 1) {
      const taskIndex = mockTasks.findIndex((t) => t._id === id);
      if (taskIndex === -1) return res.status(404).json({ success: false, message: 'Task not found.' });

      const task = mockTasks[taskIndex];
      const oldStatus = task.status;

      if (req.body.comment) {
        if (!task.comments) task.comments = [];
        const newComment = {
          _id: `cmt-${Date.now()}`,
          authorName: req.user?.name || 'Operator',
          text: req.body.comment,
          timestamp: new Date().toISOString(),
        };
        task.comments.push(newComment);

        mockTaskActivities.unshift({
          _id: `act-${Date.now()}-cmt`,
          actorName: req.user?.name || 'Operator',
          action: 'TASK_COMMENT_ADDED',
          entityType: 'Task',
          entityId: task._id,
          description: `Added note: "${req.body.comment.substring(0, 40)}..."`,
          createdAt: new Date().toISOString(),
        });
        delete req.body.comment;
      }

      Object.assign(task, req.body, { updatedAt: new Date().toISOString() });

      if (req.body.status && req.body.status !== oldStatus) {
        mockTaskActivities.unshift({
          _id: `act-${Date.now()}-status`,
          actorName: req.user?.name || 'Operator',
          action: 'TASK_STATUS_CHANGED',
          entityType: 'Task',
          entityId: task._id,
          description: `Task "${task.title}": ${oldStatus} → ${task.status}`,
          createdAt: new Date().toISOString(),
        });
        emitToAll('task:statusChanged', { taskId: task._id, title: task.title, status: req.body.status, oldStatus });
      }

      emitToAll('dashboard:statsUpdated', { module: 'tasks' });
      return res.json({ success: true, data: task });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const oldStatus = task.status;

    // Handle comment addition
    if (req.body.comment) {
      task.comments.push({
        author: req.user?._id,
        authorName: req.user?.name || 'Operator',
        text: req.body.comment,
        timestamp: new Date(),
      });
      await ActivityLog.create({
        actor: req.user?._id,
        actorName: req.user?.name || 'Operator',
        action: 'TASK_COMMENT_ADDED',
        entityType: 'Task',
        entityId: task._id,
        description: `Added note on task "${task.title}"`,
      });
      delete req.body.comment;
    }

    // Lookup assignedToName if assignedTo changed and name not provided
    if (req.body.assignedTo && req.body.assignedTo !== String(task.assignedTo)) {
      if (!req.body.assignedToName) {
        const person = await Personnel.findById(req.body.assignedTo);
        if (person) req.body.assignedToName = person.name;
      }
      await ActivityLog.create({
        actor: req.user?._id,
        actorName: req.user?.name || 'Operator',
        action: 'TASK_ASSIGNED',
        entityType: 'Task',
        entityId: task._id,
        description: `Task reassigned to ${req.body.assignedToName || 'Crew member'}`,
      });
    }

    Object.assign(task, req.body);
    await task.save();

    if (req.body.status && req.body.status !== oldStatus) {
      emitToAll('task:statusChanged', { taskId: task._id, title: task.title, status: req.body.status, oldStatus });
      await ActivityLog.create({
        actor: req.user?._id,
        actorName: req.user?.name || 'Operator',
        action: 'TASK_STATUS_CHANGED',
        entityType: 'Task',
        entityId: task._id,
        description: `Task "${task.title}": ${oldStatus} → ${task.status}`,
      });
    }

    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (require('mongoose').connection.readyState !== 1) {
      const idx = mockTasks.findIndex((t) => t._id === id);
      if (idx !== -1) {
        const removed = mockTasks.splice(idx, 1)[0];
        mockTaskActivities.unshift({
          _id: `act-${Date.now()}`,
          actorName: req.user?.name || 'Operator',
          action: 'TASK_DELETED',
          entityType: 'Task',
          entityId: id,
          description: `Task "${removed.title}" deleted`,
          createdAt: new Date().toISOString(),
        });
      }
      emitToAll('dashboard:statsUpdated', { module: 'tasks' });
      return res.json({ success: true, message: 'Task deleted.' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    await Task.findByIdAndDelete(id);
    await ActivityLog.create({
      actor: req.user?._id,
      actorName: req.user?.name || 'Operator',
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: task._id,
      description: `Task "${task.title}" deleted`,
    });

    emitToAll('dashboard:statsUpdated', { module: 'tasks' });
    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTaskStats, getTask, createTask, updateTask, deleteTask };

