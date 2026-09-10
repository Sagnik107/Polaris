import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmergencyBanner = ({ emergency }) => {
  const navigate = useNavigate();

  if (!emergency) return null;

  return (
    <div className="mb-6 rounded-lg bg-rose-500/15 border border-rose-500/40 p-4 flex items-center justify-between text-rose-200 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50">
              ACTIVE LEVEL 1 EMERGENCY
            </span>
            <span className="text-sm font-semibold text-white">
              {emergency.title || 'Station Critical Incident'}
            </span>
          </div>
          <p className="text-xs text-rose-300/80 mt-1 line-clamp-1">
            {emergency.description || 'Facility emergency declared. Priority response team active.'}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate('/emergency')}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium font-mono transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
      >
        <span>COMMAND PROTOCOL</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default EmergencyBanner;
