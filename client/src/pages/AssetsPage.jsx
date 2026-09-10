import React, { useState, useEffect } from 'react';
import { Wrench, Search, Plus, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export const AssetsPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [maintNotes, setMaintNotes] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assets');
      if (res.data?.success) {
        setAssets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleLogMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await api.put(`/assets/${selectedAsset._id}`, {
        status: 'Operational',
        condition: 'Good',
        nextMaintenanceDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      });
      if (res.data?.success) {
        setIsMaintModalOpen(false);
        setMaintNotes('');
        fetchAssets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update asset');
    }
  };

  const filtered = assets.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.assetTag?.toLowerCase().includes(search.toLowerCase()) ||
    a.baseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            Polar Assets, Vehicles & Heavy Machinery
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            TRACKED CARRIERS, STATION POWER TURBINES & SCIENTIFIC SENSOR SUITES
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="polar-card p-4 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search asset tag, machinery model, station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          {filtered.length} equipment assets tracked
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((asset) => {
          const isOverdue =
            new Date(asset.nextMaintenanceDate) < new Date() && asset.status !== 'Decommissioned';

          return (
            <div
              key={asset._id || asset.assetTag}
              className={`polar-card p-6 flex flex-col justify-between ${
                isOverdue ? 'border-rose-500/40' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-sky-400">{asset.assetTag}</span>
                    <h3 className="text-base font-bold text-white font-heading mt-1">{asset.name}</h3>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block">{asset.baseName}</span>
                  </div>
                  <StatusBadge status={asset.status} />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Model / Serial:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{asset.model}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Condition:</span>
                    <span className="text-teal-400 font-semibold">{asset.condition}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Next Service:</span>
                    <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {new Date(asset.nextMaintenanceDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">{asset.category}</span>
                <button
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsMaintModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold"
                >
                  Log Service
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Maintenance Modal */}
      <Modal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} title="Log Asset Maintenance Record">
        {selectedAsset && (
          <form onSubmit={handleLogMaintenance} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Asset Information</label>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-white font-semibold">
                {selectedAsset.assetTag} — {selectedAsset.name}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Maintenance Actions Performed</label>
              <textarea
                rows={3}
                required
                value={maintNotes}
                onChange={(e) => setMaintNotes(e.target.value)}
                placeholder="e.g. Replaced fuel filter; flushed sub-zero radiator coolant; calibrated turbine telemetry."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMaintModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase"
              >
                Certify & Clear Maintenance
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AssetsPage;
