import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import EmergencyBanner from '../components/common/EmergencyBanner';
import Modal from '../components/common/Modal';

export const AppLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const { unreadAlertsCount, activeEmergency } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [utcTime, setUtcTime] = useState('14:28:09 UTC');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { label: 'Command Dashboard', path: '/dashboard', icon: 'dashboard', activeDot: true },
    { label: 'Expeditions', path: '/expeditions', icon: 'explore', badge: '3' },
    { label: 'Cargo Tracking', path: '/cargo', icon: 'local_shipping', badge: '12' },
    { label: 'Inventory & Assets', path: '/inventory', icon: 'inventory_2' },
    { label: 'Personnel', path: '/personnel', icon: 'badge', statusDot: true },
    { label: 'Base Management', path: '/bases', icon: 'domain' },
    { label: 'Emergency Center', path: '/emergency', icon: 'emergency', isDanger: true, badge: 'LVL 2' },
    { label: 'Tasks', path: '/tasks', icon: 'task_alt' },
    { label: 'Alerts & Analytics', path: '/alerts', icon: 'insights', badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : '4', isWarning: true },
    { label: 'Reports', path: '/reports', icon: 'description' },
  ];

  if (hasRole('SuperAdmin')) {
    navItems.push({ label: 'User Admin', path: '/users', icon: 'admin_panel_settings' });
  }

  // Quick search routes
  const searchResults = [
    { title: 'Command Dashboard', category: 'Module', path: '/dashboard' },
    { title: 'INAE-2026 Ice Shelf Core Sampling', category: 'Expeditions', path: '/expeditions' },
    { title: 'INAE-45 Wintering Research Mission', category: 'Expeditions', path: '/expeditions' },
    { title: 'Cargo CRG-2026-001 (Aviation Turbine Fuel)', category: 'Cargo', path: '/cargo' },
    { title: 'Cargo CRG-2026-002 (Crankshaft Replacement)', category: 'Cargo', path: '/cargo' },
    { title: 'Aviation Turbine Fuel Jet A-1', category: 'Inventory', path: '/inventory' },
    { title: 'Emergency Blood Plasma Vault', category: 'Inventory', path: '/inventory' },
    { title: 'PistenBully 300 PB300 Polar', category: 'Assets', path: '/assets' },
    { title: 'Station Prime Generator #1', category: 'Assets', path: '/assets' },
    { title: 'Maitri Station (Schirmacher Oasis)', category: 'Bases', path: '/bases' },
    { title: 'Bharati Station (Larsemann Hills)', category: 'Bases', path: '/bases' },
    { title: 'Himadri Station (Svalbard)', category: 'Bases', path: '/bases' },
    { title: 'Emergency Incident INC-2026-001', category: 'Emergency', path: '/emergency' },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#051422] text-[#F4F9FF] min-h-screen flex flex-col font-sans overflow-x-hidden antialiased selection:bg-[#28A9F5] selection:text-[#020914]">
      {/* ========================================================================= */}
      {/* LEFT TECHNICAL SIDEBAR (Direct from Stitch project) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col justify-between p-4 z-40 border-r border-[rgba(130,190,225,0.18)] bg-[rgba(8,30,48,0.92)] backdrop-blur-md">
        {/* Top Branding & Navigation Items */}
        <div className="flex flex-col gap-5">
          {/* SideNav Header & Insignia */}
          <div className="flex items-center gap-3 px-2 py-1 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-[rgba(12,39,60,0.96)] border border-[rgba(75,177,235,0.42)] flex items-center justify-center shadow-[0_0_12px_rgba(40,169,245,0.3)]">
              <span className="material-symbols-outlined text-[#43B8FF]">hub</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-widest text-[#43B8FF] font-['Space_Grotesk']">
                POLARIS
              </span>
              <span className="text-[10px] text-[#6E8498] tracking-wider font-mono">
                ARCTIC C2 INTEL v4.2
              </span>
            </div>
          </div>

          {/* Navigation Tab List */}
          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-240px)] pr-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                    isActive
                      ? 'bg-[rgba(12,39,60,0.96)] text-[#7BD0FF] border border-[rgba(75,177,235,0.42)] shadow-[0_0_16px_rgba(40,169,245,0.25)] font-medium'
                      : item.isDanger
                      ? 'text-[#A9BDD0] hover:text-[#FF6678] hover:bg-[rgba(7,24,39,0.82)] border border-transparent hover:border-[#FF6678]/30'
                      : 'text-[#A9BDD0] hover:text-[#F4F9FF] hover:bg-[rgba(7,24,39,0.82)] border border-transparent hover:border-[rgba(75,177,235,0.42)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-outlined ${
                        isActive
                          ? 'text-[#43B8FF]'
                          : item.isDanger
                          ? 'text-[#FF6678]'
                          : 'text-[#6E8498]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="tracking-wide flex-1 text-xs">{item.label}</span>

                    {/* Stitch Badges & Indicators */}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#43B8FF] shadow-[0_0_6px_#43B8FF]"></span>
                    )}
                    {item.statusDot && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#31D49A]"></span>
                    )}
                    {item.badge && !isActive && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          item.isDanger
                            ? 'bg-[#FF6678]/20 text-[#FF6678] border-[#FF6678]/40'
                            : item.isWarning
                            ? 'bg-[#F6C85F]/20 text-[#F6C85F] border-[#F6C85F]/40'
                            : 'bg-[#12212f] text-[#7BD0FF] border-[rgba(130,190,225,0.18)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom: CTA & System Utilities (Stitch design) */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
          {/* Emergency Dispatch Action Button */}
          <button
            onClick={() => navigate('/emergency')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[rgba(7,24,39,0.82)] border border-[#FF6678]/40 text-[#FF6678] hover:bg-[#FF6678] hover:text-[#020914] font-mono text-xs transition-all duration-150 shadow-[0_0_12px_rgba(255,102,120,0.15)] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">sos</span>
            <span>Emergency Dispatch</span>
          </button>

          {/* Sub-utilities (Help, Online Sync) */}
          <div className="flex items-center justify-between text-[#6E8498] px-1 text-[11px] font-mono">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 hover:text-[#7BD0FF] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              <span>Help</span>
            </button>
            <span className="text-[rgba(130,190,225,0.18)]">|</span>
            <div className="flex items-center gap-1.5 text-[#A9BDD0]">
              <span className="material-symbols-outlined text-sm text-[#31D49A] animate-spin" style={{ animationDuration: '10s' }}>
                sync
              </span>
              <span>Online Sync</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WRAPPER (Offset by Sidebar: 256px / 16rem) */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* ========================================================================= */}
        {/* TOP COMMAND BAR (Direct from Stitch project) */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-6 h-16 border-b border-[rgba(130,190,225,0.18)] bg-[rgba(7,24,39,0.82)] backdrop-blur-md shadow-sm">
          {/* Left: Mobile Toggle & Global Search */}
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#A9BDD0] hover:text-white"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8498] text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search: Base, expedition ID, asset code..."
                className="w-full pl-9 pr-12 py-1.5 rounded-lg bg-[#061827] border border-[rgba(130,190,225,0.18)] text-[#F4F9FF] placeholder-[#6E8498] font-mono text-xs focus:border-[#39B8FF] focus:outline-none focus:ring-1 focus:ring-[#39B8FF] transition-all duration-150"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-[#6E8498] bg-[#12212f] rounded border border-[rgba(130,190,225,0.18)]">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: UTC Clock, Action Icons, Role Switcher, Operator Profile */}
          <div className="flex items-center gap-4">
            {/* Live Precision UTC Clock */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1d2b] border border-[rgba(130,190,225,0.18)]">
              <span
                className="material-symbols-outlined text-[#43B8FF] text-sm animate-spin"
                style={{ animationDuration: '12s' }}
              >
                schedule
              </span>
              <span className="text-xs tracking-wider text-[#7BD0FF] font-mono">
                {utcTime}
              </span>
            </div>

            {/* Trailing System Actions */}
            <div className="flex items-center gap-1 border-x border-[rgba(130,190,225,0.18)] px-2 sm:px-3">
              <button
                onClick={() => navigate('/tasks')}
                className="p-1.5 rounded-lg text-[#6E8498] hover:text-[#F4F9FF] hover:bg-[#12212f] transition-all"
                title="Expedition Schedule"
              >
                <span className="material-symbols-outlined text-lg">calendar_month</span>
              </button>

              <button
                onClick={() => navigate('/alerts')}
                className="relative p-1.5 rounded-lg text-[#6E8498] hover:text-[#F4F9FF] hover:bg-[#12212f] transition-all"
                title="Notifications & Alerts"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                {unreadAlertsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF6678] shadow-[0_0_8px_#FF6678]"></span>
                )}
              </button>

              <button
                onClick={() => navigate('/analytics')}
                className="p-1.5 rounded-lg text-[#6E8498] hover:text-[#F4F9FF] hover:bg-[#12212f] transition-all"
                title="Telemetry Parameters"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
              </button>
            </div>

            {/* Role Switcher Pill */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#12212f] border border-[rgba(130,190,225,0.18)]">
              <span className="text-[10px] font-mono text-[#6E8498]">ROLE:</span>
              <span className="text-[10px] font-mono text-[#7BD0FF] font-semibold uppercase">
                {user?.role || 'EXPEDITION & BASE CMDR'}
              </span>
              <span className="material-symbols-outlined text-[#6E8498] text-sm">unfold_more</span>
            </div>

            {/* Operator Profile */}
            <div className="flex items-center gap-3 pl-1 sm:pl-2">
              <div className="flex flex-col text-right hidden md:flex">
                <span className="text-xs font-semibold text-[#F4F9FF] tracking-wide">
                  {user?.name || 'Cmdr. Elena Rostova'}
                </span>
                <span className="text-[10px] text-[#48E5C3] font-mono">
                  {user?.role || 'Expedition Command'}
                </span>
              </div>

              <div className="relative cursor-pointer" onClick={logout} title="Click to Sign Out">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[rgba(75,177,235,0.42)] shadow-[0_0_10px_rgba(40,169,245,0.3)] bg-[#0A2940] flex items-center justify-center font-bold text-xs text-[#7BD0FF]">
                  {user?.name ? user.name.charAt(0) : 'E'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#31D49A] border-2 border-[#020914]"></span>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN CONTENT CANVAS (1600px Max Fluid Responsive Container) */}
        {/* ========================================================================= */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
          <EmergencyBanner emergency={activeEmergency} />
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="POLARIS Global Telemetry Search">
        <div className="space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#6E8498]">search</span>
            <input
              type="text"
              placeholder="Search expeditions, cargo manifests, inventory, stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-sm text-[#F4F9FF] placeholder-[#6E8498] focus:outline-none focus:border-[#39B8FF] font-mono"
            />
          </div>

          <div className="divide-y divide-[rgba(130,190,225,0.1)] max-h-80 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsSearchOpen(false);
                  navigate(item.path);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded hover:bg-[#12212f] text-left transition-colors"
              >
                <span className="text-xs text-[#F4F9FF]">{item.title}</span>
                <span className="text-[10px] font-mono text-[#43B8FF] bg-[#0A2940] px-2 py-0.5 rounded border border-[#28A9F5]/30">
                  {item.category}
                </span>
              </button>
            ))}
            {searchResults.length === 0 && (
              <p className="text-xs text-[#6E8498] text-center py-6">No matching polar records found.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#020914]/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-[#082033] h-full p-4 flex flex-col z-10 border-r border-[rgba(130,190,225,0.18)]">
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(130,190,225,0.18)]">
              <span className="font-bold text-lg text-[#43B8FF] font-['Space_Grotesk']">POLARIS</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[#A9BDD0]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-[#A9BDD0] hover:bg-[#12212f]"
                >
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-[#FF6678] text-xs font-mono pt-4 border-t border-[rgba(130,190,225,0.18)]"
            >
              <span className="material-symbols-outlined text-sm">logout</span> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
