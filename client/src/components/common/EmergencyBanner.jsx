import React from 'react';
import { useNavigate } from 'react-router-dom';

export const EmergencyBanner = ({ emergency }) => {
  const navigate = useNavigate();

  if (!emergency || emergency.status === 'Resolved' || emergency.status === 'Closed') return null;

  const incidentCode = emergency.incidentNumber || emergency.code || 'INC-ALERT';
  const location = emergency.location || emergency.baseName || (typeof emergency.base === 'object' ? emergency.base?.name : null) || 'Antarctic Sector';
  const severity = emergency.severity || 'Critical';
  const status = emergency.status || 'Active';

  return (
    <div className="mb-6 rounded-xl bg-gradient-to-r from-danger/25 via-[#1a0c14] to-surface-1 border border-danger/50 p-3.5 shadow-[0_0_20px_rgba(255,102,120,0.18)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-danger/20 border border-danger/50 flex items-center justify-center text-danger shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-lg animate-pulse">crisis_alert</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-danger text-polar-950 text-[10px] font-mono font-bold tracking-wider uppercase">
              LEVEL 1 EMERGENCY
            </span>
            <span className="font-mono text-xs font-bold text-danger bg-danger/10 px-1.5 py-0.2 rounded border border-danger/30">
              {incidentCode}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-danger/20 text-danger border border-danger/30 uppercase">
              {severity}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-2 text-ice-300 border border-border-default uppercase">
              {status}
            </span>
            <span className="text-xs text-text-muted font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-danger">location_on</span>
              {location}
            </span>
          </div>
          <h4 className="text-xs font-bold text-text-primary mt-0.5">
            {emergency.title || 'Polar Emergency Incident'}
          </h4>
          <p className="text-[11px] text-text-secondary line-clamp-1">
            {emergency.description || 'Facility emergency declared. Priority response team active.'}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate('/emergency')}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-danger hover:bg-danger/90 text-polar-950 font-mono font-bold text-xs shadow-[0_0_12px_rgba(255,102,120,0.3)] transition-all cursor-pointer shrink-0 self-end md:self-auto"
      >
        <span className="material-symbols-outlined text-sm font-bold">shield</span>
        <span>COMMAND PROTOCOL</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  );
};

export default EmergencyBanner;
