import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AccessDenied = ({ allowedRoles = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const roleDisplayNames = {
    SuperAdmin: 'SuperAdmin (Expedition & Station Command)',
    ExpeditionManager: 'Expedition Manager',
    LogisticsCoordinator: 'Logistics Coordinator',
    InventoryManager: 'Inventory & Cryo Assets Manager',
    BaseOfficer: 'Base Operational Officer',
    MedicalOfficer: 'Chief Medical & SAR Officer',
    PersonnelManager: 'Personnel Workforce Director',
    Viewer: 'Observer / Scientific Viewer',
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-2xl rounded-2xl bg-[#081e30] border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden relative backdrop-blur-xl">
        {/* Top Warning Strip */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900/60 to-[#081e30] border-b border-rose-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse">
              <span className="material-symbols-outlined text-2xl">shield_lock</span>
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-bold">
                SECURITY CLASSIFICATION ERROR 403
              </span>
              <h2 className="text-base font-bold text-white tracking-wide font-mono">
                COMPARTMENT ACCESS RESTRICTED
              </h2>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase">
            DEFCON LEVEL 2
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-[#A9BDD0]">
              Your operator credentials do not possess the required security clearance level to access this tactical compartment.
            </p>
            <p className="text-xs text-[#6E8498] font-mono">
              POLARIS Rule: Role-Based Access Control (RBAC) enforces compartment isolation for sensitive mission telemetry, asset transfers, medical dossiers, and user provisioning.
            </p>
          </div>

          {/* Security Telemetry Audit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#051422] border border-[rgba(130,190,225,0.18)] font-mono text-xs">
            <div>
              <span className="text-[#6E8498] block text-[10px] uppercase">Attempted Route</span>
              <span className="text-rose-400 font-semibold break-all">{location.pathname}</span>
            </div>

            <div>
              <span className="text-[#6E8498] block text-[10px] uppercase">Active Operator</span>
              <span className="text-[#F4F9FF] font-semibold">{user?.name || 'Unknown Operator'}</span>
            </div>

            <div>
              <span className="text-[#6E8498] block text-[10px] uppercase">Assigned Operational Role</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {roleDisplayNames[user?.role] || user?.role || 'Unspecified Role'}
              </span>
            </div>

            <div>
              <span className="text-[#6E8498] block text-[10px] uppercase">Authorized Clearance Levels</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {allowedRoles.length > 0 ? (
                  allowedRoles.map((role) => (
                    <span
                      key={role}
                      className="px-1.5 py-0.5 rounded bg-[#43B8FF]/15 text-[#7BD0FF] border border-[#43B8FF]/30 text-[10px]"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-[#6E8498]">SuperAdmin Only</span>
                )}
              </div>
            </div>
          </div>

          {/* Incident Protocol Notification */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">info</span>
            <div>
              <span className="font-semibold block font-mono text-[11px]">COMMAND DIRECTIVE</span>
              <span>
                If your polar mission assignment requires elevated permissions for this module, request an operational clearance elevation from Station Commander Radhika Roy or the SuperAdmin console.
              </span>
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#43B8FF] hover:bg-[#43B8FF]/90 text-[#020914] font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(67,184,255,0.3)] active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">dashboard</span>
              <span>Return to Command Dashboard</span>
            </button>

            <button
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0e273e] hover:bg-[#143757] text-[#A9BDD0] hover:text-white border border-[rgba(130,190,225,0.25)] font-mono text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">switch_account</span>
              <span>Sign In with Elevated Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
