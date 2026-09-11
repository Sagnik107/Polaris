import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  User,
  MapPin,
  Compass,
  Flame,
  ArrowRight,
  RotateCcw,
  Trash2,
  MessageSquare,
  Send,
  History,
  LayoutGrid,
  List,
  ChevronRight,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export const TasksPage = () => {
  const { user, hasRole } = useAuth();

  // RBAC checks
  const canCreate = hasRole('SuperAdmin', 'ExpeditionManager', 'BaseOfficer');
  const canUpdate = user && user.role !== 'Viewer';
  const canDelete = hasRole('SuperAdmin', 'ExpeditionManager');

  // State
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Linked modules
  const [personnelList, setPersonnelList] = useState([]);
  const [expeditionsList, setExpeditionsList] = useState([]);
  const [basesList, setBasesList] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
    assignedTo: '',
    expedition: '',
    base: '',
    status: 'Pending',
  });

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch linked entities (personnel, expeditions, bases)
  useEffect(() => {
    fetchTasks();

    const fetchLinkedData = async () => {
      try {
        const [pRes, eRes, bRes] = await Promise.allSettled([
          api.get('/personnel'),
          api.get('/expeditions'),
          api.get('/bases'),
        ]);

        if (pRes.status === 'fulfilled' && pRes.value.data?.success) {
          setPersonnelList(pRes.value.data.data);
        }
        if (eRes.status === 'fulfilled' && eRes.value.data?.success) {
          setExpeditionsList(eRes.value.data.data);
        }
        if (bRes.status === 'fulfilled' && bRes.value.data?.success) {
          setBasesList(bRes.value.data.data);
        }
      } catch (err) {
        console.warn('Error loading linked metadata for tasks:', err);
      }
    };

    fetchLinkedData();
  }, []);

  // Fetch task details (including activity history and comments)
  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/tasks/${task._id}`);
      if (res.data?.success) {
        setSelectedTask(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Create new task
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canCreate) {
      alert('Access restricted: Insufficient permissions to create operational tasks.');
      return;
    }

    try {
      const selectedPerson = personnelList.find((p) => p._id === newTask.assignedTo);

      const payload = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        deadline: newTask.deadline,
        status: newTask.status || 'Pending',
        assignedTo: newTask.assignedTo || null,
        assignedToName: selectedPerson ? selectedPerson.name : '',
        expedition: newTask.expedition || null,
        base: newTask.base || null,
      };

      const res = await api.post('/tasks', payload);
      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setNewTask({
          title: '',
          description: '',
          priority: 'Medium',
          deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
          assignedTo: '',
          expedition: '',
          base: '',
          status: 'Pending',
        });
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  // Change task status (Pending -> In Progress -> Completed, or Overdue -> In Progress / Completed)
  const handleStatusChange = async (taskId, nextStatus) => {
    if (!canUpdate) {
      alert('Access restricted: Viewer role cannot modify task status.');
      return;
    }
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: nextStatus });
      if (res.data?.success) {
        fetchTasks();
        if (selectedTask && selectedTask._id === taskId) {
          openTaskDetail(res.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Add field comment/note to task
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    if (!canUpdate) {
      alert('Access restricted: Viewer role cannot add comments.');
      return;
    }

    try {
      setIsSubmittingComment(true);
      const res = await api.put(`/tasks/${selectedTask._id}`, { comment: commentText.trim() });
      if (res.data?.success) {
        setCommentText('');
        openTaskDetail(res.data.data);
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!canDelete) {
      alert('Access restricted: Only SuperAdmin and ExpeditionManager can delete tasks.');
      return;
    }
    if (!window.confirm('Are you sure you want to permanently delete this operational task?')) {
      return;
    }

    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data?.success) {
        setIsDetailModalOpen(false);
        setSelectedTask(null);
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Helper: check overdue status
  const isOverdue = (task) => {
    if (task.status === 'Completed') return false;
    if (task.status === 'Overdue') return true;
    const taskDeadline = task.deadline || task.dueDate;
    return taskDeadline ? new Date(taskDeadline) < new Date() : false;
  };

  // Helper: format deadline with urgency indicator
  const formatDeadline = (dateStr) => {
    if (!dateStr) return 'No deadline set';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const daysAgo = Math.abs(diffDays);
      return `Overdue by ${daysAgo === 0 ? 'hours' : `${daysAgo}d`}`;
    }
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return `Due ${d.toLocaleDateString()}`;
  };

  // Helper: priority styling
  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Low':
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-700';
    }
  };

  // Helper: extract assignee name
  const getAssigneeName = (task) => {
    if (task.assignedToName) return task.assignedToName;
    if (task.assignedTo && typeof task.assignedTo === 'object' && task.assignedTo.name) {
      return task.assignedTo.name;
    }
    return 'Unassigned (Station Crew)';
  };

  // Helper: extract expedition label
  const getExpeditionLabel = (task) => {
    if (!task.expedition) return null;
    if (typeof task.expedition === 'object') {
      return task.expedition.expeditionCode
        ? `${task.expedition.expeditionCode}: ${task.expedition.name}`
        : task.expedition.name;
    }
    const found = expeditionsList.find((e) => e._id === task.expedition);
    return found ? `${found.expeditionCode || ''} ${found.name}`.trim() : null;
  };

  // Helper: extract base label
  const getBaseLabel = (task) => {
    if (!task.base) return null;
    if (typeof task.base === 'object') {
      return task.base.name;
    }
    const found = basesList.find((b) => b._id === task.base);
    return found ? found.name : null;
  };

  // Filtered task items
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(query);
        const descMatch = t.description?.toLowerCase().includes(query);
        const assigneeMatch = getAssigneeName(t).toLowerCase().includes(query);
        const expMatch = getExpeditionLabel(t)?.toLowerCase().includes(query);
        const baseMatch = getBaseLabel(t)?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !assigneeMatch && !expMatch && !baseMatch) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'All') {
        if (statusFilter === 'Overdue') {
          if (!isOverdue(t)) return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Priority
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== 'All') {
        const name = getAssigneeName(t);
        if (name !== assigneeFilter) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Unique assignee names for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      const name = getAssigneeName(t);
      if (name && name !== 'Unassigned (Station Crew)') {
        set.add(name);
      }
    });
    return Array.from(set);
  }, [tasks]);

  // KPI Metrics counts
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === 'Pending' || t.status === 'Todo').length;
  const inProgressCount = tasks.filter((t) => (t.status === 'In Progress' || t.status === 'InProgress') && !isOverdue(t)).length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  // Kanban column definition
  const KANBAN_COLUMNS = [
    {
      id: 'Pending',
      title: 'Pending',
      subtitle: 'AWAITING DISPATCH',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      filterFn: (t) => (t.status === 'Pending' || t.status === 'Todo') && !isOverdue(t),
    },
    {
      id: 'In Progress',
      title: 'In Progress',
      subtitle: 'OPERATIONAL EXECUTION',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      filterFn: (t) => (t.status === 'In Progress' || t.status === 'InProgress') && !isOverdue(t),
    },
    {
      id: 'Overdue',
      title: 'Overdue',
      subtitle: 'ACTION REQUIRED',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse',
      filterFn: (t) => isOverdue(t),
    },
    {
      id: 'Completed',
      title: 'Completed',
      subtitle: 'MISSION VERIFIED',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      filterFn: (t) => t.status === 'Completed',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
              Operational Tasks & Field Assignments
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            CRITICAL STATION CHECKLISTS, TURBINE INSPECTIONS, RECON PROTOCOLS & LOGISTICS OPS
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Workflow</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* New task button (RBAC protected) */}
          {canCreate ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Task</span>
            </button>
          ) : (
            <span
              title="Only SuperAdmin, ExpeditionManager, or BaseOfficer can create operational tasks."
              className="text-[11px] font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded border border-slate-800"
            >
              View-Only Mode
            </span>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('All')}
          className={`polar-card p-3 cursor-pointer transition-all hover:border-slate-600 ${
            statusFilter === 'All' ? 'border-sky-500 ring-1 ring-sky-500/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-white">{totalCount}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">All station directives</div>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`polar-card p-3 cursor-pointer transition-all hover:border-slate-600 ${
            statusFilter === 'Pending' ? 'border-amber-500 ring-1 ring-amber-500/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-300 uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-amber-300">{pendingCount}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Awaiting dispatch</div>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className={`polar-card p-3 cursor-pointer transition-all hover:border-slate-600 ${
            statusFilter === 'In Progress' ? 'border-cyan-500 ring-1 ring-cyan-500/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-300 uppercase">In Progress</span>
            <RotateCcw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-cyan-300">{inProgressCount}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Active field execution</div>
        </div>

        <div
          onClick={() => setStatusFilter('Overdue')}
          className={`polar-card p-3 cursor-pointer transition-all hover:border-rose-500 ${
            statusFilter === 'Overdue' ? 'border-rose-500 ring-1 ring-rose-500/30' : ''
          } ${overdueCount > 0 ? 'bg-rose-950/20 border-rose-500/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-300 uppercase font-bold flex items-center gap-1">
              {overdueCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
              Overdue
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-rose-400">{overdueCount}</div>
          <div className="text-[10px] font-mono text-rose-400/80 mt-0.5">Immediate action req.</div>
        </div>

        <div
          onClick={() => setStatusFilter('Completed')}
          className={`polar-card p-3 cursor-pointer transition-all hover:border-slate-600 ${
            statusFilter === 'Completed' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-300 uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-emerald-300">{completedCount}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Successfully signed off</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="polar-card p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search task title, description, assignee, expedition or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:border-sky-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none max-w-[180px] truncate"
            >
              <option value="All">All Personnel</option>
              {uniqueAssignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== 'All' || priorityFilter !== 'All' || assigneeFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setPriorityFilter('All');
                setAssigneeFilter('All');
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="polar-card p-12 text-center font-mono text-slate-400">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
          <span>Synchronizing operational tasks from command telemetry...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter(col.filterFn);

            return (
              <div
                key={col.id}
                className={`polar-card p-3.5 flex flex-col space-y-3 min-h-[580px] border-t-2 ${
                  col.id === 'Overdue'
                    ? 'border-t-rose-500 bg-rose-950/5'
                    : col.id === 'Completed'
                    ? 'border-t-emerald-500'
                    : col.id === 'In Progress'
                    ? 'border-t-cyan-500'
                    : 'border-t-amber-500'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-1">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                      {col.title}
                    </h3>
                    <p className="text-[9px] font-mono text-slate-500">{col.subtitle}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border font-semibold ${col.badgeColor}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Column */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="py-10 text-center font-mono text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-lg">
                      No {col.title.toLowerCase()} tasks
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const taskIsOverdue = isOverdue(t);
                      const isCritical = t.priority === 'Critical';
                      const isHigh = t.priority === 'High';

                      return (
                        <div
                          key={t._id}
                          className={`p-3.5 rounded-lg border transition-all duration-200 group relative ${
                            taskIsOverdue
                              ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400 shadow-md shadow-rose-950/30'
                              : isCritical
                              ? 'bg-slate-950 border-rose-500/40 hover:border-rose-400 shadow-sm shadow-rose-950/20'
                              : isHigh
                              ? 'bg-slate-950 border-amber-500/30 hover:border-amber-400'
                              : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Top Priority & Status Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${getPriorityBadgeStyle(
                                t.priority
                              )}`}
                            >
                              {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                              {t.priority}
                            </span>
                            <StatusBadge status={taskIsOverdue ? 'Overdue' : t.status} />
                          </div>

                          {/* Task Title (clickable) */}
                          <h4
                            onClick={() => openTaskDetail(t)}
                            className="text-xs font-bold text-white font-sans hover:text-sky-300 transition-colors cursor-pointer line-clamp-2"
                          >
                            {t.title}
                          </h4>

                          {/* Task Description */}
                          {t.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}

                          {/* Connected Expedition & Base Metadata */}
                          {(t.expedition || t.base) && (
                            <div className="mt-2.5 pt-2 border-t border-slate-850 flex flex-wrap gap-1.5 text-[10px] font-mono">
                              {t.expedition && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-800 truncate max-w-full">
                                  <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                                  <span className="truncate">{getExpeditionLabel(t)}</span>
                                </span>
                              )}
                              {t.base && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800 truncate max-w-full">
                                  <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="truncate">{getBaseLabel(t)}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Assignee & Deadline */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-slate-400 truncate mr-2">
                              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{getAssigneeName(t)}</span>
                            </div>
                            <span
                              className={`shrink-0 flex items-center gap-1 font-semibold ${
                                taskIsOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{formatDeadline(t.deadline || t.dueDate)}</span>
                            </span>
                          </div>

                          {/* Action Footer */}
                          <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                            <button
                              onClick={() => openTaskDetail(t)}
                              className="text-[10px] font-mono px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <History className="w-3 h-3" />
                              <span>Details & Notes</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {/* Workflow transition buttons */}
                              {canUpdate ? (
                                <>
                                  {(t.status === 'Pending' || t.status === 'Todo') && (
                                    <button
                                      onClick={() => handleStatusChange(t._id, 'In Progress')}
                                      className="text-[10px] font-mono px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-all cursor-pointer font-semibold"
                                      title="Begin operational work"
                                    >
                                      <span>Start</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}

                                  {(t.status === 'In Progress' || t.status === 'InProgress' || taskIsOverdue) && (
                                    <button
                                      onClick={() => handleStatusChange(t._id, 'Completed')}
                                      className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer font-semibold"
                                      title="Mark task completed"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Complete</span>
                                    </button>
                                  )}

                                  {t.status === 'Completed' && (
                                    <button
                                      onClick={() => handleStatusChange(t._id, 'In Progress')}
                                      className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                                      title="Reopen task"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reopen</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">Read-only</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABULAR LIST VIEW */
        <div className="polar-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Task & Directive</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Workflow Status</th>
                  <th className="px-4 py-3">Assigned Operator</th>
                  <th className="px-4 py-3">Expedition / Station</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No matching operational tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const taskIsOverdue = isOverdue(t);
                    return (
                      <tr
                        key={t._id}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          taskIsOverdue ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div
                            onClick={() => openTaskDetail(t)}
                            className="font-sans font-bold text-white hover:text-sky-300 transition-colors cursor-pointer"
                          >
                            {t.title}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-md mt-0.5">
                            {t.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getPriorityBadgeStyle(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={taskIsOverdue ? 'Overdue' : t.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-300">{getAssigneeName(t)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-[11px]">
                            {t.expedition && (
                              <div className="text-sky-400">{getExpeditionLabel(t)}</div>
                            )}
                            {t.base && <div className="text-slate-400">{getBaseLabel(t)}</div>}
                            {!t.expedition && !t.base && (
                              <span className="text-slate-600">Station Direct</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={taskIsOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}
                          >
                            {formatDeadline(t.deadline || t.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openTaskDetail(t)}
                              className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                            {canUpdate && (t.status === 'Pending' || t.status === 'Todo') && (
                              <button
                                onClick={() => handleStatusChange(t._id, 'In Progress')}
                                className="px-2 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 cursor-pointer"
                              >
                                Start
                              </button>
                            )}
                            {canUpdate &&
                              (t.status === 'In Progress' || t.status === 'InProgress' || taskIsOverdue) && (
                                <button
                                  onClick={() => handleStatusChange(t._id, 'Completed')}
                                  className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
                                >
                                  Done
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue Operational Task Assignment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Task Directive Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Inspect Station Backup Generator Fuel Line & Heat Trace"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Operational Instructions & Safety Checklists <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Specify safety procedures, required Arctic gear, tools, and sign-off criteria..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Priority Level</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="Critical">Critical (Immediate Hazard)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low / Routine</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Deadline Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Initial Workflow Status</label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Assign Operator</label>
              <select
                value={newTask.assignedTo}
                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="">Unassigned (General Crew)</option>
                {personnelList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.designation ? `(${p.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Link to Expedition</label>
              <select
                value={newTask.expedition}
                onChange={(e) => setNewTask({ ...newTask, expedition: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="">None (Station Base Task)</option>
                {expeditionsList.map((exp) => (
                  <option key={exp._id} value={exp._id}>
                    {exp.expeditionCode ? `[${exp.expeditionCode}] ` : ''}
                    {exp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Base Outpost</label>
              <select
                value={newTask.base}
                onChange={(e) => setNewTask({ ...newTask, base: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="">None / Remote Field</option>
                {basesList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              Issue Directive
            </button>
          </div>
        </form>
      </Modal>

      {/* TASK DETAILS & ACTIVITY TIMELINE MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        title="Operational Task Directive & Field Log"
        maxWidth="max-w-3xl"
      >
        {selectedTask && (
          <div className="space-y-6 font-mono text-xs">
            {/* Header / Summary Card */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${getPriorityBadgeStyle(
                      selectedTask.priority
                    )}`}
                  >
                    {selectedTask.priority === 'Critical' && <Flame className="w-3 h-3 text-rose-400" />}
                    {selectedTask.priority} Priority
                  </span>
                  <StatusBadge
                    status={isOverdue(selectedTask) ? 'Overdue' : selectedTask.status}
                  />
                </div>

                {/* Workflow Actions */}
                {canUpdate && (
                  <div className="flex items-center gap-2">
                    {(selectedTask.status === 'Pending' || selectedTask.status === 'Todo') && (
                      <button
                        onClick={() => handleStatusChange(selectedTask._id, 'In Progress')}
                        className="px-3 py-1 rounded bg-sky-500 text-slate-950 font-bold hover:bg-sky-400 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Start Work</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(selectedTask.status === 'In Progress' ||
                      selectedTask.status === 'InProgress' ||
                      isOverdue(selectedTask)) && (
                      <button
                        onClick={() => handleStatusChange(selectedTask._id, 'Completed')}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sign Off / Complete</span>
                      </button>
                    )}

                    {selectedTask.status === 'Completed' && (
                      <button
                        onClick={() => handleStatusChange(selectedTask._id, 'In Progress')}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen Task</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <h2 className="text-base font-bold text-white font-sans">{selectedTask.title}</h2>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {selectedTask.description || 'No additional instructions provided.'}
              </p>

              {/* Linked Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-850 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Assigned To</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{getAssigneeName(selectedTask)}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Deadline</span>
                  <span
                    className={`font-semibold flex items-center gap-1 mt-0.5 ${
                      isOverdue(selectedTask) ? 'text-rose-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDeadline(selectedTask.deadline || selectedTask.dueDate)}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Expedition</span>
                  <span className="text-sky-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                    <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">
                      {getExpeditionLabel(selectedTask) || 'Station Direct'}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Base Outpost</span>
                  <span className="text-indigo-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{getBaseLabel(selectedTask) || 'Field Traverse'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Workflow Progress Timeline Banner */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                Directive Workflow Lifecycle
              </span>
              <div className="flex items-center justify-between text-xs">
                <div
                  className={`flex items-center gap-1.5 ${
                    selectedTask.status === 'Pending' || selectedTask.status === 'Todo'
                      ? 'text-amber-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedTask.status === 'Pending' || selectedTask.status === 'Todo'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>1. Pending</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <div
                  className={`flex items-center gap-1.5 ${
                    selectedTask.status === 'In Progress' || selectedTask.status === 'InProgress'
                      ? 'text-cyan-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedTask.status === 'In Progress' || selectedTask.status === 'InProgress'
                        ? 'bg-cyan-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>2. In Progress</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <div
                  className={`flex items-center gap-1.5 ${
                    isOverdue(selectedTask)
                      ? 'text-rose-400 font-bold'
                      : selectedTask.status === 'Completed'
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOverdue(selectedTask)
                        ? 'bg-rose-400 animate-ping'
                        : selectedTask.status === 'Completed'
                        ? 'bg-emerald-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>{isOverdue(selectedTask) ? '3. Overdue' : '3. Completed'}</span>
                </div>
              </div>
            </div>

            {/* Split Grid: Activity History & Team Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activity & Audit Timeline */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-400" />
                    <span>Audit & Activity History</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedTask.activityHistory?.length || 0} events
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {(!selectedTask.activityHistory || selectedTask.activityHistory.length === 0) ? (
                    <div className="py-6 text-center text-slate-500 text-[11px]">
                      No previous audit records logged.
                    </div>
                  ) : (
                    selectedTask.activityHistory.map((act) => (
                      <div
                        key={act._id}
                        className="p-2 rounded bg-slate-900/60 border border-slate-850 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="font-bold text-sky-300">{act.actorName || 'Operator'}</span>
                          <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-300">{act.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comments / Field Notes */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                    <h4 className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Operational Field Notes</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedTask.comments?.length || 0} notes
                    </span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                      <div className="py-6 text-center text-slate-500 text-[11px]">
                        No field notes appended yet.
                      </div>
                    ) : (
                      selectedTask.comments.map((cmt, idx) => (
                        <div
                          key={cmt._id || idx}
                          className="p-2 rounded bg-slate-900 border border-slate-850 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="text-emerald-400 font-bold">
                              {cmt.authorName || (typeof cmt.author === 'object' && cmt.author?.name) || 'Field Crew'}
                            </span>
                            <span>
                              {cmt.timestamp ? new Date(cmt.timestamp).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-slate-200">{cmt.text || cmt.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Comment Input */}
                {canUpdate ? (
                  <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-850 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add operational field note..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !commentText.trim()}
                      className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </form>
                ) : (
                  <div className="text-[10px] text-slate-500 italic text-center pt-2">
                    Sign-in with operator credentials to append field notes.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Bar: Delete Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteTask(selectedTask._id)}
                    className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Directive</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TasksPage;

