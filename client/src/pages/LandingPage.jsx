import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PolarisLogo from '../components/common/PolarisLogo';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('admin@polaris.aq');
  const [password, setPassword] = useState('Polaris@2026');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Broadcast Alert Notification State
  const [showAlertNotice, setShowAlertNotice] = useState(false);

  // Demo user presets for 1-click testing
  const demoUsers = [
    { label: 'SuperAdmin (Command)', email: 'admin@polaris.aq', pass: 'Polaris@2026' },
    { label: 'Expedition Mgr', email: 'expeditions@polaris.aq', pass: 'Polaris@2026' },
    { label: 'Logistics Coord', email: 'logistics@polaris.aq', pass: 'Polaris@2026' },
    { label: 'Base Officer (Maitri)', email: 'base.maitri@polaris.aq', pass: 'Polaris@2026' },
  ];

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      setShowLoginModal(false);
      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    login(demoEmail, demoPass)
      .then(() => {
        setShowLoginModal(false);
        navigate('/dashboard');
      })
      .catch((err) => {
        setLoginError(err.response?.data?.message || 'Login failed.');
      });
  };

  const scrollToTerminal = () => {
    const el = document.getElementById('platform-terminal');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-polar-950 text-text-primary antialiased selection:bg-ice-500 selection:text-polar-950 overflow-x-hidden min-h-screen relative font-sans text-sm">
      {/* CSS Radar and Grid Styles */}
      <style>{`
        .polar-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(130, 190, 225, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(130, 190, 225, 0.03) 1px, transparent 1px);
        }
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-radar {
          animation: radar-sweep 8s linear infinite;
        }
      `}</style>

      {/* Atmospheric Aurora Borealis Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="polar-grid absolute inset-0 opacity-80" />
        <div className="absolute -top-[20%] left-1/4 w-[700px] h-[550px] bg-aurora-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[10%] right-[5%] w-[550px] h-[450px] bg-ice-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-[45%] -left-[10%] w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[400px] bg-aurora-400/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 w-full h-16 border-b border-border-default bg-surface-1/90 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
            {/* Brand / Identity with Unified Polaris Insignia */}
            <PolarisLogo
              className="w-8 h-8"
              withText={true}
              subtitle="ARCTIC COMMAND &amp; CONTROL"
              onClick={() => navigate('/')}
            />

            {/* Center Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-primary border-b-2 border-primary font-medium text-xs py-1 transition-colors duration-150" href="#home">Home</a>
              <a className="text-text-muted hover:text-text-primary transition-colors duration-150 text-xs py-1" href="#about">About</a>
              <a className="text-text-muted hover:text-text-primary transition-colors duration-150 text-xs py-1" href="#features">Features</a>
              <a className="text-text-muted hover:text-text-primary transition-colors duration-150 text-xs py-1" href="#operations">Operations</a>
              <a className="text-text-muted hover:text-text-primary transition-colors duration-150 text-xs py-1" href="#contact">Contact</a>
            </nav>

            {/* Trailing Actions & Operator Login */}
            <div className="flex items-center gap-4">
              {/* Mission status indicator pill */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2 border border-border-default">
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(49,212,154,0.6)]" />
                <span className="font-mono text-[11px] text-text-secondary">DEFCON-5 // GRID NORMAL</span>
              </div>

              {/* Operator Login Button / User Profile */}
              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ice-300 hover:text-text-primary border border-border-strong text-xs font-mono transition-all duration-200"
                  >
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span>{user.name?.split(' ')[0] || user.role}</span>
                    <span className="material-symbols-outlined text-sm">dashboard</span>
                  </button>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('/', { replace: true });
                    }}
                    className="p-2 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-danger border border-border-default transition-colors text-xs"
                    title="Log Out"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="relative group flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ice-300 hover:text-text-primary border border-border-default hover:border-border-strong transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-ice-400 text-sm">lock</span>
                  <span className="font-mono text-xs tracking-wider">Operator Login</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center">
          {/* Hero Section */}
          <section id="home" className="w-full max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center relative">
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-2xl">
              <img
                className="w-full h-full object-cover opacity-35"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPe38DWWClvgBkSyXnlsTv79Ft4rpcVvlvFyKV6kuFgb7glbyKTUKpekox8Ig0z6-lqD4b71aCgWGzLk0A5DBOrsYCGQu1AVWGyct7zNu6UAMWzspqeOQrCQnTMCMZ4JzboNcm86q_CJp5YFC70cfSO7ErWr6YrlC_xSkHPqxL2NiEn6lbANUYJuoqVNZzHPAnY4adj5bOLtnHUh0vE02JuX74v6XAtasv-cROqGp9N2eT8ibi7MMPjA"
                alt="Polar expedition landscape background"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-polar-950/80 via-polar-950/60 to-polar-950" />
              <div className="absolute inset-0 bg-gradient-to-t from-polar-950 via-transparent to-polar-950/70" />
            </div>

            {/* Operational Breadcrumb / Sector Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border-strong mb-8 shadow-[0_0_14px_rgba(40,169,245,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-aurora-400" />
              <span className="font-mono text-[11px] text-aurora-400 tracking-wider">SYS ACTIVE • POLAR MISSION CONTROLLER v4.2</span>
              <span className="text-border-default">|</span>
              <span className="font-mono text-[11px] text-text-muted">77°51'S 166°40'E</span>
            </div>

            {/* Main Display Headline */}
            <h1 className="text-3xl md:text-5xl font-bold max-w-4xl tracking-tight text-text-primary mb-6 leading-tight">
              POLARIS Supporting Expeditions.<br className="hidden sm:inline" />{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ice-300 via-ice-400 to-aurora-400">
                Enabling Discoveries.
              </span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="text-base md:text-lg text-text-secondary max-w-2xl mb-10 leading-relaxed font-light">
              A unified operational platform for expedition management, cargo tracking, inventory, personnel and emergency response across the world's most challenging frontiers.
            </p>

            {/* CTA Action Cluster */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
              {/* Primary CTA */}
              <button
                onClick={() => {
                  if (user) {
                    navigate('/dashboard');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 hover:from-ice-400 hover:to-sky-400 text-polar-950 font-semibold tracking-wide shadow-[0_0_24px_rgba(40,169,245,0.45)] hover:shadow-[0_0_32px_rgba(40,169,245,0.65)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 text-base"
              >
                <span>{user ? 'Open Dashboard' : 'Get Started'}</span>
                <span className="material-symbols-outlined text-polar-950 font-bold text-lg">arrow_forward</span>
              </button>

              {/* Secondary CTA */}
              <button
                onClick={scrollToTerminal}
                className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-primary border border-border-default hover:border-border-strong backdrop-blur-md font-medium transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 text-base"
              >
                <span className="material-symbols-outlined text-ice-400 text-lg">terminal</span>
                <span>Explore Platform</span>
              </button>
            </div>

            {/* Minimal Horizontal Operational Feature Strip */}
            <div id="features" className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-border-default/60 py-6 bg-surface-1/40 backdrop-blur-sm px-4 rounded-xl">
              {/* Feature 1: SAFER EXPEDITIONS */}
              <div className="flex flex-col items-start text-left p-3 rounded-lg hover:bg-surface-1 transition-colors duration-150 border-l-2 border-aurora-500/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-aurora-400 text-[18px]">favorite</span>
                  <span className="font-mono text-xs text-ice-300 font-semibold tracking-wider">SAFER EXPEDITIONS</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Real-time biometric &amp; telemetry monitoring in sub-zero extremes
                </p>
              </div>

              {/* Feature 2: SMARTER LOGISTICS */}
              <div className="flex flex-col items-start text-left p-3 rounded-lg hover:bg-surface-1 transition-colors duration-150 border-l-2 border-ice-400/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-ice-400 text-[18px]">local_shipping</span>
                  <span className="font-mono text-xs text-ice-300 font-semibold tracking-wider">SMARTER LOGISTICS</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Dynamic trans-polar route calculation &amp; cargo integrity
                </p>
              </div>

              {/* Feature 3: STRONGER DECISIONS */}
              <div className="flex flex-col items-start text-left p-3 rounded-lg hover:bg-surface-1 transition-colors duration-150 border-l-2 border-sky-500/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-sky-500 text-[18px]">analytics</span>
                  <span className="font-mono text-xs text-ice-300 font-semibold tracking-wider">STRONGER DECISIONS</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Mission control intelligence with predictive weather &amp; fuel models
                </p>
              </div>
            </div>
          </section>

          {/* Platform Preview Frame: Miniature Polar Command Terminal */}
          <section id="platform-terminal" className="w-full max-w-7xl mx-auto px-6 pb-24">
            {/* Terminal Container */}
            <div className="relative rounded-2xl p-1 bg-gradient-to-b from-border-strong via-border-default/40 to-transparent shadow-[0_20px_50px_rgba(2,9,20,0.8)]">
              <div className="rounded-[14px] bg-polar-900 border border-border-default/80 backdrop-blur-xl overflow-hidden">
                {/* Terminal Title Bar / Status Header */}
                <div className="w-full px-5 py-3.5 bg-surface-2 border-b border-border-default flex items-center justify-between">
                  {/* Console Control Buttons & Title */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger/70 border border-danger/40" />
                      <div className="w-3 h-3 rounded-full bg-warning/70 border border-warning/40" />
                      <div className="w-3 h-3 rounded-full bg-success/70 border border-success/40" />
                    </div>
                    <div className="h-4 w-[1px] bg-border-default" />
                    <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                      <span className="material-symbols-outlined text-ice-400 text-sm">terminal</span>
                      <span className="tracking-wide">POLARIS // ARCTIC-C2 // TACTICAL CONSOLE - SECTOR ALPHA-09</span>
                    </div>
                  </div>

                  {/* Terminal Telemetry Indicators */}
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="hidden sm:flex items-center gap-2 text-text-muted">
                      <span>FREQ:</span>
                      <span className="text-text-primary">434.200 MHz</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-text-muted">
                      <span>SAT-LINK:</span>
                      <span className="text-aurora-400">IRIDIUM LOCK (99.8%)</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-0.5 rounded bg-surface-3 border border-border-strong text-ice-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-ice-400 animate-pulse" />
                      <span>LIVE RECON</span>
                    </div>
                  </div>
                </div>

                {/* Terminal Main Grid Body */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-polar-950/70">
                  {/* Left Panel: Active Polar Operations Map & Radar (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="relative h-[380px] rounded-xl border border-border-default bg-surface-2 overflow-hidden flex flex-col justify-between p-4">
                      {/* Simulated Topo Radar Map Graphic Background */}
                      <div className="absolute inset-0 z-0">
                        <img
                          className="w-full h-full object-cover opacity-35 mix-blend-screen"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhU8uwPU7UnWwh8V4jZ-cRzRcq93-BpmlNIpz_-U5p9ZUfHKPZBrA5n4U5qFD2zukiUDASdH76ejZjI8_yKuAp1UMV2ziTXBk0rUW3rRaga6UgRCPUBl2tkG8GKvX_9UmPSFILaT-ApqVKtL9lSeEluBUuEbb8jDRnQb-h2etICjC_-ilNC3zzXNgRyItn3dRhWjKFAa8V1Ax6TdTTDbzBgcPIKRksrq6yOqoZCqK3FD7Xqzqo1DEvZg"
                          alt="Photorealistic satellite radar topological map"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-polar-950 via-transparent to-transparent" />
                      </div>

                      {/* Radar sweep graphic layer */}
                      <div className="absolute right-12 top-12 w-48 h-48 rounded-full border border-ice-400/20 pointer-events-none hidden sm:block">
                        <div className="w-full h-full rounded-full border border-dashed border-ice-400/30 animate-radar" />
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-ice-400/20" />
                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-ice-400/20" />
                      </div>

                      {/* Top Bar inside Map */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface-3/90 backdrop-blur-md border border-border-strong">
                          <span className="material-symbols-outlined text-ice-400 text-sm">near_me</span>
                          <span className="font-mono text-xs text-text-primary">TRANS-ANTARCTIC TRAVERSE // ROUTE 04</span>
                        </div>
                        <span className="font-mono text-xs text-ice-300 bg-surface-2/80 px-2 py-0.5 rounded border border-border-default">
                          -42.4°C • WIND: 38kt SSE
                        </span>
                      </div>

                      {/* Center Active Asset Waypoints */}
                      <div className="relative z-10 flex flex-col gap-2 my-auto">
                        {/* Target Unit 1 */}
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-1/90 backdrop-blur-md border border-border-strong max-w-sm ml-4 shadow-[0_0_16px_rgba(40,169,245,0.2)]">
                          <div className="w-2.5 h-2.5 rounded-full bg-ice-400 animate-ping" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-text-primary">Expedition Unit Boreas-VII</span>
                              <span className="font-mono text-xs text-aurora-400">NOMINAL</span>
                            </div>
                            <div className="flex items-center gap-3 text-text-muted font-mono text-[11px] mt-0.5">
                              <span>CREW: 6 PAX</span>
                              <span>•</span>
                              <span>CARGO: 1,420kg</span>
                              <span>•</span>
                              <span>SPEED: 18 km/h</span>
                            </div>
                          </div>
                        </div>

                        {/* Target Unit 2 */}
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-1/80 backdrop-blur-md border border-border-default max-w-xs ml-12">
                          <div className="w-2 h-2 rounded-full bg-warning" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-text-primary">Autonomous Sled Alpha</span>
                              <span className="font-mono text-xs text-warning">CREVASSE FLAGGED</span>
                            </div>
                            <div className="text-text-muted font-mono text-[11px]">AUTOPILOT REROUTING (+4.2 km)</div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom HUD Status Bar */}
                      <div className="relative z-10 flex items-center justify-between text-text-muted font-mono text-xs bg-surface-2/90 backdrop-blur-md p-2 rounded-lg border border-border-default">
                        <span>COORDINATES: <span className="text-text-primary">82°04'12"S 104°18'30"W</span></span>
                        <span>ELEVATION: <span className="text-text-primary">2,840m ASL</span></span>
                        <span>ICE THICKNESS: <span className="text-ice-400">3.2m (SOLID)</span></span>
                      </div>
                    </div>

                    {/* Sub-strip Telemetry Gauges */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
                        <div className="font-mono text-[11px] text-text-muted mb-1">CONVOY FUEL RESERVE</div>
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-lg font-bold text-text-primary">87.4%</span>
                          <span className="font-mono text-xs text-success">+360 NM</span>
                        </div>
                        <div className="w-full h-1 bg-polar-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-ice-500 rounded-full" style={{ width: '87.4%' }} />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
                        <div className="font-mono text-[11px] text-text-muted mb-1">ATMOSPHERIC PRESSURE</div>
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-lg font-bold text-text-primary">982 hPa</span>
                          <span className="font-mono text-xs text-warning">STABLE</span>
                        </div>
                        <div className="w-full h-1 bg-polar-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-warning rounded-full" style={{ width: '65%' }} />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
                        <div className="font-mono text-[11px] text-text-muted mb-1">CREW BIOMETRIC AVG</div>
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-lg font-bold text-text-primary">74 BPM</span>
                          <span className="font-mono text-xs text-aurora-400">OPTIMAL</span>
                        </div>
                        <div className="w-full h-1 bg-polar-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-aurora-400 rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Mission Intelligence Feed & Diagnostics (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Cargo & Critical Inventory Card */}
                    <div className="p-4 rounded-xl bg-surface-2 border border-border-default flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-ice-400 text-sm">inventory_2</span>
                          <span className="text-sm font-semibold text-text-primary">CRITICAL EXPEDITION PAYLOAD</span>
                        </div>
                        <span className="font-mono text-[11px] text-ice-400 bg-ice-500/10 px-2 py-0.5 rounded border border-ice-500/20">
                          RFID SYNCED
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-2.5 rounded bg-surface-1 border border-border-default">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-aurora-400 text-sm">medical_services</span>
                            <div>
                              <div className="font-mono text-xs text-text-primary">Cryo-Plasma Kits &amp; Diagnostics</div>
                              <div className="font-mono text-[10px] text-text-muted">CONTAINER #CX-902 • TEMP: -78°C SEALED</div>
                            </div>
                          </div>
                          <span className="font-mono text-xs text-success">100% INTACT</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded bg-surface-1 border border-border-default">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-ice-400 text-sm">satellite_alt</span>
                            <div>
                              <div className="font-mono text-xs text-text-primary">Deep Core Thermal Drills (x2)</div>
                              <div className="font-mono text-[10px] text-text-muted">CONTAINER #DR-014 • TELEMETRY ONLINE</div>
                            </div>
                          </div>
                          <span className="font-mono text-xs text-ice-300">CALIBRATED</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Tactical Telemetry Event Feed */}
                    <div className="flex-1 p-4 rounded-xl bg-surface-2 border border-border-default flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-aurora-400 text-sm">monitoring</span>
                          <span className="text-sm font-semibold text-text-primary">MISSION TELEMETRY LOG</span>
                        </div>
                        <span className="font-mono text-[11px] text-text-muted">BUFFER: 256 EVT/S</span>
                      </div>

                      <div className="flex-1 font-mono text-xs space-y-2.5 text-text-secondary overflow-hidden">
                        <div className="flex items-start gap-2 border-b border-border-default/40 pb-2">
                          <span className="text-text-muted">21:44:02</span>
                          <span className="text-aurora-400">[RADIO]</span>
                          <span>McMurdo Station relay confirms storm front delta shift to 120km NNE.</span>
                        </div>
                        <div className="flex items-start gap-2 border-b border-border-default/40 pb-2">
                          <span className="text-text-muted">21:43:18</span>
                          <span className="text-ice-400">[ROUTER]</span>
                          <span>Traverse Unit Boreas-VII switched uplink to LEO Sat-4; latency: 42ms.</span>
                        </div>
                        <div className="flex items-start gap-2 border-b border-border-default/40 pb-2">
                          <span className="text-text-muted">21:41:50</span>
                          <span className="text-warning">[ICE-ICE]</span>
                          <span>Sub-surface acoustic scan indicates 1.2m crevasse bridging required at WP-12.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-text-muted">21:39:11</span>
                          <span className="text-text-primary">[DISPATCH]</span>
                          <span>Supply Drone Falcon-3 pre-flight thermal checks passed for Amundsen-Scott leg.</span>
                        </div>
                      </div>

                      {/* Quick Action Button in Console */}
                      <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between">
                        <span className="font-mono text-[11px] text-text-muted">ARCTIC DISPATCH PROTOCOL: STANDBY</span>
                        <button
                          onClick={() => {
                            setShowAlertNotice(true);
                            setTimeout(() => setShowAlertNotice(false), 4000);
                          }}
                          className="px-3 py-1.5 rounded bg-surface-3 hover:bg-surface-container text-ice-300 hover:text-text-primary border border-border-default text-xs font-medium flex items-center gap-1.5 transition-colors duration-150"
                        >
                          <span className="material-symbols-outlined text-xs">cell_tower</span>
                          <span>Broadcast Alert</span>
                        </button>
                      </div>

                      {showAlertNotice && (
                        <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/30 text-warning font-mono text-xs flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          <span>Priority flash broadcast dispatched to Polar C2 mesh grid.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terminal Footer Status Strip */}
                <div className="px-6 py-2.5 bg-polar-950 border-t border-border-default flex flex-wrap items-center justify-between font-mono text-xs text-text-muted">
                  <div className="flex items-center gap-4">
                    <span>ENCRYPTION: AES-256-GCM / QUANTUM-RESISTANT</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">DATA HARVEST RATE: 10.4 MB/S</span>
                  </div>
                  <div className="text-ice-400">CONNECTED TO POLARIS HIGH LATITUDE MESH NETWORK</div>
                </div>
              </div>
            </div>
          </section>

          {/* Trust & Standards Footer Section */}
          <footer className="w-full border-t border-border-default bg-surface-1 py-10 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <PolarisLogo className="w-6 h-6" glow={false} />
                <span className="text-sm font-semibold text-text-primary tracking-wider">POLARIS ARCTIC C2 OPERATIONS</span>
                <span className="text-border-default">|</span>
                <span className="text-text-muted text-xs">Standardized Antarctic &amp; Arctic Logistics Framework</span>
              </div>
              <div className="flex items-center gap-8 text-xs text-text-secondary">
                <a className="hover:text-text-primary transition-colors" href="#">Polar Security Protocols</a>
                <a className="hover:text-text-primary transition-colors" href="#">System Telemetry Specs</a>
                <a className="hover:text-text-primary transition-colors" href="#">IRIDIUM &amp; Starlink Bridge</a>
                <span className="text-text-muted">© 2026 POLARIS C2 Platform</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Operator Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-polar-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-surface-2 border border-border-strong shadow-[0_16px_50px_rgba(2,9,20,0.9)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-default">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border-strong flex items-center justify-center text-ice-400">
                  <span className="material-symbols-outlined text-base">lock</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-base">Operator Authentication</h3>
                  <p className="text-[11px] font-mono text-text-muted">POLARIS C2 // SECURE ACCESS GATEWAY</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Error Alert */}
            {loginError && (
              <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{loginError}</span>
              </div>
            )}

            {/* Direct Form */}
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Polar Access ID / Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@polaris.aq"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-1 border border-border-default text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-ice-400 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Security Passphrase</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-1 border border-border-default text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-ice-400 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 hover:from-ice-400 hover:to-sky-400 text-polar-950 font-semibold text-sm tracking-wide shadow-md transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-polar-950 animate-ping" />
                    <span>VERIFYING POLAR CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate Session</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo 1-Click Selectors */}
            <div className="mt-6 pt-4 border-t border-border-default">
              <span className="text-[11px] font-mono text-text-muted block mb-2">QUICK ACCESS PRESETS (DEMO ROLES):</span>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleQuickLogin(u.email, u.pass)}
                    className="p-2 rounded-lg bg-surface-1 hover:bg-surface-3 border border-border-default hover:border-ice-400/50 text-left transition-colors"
                  >
                    <div className="text-xs font-medium text-ice-300">{u.label}</div>
                    <div className="text-[10px] font-mono text-text-muted truncate">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Link to Full Login Page */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  navigate('/login');
                }}
                className="text-xs text-text-muted hover:text-ice-400 underline transition-colors"
              >
                Open Full Authentication Portal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
