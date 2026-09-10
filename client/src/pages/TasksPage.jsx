import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Search, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
  });

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

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/tasks', {
        ...newTask,
        status: 'Todo',
      });
      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setNewTask({
          title: '',
          description: '',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
        });
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: nextStatus });
      if (res.data?.success) {
        fetchTasks();
      }
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            Operational Tasks & Maintenance Assignments
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            CRITICAL STATION CHECKLISTS, TURBINE INSPECTIONS & SURVEY PROTOCOLS
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Todo', 'InProgress', 'Completed'].map((colStatus) => {
          const colTasks = tasks.filter(
            (t) => t.status === colStatus || (colStatus === 'InProgress' && t.status === 'Overdue')
          );

          return (
            <div key={colStatus} className="polar-card p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                  {colStatus === 'InProgress' ? 'In Progress / Overdue' : colStatus}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {colTasks.map((t) => {
                  const isOverdue = t.status === 'Overdue';

                  return (
                    <div
                      key={t._id}
                      className={`p-4 rounded-lg bg-slate-950/80 border ${
                        isOverdue ? 'border-rose-500/40' : 'border-slate-800'
                      } space-y-2`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            t.priority === 'Critical'
                              ? 'bg-rose-500/20 text-rose-300'
                              : t.priority === 'High'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>

                      <h4 className="text-sm font-semibold text-white font-sans">{t.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>Assigned: {t.assignedToName || 'Station Crew'}</span>
                        <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                          Due: {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Quick action button */}
                      <div className="pt-2 flex justify-end gap-2">
                        {t.status !== 'Completed' && (
                          <button
                            onClick={() => handleStatusChange(t._id, 'Completed')}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark Done
                          </button>
                        )}
                        {t.status === 'Todo' && (
                          <button
                            onClick={() => handleStatusChange(t._id, 'InProgress')}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Assign Operational Task">
        <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Inspect Station Backup Generator Fuel Line"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Detailed Instructions</label>
            <textarea
              rows={3}
              required
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Details on tools required, safety gear, and checklists"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase"
            >
              Issue Task Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksPage;
