import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PolarisLogo from '../components/common/PolarisLogo';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [missionId, setMissionId] = useState('admin@polaris.aq');
  const [securityKey, setSecurityKey] = useState('Polaris@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('expedition');

  const roleProfiles = {
    expedition: {
      name: 'Expedition Manager',
      email: 'expeditions@polaris.aq',
      title: 'Expedition Manager Dispatch Profile',
      target: '/expeditions',
      desc: 'Authorizes field movements, monitors traverse biometrics, and coordinates multi-base scientific traverses.',
      icon: 'explore',
    },
    logistics: {
      name: 'Logistics Coordinator',
      email: 'logistics@polaris.aq',
      title: 'Logistics Coordinator Supply Profile',
      target: '/cargo',
      desc: 'Controls global multi-modal freight, cargo containers, vessel manifests, and cold-chain staging.',
      icon: 'local_shipping',
    },
    inventory: {
      name: 'Inventory Manager',
      email: 'inventory@polaris.aq',
      title: 'Inventory & Cryogenic Asset Profile',
      target: '/inventory',
      desc: 'Manages critical polar depot fuel reserves, spare assemblies, life-support hardware, and threshold alarms.',
      icon: 'inventory_2',
    },
    medical: {
      name: 'Medical / Safety Officer',
      email: 'medical@polaris.aq',
      title: 'Medical & Emergency Response Profile',
      target: '/emergency',
      desc: 'Monitors vital biosignals, hypothermia triage protocols, and dispatches SAR emergency broadcasts.',
      icon: 'emergency_share',
    },
    authority: {
      name: 'Viewer / Command Authority',
      email: 'admin@polaris.aq',
      title: 'Central Command Authority Profile',
      target: '/dashboard',
      desc: 'Full operational oversight of all 4 polar stations, automated state machine, and global DEFCON alert network.',
      icon: 'shield',
    },
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setMissionId(roleProfiles[roleKey].email);
    setSecurityKey('Polaris@2026');
    setError('');
  };

  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(missionId, securityKey);
      const targetRoute = roleProfiles[selectedRole]?.target || '/dashboard';
      navigate(targetRoute);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Terminal authentication failed. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCACAuth = () => {
    setMissionId('admin@polaris.aq');
    setSecurityKey('Polaris@2026');
    handleSignIn();
  };

  const handleInstantAdmin = async () => {
    setError('');
    setIsLoading(true);
    setMissionId('admin@polaris.aq');
    setSecurityKey('Polaris@2026');
    try {
      await login('admin@polaris.aq', 'Polaris@2026');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Instant Admin authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-polar-950 text-text-primary antialiased min-h-screen relative flex flex-col justify-between overflow-x-hidden select-none font-body">
      {/* Atmospheric Polar Aurora and Abyssal Lights */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-[20%] right-[-10%] w-[850px] h-[650px] rounded-full bg-aurora-500/10 blur-[140px] mix-blend-screen transform rotate-12 animate-pulse"
          style={{ animationDuration: '9s' }}
        />
        <div className="absolute top-[10%] -left-[15%] w-[900px] h-[700px] rounded-full bg-ice-500/15 blur-[160px] mix-blend-screen" />
        <div className="absolute -bottom-[25%] left-[20%] w-[1000px] h-[600px] rounded-full bg-polar-750/30 blur-[150px]" />
        {/* Tactical Radar Coordinate Grid Overlay */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(130, 190, 225, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(130, 190, 225, 0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Top System Telemetry Bar (Standalone Authentication Context) */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-border-default bg-surface-1 backdrop-blur-md">
        <PolarisLogo
          className="w-8 h-8"
          withText={true}
          subtitle="ARCTIC HIGH-LATITUDE OPERATIONAL SYSTEM"
          onClick={() => navigate('/')}
        />

        {/* Live Telemetry Status Readout & Instant Admin Beacon */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-surface-2 border border-border-default text-ice-300">
            <span className="w-2 h-2 rounded-full bg-aurora-400 shadow-[0_0_8px_rgba(41,214,176,0.8)] animate-ping" />
            <span>LAT: 78°13'N</span>
            <span className="text-text-muted">•</span>
            <span>MC_MURDO_GW: ONLINE</span>
            <span className="text-text-muted">•</span>
            <span className="text-aurora-400">ENC: AES-256-GCM</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container border border-border-default text-text-secondary">
            <span className="material-symbols-outlined text-[14px] text-ice-400">lock</span>
            <span>GATEWAY SECURE</span>
          </div>

          {/* Instant Admin Access Button */}
          <button
            type="button"
            onClick={handleInstantAdmin}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-950/80 to-[#0A2940] border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-rose-200 text-xs font-mono font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Authenticate instantly with verified SuperAdmin credentials via secure API"
          >
            <span className="material-symbols-outlined text-[16px] text-rose-400 animate-pulse">admin_panel_settings</span>
            <span>Instant Admin Access</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 text-[9px] uppercase tracking-wider">C2</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Centered Login Console Card (~440px max width) */}
        <div className="w-full max-w-[440px] rounded-xl bg-surface-1 backdrop-blur-[14px] border border-border-default shadow-[0_8px_32px_rgba(2,9,20,0.65)] p-6 sm:p-8 relative overflow-hidden transition-all duration-300 hover:border-border-strong">
          {/* Top Decorative Corner Brackets for Military Instrument Feel */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ice-400" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ice-400" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ice-400" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ice-400" />

          {/* Card Header: Insignia & Brand Description */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <PolarisLogo className="w-14 h-14" glow={true} />
            </div>
            <h1 className="font-headline text-lg font-bold text-ice-400 tracking-widest uppercase mb-0.5">POLARIS</h1>
            <p className="text-[10px] font-mono text-text-muted tracking-wider uppercase mb-3">
              Polar Logistics and Asset Resource Information System
            </p>
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-border-strong to-transparent mx-auto mb-3" />
            <h2 className="font-headline text-xl font-semibold text-text-primary">Welcome Back</h2>
            <p className="text-xs text-text-secondary mt-1">Sign in to continue to POLARIS Command Center</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/40 text-danger text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{error}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form className="space-y-4" onSubmit={handleSignIn}>
            {/* Input: Email or Mission ID */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
                <label className="text-text-secondary flex items-center gap-1.5" htmlFor="missionId">
                  <span className="material-symbols-outlined text-[13px] text-ice-400">badge</span>
                  EMAIL OR MISSION ID
                </label>
                <span className="text-text-muted">AUTH-ID: LEVEL 3+</span>
              </div>
              <div className="relative">
                <input
                  id="missionId"
                  type="text"
                  required
                  value={missionId}
                  onChange={(e) => setMissionId(e.target.value)}
                  placeholder="operator@polaris.aq"
                  className="w-full bg-polar-850 border border-border-default rounded-lg px-3.5 py-2.5 text-text-primary font-mono text-xs focus:border-border-focus focus:ring-1 focus:ring-border-focus outline-none transition-all placeholder:text-text-muted"
                />
                <div className="absolute right-3 top-2.5 text-ice-400 opacity-80 pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
              </div>
            </div>

            {/* Input: Security Passkey / Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
                <label className="text-text-secondary flex items-center gap-1.5" htmlFor="securityKey">
                  <span className="material-symbols-outlined text-[13px] text-ice-400">key</span>
                  SECURITY PASSKEY / PASSWORD
                </label>
                <a className="text-ice-300 hover:text-ice-200 transition-colors" href="#">Forgot key?</a>
              </div>
              <div className="relative">
                <input
                  id="securityKey"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  placeholder="Enter cryptographic key"
                  className="w-full bg-polar-850 border border-border-default rounded-lg pl-3.5 pr-10 py-2.5 text-text-primary font-mono text-xs focus:border-border-focus focus:ring-1 focus:ring-border-focus outline-none transition-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-ice-300 transition-colors p-0.5 focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Checkbox: Session Persistence */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded bg-polar-800 border border-border-default text-ice-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  Remember terminal session (12 hrs)
                </span>
              </label>
              <div className="flex items-center gap-1 text-[10px] font-mono text-aurora-400">
                <span className="w-1.5 h-1.5 rounded-full bg-aurora-400 shadow-[0_0_6px_rgba(41,214,176,0.6)]" />
                NODE SYNCED
              </div>
            </div>

            {/* Action Button: Primary Terminal Sign-In */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] hover:from-ice-400 hover:to-ice-500 text-polar-950 font-headline text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(40,169,245,0.4)] hover:shadow-[0_0_28px_rgba(40,169,245,0.6)] transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  terminal
                </span>
                <span>{isLoading ? 'Authenticating Terminal...' : 'Sign In to Terminal'}</span>
              </button>
            </div>

            {/* Visual Divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="w-full border-t border-border-default" />
              <span className="absolute bg-surface-2 px-3 text-[10px] font-mono text-text-muted tracking-widest border border-border-default rounded-full">
                OR SECURE CREDENTIAL
              </span>
            </div>

            {/* Secondary Action: CAC / Gov SSO */}
            <button
              type="button"
              onClick={handleCACAuth}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-border-strong text-text-primary text-xs transition-all duration-150 active:scale-[0.99] cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[18px] text-ice-400 group-hover:text-aurora-400 transition-colors">
                cloud_download
              </span>
              <span>Login via CAC / Government SSO (Quick Admin)</span>
            </button>
          </form>

          {/* Security Certification Footer */}
          <div className="mt-6 pt-4 border-t border-border-default text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-text-muted">
              <span className="material-symbols-outlined text-[14px] text-aurora-400">shield</span>
              <span>Secure government-grade operational access • FIPS 140-3 Validated</span>
            </div>
          </div>
        </div>

        {/* Below Card: Role-Based Access Control Preview Switcher */}
        <div className="w-full max-w-[760px] mt-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-mono">
            <span className="tracking-wider text-ice-400 uppercase">Role-Based Telemetry Routing</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-secondary">Select role to populate verified credentials</span>
          </div>

          {/* Role Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border-default">
            {Object.keys(roleProfiles).map((key) => {
              const role = roleProfiles[key];
              const isActive = selectedRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'text-ice-300 bg-surface-3 border border-border-strong shadow-[0_0_12px_rgba(40,169,245,0.25)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-1 border border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ice-400' : 'bg-slate-600'}`} />
                  <span>{role.name}</span>
                </button>
              );
            })}
          </div>

          {/* Informative Dynamic Tooltip Box */}
          <div className="mt-3 p-3.5 rounded-xl bg-surface-1/90 border border-border-default backdrop-blur-md text-left transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1.5 rounded bg-polar-800 border border-border-default text-ice-400">
                  <span className="material-symbols-outlined text-[16px]">
                    {roleProfiles[selectedRole].icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline text-sm font-semibold text-ice-200">
                      {roleProfiles[selectedRole].title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-aurora-500/10 text-aurora-400 border border-aurora-400/20">
                      TARGET: {roleProfiles[selectedRole].target}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {roleProfiles[selectedRole].desc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSignIn()}
                className="px-3 py-1.5 rounded-lg bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-400/40 text-xs font-mono whitespace-nowrap transition-all cursor-pointer"
              >
                Instant Access →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Security Strip */}
      <footer className="w-full border-t border-border-default bg-surface-1 py-3 px-6 text-center text-xs font-mono text-text-muted">
        <span>POLARIS OPERATIONAL COMMAND & LOGISTICS TELEMETRY GRID • BUILD 2026.04-REL</span>
      </footer>
    </div>
  );
};

export default LoginPage;
