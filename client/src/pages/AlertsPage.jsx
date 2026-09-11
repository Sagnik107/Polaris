import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Shield,
  Activity,
  Flame,
  Wind,
  Thermometer,
  Radio,
  Search,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  CheckCircle2,
  Trash2,
  BarChart3,
  TrendingUp,
  Compass,
  Eye,
  X,
  Fuel,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/common/Modal';

// Tactical Web Audio Radar / Sonar Sound Synthesizer
const playRadarChime = (severity = 'Critical') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'Critical' ? 'sawtooth' : 'sine';
    const freq = severity === 'Critical' ? 880 : 587.33;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(severity === 'Critical' ? 440 : 293.66, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (err) {
    console.debug('Audio synth bypassed:', err);
  }
};

export const AlertsPage = () => {
  const { setUnreadAlertsCount } = useSocket();

  // Navigation and active view tabs
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'analytics'
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    warning: 0,
    unread: 0,
    resolved: 0,
    uptimeScore: 99.8,
    mttaMinutes: 1.4,
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Filters
  const [filter, setFilter] = useState('All'); // 'All' | 'Unread' | 'Critical' | 'High' | 'Warning' | 'Resolved'
  const [stationFilter, setStationFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [completedSopSteps, setCompletedSopSteps] = useState({});

  // Drill form state
  const [drillForm, setDrillForm] = useState({
    title: 'Catastrophic Gale & Generator #1 Overheat Alarm',
    message: 'Sudden wind gusts of 68 knots accompanied by ambient -44°C temp caused turbine icing and tripped secondary generator at Maitri Station.',
    severity: 'Critical',
    module: 'Incidents',
    base: 'Maitri Station',
    type: 'Drill',
  });
  const [isSubmittingDrill, setIsSubmittingDrill] = useState(false);

  // Fetch alerts, stats, and analytics
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [alertsRes, statsRes, analyticsRes] = await Promise.all([
        api.get('/alerts').catch(() => ({ data: { success: false } })),
        api.get('/alerts/stats').catch(() => ({ data: { success: false } })),
        api.get('/analytics').catch(() => ({ data: { success: false } })),
      ]);

      if (alertsRes.data?.success && Array.isArray(alertsRes.data.data)) {
        setAlerts(alertsRes.data.data);
      }
      if (statsRes.data?.success && statsRes.data.data) {
        setStats(statsRes.data.data);
        if (typeof statsRes.data.data.unread === 'number') {
          setUnreadAlertsCount(statsRes.data.data.unread);
        }
      }
      if (analyticsRes.data?.success && analyticsRes.data.data) {
        setAnalyticsData(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load alert telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [setUnreadAlertsCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/read-all');
      setUnreadAlertsCount(0);
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setStats((prev) => ({ ...prev, unread: 0 }));
    } catch (err) {
      alert('Failed to acknowledge alerts');
    }
  };

  // Mark single as read
  const handleMarkRead = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/read`);
      setUnreadAlertsCount((prev) => Math.max(0, prev - 1));
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, isRead: true } : a))
      );
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  // Resolve alert
  const handleResolveAlert = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`, { resolutionNote });
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === alertId
            ? { ...a, status: 'Resolved', isRead: true, resolutionNote }
            : a
        )
      );
      setStats((prev) => ({
        ...prev,
        resolved: prev.resolved + 1,
        unread: Math.max(0, prev.unread - 1),
      }));
      setSelectedAlert(null);
      setResolutionNote('');
      setCompletedSopSteps({});
    } catch (err) {
      alert('Failed to resolve alert');
    }
  };

  // Dismiss / Delete alert
  const handleDeleteAlert = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      fetchData();
      if (selectedAlert?._id === alertId) setSelectedAlert(null);
    } catch (err) {
      alert('Failed to dismiss alert');
    }
  };

  // Submit Emergency Drill
  const handleLaunchDrill = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingDrill(true);
      const res = await api.post('/alerts', drillForm);
      if (res.data?.success) {
        if (audioEnabled) {
          playRadarChime(drillForm.severity);
        }
        setIsDrillModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert('Failed to launch simulated drill');
    } finally {
      setIsSubmittingDrill(false);
    }
  };

  // Preset Drill Scenarios
  const drillPresets = [
    {
      label: 'Catastrophic Gale & Generator Overheat (Maitri)',
      title: 'Catastrophic Gale & Generator #1 Overheat Alarm',
      message: 'Sudden wind gusts of 68 knots accompanied by ambient -44°C temp caused turbine icing and tripped secondary generator at Maitri Station.',
      severity: 'Critical',
      module: 'Incidents',
      base: 'Maitri Station',
    },
    {
      label: 'Jet A-1 Fuel Depletion Spike (Maitri)',
      title: 'CRITICAL FUEL: Rapid Storage Drain Detected',
      message: 'Turbine consumption spiked by 34% due to extreme sub-zero pre-heaters. Fuel stock dropped below 2,000L.',
      severity: 'High',
      module: 'Inventory',
      base: 'Maitri Station',
    },
    {
      label: 'Blizzard Cat 4 Whiteout Warning (Bharati)',
      title: 'WEATHER ALERT: Blizzard Cat 4 approaching Larsemann Hills',
      message: 'Extreme wind (74 kt gusts) causing zero-visibility whiteout conditions. LARSEM-2026 expedition sheltered in place.',
      severity: 'Critical',
      module: 'Expeditions',
      base: 'Bharati Station',
    },
    {
      label: 'Iridium SatLink Jamming / Solar Flare (Himadri)',
      title: 'WARNING: Ny-Ålesund Satellite Uplink Attenuation',
      message: 'Atmospheric ion disturbance detected over Spitsbergen. Uplink packet jitter elevated to 142ms.',
      severity: 'Warning',
      module: 'System',
      base: 'Himadri Station',
    },
  ];

  // Filter calculation
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title?.toLowerCase().includes(q);
        const matchMsg = a.message?.toLowerCase().includes(q);
        const matchBase = a.base?.toLowerCase().includes(q);
        const matchModule = a.module?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchBase && !matchModule) return false;
      }

      // Station
      if (stationFilter !== 'ALL' && a.base !== stationFilter) {
        return false;
      }

      // Severity / Status
      if (filter === 'All') return true;
      if (filter === 'Unread') return !a.isRead;
      if (filter === 'Resolved') return a.status === 'Resolved';
      return a.severity?.toLowerCase() === filter.toLowerCase();
    });
  }, [alerts, filter, stationFilter, searchQuery]);

  // Counts for filter pills
  const filterCounts = useMemo(() => {
    return {
      All: alerts.length,
      Unread: alerts.filter((a) => !a.isRead).length,
      Critical: alerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length,
      High: alerts.filter((a) => a.severity === 'High' && a.status !== 'Resolved').length,
      Warning: alerts.filter((a) => a.severity === 'Warning' && a.status !== 'Resolved').length,
      Resolved: alerts.filter((a) => a.status === 'Resolved').length,
    };
  }, [alerts]);

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* HEADER: Title, Mode Tabs, and Action Controls */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[rgba(130,190,225,0.18)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c273e] border border-[#43B8FF]/40 flex items-center justify-center shadow-[0_0_15px_rgba(40,169,245,0.3)]">
              <Bell className="w-5 h-5 text-[#43B8FF] animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-[#F4F9FF] tracking-tight flex items-center gap-2.5">
                Polar Operations Alert Center & Analytics Hub
              </h1>
              <p className="text-xs text-[#6E8498] mt-0.5 font-mono tracking-wider">
                AUTOMATED LOGISTICS DELAY FLAGS • SUB-ZERO TELEMETRY • PREDICTIVE C2 ANALYTICS
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audio Alert Toggle */}
          <button
            onClick={() => setAudioEnabled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs border transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-[#0e2a44] text-[#43B8FF] border-[#43B8FF]/40 shadow-[0_0_10px_rgba(67,184,255,0.2)]'
                : 'bg-[#0a1b2a] text-[#6E8498] border-[rgba(130,190,225,0.18)] hover:text-[#A9BDD0]'
            }`}
            title={audioEnabled ? 'Sonar Siren Sound: Active' : 'Sonar Siren Sound: Muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Audio: ON' : 'Audio: MUTED'}</span>
          </button>

          {/* Trigger Drill Simulation Button */}
          <button
            onClick={() => setIsDrillModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FF6678]/15 hover:bg-[#FF6678]/25 text-[#FF6678] border border-[#FF6678]/40 font-mono text-xs font-semibold shadow-[0_0_12px_rgba(255,102,120,0.2)] transition-all active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#FF6678]" />
            <span>Simulate Emergency Drill</span>
          </button>

          {/* Acknowledge All Button */}
          <button
            onClick={handleMarkAllRead}
            disabled={stats.unread === 0}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs border transition-all cursor-pointer ${
              stats.unread > 0
                ? 'bg-[#0a2338] hover:bg-[#103454] text-[#7BD0FF] border-[#43B8FF]/40 shadow-sm active:scale-95'
                : 'bg-[#071929] text-[#6E8498] border-[rgba(130,190,225,0.18)] opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Acknowledge All</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP COMMAND HUD: 4 Live Glassmorphism Telemetry Cards */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Threats */}
        <div
          onClick={() => {
            setActiveTab('stream');
            setFilter('Critical');
          }}
          className={`polar-card p-4.5 cursor-pointer transition-all hover:scale-[1.01] ${
            stats.critical > 0
              ? 'border-[#FF6678]/40 bg-[rgba(255,102,120,0.06)] shadow-[0_0_16px_rgba(255,102,120,0.15)]'
              : 'border-[rgba(130,190,225,0.18)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#A9BDD0] uppercase tracking-wider">
              Critical Threats
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FF6678]/20 border border-[#FF6678]/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#FF6678] animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono text-[#FF6678]">
              {stats.critical}
            </span>
            <span className="text-[11px] font-mono text-[#FF6678]/80">
              {stats.critical > 0 ? 'PROTOCOL REQUIRED' : 'NOMINAL'}
            </span>
          </div>
          <p className="text-[11px] text-[#6E8498] font-mono mt-1">
            Immediate dispatch required for level 1 alarms
          </p>
        </div>

        {/* Card 2: High & Warning Triage */}
        <div
          onClick={() => {
            setActiveTab('stream');
            setFilter('High');
          }}
          className="polar-card p-4.5 cursor-pointer transition-all hover:scale-[1.01] border-[rgba(130,190,225,0.18)] hover:border-[#F6C85F]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#A9BDD0] uppercase tracking-wider">
              Operational Triage
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F6C85F]/15 border border-[#F6C85F]/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#F6C85F]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono text-[#F6C85F]">
              {stats.high + stats.warning}
            </span>
            <span className="text-[11px] font-mono text-[#F6C85F]/80">
              {stats.high} High • {stats.warning} Warn
            </span>
          </div>
          <p className="text-[11px] text-[#6E8498] font-mono mt-1">
            Supply delays, fuel buffers & link warnings
          </p>
        </div>

        {/* Card 3: Sensor Network Health */}
        <div className="polar-card p-4.5 border-[rgba(130,190,225,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#A9BDD0] uppercase tracking-wider">
              Sensor Uptime Index
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#31D49A]/15 border border-[#31D49A]/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#31D49A]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono text-[#31D49A]">
              {stats.uptimeScore || 99.8}%
            </span>
            <span className="text-[11px] font-mono text-[#31D49A]">STATION SYNC</span>
          </div>
          <p className="text-[11px] text-[#6E8498] font-mono mt-1">
            4 polar stations telemetry reporting live
          </p>
        </div>

        {/* Card 4: Response Velocity (MTTA) */}
        <div className="polar-card p-4.5 border-[rgba(130,190,225,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#A9BDD0] uppercase tracking-wider">
              Mean Time to Ack (MTTA)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#28A9F5]/15 border border-[#28A9F5]/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#28A9F5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono text-[#43B8FF]">
              {stats.mttaMinutes || 1.4}m
            </span>
            <span className="text-[11px] font-mono text-[#31D49A]">-0.6m GAIN</span>
          </div>
          <p className="text-[11px] text-[#6E8498] font-mono mt-1">
            Standard polar threshold target: &lt; 3.0 min
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE SWITCHER: [🚨 Live Alert Stream] vs [📊 Mission Analytics Studio] */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(130,190,225,0.15)] pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('stream')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-mono text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              activeTab === 'stream'
                ? 'text-[#43B8FF] border-[#43B8FF] bg-[#0c273e]/50 shadow-[0_-4px_12px_rgba(40,169,245,0.15)]'
                : 'text-[#6E8498] border-transparent hover:text-[#F4F9FF] hover:bg-[#071e30]/30'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Live Alert Stream</span>
            <span className="ml-1 px-1.5 py-0.2 rounded bg-[#0c273e] border border-[#43B8FF]/30 text-[10px] text-[#7BD0FF]">
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-mono text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              activeTab === 'analytics'
                ? 'text-[#31D49A] border-[#31D49A] bg-[#082a2b]/40 shadow-[0_-4px_12px_rgba(49,212,154,0.15)]'
                : 'text-[#6E8498] border-transparent hover:text-[#F4F9FF] hover:bg-[#071e30]/30'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Mission Analytics Studio</span>
            <span className="w-2 h-2 rounded-full bg-[#31D49A] animate-pulse" />
          </button>
        </div>

        {/* Quick Sync & Count status */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#6E8498]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#31D49A] animate-ping" />
          <span>IRIDIUM TELEMETRY ONLINE</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: LIVE ALERT STREAM */}
      {/* ========================================================================= */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          {/* Controls: Search, Station Selector, Severity Tabs */}
          <div className="polar-card p-3.5 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8498]" />
              <input
                type="text"
                placeholder="Search alerts, messages, equipment, base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] placeholder-[#6E8498] focus:outline-none focus:border-[#43B8FF]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E8498] hover:text-[#F4F9FF]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Station Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#6E8498] shrink-0">Station:</span>
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#7BD0FF] focus:outline-none focus:border-[#43B8FF] cursor-pointer"
              >
                <option value="ALL">All Polar Stations</option>
                <option value="Maitri Station">Maitri Station</option>
                <option value="Bharati Station">Bharati Station</option>
                <option value="Himadri Station">Himadri Station</option>
                <option value="RV Bharati">RV Bharati (Vessel)</option>
              </select>
            </div>
          </div>

          {/* Severity & State Filter Tabs with Count Badges */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'All', label: 'All Alerts', count: filterCounts.All, color: 'sky' },
              { id: 'Unread', label: 'Unread', count: filterCounts.Unread, color: 'ice' },
              { id: 'Critical', label: 'Critical', count: filterCounts.Critical, color: 'rose' },
              { id: 'High', label: 'High Priority', count: filterCounts.High, color: 'amber' },
              { id: 'Warning', label: 'Warnings', count: filterCounts.Warning, color: 'yellow' },
              { id: 'Resolved', label: 'Resolved', count: filterCounts.Resolved, color: 'teal' },
            ].map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? f.id === 'Critical'
                        ? 'bg-[#FF6678]/20 text-[#FF6678] border-[#FF6678]/50 shadow-[0_0_12px_rgba(255,102,120,0.25)]'
                        : f.id === 'High'
                        ? 'bg-[#F6C85F]/20 text-[#F6C85F] border-[#F6C85F]/50 shadow-[0_0_12px_rgba(246,200,95,0.25)]'
                        : f.id === 'Resolved'
                        ? 'bg-[#31D49A]/20 text-[#31D49A] border-[#31D49A]/50 shadow-[0_0_12px_rgba(49,212,154,0.25)]'
                        : 'bg-[#0c273e] text-[#7BD0FF] border-[#43B8FF]/50 shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                      : 'text-[#A9BDD0] hover:bg-[#0c273e]/40 border-transparent'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      isActive
                        ? 'bg-black/30 font-bold'
                        : 'bg-[#102336] text-[#6E8498]'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* ALERTS FEED LIST OR POLAR RADAR EMPTY STATE */}
          {/* ========================================================================= */}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((alert) => {
                const isCritical = alert.severity === 'Critical';
                const isHigh = alert.severity === 'High';
                const isWarning = alert.severity === 'Warning';
                const isResolved = alert.status === 'Resolved';

                return (
                  <div
                    key={alert._id}
                    className={`polar-card p-4 transition-all duration-150 relative overflow-hidden ${
                      isResolved
                        ? 'border-[#31D49A]/30 bg-[#061825]/60 opacity-80'
                        : !alert.isRead
                        ? isCritical
                          ? 'border-[#FF6678]/50 bg-[#160b13]/80 shadow-[0_0_16px_rgba(255,102,120,0.12)]'
                          : isHigh
                          ? 'border-[#F6C85F]/40 bg-[#141208]/80 shadow-[0_0_12px_rgba(246,200,95,0.08)]'
                          : 'border-[#43B8FF]/40 bg-[#081e30]/80'
                        : 'border-[rgba(130,190,225,0.15)] bg-[#071929]/50'
                    }`}
                  >
                    {/* Left vertical status indicator strip */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isResolved
                          ? 'bg-[#31D49A]'
                          : isCritical
                          ? 'bg-[#FF6678]'
                          : isHigh
                          ? 'bg-[#F6C85F]'
                          : 'bg-[#43B8FF]'
                      }`}
                    />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pl-2">
                      {/* Left: Icon & Description */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                            isResolved
                              ? 'bg-[#31D49A]/15 border-[#31D49A]/30 text-[#31D49A]'
                              : isCritical
                              ? 'bg-[#FF6678]/20 border-[#FF6678]/40 text-[#FF6678] shadow-[0_0_12px_rgba(255,102,120,0.3)]'
                              : isHigh
                              ? 'bg-[#F6C85F]/15 border-[#F6C85F]/30 text-[#F6C85F]'
                              : 'bg-[#43B8FF]/15 border-[#43B8FF]/30 text-[#43B8FF]'
                          }`}
                        >
                          {isResolved ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isCritical ? (
                            <AlertTriangle className="w-5 h-5 animate-pulse" />
                          ) : isHigh ? (
                            <Flame className="w-5 h-5" />
                          ) : (
                            <Info className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#F4F9FF] font-sans tracking-tight">
                              {alert.title}
                            </span>
                            {!alert.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[#43B8FF] animate-pulse" title="Unread" />
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                                isResolved
                                  ? 'bg-[#31D49A]/15 text-[#31D49A] border-[#31D49A]/30'
                                  : isCritical
                                  ? 'bg-[#FF6678]/20 text-[#FF6678] border-[#FF6678]/40'
                                  : isHigh
                                  ? 'bg-[#F6C85F]/15 text-[#F6C85F] border-[#F6C85F]/30'
                                  : 'bg-[#43B8FF]/15 text-[#43B8FF] border-[#43B8FF]/30'
                              }`}
                            >
                              {isResolved ? 'Resolved' : alert.severity}
                            </span>
                            {alert.base && (
                              <span className="px-2 py-0.5 rounded bg-[#0a2338] text-[#7BD0FF] border border-[#43B8FF]/20 text-[10px] font-mono">
                                📍 {alert.base}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#A9BDD0] leading-relaxed max-w-3xl">
                            {alert.message}
                          </p>

                          {/* Sensor readings / Telemetry Chips */}
                          {alert.telemetry && Object.keys(alert.telemetry).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(alert.telemetry).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#041423] text-[#7BD0FF] border border-[rgba(130,190,225,0.15)] flex items-center gap-1"
                                >
                                  <span className="text-[#6E8498] capitalize">{key}:</span>
                                  <span className="font-semibold">{val}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer Meta */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[#6E8498]">
                            <span>Module: <strong className="text-[#A9BDD0]">{alert.module || alert.type}</strong></span>
                            <span>•</span>
                            <span>Logged: {new Date(alert.createdAt).toLocaleTimeString()} UTC</span>
                            {alert.resolutionNote && (
                              <>
                                <span>•</span>
                                <span className="text-[#31D49A]">SITREP: {alert.resolutionNote}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="flex items-center gap-1 text-xs font-mono text-[#7BD0FF] hover:text-[#F4F9FF] px-3 py-1.5 rounded-lg bg-[#0e273e] hover:bg-[#143757] border border-[#43B8FF]/30 transition-all cursor-pointer"
                          title="View telemetry dossier and command protocol"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect SOP</span>
                        </button>

                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkRead(alert._id)}
                            className="text-xs font-mono text-[#48E5C3] hover:text-[#F4F9FF] px-3 py-1.5 rounded-lg bg-[#082a2b] hover:bg-[#0c3e3f] border border-[#31D49A]/30 transition-all cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAlert(alert._id)}
                          className="text-[#6E8498] hover:text-[#FF6678] p-1.5 rounded hover:bg-[#FF6678]/10 transition-colors cursor-pointer"
                          title="Dismiss Alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* SLEEK POLAR RADAR EMPTY STATE (Fixing the blank screen!) */
            /* ========================================================================= */
            <div className="polar-card p-12 text-center flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
              {/* Radar Scanner Graphic */}
              <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
                {/* Concentric circles */}
                <div className="absolute inset-0 rounded-full border border-[#43B8FF]/20" />
                <div className="absolute inset-4 rounded-full border border-[#43B8FF]/15" />
                <div className="absolute inset-8 rounded-full border border-[#43B8FF]/10" />
                <div className="absolute inset-12 rounded-full border border-[#43B8FF]/25" />
                {/* Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-[#43B8FF]/20" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-px bg-[#43B8FF]/20" />
                </div>
                {/* Rotating beam */}
                <div className="absolute inset-0 rounded-full radar-beam bg-gradient-to-tr from-transparent via-[#43B8FF]/20 to-transparent" />
                {/* Center dot */}
                <div className="relative w-3 h-3 rounded-full bg-[#31D49A] shadow-[0_0_10px_#31D49A] animate-ping" />
              </div>

              <h3 className="text-lg font-bold font-heading text-[#F4F9FF] tracking-tight">
                No {filter !== 'All' ? `"${filter}"` : ''} Active Alerts Detected
              </h3>
              <p className="text-xs text-[#6E8498] font-mono mt-1.5 max-w-md">
                Sector telemetry is operating within nominal safety thresholds. All environmental sensors at{' '}
                {stationFilter === 'ALL' ? 'all polar stations' : stationFilter} report calm.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setFilter('All');
                    setStationFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0e273e] hover:bg-[#143757] text-[#7BD0FF] font-mono text-xs border border-[#43B8FF]/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>

                <button
                  onClick={() => setIsDrillModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FF6678]/15 hover:bg-[#FF6678]/25 text-[#FF6678] font-mono text-xs border border-[#FF6678]/40 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Trigger Drill Simulation</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MISSION ANALYTICS STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Hourly Alert Frequency & Spike Timeline */}
            <div className="polar-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(130,190,225,0.18)] pb-2">
                <div>
                  <h3 className="text-sm font-bold font-heading uppercase text-[#F4F9FF] tracking-wider">
                    Polar Alarm Volume & Temporal Spikes
                  </h3>
                  <p className="text-xs text-[#6E8498] font-mono">
                    Incident frequency breakdown across last 24 UTC hours
                  </p>
                </div>
                <span className="text-xs font-mono text-[#FF6678] bg-[#FF6678]/10 px-2 py-0.5 rounded border border-[#FF6678]/30">
                  PEAK: 16:00 UTC
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      analyticsData?.hourlyAlertVolume || [
                        { time: '00:00', critical: 0, high: 1, warning: 0 },
                        { time: '04:00', critical: 0, high: 0, warning: 1 },
                        { time: '08:00', critical: 1, high: 1, warning: 0 },
                        { time: '12:00', critical: 0, high: 2, warning: 1 },
                        { time: '16:00', critical: 2, high: 1, warning: 1 },
                        { time: '20:00', critical: 1, high: 0, warning: 2 },
                      ]
                    }
                  >
                    <defs>
                      <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6678" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FF6678" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F6C85F" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F6C85F" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0e2a47" />
                    <XAxis dataKey="time" stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <YAxis stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#07192c',
                        borderColor: '#28a9f5',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Area
                      type="monotone"
                      dataKey="critical"
                      stroke="#FF6678"
                      fillOpacity={1}
                      fill="url(#criticalGrad)"
                      name="Critical Threat"
                    />
                    <Area
                      type="monotone"
                      dataKey="high"
                      stroke="#F6C85F"
                      fillOpacity={1}
                      fill="url(#highGrad)"
                      name="High Warning"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Threat Distribution by Polar Base */}
            <div className="polar-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(130,190,225,0.18)] pb-2">
                <div>
                  <h3 className="text-sm font-bold font-heading uppercase text-[#F4F9FF] tracking-wider">
                    Threat Distribution by Polar Station
                  </h3>
                  <p className="text-xs text-[#6E8498] font-mono">
                    Active alarm density across Antarctic & Arctic outposts
                  </p>
                </div>
                <span className="text-xs font-mono text-[#7BD0FF] bg-[#0c273e] px-2 py-0.5 rounded border border-[#43B8FF]/30">
                  BASE AUDIT
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      analyticsData?.baseThreats || [
                        { base: 'Maitri', critical: 1, high: 1, warning: 0 },
                        { base: 'Bharati', critical: 1, high: 1, warning: 1 },
                        { base: 'Himadri', critical: 0, high: 0, warning: 1 },
                        { base: 'RV Bharati', critical: 0, high: 0, warning: 1 },
                      ]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#0e2a47" />
                    <XAxis dataKey="base" stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <YAxis stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#07192c',
                        borderColor: '#28a9f5',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Bar dataKey="critical" fill="#FF6678" name="Critical" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="high" fill="#F6C85F" name="High" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="warning" fill="#43B8FF" name="Warning" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Sub-Zero Diesel Reserves vs Safety Thresholds */}
            <div className="polar-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(130,190,225,0.18)] pb-2">
                <div>
                  <h3 className="text-sm font-bold font-heading uppercase text-[#F4F9FF] tracking-wider">
                    Sub-Zero Fuel Reserves vs Safety Limits
                  </h3>
                  <p className="text-xs text-[#6E8498] font-mono">
                    Jet A-1 & Sub-Zero Diesel storage levels in liters
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#F6C85F]">
                  <Fuel className="w-3.5 h-3.5" />
                  <span>BUFFER ALERT</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      analyticsData?.fuelReserves || [
                        { base: 'Maitri', stock: 18500, min: 12000 },
                        { base: 'Bharati', stock: 28000, min: 8000 },
                        { base: 'Himadri', stock: 6500, min: 3000 },
                        { base: 'RV Bharati', stock: 22000, min: 7000 },
                      ]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#0e2a47" />
                    <XAxis dataKey="base" stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <YAxis stroke="#6e8498" fontSize={11} fontStyle="mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#07192c',
                        borderColor: '#28a9f5',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Bar dataKey="stock" fill="#28a9f5" name="Current Stock (L)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="min" fill="#f6c85f" name="Safety Threshold (L)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Supply Chain Status & Delay Risk */}
            <div className="polar-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(130,190,225,0.18)] pb-2">
                <div>
                  <h3 className="text-sm font-bold font-heading uppercase text-[#F4F9FF] tracking-wider">
                    Supply Chain & Convoy Risk Distribution
                  </h3>
                  <p className="text-xs text-[#6E8498] font-mono">
                    Total polar cargo manifests status breakdown
                  </p>
                </div>
                <span className="text-xs font-mono text-[#31D49A] bg-[#31D49A]/10 px-2 py-0.5 rounded border border-[#31D49A]/30">
                  94.8% IN PIPELINE
                </span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        analyticsData?.cargoStatus || [
                          { name: 'Delivered', value: 38, color: '#31d49a' },
                          { name: 'In Transit', value: 14, color: '#28a9f5' },
                          { name: 'Loading', value: 6, color: '#7bd0ff' },
                          { name: 'Delayed / Grounded', value: 3, color: '#ff6678' },
                        ]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(
                        analyticsData?.cargoStatus || [
                          { color: '#31d49a' },
                          { color: '#28a9f5' },
                          { color: '#7bd0ff' },
                          { color: '#ff6678' },
                        ]
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#07192c',
                        borderColor: '#28a9f5',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Operational Efficiency Summary Bar */}
          <div className="polar-card p-6">
            <h3 className="text-sm font-bold font-heading uppercase text-[#F4F9FF] tracking-wider mb-4 border-b border-[rgba(130,190,225,0.18)] pb-2">
              Polar Fleet Reliability Index & MTTR Benchmarks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)]">
                <span className="text-[#6E8498] block">Mean Time to Resupply (MTTR):</span>
                <span className="text-lg font-bold text-[#31D49A] mt-1 block">4.2 Days (Convoy)</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)]">
                <span className="text-[#6E8498] block">Turbine Fleet Uptime:</span>
                <span className="text-lg font-bold text-[#43B8FF] mt-1 block">99.4% Synchronized</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)]">
                <span className="text-[#6E8498] block">Medical Clearance Rate:</span>
                <span className="text-lg font-bold text-[#48E5C3] mt-1 block">100% (124/124)</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#041423] border border-[rgba(130,190,225,0.18)]">
                <span className="text-[#6E8498] block">Cryo-Sensor Precision:</span>
                <span className="text-lg font-bold text-[#7BD0FF] mt-1 block">±0.04°C Calibrated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EMERGENCY DRILL SIMULATOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDrillModalOpen}
        onClose={() => setIsDrillModalOpen(false)}
        title="Polar Operations Emergency Drill Simulator"
      >
        <form onSubmit={handleLaunchDrill} className="space-y-4">
          <p className="text-xs text-[#A9BDD0] font-mono leading-relaxed">
            Trigger a simulated alarm scenario to verify crew response time, audio sirens, and C2 telemetry routing.
          </p>

          {/* Preset Buttons */}
          <div>
            <label className="text-[11px] font-mono text-[#6E8498] block mb-1.5 uppercase">
              Quick Preset Scenarios:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {drillPresets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() =>
                    setDrillForm({
                      title: preset.title,
                      message: preset.message,
                      severity: preset.severity,
                      module: preset.module,
                      base: preset.base,
                      type: 'Drill',
                    })
                  }
                  className="p-2 text-left rounded-lg bg-[#061827] hover:bg-[#0c273e] border border-[rgba(130,190,225,0.18)] hover:border-[#43B8FF]/40 text-[11px] font-mono text-[#7BD0FF] transition-all cursor-pointer truncate"
                >
                  ⚡ {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-mono text-[#6E8498] block mb-1">
                Target Polar Station:
              </label>
              <select
                value={drillForm.base}
                onChange={(e) => setDrillForm({ ...drillForm, base: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] focus:outline-none focus:border-[#43B8FF]"
              >
                <option value="Maitri Station">Maitri Station (Antarctica)</option>
                <option value="Bharati Station">Bharati Station (Antarctica)</option>
                <option value="Himadri Station">Himadri Station (Arctic/Svalbard)</option>
                <option value="RV Bharati">RV Bharati (Polar Vessel)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#6E8498] block mb-1">
                Severity Level:
              </label>
              <select
                value={drillForm.severity}
                onChange={(e) => setDrillForm({ ...drillForm, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] focus:outline-none focus:border-[#43B8FF]"
              >
                <option value="Critical">Critical (Immediate Level 1 Siren)</option>
                <option value="High">High Priority</option>
                <option value="Warning">Operational Warning</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#6E8498] block mb-1">
              Alert Title:
            </label>
            <input
              type="text"
              required
              value={drillForm.title}
              onChange={(e) => setDrillForm({ ...drillForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] focus:outline-none focus:border-[#43B8FF]"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#6E8498] block mb-1">
              Emergency Message & Symptoms:
            </label>
            <textarea
              rows={3}
              required
              value={drillForm.message}
              onChange={(e) => setDrillForm({ ...drillForm, message: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] focus:outline-none focus:border-[#43B8FF]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
            <button
              type="button"
              onClick={() => setIsDrillModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-transparent text-[#6E8498] hover:text-[#F4F9FF] text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingDrill}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6678] hover:bg-[#FF6678]/90 text-[#020914] font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,102,120,0.3)] cursor-pointer"
            >
              <Zap className="w-4 h-4 text-[#020914]" />
              <span>{isSubmittingDrill ? 'Broadcasting...' : 'Broadcast Emergency Drill'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: TACTICAL ALERT INSPECTION & PROTOCOL RESOLUTION */}
      {/* ========================================================================= */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Polar C2 Incident Dossier: ${selectedAlert.title}`}
        >
          <div className="space-y-4">
            {/* Header Alert summary */}
            <div
              className={`p-3.5 rounded-lg border ${
                selectedAlert.severity === 'Critical'
                  ? 'bg-[#FF6678]/10 border-[#FF6678]/30 text-[#FF6678]'
                  : selectedAlert.severity === 'High'
                  ? 'bg-[#F6C85F]/10 border-[#F6C85F]/30 text-[#F6C85F]'
                  : 'bg-[#43B8FF]/10 border-[#43B8FF]/30 text-[#43B8FF]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold tracking-wider">
                  {selectedAlert.severity} PRIORITY PROTOCOL
                </span>
                <span className="text-[11px] font-mono text-[#A9BDD0]">
                  Station: {selectedAlert.base || 'Polar Command'}
                </span>
              </div>
              <p className="text-xs text-[#F4F9FF] mt-2 leading-relaxed">
                {selectedAlert.message}
              </p>
            </div>

            {/* Live Sensor Gauges */}
            {selectedAlert.telemetry && Object.keys(selectedAlert.telemetry).length > 0 && (
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#6E8498] mb-2">
                  Real-Time Sensor Telemetry
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selectedAlert.telemetry).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-2.5 rounded bg-[#020914] border border-[rgba(130,190,225,0.18)]"
                    >
                      <span className="text-[10px] font-mono text-[#6E8498] block capitalize">{k}:</span>
                      <span className="text-xs font-mono font-bold text-[#7BD0FF] mt-0.5 block">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Operating Procedure (SOP) Checklist */}
            <div>
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#6E8498] mb-2">
                Standard Operating Procedure (SOP) Checklist
              </h4>
              <div className="space-y-2 bg-[#020914] p-3 rounded-lg border border-[rgba(130,190,225,0.18)]">
                {[
                  'Verify primary telemetry sensor telemetry with auxiliary probe',
                  'Confirm physical personnel safety & initiate shelter-in-place protocol if required',
                  'Establish direct Iridium VHF comms link with Base Station Commander',
                  'Submit tactical SITREP and mark incident as resolved in C2 log',
                ].map((step, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 text-xs font-mono text-[#A9BDD0] cursor-pointer hover:text-[#F4F9FF]"
                  >
                    <input
                      type="checkbox"
                      checked={!!completedSopSteps[idx]}
                      onChange={(e) =>
                        setCompletedSopSteps({ ...completedSopSteps, [idx]: e.target.checked })
                      }
                      className="mt-0.5 rounded border-[rgba(130,190,225,0.3)] bg-[#0c273e] text-[#43B8FF] focus:ring-0"
                    />
                    <span className={completedSopSteps[idx] ? 'line-through opacity-60' : ''}>
                      {step}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Resolution SITREP notes */}
            {selectedAlert.status !== 'Resolved' ? (
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#6E8498] block mb-1">
                  Incident Resolution SITREP Notes:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Auxiliary generator #2 engaged. Ambient temperature stabilized at -38°C. Turbine iced cleared by technical team."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#020914] border border-[rgba(130,190,225,0.18)] text-xs font-mono text-[#F4F9FF] placeholder-[#6E8498] focus:outline-none focus:border-[#31D49A]"
                />
              </div>
            ) : (
              <div className="p-3 rounded bg-[#31D49A]/10 border border-[#31D49A]/30 text-xs font-mono text-[#31D49A]">
                ✓ Incident marked as resolved. Logged in station archives.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[rgba(130,190,225,0.18)]">
              <button
                type="button"
                onClick={() => handleDeleteAlert(selectedAlert._id)}
                className="flex items-center gap-1.5 text-xs font-mono text-[#FF6678] hover:text-[#FF6678]/80 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dismiss Alert</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#082033] hover:bg-[#0c273e] text-xs font-mono text-[#A9BDD0] cursor-pointer"
                >
                  Close Dossier
                </button>

                {selectedAlert.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolveAlert(selectedAlert._id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#31D49A] hover:bg-[#31D49A]/90 text-[#020914] font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(49,212,154,0.3)] cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolve & Archive Incident</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AlertsPage;
