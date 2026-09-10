import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { useSocket } from '../context/SocketContext';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const { setUnreadAlertsCount } = useSocket();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alerts');
      if (res.data?.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/read-all');
      setUnreadAlertsCount(0);
      fetchAlerts();
    } catch (err) {
      alert('Failed to mark all as read');
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/read`);
      setUnreadAlertsCount((prev) => Math.max(0, prev - 1));
      fetchAlerts();
    } catch (err) {
      alert('Failed to mark read');
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !a.isRead;
    return a.severity === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-sky-400" />
            Polar Operations Alert Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            AUTOMATED LOGISTICS DELAY FLAGS, FUEL WARNINGS & ENVIRONMENTAL SENSORS
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-xs border border-slate-700 transition-colors cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Acknowledge All Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'Unread', 'Critical', 'High', 'Warning'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
              filter === f
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:bg-slate-800 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <div
            key={alert._id}
            className={`polar-card p-5 flex items-start justify-between gap-4 transition-all ${
              !alert.isRead ? 'border-sky-500/30 bg-slate-900/80' : 'opacity-75'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                  alert.severity === 'Critical'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : alert.severity === 'High'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                }`}
              >
                {alert.severity === 'Critical' ? (
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white font-sans">
                    {alert.title}
                  </span>
                  {!alert.isRead && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.message}</p>

                <div className="mt-2.5 flex items-center gap-3 text-[11px] font-mono text-slate-500">
                  <span>Module: {alert.module}</span>
                  <span>•</span>
                  <span>{new Date(alert.createdAt).toLocaleTimeString()} UTC</span>
                </div>
              </div>
            </div>

            {!alert.isRead && (
              <button
                onClick={() => handleMarkRead(alert._id)}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-slate-800 border border-slate-700 shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPage;
