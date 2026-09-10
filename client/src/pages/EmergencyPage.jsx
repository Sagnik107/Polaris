import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, ShieldAlert, CheckCircle2, Clock, User } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export const EmergencyPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionDesc, setActionDesc] = useState('');

  // Declare Emergency form
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    type: 'Facility',
    severity: 'Critical',
    baseName: 'Maitri Station',
  });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/incidents');
      if (res.data?.success) {
        setIncidents(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDeclare = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/incidents', {
        ...newIncident,
        status: 'Active',
      });
      if (res.data?.success) {
        setIsDeclareModalOpen(false);
        setNewIncident({
          title: '',
          description: '',
          type: 'Facility',
          severity: 'Critical',
          baseName: 'Maitri Station',
        });
        fetchIncidents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to declare emergency');
    }
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!selectedIncident || !actionDesc) return;
    try {
      const res = await api.put(`/incidents/${selectedIncident._id}`, {
        action: { description: actionDesc, performedBy: 'Command Duty Officer' },
      });
      if (res.data?.success) {
        setActionDesc('');
        setSelectedIncident(null);
        fetchIncidents();
      }
    } catch (err) {
      alert('Failed to log action');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Emergency Incident Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            STATION TURBINE FAILURES, BLIZZARD TRAPPINGS & RESCUE PROTOCOLS
          </p>
        </div>

        <button
          onClick={() => setIsDeclareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase font-mono tracking-wider transition-all shadow-lg shadow-rose-950/60 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Declare Emergency Protocol</span>
        </button>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((inc) => {
          const isCritical = inc.severity === 'Critical' && inc.status === 'Active';

          return (
            <div
              key={inc._id || inc.incidentNumber}
              className={`polar-card p-6 ${
                isCritical ? 'border-rose-500/50 bg-rose-950/20 polar-glow-danger' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-rose-400">
                      {inc.incidentNumber}
                    </span>
                    <StatusBadge status={inc.status} />
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                        inc.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {inc.severity} SEVERITY
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white font-heading mt-2">{inc.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                    {inc.description}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-400">
                    <span>Base: {inc.baseName}</span>
                    <span>•</span>
                    <span>Reported by: {inc.reporterName || 'Station Commander'}</span>
                    <span>•</span>
                    <span>Type: {inc.type}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIncident(inc)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono font-bold shrink-0 self-start"
                >
                  Log Action Step
                </button>
              </div>

              {/* Action Log Timeline */}
              {inc.actions && inc.actions.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-2">
                    Triage & Mitigation Timeline ({inc.actions.length} steps)
                  </span>
                  <div className="space-y-2">
                    {inc.actions.map((act, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono flex items-start gap-2 text-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <div>
                          <span>{act.description}</span>
                          <span className="text-slate-500 text-[10px] ml-2">
                            — {act.performedBy} ({new Date(act.timestamp).toLocaleTimeString()})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Declare Emergency Modal */}
      <Modal isOpen={isDeclareModalOpen} onClose={() => setIsDeclareModalOpen(false)} title="Declare Station Emergency Protocol">
        <form onSubmit={handleDeclare} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Emergency Title</label>
            <input
              type="text"
              required
              value={newIncident.title}
              onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
              placeholder="e.g. Primary Turbine Power Loss - Maitri Station"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Incident Category</label>
            <select
              value={newIncident.type}
              onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            >
              <option value="Facility">Facility / Infrastructure Failure</option>
              <option value="Environmental">Environmental (Blizzard/Katabatic Wind)</option>
              <option value="Medical">Medical Evacuation / Hypothermia</option>
              <option value="Logistics">Logistics / Convoy Strand</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Severity Level</label>
            <select
              value={newIncident.severity}
              onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            >
              <option value="Critical">Critical (Threat to Life or Station Power)</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Description & Immediate Hazard</label>
            <textarea
              rows={3}
              required
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
              placeholder="Current conditions, personnel at risk, immediate containment steps taken"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeclareModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider"
            >
              Broadcast Emergency Signal
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Action Modal */}
      <Modal isOpen={!!selectedIncident} onClose={() => setSelectedIncident(null)} title="Log Mitigation Action">
        <form onSubmit={handleAddAction} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Action Description</label>
            <textarea
              rows={3}
              required
              value={actionDesc}
              onChange={(e) => setActionDesc(e.target.value)}
              placeholder="e.g. Dispatched emergency fuel bladder via Hagglunds carrier to generator shelter"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedIncident(null)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase"
            >
              Record Action Step
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmergencyPage;
