import React from 'react';

const STATUS_STYLES = {
  // Operational & Active
  Operational: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Active: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Completed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Cleared: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  InStock: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',

  // In Transit & Planning
  InTransit: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Loading: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Planning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Pending: 'bg-slate-500/20 text-slate-300 border-slate-600/40',
  Assigned: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  InProgress: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'In Progress': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Arrived: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Draft: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Todo: 'bg-slate-500/15 text-slate-300 border-slate-500/30',

  // Warnings & Critical
  Delayed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  LowStock: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Maintenance: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Overdue: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
  Critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
  Emergency: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
  High: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Moderate: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Investigating: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export const StatusBadge = ({ status, className = '' }) => {
  const badgeStyle = STATUS_STYLES[status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-wide ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
};

export default StatusBadge;
