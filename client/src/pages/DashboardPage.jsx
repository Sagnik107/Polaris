import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/common/Modal';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { recentEvents } = useSocket();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [syncToast, setSyncToast] = useState(null);

  // Map Controls State
  const [selectedMapStation, setSelectedMapStation] = useState('maitri');
  const [activeMapView, setActiveMapView] = useState('iceShelf'); // 'iceShelf' | 'thermal' | 'satLink'
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [stationHudOpen, setStationHudOpen] = useState(true);

  // Filter for Ongoing Expeditions
  const [expeditionFilter, setExpeditionFilter] = useState('ALL'); // 'ALL' | 'ON_TRACK' | 'AT_RISK'

  // Modals
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([
    '[00:00:01 UTC] POLARIS C2 Arctic Link initialized via IRIDIUM NEXT-7.',
    '[00:00:04 UTC] Sub-zero cryogenic telemetry linked: 4 stations, 1 mobile vessel.',
    '[00:00:12 UTC] Real-time bathymetry and radar scan feed online.',
    '[00:01:05 UTC] Automatic satellite pass scheduled in 14m 20s.',
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // New Mission Order Form State
  const [missionForm, setMissionForm] = useState({
    code: 'INAE-46',
    name: 'Amery Subglacial Core Extraction',
    baseName: 'Bharati Station',
    leadScientist: 'Dr. Rajesh Sharma',
    durationDays: 45,
    budget: 3500000,
    objective: 'Extract 150m subglacial ice core for paleoclimate CO2 isotope modeling.',
  });
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);

  // Tactical Emergency SITREP State
  const [sitrepSent, setSitrepSent] = useState(false);

  // Dashboard Data
  const [data, setData] = useState({
    kpis: {
      expeditions: 3,
      personnel: 124,
      cargo: 2,
      alerts: 4,
      planningExpeditions: 1,
      criticalAlerts: 1,
    },
    expeditions: [],
    bases: [],
    cargos: [],
    incidents: [],
    alerts: [],
    readinessScore: 87,
  });

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [dashRes, expRes, basesRes, cargoRes, incRes, alertRes] = await Promise.all([
        api.get('/dashboard').catch(() => ({ data: { success: false } })),
        api.get('/expeditions?limit=8').catch(() => ({ data: { success: false } })),
        api.get('/bases').catch(() => ({ data: { success: false } })),
        api.get('/cargo?limit=6').catch(() => ({ data: { success: false } })),
        api.get('/incidents?limit=4').catch(() => ({ data: { success: false } })),
        api.get('/alerts?limit=6').catch(() => ({ data: { success: false } })),
      ]);

      const dashData = dashRes.data?.data;
      const expeditionsList = expRes.data?.data || dashData?.activeExpeditionsList || [];
      const basesList = basesRes.data?.data || dashData?.bases || [];
      const cargosList = cargoRes.data?.data || [];
      const incidentsList = incRes.data?.data || [];
      const alertsList = alertRes.data?.data || dashData?.recentActivity || [];

      // Calculate dynamic readiness score
      let calculatedReadiness = dashData?.readinessScore || 87;
      if (expeditionsList.length > 0) {
        const sum = expeditionsList.reduce((acc, curr) => acc + (curr.readinessScore || 85), 0);
        calculatedReadiness = Math.round(sum / expeditionsList.length);
      }

      // Personnel total
      const totalPersonnel = basesList.reduce((acc, b) => acc + (b.currentPersonnel || 0), 0) || 124;

      setData({
        kpis: {
          expeditions: expeditionsList.filter(e => e.status === 'Active').length || dashData?.kpis?.expeditions || 3,
          activeExpeditions: expeditionsList.filter(e => e.status === 'Active').length || 3,
          personnel: totalPersonnel,
          cargo: cargosList.filter(c => c.status === 'InTransit' || c.status === 'Delayed').length || dashData?.kpis?.cargo || 2,
          alerts: alertsList.length || dashData?.kpis?.alerts || 4,
          planningExpeditions: expeditionsList.filter(e => e.status === 'Planning').length || 1,
          criticalAlerts: alertsList.filter(a => a.severity === 'Critical').length || 1,
        },
        expeditions: expeditionsList,
        bases: basesList,
        cargos: cargosList,
        incidents: incidentsList,
        alerts: alertsList,
        readinessScore: calculatedReadiness,
      });

      const now = new Date().toISOString().substring(11, 19) + ' UTC';
      setLastSyncTime(now);

      if (isManual) {
        setSyncToast(`Telemetry Synchronized at ${now}`);
        setTimeout(() => setSyncToast(null), 3500);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => fetchDashboard(false), 30000);
    return () => clearInterval(timer);
  }, []);

  // Update terminal when recent socket events arrive
  useEffect(() => {
    if (recentEvents && recentEvents.length > 0) {
      const latest = recentEvents[0];
      setTerminalLogs(prev => [
        `[${latest.time || 'LIVE'}] ${latest.title}`,
        ...prev.slice(0, 40)
      ]);
    }
  }, [recentEvents]);

  // Handle Mission Creation
  const handleCreateMission = async (e) => {
    e.preventDefault();
    setIsSubmittingMission(true);
    try {
      const payload = {
        code: missionForm.code,
        name: missionForm.name,
        baseName: missionForm.baseName,
        status: 'Active',
        readinessScore: 92,
        riskLevel: 'Low',
        progress: 10,
        startDate: new Date(),
        endDate: new Date(Date.now() + (missionForm.durationDays || 30) * 86400000),
        objectives: [missionForm.objective],
        milestones: [{ title: 'Deployment & Sensor Drop', dueDate: new Date().toISOString().substring(0, 10), status: 'InProgress' }],
        budget: { allocated: parseInt(missionForm.budget) || 2000000, spent: 250000 },
        aiRiskPrediction: 'Weather window optimal. Departure authorized.',
      };

      await api.post('/expeditions', payload).catch(() => null);

      // Optimistic local update
      setData(prev => ({
        ...prev,
        expeditions: [payload, ...prev.expeditions],
        kpis: {
          ...prev.kpis,
          expeditions: prev.kpis.expeditions + 1,
        }
      }));

      setIsMissionModalOpen(false);
      setSyncToast(`Mission Order ${missionForm.code} Successfully Deployed!`);
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Failed to create mission:', err);
    } finally {
      setIsSubmittingMission(false);
    }
  };

  // Station Telemetry database
  const stationMetadata = {
    maitri: {
      name: 'Maitri Station',
      code: 'MAITRI',
      coords: '70°45\'58" S, 11°44\'09" E',
      type: 'Permanent Antarctic Station',
      temp: '-18°C',
      wind: '24 kt ENE',
      pressure: '1012 hPa',
      crew: 38,
      capacity: 65,
      power: 'Generator #1 (Maintenance) / #2 Active (92kW)',
      fuel: '84,500 L (Pour Point -45°C Diesel)',
      status: 'Advisory Alert (Blizzard Approaching)',
      statusColor: 'text-warning',
    },
    bharati: {
      name: 'Bharati Station',
      code: 'BHARATI',
      coords: '69°24\'25" S, 76°11\'28" E',
      type: 'Modern Energy-Efficient Hub',
      temp: '-22°C',
      wind: '18 kt S',
      pressure: '1008 hPa',
      crew: 44,
      capacity: 72,
      power: 'Wind Turbine Farm + Combined Heat & Power (Nominal)',
      fuel: '112,000 L In Stock (Resupply Convoy En Route)',
      status: '100% Operational',
      statusColor: 'text-aurora-400',
    },
    larsemann: {
      name: 'Larsemann Hills Field Array',
      code: 'REFUGE-POD',
      coords: '69°23\'40" S, 76°08\'15" E',
      type: 'Automated Scientific Refuge Pod',
      temp: '-34°C',
      wind: '74 kt Gale',
      pressure: '988 hPa',
      crew: 6,
      capacity: 12,
      power: 'Micro-Turbine & Solar Bank (Emergency Mode)',
      fuel: 'Emergency Reserve 4,200 L',
      status: 'GALE SHELTER PROTOCOL',
      statusColor: 'text-danger',
    },
    himadri: {
      name: 'Himadri Station',
      code: 'HIMADRI',
      coords: '78°55\'26" N, 11°55\'41" E',
      type: 'Arctic Research Station (Svalbard)',
      temp: '-8°C',
      wind: '12 kt NW',
      pressure: '1016 hPa',
      crew: 14,
      capacity: 25,
      power: 'Grid Power via Ny-Ålesund Hydro-Thermal Link',
      fuel: '16,000 L Backup Vault',
      status: 'Nominal Research Operations',
      statusColor: 'text-aurora-400',
    },
    rvBharati: {
      name: 'RV Bharati Research Vessel',
      code: 'RV-BHARATI',
      coords: '65°12\'00" S, 45°18\'00" E',
      type: 'Ice-Class Mobile Polar Vessel',
      temp: '-4°C',
      wind: '32 kt WSW',
      pressure: '996 hPa',
      crew: 28,
      capacity: 50,
      power: 'Twin Marine Diesels 4,800 kW',
      fuel: 'Marine Gas Oil 680,000 L',
      status: 'Sea-Ice Transit Corridor',
      statusColor: 'text-ice-300',
    },
  };

  const selectedStation = stationMetadata[selectedMapStation] || stationMetadata.maitri;

  // Filtered Expeditions
  const filteredExpeditions = (data.expeditions || []).filter(exp => {
    if (expeditionFilter === 'ALL') return true;
    if (expeditionFilter === 'ON_TRACK') return exp.riskLevel !== 'High' && exp.riskLevel !== 'Critical';
    if (expeditionFilter === 'AT_RISK') return exp.riskLevel === 'High' || exp.riskLevel === 'Critical';
    return true;
  });

  // Calculate SVG arc for circular readiness gauge
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69
  const readinessPercent = Math.min(Math.max(data.readinessScore || 87, 0), 100);
  const strokeOffset = circumference - (circumference * readinessPercent) / 100;

  // Active Incident Data
  const activeIncident = data.incidents?.find(i => i.status === 'Responding' || i.status === 'Reported' || i.severity === 'Critical') || {
    incidentNumber: 'INC-2026-001',
    title: 'Catastrophic Gale & Generator #1 Overheat Alarm',
    description: 'Sudden wind gusts of 68 knots accompanied by ambient -44°C temp caused turbine icing and tripped secondary generator at Maitri Station.',
    severity: 'Critical',
    status: 'Responding',
    location: 'Maitri Station - Power Generation Bay 2',
  };

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* Toast Alert for Telemetry or Mission Actions */}
      {syncToast && (
        <div className="fixed top-20 right-6 z-50 rounded-lg bg-[#0e2c44] border border-[#43B8FF] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[#31D49A] text-lg">check_circle</span>
          <span className="text-xs font-mono text-[#F4F9FF]">{syncToast}</span>
        </div>
      )}

      {/* Breadcrumbs & Tactical Command Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            <span className="cursor-pointer hover:text-text-primary" onClick={() => navigate('/dashboard')}>POLARIS C2</span>
            <span>/</span>
            <span>Operations & Command</span>
            <span>/</span>
            <span className="text-ice-400 font-semibold">Command Dashboard</span>
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
          {lastSyncTime && (
            <span className="hidden md:inline text-[11px] font-mono text-text-muted">
              Sync: <strong className="text-ice-300">{lastSyncTime}</strong>
            </span>
          )}
          <button
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-primary text-xs font-mono transition-all duration-150 backdrop-blur-md cursor-pointer active:scale-95 disabled:opacity-50"
            title="Force refresh telemetry from all stations"
          >
            <span className={`material-symbols-outlined text-ice-400 text-sm ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Telemetry'}</span>
          </button>
          
          <button
            onClick={() => setIsMissionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 text-xs font-mono font-bold hover:brightness-110 shadow-[0_0_16px_rgba(40,169,245,0.3)] transition-all duration-150 active:scale-95 cursor-pointer"
            title="Deploy new polar mission order"
          >
            <span className="material-symbols-outlined text-polar-950 text-base">add_circle</span>
            <span>Create Mission Order</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TACTICAL EMERGENCY PROTOCOL WIDGET (Direct Action Banner) */}
      {/* ========================================================================= */}
      {activeIncident && (
        <div className="rounded-xl bg-gradient-to-r from-danger/20 via-danger/10 to-surface-1 border border-danger/40 p-4 shadow-[0_0_20px_rgba(255,102,120,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 border border-danger/50 flex items-center justify-center text-danger shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-xl animate-pulse">crisis_alert</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-danger text-polar-950 text-[10px] font-mono font-bold tracking-wider uppercase">
                  ACTIVE PRIORITY EMERGENCY
                </span>
                <span className="font-mono text-xs font-bold text-danger">{activeIncident.incidentNumber}</span>
                <span className="text-xs text-text-muted">• {activeIncident.location || 'Maitri Station'}</span>
              </div>
              <h3 className="text-sm font-bold text-text-primary mt-1">
                {activeIncident.title}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">
                {activeIncident.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                setSitrepSent(true);
                setSyncToast('Priority SITREP broadcasted across all Polar C2 nodes!');
                setTimeout(() => setSyncToast(null), 4000);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default text-text-primary text-xs font-mono transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-ice-400">send</span>
              <span>{sitrepSent ? 'SITREP Sent ✓' : 'Dispatch SITREP'}</span>
            </button>
            <button
              onClick={() => navigate('/emergency')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-danger hover:bg-danger/90 text-polar-950 font-bold text-xs font-mono shadow-[0_0_12px_rgba(255,102,120,0.3)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">shield</span>
              <span>Command Protocol</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP KPI ROW (4 Reactive Interactive Cards) */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. ACTIVE EXPEDITIONS */}
        <div
          onClick={() => navigate('/expeditions')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-ice-400/60 hover:shadow-[0_0_16px_rgba(40,169,245,0.2)] transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-ice-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">ACTIVE EXPEDITIONS</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-ice-400 group-hover:border-ice-400/40">
              <span className="material-symbols-outlined">explore</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.expeditions}
            </span>
            <span className="text-xs font-mono text-ice-300 font-medium">
              +{data.kpis.planningExpeditions || 1} in prep
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              2 On Schedule
            </span>
            <span className="text-warning flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              1 Weather Watch
            </span>
          </div>
        </div>

        {/* 2. PERSONNEL DEPLOYED */}
        <div
          onClick={() => navigate('/personnel')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-aurora-400/60 hover:shadow-[0_0_16px_rgba(49,212,154,0.2)] transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-aurora-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">PERSONNEL DEPLOYED</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-aurora-400 group-hover:border-aurora-400/40">
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
            <span>Maitri: <strong className="text-ice-300">38</strong></span>
            <span className="text-border-default">|</span>
            <span>Bharati: <strong className="text-ice-300">44</strong></span>
            <span className="text-border-default">|</span>
            <span className="text-aurora-400">Himadri: 14</span>
            <span className="text-border-default">|</span>
            <span className="text-ice-200">RV: 28</span>
          </div>
        </div>

        {/* 3. CARGO IN TRANSIT */}
        <div
          onClick={() => navigate('/cargo')}
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-sky-400/60 hover:shadow-[0_0_16px_rgba(57,184,255,0.2)] transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">CARGO IN TRANSIT</span>
            <div className="p-2 rounded-lg bg-surface-container border border-border-default text-sky-500 group-hover:border-sky-400/40">
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
          className="relative overflow-hidden rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-4 shadow-sm hover:border-warning/60 hover:shadow-[0_0_16px_rgba(246,200,95,0.2)] transition-all duration-200 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">ACTIVE ALERTS</span>
            <div className="p-2 rounded-lg bg-surface-container border border-warning/30 text-warning group-hover:border-warning">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-bold text-text-primary font-mono leading-none">
              {data.kpis.alerts}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-warning/15 text-warning border border-warning/40">
              {data.kpis.criticalAlerts || 1} Critical, 3 Advisory
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs">
            <span className="text-danger flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
              Blizzard Cat 3
            </span>
            <span className="text-ice-400 hover:text-ice-200 font-mono underline decoration-dotted">View All Center →</span>
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
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-ice-300 border border-border-default flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#31D49A] animate-pulse" />
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
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                  />
                  {/* Ready dynamic arc */}
                  <circle
                    className="filter drop-shadow-[0_0_8px_rgba(40,169,245,0.4)] transition-all duration-1000 ease-out"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r={radius}
                    stroke="url(#iceGradientDynamic)"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                  <defs>
                    <linearGradient id="iceGradientDynamic" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#28A9F5" />
                      <stop offset="100%" stopColor="#29D6B0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Gauge Inner Data */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-text-primary font-mono tracking-tight">{readinessPercent}%</span>
                  <span className="text-[11px] font-mono text-ice-300 uppercase tracking-widest font-semibold">READINESS</span>
                  <span className="text-[9px] text-text-muted font-mono">INDEX Q1-26</span>
                </div>
              </div>

              {/* Metric Breakdown */}
              <div className="flex flex-col gap-3 w-full sm:w-auto flex-1 max-w-xs">
                {/* Ready */}
                <div className="p-2.5 rounded-lg bg-surface-container/60 border border-border-default">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="flex items-center gap-2 text-text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-ice-400" /> Ready
                    </span>
                    <span className="font-mono font-bold text-ice-300">{readinessPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ice-500 to-aurora-400 rounded-full transition-all duration-1000" style={{ width: `${readinessPercent}%` }} />
                  </div>
                </div>

                {/* At Risk */}
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

                {/* Delayed */}
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
            <div 
              onClick={() => navigate('/analytics')}
              className="p-2 rounded bg-surface-2 hover:bg-surface-3 cursor-pointer transition-colors"
              title="Click to view Environmental analytics"
            >
              <span className="block text-[10px] text-text-muted font-mono">ENV INDEX</span>
              <span className="font-mono text-xs font-semibold text-aurora-400">OPTIMAL 0.82</span>
            </div>
            <div 
              onClick={() => navigate('/personnel')}
              className="p-2 rounded bg-surface-2 hover:bg-surface-3 cursor-pointer transition-colors"
              title="Click to view crew duty roster"
            >
              <span className="block text-[10px] text-text-muted font-mono">CREW REST</span>
              <span className="font-mono text-xs font-semibold text-ice-300">94% ADMISSIBLE</span>
            </div>
            <div 
              onClick={() => navigate('/assets')}
              className="p-2 rounded bg-surface-2 hover:bg-surface-3 cursor-pointer transition-colors"
              title="Click to view generator & fleet health"
            >
              <span className="block text-[10px] text-text-muted font-mono">EQUIP HEALTH</span>
              <span className="font-mono text-xs font-semibold text-warning">NOMINAL 91%</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Ongoing Expeditions List (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default p-5 flex flex-col justify-between shadow-sm">
          <div>
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-default">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-ice-400">navigation</span>
                <h2 className="font-headline text-lg font-semibold text-text-primary">Ongoing Expeditions</h2>
              </div>
              
              {/* Interactive Filter Pills */}
              <div className="flex items-center bg-surface-2 p-0.5 rounded-lg border border-border-default text-xs font-mono">
                <button
                  onClick={() => setExpeditionFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    expeditionFilter === 'ALL' ? 'bg-ice-500/20 text-ice-300 font-semibold border border-ice-500/30' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  All ({data.expeditions.length || 3})
                </button>
                <button
                  onClick={() => setExpeditionFilter('ON_TRACK')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    expeditionFilter === 'ON_TRACK' ? 'bg-aurora-500/20 text-aurora-400 font-semibold border border-aurora-500/30' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  On Track
                </button>
                <button
                  onClick={() => setExpeditionFilter('AT_RISK')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    expeditionFilter === 'AT_RISK' ? 'bg-warning/20 text-warning font-semibold border border-warning/30' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  At Risk
                </button>
              </div>
            </div>

            {/* Expedition Cards */}
            <div className="divide-y divide-border-default/60">
              {filteredExpeditions.slice(0, 3).map((exp) => (
                <div
                  key={exp._id || exp.code}
                  onClick={() => navigate(`/expeditions/${exp._id || ''}`)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-surface-container/30 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-surface-2 border flex items-center justify-center mt-0.5 ${
                      exp.riskLevel === 'High' || exp.riskLevel === 'Critical' ? 'border-warning/40 text-warning' : 'border-border-default text-ice-400'
                    }`}>
                      <span className="material-symbols-outlined">{exp.riskLevel === 'High' ? 'warning' : 'terrain'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-headline text-base font-bold text-text-primary tracking-wide">{exp.code}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          exp.riskLevel === 'High' || exp.riskLevel === 'Critical' ? 'bg-warning/15 text-warning border-warning/40' : 'bg-aurora-500/10 text-aurora-400 border-aurora-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${exp.riskLevel === 'High' ? 'bg-warning animate-pulse' : 'bg-aurora-400'}`} /> 
                          [{exp.riskLevel === 'High' ? 'AT RISK' : 'ON TRACK'}]
                        </span>
                        {exp.riskLevel === 'High' && (
                           <span className="text-[11px] text-danger font-mono font-medium">Delay Predicted</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{exp.name}</p>
                      <div className="flex items-center gap-4 text-xs font-mono text-text-muted mt-1">
                        <span>Base: {exp.baseName || (exp.destinationBase?.name) || 'Bharati Station'}</span>
                        <span>•</span>
                        <span className={exp.riskLevel === 'High' ? "text-warning" : "text-aurora-400"}>
                          {exp.aiRiskPrediction || 'Clear Corridor'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-48 flex flex-col items-end gap-1.5">
                    <div className="w-full flex justify-between text-xs font-mono">
                      <span className="text-text-muted">Progress</span>
                      <span className={`${exp.riskLevel === 'High' ? 'text-warning' : 'text-ice-300'} font-semibold`}>{exp.progress || exp.readinessScore || 75}%</span>
                    </div>
                    <div className="w-full h-2 bg-polar-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${exp.riskLevel === 'High' ? 'bg-warning' : 'bg-ice-400'}`} style={{ width: `${exp.progress || exp.readinessScore || 75}%` }} />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">{exp.milestones?.[0]?.title || 'Deploying'}</span>
                  </div>
                </div>
              ))}
              
              {filteredExpeditions.length === 0 && (
                <div className="py-8 text-center text-text-muted font-mono text-sm">
                  No active expeditions matching current filter criteria.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Expeditions Footer Action */}
          <div className="pt-3 border-t border-border-default flex justify-between items-center text-xs">
            <span className="text-text-muted font-mono">Showing {Math.min(filteredExpeditions.length, 3)} operational mission tracks</span>
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
                <p className="text-xs font-mono text-text-muted">
                  Zoom: {zoomLevel.toFixed(2)}x • Mode: <strong className="text-ice-300 uppercase">{activeMapView}</strong> • Polar Radar Grid
                </p>
              </div>
            </div>

            {/* Map Indicators & Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div 
                onClick={() => {
                  setSelectedMapStation('maitri');
                  setStationHudOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-border-strong text-xs font-mono text-ice-300 cursor-pointer hover:border-ice-400 transition-colors"
                title="Click to open Maitri Station telemetry"
              >
                <span className="material-symbols-outlined text-sm text-ice-400">thermostat</span>
                <span>MAITRI: -18°C</span>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-surface-2 rounded-lg border border-border-default p-0.5 text-xs font-mono">
                <button
                  onClick={() => setActiveMapView('iceShelf')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'iceShelf' ? 'bg-ice-500/20 text-ice-300 border border-ice-500/40 font-semibold shadow-[0_0_10px_rgba(40,169,245,0.2)]' : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Cryosphere bathymetry and ice-shelf vectors"
                >
                  Ice Shelf
                </button>
                <button
                  onClick={() => setActiveMapView('thermal')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'thermal' ? 'bg-warning/20 text-warning border border-warning/40 font-semibold shadow-[0_0_10px_rgba(246,200,95,0.2)]' : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Infrared heat-signature telemetry"
                >
                  Thermal
                </button>
                <button
                  onClick={() => setActiveMapView('satLink')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    activeMapView === 'satLink' ? 'bg-aurora-500/20 text-aurora-400 border border-aurora-500/40 font-semibold shadow-[0_0_10px_rgba(49,212,154,0.2)]' : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Orbital satellite communication links"
                >
                  Sat Link
                </button>
              </div>
            </div>
          </div>

          {/* Polar Map Canvas Simulation with Real Zooming */}
          <div className="relative w-full h-[470px] rounded-lg overflow-hidden bg-polar-950 border border-border-default flex items-center justify-center select-none">
            {/* Transformable Canvas Container based on zoomLevel */}
            <div 
              className="absolute inset-0 transition-transform duration-300 ease-out origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Map Background Satellite Texture */}
              <div
                className={`absolute inset-0 bg-cover bg-center transition-all duration-500 ${
                  activeMapView === 'thermal' 
                    ? 'opacity-60 saturate-200 hue-rotate-15 filter contrast-125' 
                    : activeMapView === 'satLink'
                    ? 'opacity-30 hue-rotate-90 filter'
                    : 'opacity-40 mix-blend-screen'
                }`}
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBknbGQtC4bzeDYnXA6q5vxR5Aq6gMd_kddrlDxYnfuxVPiyastot2vQ76huCtvCWe5AW4WTGrCeb3MiK4AF-_2j2OKCkx4vsRZOv5dww_YYvRLgnsjhPe1Y6dvQvK70hNJOY23cmiVIzpFm6CsqxJ_spOhJ64KMmsE6xTBJQwdC-BtYz54nFVwKCtNJ-7JnWLCAo4m7rEaD03NW9MH-gYUdHhEPcjJtTGG_WGNt4wBwEGKIfz3y7_KNQ')",
                }}
              />

              {/* Thermal Mode Heatmap Gradient Overlay */}
              {activeMapView === 'thermal' && (
                <div className="absolute inset-0 bg-gradient-radial from-[#ff5500]/25 via-[#ff1100]/10 to-transparent pointer-events-none mix-blend-color-dodge animate-pulse" />
              )}

              {/* SatLink Mode Downlink Grid */}
              {activeMapView === 'satLink' && (
                <div className="absolute inset-0 bg-[radial-gradient(#31D49A_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
              )}

              {/* SVG Grid, Concentric Range Rings, Radar Sweep & Route Vectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="polarGridMap" patternUnits="userSpaceOnUse" width="40" height="40">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={activeMapView === 'thermal' ? "rgba(246, 200, 95, 0.12)" : activeMapView === 'satLink' ? "rgba(49, 212, 154, 0.12)" : "rgba(130, 190, 225, 0.08)"} strokeWidth="1" />
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
                <circle cx="50%" cy="50%" r="100" fill="none" stroke={activeMapView === 'thermal' ? "#FF8A3D" : "#43B8FF"} strokeOpacity="0.2" strokeDasharray="4 4" strokeWidth="1" />
                <circle cx="50%" cy="50%" r="180" fill="none" stroke={activeMapView === 'thermal' ? "#FF8A3D" : "#43B8FF"} strokeOpacity="0.15" strokeWidth="1" />
                <circle cx="50%" cy="50%" r="260" fill="none" stroke={activeMapView === 'thermal' ? "#FF8A3D" : "#43B8FF"} strokeOpacity="0.08" strokeDasharray="2 6" strokeWidth="1" />

                {/* Radar Beam Animation */}
                <g className="radar-beam">
                  <line x1="50%" y1="50%" x2="50%" y2="0%" stroke={activeMapView === 'thermal' ? "#FF8A3D" : activeMapView === 'satLink' ? "#31D49A" : "#43B8FF"} strokeWidth="1.5" strokeOpacity="0.4" />
                  <path d="M 50% 50% L 50% 0% A 260 260 0 0 1 70% 8% Z" fill={activeMapView === 'thermal' ? "rgba(255, 138, 61, 0.08)" : "rgba(67, 184, 255, 0.06)"} />
                </g>

                {/* Mission Route Vectors */}
                <path d="M 280 180 Q 420 140 560 240" fill="none" stroke="url(#vectorRoute1)" strokeDasharray="6 4" strokeWidth="2.5" className="animate-pulse" />
                <path d="M 560 240 Q 640 280 720 330" fill="none" stroke="url(#vectorRoute2)" strokeDasharray="4 4" strokeWidth="2" />
                <path d="M 280 180 Q 330 90 460 70" fill="none" stroke="rgba(67, 184, 255, 0.4)" strokeDasharray="2 4" strokeWidth="1.5" />
              </svg>

              {/* INTERACTIVE BASE NODE 1: MAITRI */}
              <div
                onClick={() => {
                  setSelectedMapStation('maitri');
                  setStationHudOpen(true);
                }}
                className={`absolute top-[170px] left-[260px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20`}
                title="Click to inspect Maitri Station telemetry"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-ice-400/20 animate-ping-slow" />
                  <div className="absolute w-8 h-8 rounded-full bg-ice-400/30" />
                  <div className="w-4 h-4 rounded-full bg-ice-400 border-2 border-polar-950 shadow-[0_0_12px_#43B8FF] z-10" />
                </div>
                <div className="absolute left-6 -top-4 whitespace-nowrap bg-surface-3/95 backdrop-blur-md border border-border-strong px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-ice-300">MAITRI BASE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  </div>
                  <div className="font-mono text-[10px] text-text-muted">
                    Crew: 38 • -18°C • 1012 hPa
                  </div>
                </div>
              </div>

              {/* INTERACTIVE BASE NODE 2: BHARATI */}
              <div
                onClick={() => {
                  setSelectedMapStation('bharati');
                  setStationHudOpen(true);
                }}
                className="absolute top-[230px] left-[550px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20"
                title="Click to inspect Bharati Station telemetry"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-10 h-10 rounded-full bg-aurora-400/25 animate-ping-slow" />
                  <div className="w-3.5 h-3.5 rounded-full bg-aurora-400 border-2 border-polar-950 shadow-[0_0_12px_#29D6B0] z-10" />
                </div>
                <div className="absolute left-5 -top-3 whitespace-nowrap bg-surface-3/95 backdrop-blur-md border border-border-strong px-2.5 py-1 rounded-lg shadow-lg pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-aurora-400">BHARATI STATION</span>
                    <span className="text-[9px] px-1 rounded bg-aurora-400/20 text-aurora-300 font-mono">HUB</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-muted">
                    Crew: 44 • -22°C • Resupply 92%
                  </div>
                </div>
              </div>

              {/* INTERACTIVE BASE NODE 3: LARSEMANN HILLS */}
              <div
                onClick={() => {
                  setSelectedMapStation('larsemann');
                  setStationHudOpen(true);
                }}
                className="absolute top-[320px] left-[710px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20"
                title="Click to inspect Larsemann Hills Array"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-warning/30 animate-ping" />
                  <div className="w-4 h-4 rounded-full bg-warning border-2 border-polar-950 shadow-[0_0_14px_#F6C85F] z-10 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-polar-950" />
                  </div>
                </div>
                <div className="absolute left-6 -top-5 whitespace-nowrap bg-surface-3/95 backdrop-blur-md border border-warning/50 px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-warning">LARSEMANN REFUGE</span>
                    <span className="text-[9px] font-mono text-danger px-1 bg-danger/20 rounded">BLIZZARD</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-muted">
                    Crew: 6 (Sheltered) • -34°C • 74kt
                  </div>
                </div>
              </div>

              {/* INTERACTIVE BASE NODE 4: HIMADRI */}
              <div
                onClick={() => {
                  setSelectedMapStation('himadri');
                  setStationHudOpen(true);
                }}
                className="absolute top-[65px] left-[450px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20"
                title="Click to inspect Himadri Station"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-sky-300 border-2 border-polar-950 shadow-[0_0_10px_#7BD0FF] z-10" />
                </div>
                <div className="absolute left-5 -top-2 whitespace-nowrap bg-surface-2/95 backdrop-blur-md border border-border-default px-2.5 py-1 rounded text-[11px] font-mono text-text-primary pointer-events-auto">
                  HIMADRI (Arctic Ny-Ålesund) • -8°C
                </div>
              </div>

              {/* INTERACTIVE BASE NODE 5: RV BHARATI */}
              <div
                onClick={() => {
                  setSelectedMapStation('rvBharati');
                  setStationHudOpen(true);
                }}
                className="absolute top-[390px] left-[380px] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20"
                title="Click to inspect RV Bharati Vessel"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-ice-300 border border-polar-950 shadow-[0_0_10px_#43B8FF] z-10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[10px] text-polar-950">directions_boat</span>
                  </div>
                </div>
                <div className="absolute left-5 -top-2 whitespace-nowrap bg-surface-2/95 backdrop-blur-md border border-border-default px-2 py-0.5 rounded text-[10px] font-mono text-ice-300 pointer-events-auto">
                  RV BHARATI (Southern Ocean)
                </div>
              </div>
            </div>

            {/* Coordinate HUD Labels */}
            <div className="absolute top-3 left-4 font-mono text-[10px] text-text-muted space-y-0.5 pointer-events-none">
              <p>LAT: 70°45'58" S | LON: 11°44'09" E</p>
              <p>ELEV: 117m • ICE THICKNESS: 2,420m</p>
            </div>

            <div className="absolute bottom-3 left-4 flex items-center gap-4 text-xs font-mono text-text-muted pointer-events-none hidden sm:flex">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ice-400" /> Active Station</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Weather Watch</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-aurora-400" /> Resupply Track</span>
            </div>

            {/* REAL MAP CONTROLS: Zoom In / Zoom Out / Reset Polar Center */}
            <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 bg-surface-2/95 backdrop-blur-md border border-border-default p-1 rounded-lg z-30 shadow-lg">
              <button 
                onClick={() => setZoomLevel(z => Math.min(Number((z + 0.25).toFixed(2)), 2.25))}
                className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" 
                title="Zoom Map In"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
              <button 
                onClick={() => setZoomLevel(z => Math.max(Number((z - 0.25).toFixed(2)), 0.75))}
                className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" 
                title="Zoom Map Out"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <div className="w-full h-px bg-border-default my-0.5" />
              <button 
                onClick={() => {
                  setZoomLevel(1.0);
                  setSyncToast('Polar Center Recalibrated: 70°S 11°E');
                  setTimeout(() => setSyncToast(null), 3000);
                }}
                className="w-8 h-8 rounded flex items-center justify-center text-text-primary hover:bg-surface-container hover:text-ice-400 transition-colors cursor-pointer" 
                title="Reset Polar Center"
              >
                <span className="material-symbols-outlined text-lg">my_location</span>
              </button>
            </div>

            {/* INTERACTIVE STATION TELEMETRY HUD OVERLAY (when station clicked) */}
            {stationHudOpen && (
              <div className="absolute left-4 top-14 w-80 rounded-xl bg-surface-2/95 backdrop-blur-md border border-border-strong p-3.5 z-30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-left-2">
                <div className="flex items-start justify-between pb-2 border-b border-border-default">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">{selectedStation.name}</h4>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-1 ${selectedStation.statusColor}`}>
                        {selectedStation.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">{selectedStation.coords}</span>
                  </div>
                  <button 
                    onClick={() => setStationHudOpen(false)}
                    className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                    title="Close Station HUD"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div className="py-2.5 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Weather Telemetry:</span>
                    <span className="text-ice-300 font-semibold">{selectedStation.temp} • {selectedStation.wind}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Crew Complement:</span>
                    <span className="text-text-primary">{selectedStation.crew} / {selectedStation.capacity} Personnel</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Life Support & Power:</span>
                    <span className="text-aurora-400 text-right truncate max-w-[150px]" title={selectedStation.power}>
                      {selectedStation.power}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Fuel Reserves:</span>
                    <span className="text-text-primary text-right truncate max-w-[150px]">{selectedStation.fuel}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border-default/50">
                    <span className="text-text-muted">Status:</span>
                    <span className={`font-semibold ${selectedStation.statusColor}`}>{selectedStation.status}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-default flex items-center gap-2">
                  <button
                    onClick={() => navigate('/bases')}
                    className="flex-1 py-1 px-2 rounded bg-surface-container hover:bg-surface-container-high border border-border-default text-xs font-mono text-center text-ice-300 transition-colors cursor-pointer"
                  >
                    Station Details
                  </button>
                  <button
                    onClick={() => navigate('/inventory')}
                    className="flex-1 py-1 px-2 rounded bg-surface-container hover:bg-surface-container-high border border-border-default text-xs font-mono text-center text-aurora-400 transition-colors cursor-pointer"
                  >
                    View Supplies
                  </button>
                </div>
              </div>
            )}
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
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
              {(data.alerts || []).slice(0, 4).map((alert, idx) => (
                <div key={alert._id || idx} className={`p-3 rounded-lg border transition-all group ${alert.severity === 'Critical' ? 'bg-warning/5 border-warning/30 hover:border-warning/60' : 'bg-surface-2/80 border-border-default hover:border-border-strong'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold ${alert.severity === 'Critical' ? 'text-warning' : (alert.type === 'Weather' ? 'text-ice-400' : 'text-aurora-400')}`}>
                      <span className="material-symbols-outlined text-sm">{alert.severity === 'Critical' ? 'warning' : 'info'}</span>
                      {alert.type || 'SYSTEM'}
                    </span>
                    <span className="font-mono text-[11px] text-text-muted">{new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                  </div>
                  <p className="text-xs text-text-primary font-body">
                    {alert.message}
                  </p>
                  <div className={`mt-2 pt-2 flex justify-between text-[11px] font-mono border-t ${alert.severity === 'Critical' ? 'border-warning/20' : 'border-border-default/50 text-text-muted'}`}>
                    <span className={alert.severity === 'Critical' ? 'text-warning' : ''}>{alert.title}</span>
                    <button onClick={() => navigate('/alerts')} className="text-ice-300 hover:underline cursor-pointer">View</button>
                  </div>
                </div>
              ))}
              
              {!(data.alerts?.length) && (
                <div className="py-6 text-center text-text-muted text-xs font-mono">
                  No active alerts in telemetry stream.
                </div>
              )}
            </div>
          </div>

          {/* Feed Footer Command Prompt */}
          <div className="pt-3 border-t border-border-default flex items-center justify-between mt-3">
            <span className="text-[11px] text-text-muted font-mono">Terminal buffer: 2,490 / 5,000</span>
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-border-default text-text-primary text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">terminal</span>
              <span>Open Raw Console</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* GRID ROW 4: Tactical Logistics & Supply Chain Overview Widget */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Fuel & Cryo Stock Bladders */}
        <div 
          onClick={() => navigate('/inventory')}
          className="p-4 rounded-xl bg-surface-1 border border-border-default hover:border-ice-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-text-muted">CRYO-FUEL BLADDERS</span>
            <span className="material-symbols-outlined text-ice-400">local_gas_station</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold font-mono text-text-primary">196,500 L</span>
            <span className="text-xs font-mono text-ice-300">Jet A-1 & Polar Diesel</span>
          </div>
          <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-ice-400 rounded-full" style={{ width: '74%' }} />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-text-secondary">
            <span>Maitri: 84.5kL</span>
            <span>Bharati: 112kL</span>
            <span className="text-warning">Refill Scheduled</span>
          </div>
        </div>

        {/* 2. Critical Medical Plasma Vault */}
        <div 
          onClick={() => navigate('/inventory')}
          className="p-4 rounded-xl bg-surface-1 border border-border-default hover:border-warning/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-text-muted">MEDICAL CRYO-VAULT</span>
            <span className="material-symbols-outlined text-warning">medical_services</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold font-mono text-warning">12 Units</span>
            <span className="text-xs font-mono text-danger">Threshold: 25 Units</span>
          </div>
          <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-warning rounded-full" style={{ width: '48%' }} />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-text-secondary">
            <span>Blood Plasma O-Neg</span>
            <span className="text-danger font-semibold">Low-Stock Alert</span>
          </div>
        </div>

        {/* 3. Heavy Tracked Vehicle Readiness */}
        <div 
          onClick={() => navigate('/assets')}
          className="p-4 rounded-xl bg-surface-1 border border-border-default hover:border-aurora-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-text-muted">POLAR TRACKED FLEET</span>
            <span className="material-symbols-outlined text-aurora-400">precision_manufacturing</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold font-mono text-text-primary">8 / 9 Ready</span>
            <span className="text-xs font-mono text-aurora-400">89% Operational</span>
          </div>
          <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-aurora-400 rounded-full" style={{ width: '89%' }} />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-text-secondary">
            <span>PistenBully PB300: 4</span>
            <span>Hägglunds BV206: 3</span>
            <span className="text-text-muted">Gen #1 Maint</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL: Create Mission Order */}
      {/* ========================================================================= */}
      <Modal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} title="POLARIS C2 — Create Mission Order">
        <form onSubmit={handleCreateMission} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1">Mission Order Code</label>
              <input
                type="text"
                required
                value={missionForm.code}
                onChange={(e) => setMissionForm({ ...missionForm, code: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1">Target Base / Station</label>
              <select
                value={missionForm.baseName}
                onChange={(e) => setMissionForm({ ...missionForm, baseName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
              >
                <option value="Bharati Station">Bharati Station (Larsemann Hills)</option>
                <option value="Maitri Station">Maitri Station (Schirmacher Oasis)</option>
                <option value="Himadri Station">Himadri Station (Arctic Svalbard)</option>
                <option value="RV Bharati">RV Bharati (Southern Ocean Vessel)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1">Expedition Title / Campaign Name</label>
            <input
              type="text"
              required
              value={missionForm.name}
              onChange={(e) => setMissionForm({ ...missionForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1">Lead Scientist / Officer</label>
              <input
                type="text"
                required
                value={missionForm.leadScientist}
                onChange={(e) => setMissionForm({ ...missionForm, leadScientist: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1">Mission Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={missionForm.durationDays}
                onChange={(e) => setMissionForm({ ...missionForm, durationDays: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1">Primary Scientific Objective</label>
            <textarea
              rows="3"
              required
              value={missionForm.objective}
              onChange={(e) => setMissionForm({ ...missionForm, objective: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-polar-900 border border-border-default text-text-primary font-mono text-xs focus:border-ice-400 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-border-default flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsMissionModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-surface-2 text-text-muted hover:text-text-primary font-mono text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingMission}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold font-mono text-xs hover:brightness-110 shadow-[0_0_16px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
            >
              {isSubmittingMission ? 'Deploying...' : 'Authorize & Launch Mission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Raw Telemetry Console */}
      {/* ========================================================================= */}
      <Modal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} title="POLARIS Raw Console & Diagnostic Shell">
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-muted pb-2 border-b border-border-default">
            <span>SOCKET LINK: <strong className="text-[#31D49A]">ONLINE</strong></span>
            <span>ENCRYPTION: AES-256</span>
            <button
              onClick={() => setTerminalLogs(['[CLEAR] Console buffer reset.'])}
              className="text-ice-400 hover:underline cursor-pointer"
            >
              Clear Logs
            </button>
          </div>

          {/* Terminal log window */}
          <div className="h-64 overflow-y-auto rounded bg-polar-950 p-3 text-text-secondary space-y-1 text-[11px] border border-border-default font-mono">
            {terminalLogs.map((log, i) => (
              <p key={i} className="leading-relaxed">
                <span className="text-[#43B8FF]">{'> '}</span>
                {log}
              </p>
            ))}
          </div>

          {/* Interactive Shell Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!terminalInput.trim()) return;
              const cmd = terminalInput.trim().toUpperCase();
              let resp = `Command '${cmd}' acknowledged.`;
              if (cmd === 'PING') resp = 'PING: 18ms latency to Maitri Station. Packets 4/4 received.';
              else if (cmd === 'STATUS') resp = 'SYSTEM STATUS: All 4 polar stations reporting nominal telemetry.';
              else if (cmd === 'HELP') resp = 'COMMANDS: PING, STATUS, CLEAR, RADAR, HELP.';
              else if (cmd === 'CLEAR') {
                setTerminalLogs([]);
                setTerminalInput('');
                return;
              }

              setTerminalLogs(prev => [
                `[INPUT] ${cmd}`,
                `[RESPONSE] ${resp}`,
                ...prev
              ]);
              setTerminalInput('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Enter command (e.g. PING, STATUS, HELP)..."
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded bg-polar-900 border border-border-default text-text-primary text-xs font-mono focus:border-ice-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded bg-surface-3 hover:bg-surface-container text-ice-300 border border-border-default text-xs font-mono cursor-pointer"
            >
              Execute
            </button>
          </form>
        </div>
      </Modal>

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
