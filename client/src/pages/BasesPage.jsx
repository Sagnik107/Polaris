import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, Activity, Radio, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import PolarMap from '../components/common/PolarMap';

export const BasesPage = () => {
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBases = async () => {
      try {
        setLoading(true);
        const res = await api.get('/bases');
        if (res.data?.success) {
          setBases(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load bases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBases();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
          Polar Base Command & Outpost Telemetry
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          CONTINENTAL ANTARCTIC STATIONS, ARCTIC HIGH-LATITUDE POSTS & MOBILE VESSELS
        </p>
      </div>

      {/* Map Overview */}
      <div className="polar-card p-6">
        <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider mb-4">
          Global Polar Distribution
        </h3>
        <PolarMap bases={bases} height="320px" />
      </div>

      {/* Bases Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bases.map((base) => {
          const occupancyRate = Math.round(((base.currentPersonnel || 0) / (base.capacity || 1)) * 100);

          return (
            <div key={base._id || base.code} className="polar-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400">{base.code}</span>
                    <StatusBadge status={base.status} />
                  </div>
                  <h3 className="text-lg font-bold text-white font-heading mt-1">{base.name}</h3>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    {base.location}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-400">Personnel Occupancy:</span>
                  <span className="text-teal-300 font-bold">
                    {base.currentPersonnel} / {base.capacity} ({occupancyRate}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-sky-400 rounded-full"
                    style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Specs */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Coordinates</span>
                  <span className="text-slate-200 font-semibold">
                    {base.coordinates?.lat?.toFixed(3)}°, {base.coordinates?.lng?.toFixed(3)}°
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Elevation</span>
                  <span className="text-slate-200 font-semibold">{base.elevationMeters || 0} m MSL</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BasesPage;
