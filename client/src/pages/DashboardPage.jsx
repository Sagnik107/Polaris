import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { recentEvents } = useSocket();

  const [loading, setLoading] = useState(true);
  const [selectedMapStation, setSelectedMapStation] = useState('maitri');
  const [activeMapView, setActiveMapView] = useState('iceShelf');
  const [data, setData] = useState({
    kpis: {
      expeditions: 3,
      personnel: 24,
      cargo: 12,
      alerts: 4,
    },
    expeditions: [],
    bases: [],
    cargos: [],
    incidents: [],
    readinessScore: 87,
  });

  const fetchDashboard = async () => {
    try {
      const [dashRes, expRes, basesRes, cargoRes, incRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/expeditions?limit=4'),
        api.get('/bases'),
        api.get('/cargo?limit=4'),
        api.get('/incidents?limit=4'),
      ]);

      setData({
        kpis: dashRes.data?.data?.kpis || {
          expeditions: 3,
          personnel: 24,
          cargo: 12,
          alerts: 4,
        },
        expeditions: expRes.data?.data || [],
        bases: basesRes.data?.data || [],
        cargos: cargoRes.data?.data || [],
        incidents: incRes.data?.data || [],
        readinessScore: dashRes.data?.data?.readinessScore || 87,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* Breadcrumbs & Tactical Command Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            <span>POLARIS C2</span>
            <span>/</span>
            <span>Operations & Command</span>
            <span>/</span>
            <span className="text-ice-400">Command Dashboard</span>
          </div>
          <h1 className="font-headline text-2xl lg:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
            <span>Polar Mission Command</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-aurora-500/10 text-aurora-400 border border-aurora-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-aurora-400 animate-pulse" />
              ALL SECTORS MONITORED
            </span>
          </h1>
        </div>

        {/* Header Quick Command Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboard()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-primary text-xs font-mono transition-all duration-150 backdrop-blur-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-ice-400 text-sm">refresh</span>
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={() => navigate('/expeditions')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 text-xs font-mono font-semibold hover:brightness-110 shadow-[0_0_16px_rgba(40,169,245,0.3)] transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-polar-950 text-base">add_circle</span>
            <span>Create Mission Order</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP KPI ROW (4 Reactive Cards) */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. ACTIVE EXPEDITIONS */}
        <div
          onClick={() => navigate('/expeditions')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-border-strong transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-ice-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">ACTIVE EXPEDITIONS</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-ice-400">
              <span className="material-symbols-outlined">explore</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.expeditions}
            </span>
            <span className="text-xs font-mono text-ice-300 font-medium">+1 in prep</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              2 On Schedule
            </span>
            <span className="text-warning">1 Weather Watch</span>
          </div>
        </div>

        {/* 2. PERSONNEL DEPLOYED */}
        <div
          onClick={() => navigate('/personnel')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-border-strong transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-aurora-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">PERSONNEL DEPLOYED</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-aurora-400">
              <span className="material-symbols-outlined">groups</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.personnel}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-aurora-500/10 text-aurora-400 border border-aurora-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-aurora-400" /> 100% TELEMETRY OK
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs text-text-secondary font-mono">
            <span>Maitri: <strong className="text-ice-300">14</strong></span>
            <span className="text-border-default">|</span>
            <span>Bharati: <strong className="text-ice-300">10</strong></span>
            <span className="text-border-default">|</span>
            <span className="text-aurora-400">Himadri: 0</span>
          </div>
        </div>

        {/* 3. CARGO IN TRANSIT */}
        <div
          onClick={() => navigate('/cargo')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-border-strong transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">CARGO IN TRANSIT</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-sky-500">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.cargo}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-ice-500/15 text-ice-300 border border-ice-500/30">
              2 priority resupply
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs text-text-secondary">
            <span>Vessel: RV Polar Star</span>
            <span className="font-mono text-ice-300">ETA 36h 40m</span>
          </div>
        </div>

        {/* 4. ACTIVE ALERTS */}
        <div
          onClick={() => navigate('/alerts')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-border-strong transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">ACTIVE ALERTS</span>
            <div className="p-2 rounded-lg bg-surface-container border border-warning/30 text-warning">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.alerts}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-warning/15 text-warning border border-warning/40">
              1 Critical weather, 3 Advisory
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs">
            <span className="text-danger flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
              Blizzard Cat 3
            </span>
            <span className="text-text-muted hover:text-text-primary cursor-pointer underline decoration-dotted">View All</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* GRID ROW 2: Expedition Readiness (Left) & Ongoing Expeditions (Right) */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Expedition Readiness Panel (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-5 flex flex-col justify-between shadow-sm">
          <div>
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-ice-400">speed</span>
                <h2 className="font-headline text-lg font-semibold text-text-primary">Expedition Readiness</h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-ice-300 border border-border-default">
                LIVE METRIC
              </span>
            </div>

            {/* Readiness Circular Gauge Area */}
            <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* High-precision SVG Gauge */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    className="text-surface-container-highest/40"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="66"
                    stroke="currentColor"
                    strokeWidth="12"
                  />
                  {/* Delayed arc (3%) */}
                  <circle
                    className="text-danger"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="66"
                    stroke="currentColor"
                    strokeDasharray="414.7"
                    strokeDashoffset="402.2"
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                  {/* At Risk arc (10%) */}
                  <circle
                    className="text-warning"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="66"
                    stroke="currentColor"
                    strokeDasharray="414.7"
                    strokeDashoffset="373.2"
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                  {/* Ready arc (87%) */}
                  <circle
                    className="filter drop-shadow-[0_0_8px_rgba(40,169,245,0.4)]"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="66"
                    stroke="url(#iceGradient)"
                    strokeDasharray="414.7"
                    strokeDashoffset="53.9"
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                  <defs>
                    <linearGradient id="iceGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#28A9F5" />
                      <stop offset="100%" stopColor="#29D6B0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Gauge Inner Data */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-text-primary font-mono tracking-tight">87%</span>
                  <span className="text-[11px] font-mono text-ice-300 uppercase tracking-widest font-semibold">READINESS</span>
                  <span className="text-[9px] text-text-muted font-mono">INDEX Q1-26</span>
                </div>
              </div>

              {/* Metric Breakdown */}
              <div className="flex flex-col gap-3 w-full sm:w-auto flex-1 max-w-xs">
                {/* Ready 87% */}
                <div className="p-2.5 rounded-lg bg-surface-container/60 border border-border-default">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="flex items-center gap-2 text-text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-ice-400" /> Ready
                    </span>
                    <span className="font-mono font-bold text-ice-300">87%</span>
                  </div>
                  <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ice-500 to-aurora-400 rounded-full" style={{ width: '87%' }} />
                  </div>
                </div>

                {/* At Risk 10% */}
                <div className="p-2.5 rounded-lg bg-surface-container/60 border border-border-default">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="flex items-center gap-2 text-text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" /> At Risk
                    </span>
                    <span className="font-mono font-bold text-warning">10%</span>
                  </div>
                  <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>

                {/* Delayed 3% */}
                <div className="p-2.5 rounded-lg bg-surface-container/60 border border-border-default">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="flex items-center gap-2 text-text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Delayed
                    </span>
                    <span className="font-mono font-bold text-danger">3%</span>
                  </div>
                  <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-danger rounded-full" style={{ width: '3%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Parameters Sub-bar */}
          <div className="pt-3 border-t border-border-default grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-surface-2">
              <span className="block text-[10px] text-text-muted font-mono">ENV INDEX</span>
              <span className="font-mono text-xs font-semibold text-aurora-400">OPTIMAL 0.82</span>
            </div>
            <div className="p-2 rounded bg-surface-2">
              <span className="block text-[10px] text-text-muted font-mono">CREW REST</span>
              <span className="font-mono text-xs font-semibold text-ice-300">94% ADMISSIBLE</span>
            </div>
            <div className="p-2 rounded bg-surface-2">
              <span className="block text-[10px] text-text-muted font-mono">EQUIP HEALTH</span>
              <span className="font-mono text-xs font-semibold text-warning">NOMINAL 91%</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Ongoing Expeditions List (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-5 flex flex-col justify-between shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-ice-400">navigation</span>
                <h2 className="font-headline text-lg font-semibold text-text-primary">Ongoing Expeditions</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-text-muted">3 OF 3 ACTIVE</span>
                <button
                  onClick={() => navigate('/expeditions')}
                  className="text-ice-400 hover:text-ice-200 flex items-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                </button>
              </div>
            </div>

            {/* Expedition Cards */}
            <div className="divide-y divide-border-default/60">
              {/* Expedition Item 1: INAE-2026 */}
              <div
                onClick={() => navigate('/expeditions/EXP-2026-001')}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-surface-container/30 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center text-ice-400 mt-0.5">
                    <span className="material-symbols-outlined">terrain</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-headline text-base font-bold text-text-primary tracking-wide">INAE-2026</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-aurora-500/10 text-aurora-400 border border-aurora-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-aurora-400" /> [ON TRACK]
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">East Antarctica Core Sampling Sector Bravo</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-text-muted mt-1">
                      <span>Lead: Dr. V. Sen</span>
                      <span>•</span>
                      <span>Personnel: 8</span>
                      <span>•</span>
                      <span>Sensors: 42 Active</span>
                    </div>
                  </div>
                </div>

                <div className="sm:w-48 flex flex-col items-end gap-1.5">
                  <div className="w-full flex justify-between text-xs font-mono">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-ice-300 font-semibold">75%</span>
                  </div>
                  <div className="w-full h-2 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-ice-400 rounded-full" style={{ width: '75%' }} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">ETA Destination: 4d 18h</span>
                </div>
              </div>

              {/* Expedition Item 2: LARSEM-2026 */}
              <div
                onClick={() => navigate('/expeditions/EXP-2026-002')}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-surface-container/30 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-warning/40 flex items-center justify-center text-warning mt-0.5">
                    <span className="material-symbols-outlined text-warning">ac_unit</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-headline text-base font-bold text-text-primary tracking-wide">LARSEM-2026</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-warning/15 text-warning border border-warning/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> [AT RISK]
                      </span>
                      <span className="text-[11px] text-danger font-mono font-medium">Blizzard delay</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">Larsemann Hills Structural Bedrock Survey</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-text-muted mt-1">
                      <span>Lead: K. Johansen</span>
                      <span>•</span>
                      <span>Personnel: 6</span>
                      <span>•</span>
                      <span className="text-danger">Wind: 74 kt gusts</span>
                    </div>
                  </div>
                </div>

                <div className="sm:w-48 flex flex-col items-end gap-1.5">
                  <div className="w-full flex justify-between text-xs font-mono">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-warning font-semibold">41%</span>
                  </div>
                  <div className="w-full h-2 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: '41%' }} />
                  </div>
                  <span className="text-[10px] text-warning font-mono">Sheltered at Refuge Pod 3</span>
                </div>
              </div>

              {/* Expedition Item 3: Bharati Resupply */}
              <div
                onClick={() => navigate('/cargo')}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-surface-container/30 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center text-aurora-400 mt-0.5">
                    <span className="material-symbols-outlined">deployed_code</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-headline text-base font-bold text-text-primary tracking-wide">Bharati Resupply</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-aurora-500/10 text-aurora-400 border border-aurora-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-aurora-400" /> [ON TRACK]
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">Antarctic Station Critical Fuel & Cryo-Logistics</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-text-muted mt-1">
                      <span>Convoy: Piston-Bully #4</span>
                      <span>•</span>
                      <span>Payload: 18.4 T</span>
                      <span>•</span>
                      <span className="text-aurora-400">Clear Corridor</span>
                    </div>
                  </div>
                </div>

                <div className="sm:w-48 flex flex-col items-end gap-1.5">
                  <div className="w-full flex justify-between text-xs font-mono">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-aurora-400 font-semibold">92%</span>
                  </div>
                  <div className="w-full h-2 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-aurora-400 rounded-full" style={{ width: '92%' }} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">Docking in 02h 15m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Expeditions Footer Action */}
          <div className="pt-3 border-t border-border-default flex justify-between items-center text-xs">
            <span className="text-text-muted font-mono">Showing 3 prioritized operational mission tracks</span>
            <button
              onClick={() => navigate('/expeditions')}
              className="text-ice-400 hover:text-ice-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Expedition Manifest</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* GRID ROW 3: Interactive Live Polar Base Map & Telemetry Feed */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Interactive Live Polar Base Map (8 Cols) */}
        <div className="lg:col-span-8 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-5 flex flex-col shadow-sm">
          {/* Map Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-border-default mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-ice-400">map</span>
              <div>
                <h2 className="font-headline text-lg font-semibold text-text-primary">Interactive Live Polar Base Map</h2>
                <p className="text-xs font-mono text-text-muted">Bathymetry 0.05m • Polar Radar Grid • Route Vectors</p>
              </div>
            </div>

            {/* Map Indicators & Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-2 border border-border-strong text-xs font-mono text-ice-300">
                <span className="material-symbols-outlined text-sm text-ice-400">thermostat</span>
                <span>MAITRI: -18°C</span>
              </div>
              <div className="flex items-center bg-surface-2 rounded-lg border border-border-default p-0.5 text-xs font-mono">
                <button
                  onClick={() => setActiveMapView('iceShelf')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'iceShelf' ? 'bg-ice-500/20 text-ice-300 border border-ice-500/40 font-semibold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Ice Shelf
                </button>
                <button
                  onClick={() => setActiveMapView('thermal')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'thermal' ? 'bg-ice-500/20 text-ice-300 border border-ice-500/40 font-semibold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Thermal
                </button>
                <button
                  onClick={() => setActiveMapView('satLink')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'satLink' ? 'bg-ice-500/20 text-ice-300 border border-ice-500/40 font-semibold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Sat Link
                </button>
              </div>
            </div>
          </div>

          {/* Polar Map Canvas Simulation */}
          <div className="relative w-full h-[460px] rounded-lg overflow-hidden bg-polar-950 border border-border-default flex items-center justify-center select-none">
            {/* Map Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBknbGQtC4bzeDYnXA6q5vxR5Aq6gMd_kddrlDxYnfuxVPiyastot2vQ76huCtvCWe5AW4WTGrCeb3MiK4AF-_2j2OKCkx4vsRZOv5dww_YYvRLgnsjhPe1Y6dvQvK70hNJOY23cmiVIzpFm6CsqxJ_spOhJ64KMmsE6xTBJQwdC-BtYz54nFVwKCtNJ-7JnWLCAo4m7rEaD03NW9MH-gYUdHhEPcjJtTGG_WGNt4wBwEGKIfz3y7_KNQ')",
              }}
            />

            {/* SVG Grid, Bathymetry Rings, Radar Sweep & Route Vectors */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="polarGridMap" patternUnits="userSpaceOnUse" width="40" height="40">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(130, 190, 225, 0.07)" strokeWidth="1" />
                </pattern>
                <linearGradient id="vectorRoute1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#43B8FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#29D6B0" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="vectorRoute2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F6C85F" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FF6678" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Coordinate Grid Overlay */}
              <rect width="100%" height="100%" fill="url(#polarGridMap)" />

              {/* Concentric Range Rings from Central Arctic Array */}
              <circle cx="50%" cy="50%" r="100" fill="none" stroke="rgba(67, 184, 255, 0.15)" strokeDasharray="4 4" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(67, 184, 255, 0.10)" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="260" fill="none" stroke="rgba(67, 184, 255, 0.06)" strokeDasharray="2 6" strokeWidth="1" />

              {/* Radar Beam Animation */}
              <g className="radar-beam">
                <line x1="50%" y1="50%" x2="50%" y2="0%" stroke="rgba(67, 184, 255, 0.35)" strokeWidth="1.5" />
                <path d="M 50% 50% L 50% 0% A 260 260 0 0 1 70% 8% Z" fill="rgba(67, 184, 255, 0.05)" />
              </g>

              {/* Mission Route Vectors */}
              <path d="M 280 180 Q 420 140 560 240" fill="none" stroke="url(#vectorRoute1)" strokeDasharray="6 4" strokeWidth="2.5" className="animate-pulse" />
              <path d="M 560 240 Q 640 280 720 330" fill="none" stroke="url(#vectorRoute2)" strokeDasharray="4 4" strokeWidth="2" />
              <path d="M 280 180 Q 330 90 460 70" fill="none" stroke="rgba(67, 184, 255, 0.4)" strokeDasharray="2 4" strokeWidth="1.5" />
            </svg>

            {/* Coordinate HUD Labels */}
            <div className="absolute top-3 left-4 font-mono text-[10px] text-text-muted space-y-0.5 pointer-events-none">
              <p>LAT: 70°45'58" S | LON: 11°44'09" E</p>
              <p>ELEV: 117m • ICE THICKNESS: 2,420m</p>
            </div>

            <div className="absolute bottom-3 left-4 flex items-center gap-4 text-xs font-mono text-text-muted pointer-events-none">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ice-400" /> Active Station</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Weather Contingency</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-aurora-400" /> Resupply Track</span>
            </div>

            {/* INTERACTIVE BASE NODE 1: MAITRI */}
            <div
              onClick={() => setSelectedMapStation('maitri')}
              className="absolute top-[170px] left-[260px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full bg-ice-400/20 animate-ping-slow" />
                <div className="absolute w-8 h-8 rounded-full bg-ice-400/30" />
                <div className="w-4 h-4 rounded-full bg-ice-400 border-2 border-polar-950 shadow-[0_0_12px_#43B8FF] z-10" />
              </div>
              <div className="absolute left-6 -top-4 whitespace-nowrap bg-surface-3/90 backdrop-blur-md border border-border-strong px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-ice-300">MAITRI BASE</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                </div>
                <div className="font-mono text-[10px] text-text-muted">
                  Crew: 14 • -18°C • 1012 hPa
                </div>
              </div>
            </div>

            {/* INTERACTIVE BASE NODE 2: BHARATI */}
            <div
              onClick={() => setSelectedMapStation('bharati')}
              className="absolute top-[230px] left-[550px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-10 h-10 rounded-full bg-aurora-400/25 animate-ping-slow" />
                <div className="w-3.5 h-3.5 rounded-full bg-aurora-400 border-2 border-polar-950 shadow-[0_0_12px_#29D6B0] z-10" />
              </div>
              <div className="absolute left-5 -top-3 whitespace-nowrap bg-surface-3/90 backdrop-blur-md border border-border-strong px-2.5 py-1 rounded-lg shadow-lg pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-aurora-400">BHARATI STATION</span>
                  <span className="text-[9px] px-1 rounded bg-aurora-400/20 text-aurora-300 font-mono">HUB</span>
                </div>
                <div className="font-mono text-[10px] text-text-muted">
                  Crew: 10 • -22°C • Resupply 92%
                </div>
              </div>
            </div>

            {/* INTERACTIVE BASE NODE 3: LARSEMANN HILLS */}
            <div
              onClick={() => setSelectedMapStation('larsemann')}
              className="absolute top-[320px] left-[710px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full bg-warning/30 animate-ping" />
                <div className="w-4 h-4 rounded-full bg-warning border-2 border-polar-950 shadow-[0_0_14px_#F6C85F] z-10 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-polar-950" />
                </div>
              </div>
              <div className="absolute left-6 -top-5 whitespace-nowrap bg-surface-3/95 backdrop-blur-md border border-warning/50 px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-warning">LARSEMANN HILLS</span>
                  <span className="text-[9px] font-mono text-danger px-1 bg-danger/20 rounded">BLIZZARD</span>
                </div>
                <div className="font-mono text-[10px] text-text-muted">
                  Crew: 6 (Sheltered) • -34°C • Wind 74kt
                </div>
              </div>
            </div>

            {/* INTERACTIVE BASE NODE 4: HIMADRI */}
            <div
              onClick={() => setSelectedMapStation('himadri')}
              className="absolute top-[65px] left-[450px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-ice-200 border border-polar-950 z-10" />
              </div>
              <div className="absolute left-4 -top-2 whitespace-nowrap bg-surface-2/90 backdrop-blur-md border border-border-default px-2 py-0.5 rounded text-[11px] font-mono text-text-secondary pointer-events-auto">
                HIMADRI (Automated Pod)
              </div>
            </div>

            {/* Zoom / Pan & Map Controls Floating HUD */}
            <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 bg-surface-2/90 backdrop-blur-md border border-border-default p-1 rounded-lg">
              <button className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" title="Zoom In">
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" title="Zoom Out">
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <div className="w-full h-px bg-border-default my-0.5" />
              <button className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" title="Reset Polar Center">
                <span className="material-symbols-outlined text-lg">my_location</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Activity & Telemetry Feed (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-5 flex flex-col justify-between shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-default mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">terminal</span>
                <h2 className="font-headline text-lg font-semibold text-text-primary">Live Activity Feed</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-mono text-aurora-400">
                <span className="w-1.5 h-1.5 rounded-full bg-aurora-400 animate-ping" />
                STREAMING
              </span>
            </div>

            {/* Feed Items List */}
            <div className="flex flex-col gap-3">
              {/* Event 1 */}
              <div className="p-3 rounded-lg bg-surface-2/80 border border-border-default hover:border-border-strong transition-all group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-aurora-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    CARGO ARRIVAL
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">14:26:18 UTC</span>
                </div>
                <p className="text-xs text-text-primary font-body">
                  Cargo container <strong className="font-mono text-ice-300">ATX-103</strong> cleared ice shelf staging at Maitri depot.
                </p>
                <div className="mt-2 pt-2 border-t border-border-default/50 flex justify-between text-[11px] font-mono text-text-muted">
                  <span>Manifest: Cold-Lab Spares</span>
                  <span className="text-success font-medium">Verified 100%</span>
                </div>
              </div>

              {/* Event 2 */}
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/30 hover:border-warning/60 transition-all group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-warning">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    DEPOT TELEMETRY
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">14:19:04 UTC</span>
                </div>
                <p className="text-xs text-text-primary font-body">
                  Auxiliary generator tank 3 fuel level below 15% threshold at <strong className="text-ice-300">Maitri Base</strong>.
                </p>
                <div className="mt-2 pt-2 border-t border-warning/20 flex justify-between text-[11px] font-mono">
                  <span className="text-warning">Auto-pump rerouted to Tank 1</span>
                  <button onClick={() => navigate('/inventory')} className="text-ice-300 hover:underline cursor-pointer">Dispatch Tanker</button>
                </div>
              </div>

              {/* Event 3 */}
              <div className="p-3 rounded-lg bg-surface-2/80 border border-border-default hover:border-border-strong transition-all group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-ice-400">
                    <span className="material-symbols-outlined text-sm">medical_services</span>
                    ASSET ALLOCATION
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">14:02:45 UTC</span>
                </div>
                <p className="text-xs text-text-primary font-body">
                  Trauma Medical Kit <strong className="font-mono text-ice-300">MED-ARC-9</strong> transfer authorized for INAE-2026 traverse team.
                </p>
                <div className="mt-2 pt-2 border-t border-border-default/50 flex justify-between text-[11px] font-mono text-text-muted">
                  <span>Sign-off: Dr. Rostova</span>
                  <span className="text-ice-300">Pod 02 Loaded</span>
                </div>
              </div>

              {/* Event 4 */}
              <div className="p-3 rounded-lg bg-surface-2/80 border border-border-default hover:border-border-strong transition-all group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-500">
                    <span className="material-symbols-outlined text-sm">satellite_alt</span>
                    SATCOM UPLINK
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">13:54:12 UTC</span>
                </div>
                <p className="text-xs text-text-primary font-body">
                  Iridium-Constellation array <strong className="font-mono text-ice-300">POLAR-SAT-4</strong> sync complete. 128 kbps telemetry locked.
                </p>
                <div className="mt-2 pt-2 border-t border-border-default/50 flex justify-between text-[11px] font-mono text-text-muted">
                  <span>Latency: 382ms</span>
                  <span className="text-success font-medium">Jitter: 4ms (Stable)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Footer Command Prompt */}
          <div className="pt-3 border-t border-border-default flex items-center justify-between mt-3">
            <span className="text-[11px] text-text-muted font-mono">Terminal buffer: 2,490 / 5,000</span>
            <button
              onClick={() => navigate('/alerts')}
              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-border-default text-text-primary text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">terminal</span>
              <span>Open Raw Console</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bottom System Status Bar */}
      <footer className="pt-4 pb-2 border-t border-border-default/70 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-text-muted gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            PRIMARY LINK: IRIDIUM NEXT-7
          </span>
          <span className="hidden md:inline text-border-default">|</span>
          <span className="hidden md:inline">ENCRYPTION: AES-256 POLAR SECURE</span>
          <span className="hidden md:inline text-border-default">|</span>
          <span className="hidden md:inline">NODE ID: C2-ARK-902</span>
        </div>
        <div className="flex items-center gap-2">
          <span>POLARIS C2 OPERATING SYSTEM © 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
