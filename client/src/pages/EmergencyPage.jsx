import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Clock,
  User,
  MapPin,
  CheckCircle2,
  Search,
  Filter,
  RotateCcw,
  Plus,
  Send,
  Truck,
  Activity,
  ChevronRight,
  Flame,
  AlertOctagon,
  FileText,
  X,
  Compass,
  Check,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export const EmergencyPage = () => {
  const { user, hasRole } = useAuth();

  // State
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    responding: 0,
    active: 0,
    resolved: 0,
    dispatchedUnits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [baseFilter, setBaseFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Action log input
  const [actionDesc, setActionDesc] = useState('');
  const [actionPerformer, setActionPerformer] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Declare Emergency form state
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    type: 'Facility',
    severity: 'Critical',
    baseName: 'Maitri Station',
    location: '',
  });

  // SOS Tactical Dispatch form state
  const [sosForm, setSosForm] = useState({
    mode: 'existing', // 'existing' | 'new'
    incidentId: '',
    title: '',
    description: '',
    type: 'Medical',
    severity: 'Critical',
    baseName: 'Maitri Station',
    location: '',
    leadResponder: 'Capt. Amitav Banerjee',
    dispatchUnit: 'Mil Mi-8 Polar Medevac Helo Flight-01',
    eta: '15 Minutes',
    operationalNotes: '',
    confirmed: false,
  });
  const [isSubmittingSos, setIsSubmittingSos] = useState(false);

  // Standard Indian Personnel for Antarctic SAR and Dispatch
  const SAR_LEAD_RESPONDERS = [
    { name: 'Capt. Amitav Banerjee', role: 'Search & Rescue Lead / Operations' },
    { name: 'Dr. Rajesh Sharma', role: 'Station Chief & Medical Lead' },
    { name: 'Dr. Maya Patel', role: 'Chief Medical Officer / Triage' },
    { name: 'Arjun Nair', role: 'Logistics Coordinator & Heavy Machinery Specialist' },
    { name: 'Vikram Sengupta', role: 'Polar Field Operations & Deep Field Lead' },
    { name: 'Pooja Deshmukh', role: 'Communications & Navigation Specialist' },
    { name: 'Devendra Pratap', role: 'Geophysicist & Ice Shelf Surveyor' },
    { name: 'Sanjay Deshmukh', role: 'Power Systems & Turbine Chief Engineer' },
  ];

  // Tactical Dispatch Vehicles / Units
  const DISPATCH_VEHICLES = [
    { id: 'mi8', name: 'Mil Mi-8 Heavy Medevac Helo (Rotary Flight Alpha)', speed: '130 kts', type: 'Air' },
    { id: 'bv206', name: 'Bv206 Polar All-Terrain Snowcat Unit-04', speed: '35 km/h', type: 'Tracked Ground' },
    { id: 'pistenbully', name: 'PistenBully 300 Polar Search & Rescue Crane Rig', speed: '25 km/h', type: 'Heavy Tracked' },
    { id: 'skidoo', name: 'Skidoo Rapid Response Recon Pair (Bravo)', speed: '65 km/h', type: 'Light Snowmobile' },
    { id: 'hagglunds', name: 'Hägglunds Dual-Cabin Emergency Ambulance Unit', speed: '40 km/h', type: 'Tracked Medical' },
  ];

  const BASES = [
    'Maitri Station',
    'Bharati Station',
    'Himadri Station',
  ];

  // Fetch incidents & summary stats
  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [incRes, statsRes] = await Promise.allSettled([
        api.get('/incidents'),
        api.get('/incidents/stats'),
      ]);

      if (incRes.status === 'fulfilled' && incRes.value.data?.success) {
        setIncidents(incRes.value.data.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load emergency telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 30000); // 30s fallback polling

    const socket = getSocket();
    if (socket) {
      const handleSync = () => {
        fetchData(false);
      };
      socket.on('emergency:sosDispatched', handleSync);
      socket.on('emergency:created', handleSync);
      socket.on('emergency:updated', handleSync);
      socket.on('dashboard:statsUpdated', (data) => {
        if (data?.module === 'emergencies' || data?.module === 'incidents') {
          handleSync();
        }
      });

      return () => {
        clearInterval(interval);
        socket.off('emergency:sosDispatched', handleSync);
        socket.off('emergency:created', handleSync);
        socket.off('emergency:updated', handleSync);
        socket.off('dashboard:statsUpdated');
      };
    }

    return () => clearInterval(interval);
  }, []);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (inc.incidentCode || inc.incidentNumber || '').toLowerCase();
        const title = (inc.title || '').toLowerCase();
        const desc = (inc.description || '').toLowerCase();
        const base = (inc.baseName || inc.location || '').toLowerCase();
        const unit = (inc.dispatchDetails?.unit || '').toLowerCase();
        const responder = (inc.dispatchDetails?.leadResponder || '').toLowerCase();
        if (
          !code.includes(q) &&
          !title.includes(q) &&
          !desc.includes(q) &&
          !base.includes(q) &&
          !unit.includes(q) &&
          !responder.includes(q)
        ) {
          return false;
        }
      }

      // Severity
      if (severityFilter !== 'All' && inc.severity !== severityFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active') {
          if (inc.status !== 'Active' && inc.status !== 'Reported' && inc.status !== 'Assessing') return false;
        } else if (inc.status !== statusFilter) {
          return false;
        }
      }

      // Base
      if (baseFilter !== 'All' && inc.baseName !== baseFilter) {
        return false;
      }

      // Type
      if (typeFilter !== 'All' && inc.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter, baseFilter, typeFilter]);

  // Open SOS Dispatch Modal preconfigured
  const openSosModal = (targetIncident = null) => {
    if (targetIncident) {
      setSosForm({
        mode: 'existing',
        incidentId: targetIncident._id,
        title: targetIncident.title,
        description: targetIncident.description,
        type: targetIncident.type || 'Medical',
        severity: targetIncident.severity || 'Critical',
        baseName: targetIncident.baseName || 'Maitri Station',
        location: targetIncident.location || targetIncident.baseName || '',
        leadResponder: targetIncident.dispatchDetails?.leadResponder || 'Capt. Amitav Banerjee',
        dispatchUnit: targetIncident.dispatchDetails?.unit || 'Mil Mi-8 Polar Medevac Helo Flight-01',
        eta: targetIncident.dispatchDetails?.eta || '15 Minutes',
        operationalNotes: '',
        confirmed: false,
      });
    } else {
      // Pick first active incident if available, else new
      const activeInc = incidents.find((i) => i.status !== 'Resolved' && i.status !== 'Closed');
      setSosForm({
        mode: activeInc ? 'existing' : 'new',
        incidentId: activeInc ? activeInc._id : '',
        title: '',
        description: '',
        type: 'Medical',
        severity: 'Critical',
        baseName: 'Maitri Station',
        location: '',
        leadResponder: 'Capt. Amitav Banerjee',
        dispatchUnit: 'Mil Mi-8 Polar Medevac Helo Flight-01',
        eta: '15 Minutes',
        operationalNotes: '',
        confirmed: false,
      });
    }
    setIsSosModalOpen(true);
  };

  // Submit SOS Dispatch
  const handleSosDispatch = async (e) => {
    e.preventDefault();
    if (!sosForm.confirmed) {
      alert('Operational Confirmation Required: Please review telemetry and verify authorization checkbox before executing emergency dispatch.');
      return;
    }

    try {
      setIsSubmittingSos(true);
      const payload = {
        incidentId: sosForm.mode === 'existing' ? sosForm.incidentId : undefined,
        title: sosForm.mode === 'new' ? sosForm.title : undefined,
        description: sosForm.description,
        type: sosForm.type,
        severity: sosForm.severity,
        baseName: sosForm.baseName,
        location: sosForm.location || `${sosForm.baseName} Perimeter`,
        leadResponder: sosForm.leadResponder,
        dispatchUnit: sosForm.dispatchUnit,
        eta: sosForm.eta,
        operationalNotes: sosForm.operationalNotes,
      };

      const res = await api.post('/incidents/sos', payload);
      if (res.data?.success) {
        setIsSosModalOpen(false);
        fetchData();
        // If modal was open for details, refresh it
        if (selectedIncident && res.data.data) {
          setSelectedIncident(res.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch SOS emergency team.');
    } finally {
      setIsSubmittingSos(false);
    }
  };

  // Submit Declare Emergency
  const handleDeclare = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/incidents', {
        ...newIncident,
        status: 'Active',
      });
      if (res.data?.success) {
        setIsDeclareModalOpen(false);
        setNewIncident({
          title: '',
          description: '',
          type: 'Facility',
          severity: 'Critical',
          baseName: 'Maitri Station',
          location: '',
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to declare emergency');
    }
  };

  // Open Log Action Modal
  const openActionModal = (inc) => {
    setSelectedIncident(inc);
    setActionDesc('');
    setActionPerformer(user?.name || 'Commander Radhika Roy');
    setIsActionModalOpen(true);
  };

  // Submit Action Step
  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!selectedIncident || !actionDesc.trim()) return;

    try {
      setIsSubmittingAction(true);
      const res = await api.put(`/incidents/${selectedIncident._id}`, {
        action: {
          description: actionDesc.trim(),
          performedBy: actionPerformer.trim() || user?.name || 'Commander Radhika Roy',
        },
      });
      if (res.data?.success) {
        setIsActionModalOpen(false);
        setActionDesc('');
        fetchData();
        if (isDetailModalOpen && res.data.data) {
          setSelectedIncident(res.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log mitigation action step');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Mark Incident as Resolved
  const handleResolveIncident = async (inc) => {
    const confirmation = window.confirm(
      `Confirm resolution and stabilization of Incident ${inc.incidentCode || inc.incidentNumber}? This will stand down emergency alert status.`
    );
    if (!confirmation) return;

    try {
      const res = await api.put(`/incidents/${inc._id}`, {
        status: 'Resolved',
        action: {
          description: `INCIDENT STAND-DOWN: Station incident resolved and emergency perimeter cleared by Commander Radhika Roy.`,
          performedBy: user?.name || 'Commander Radhika Roy',
        },
      });
      if (res.data?.success) {
        fetchData();
        if (selectedIncident && selectedIncident._id === inc._id) {
          setSelectedIncident(res.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update incident status to Resolved');
    }
  };

  // Helper: Severity Badge Styles
  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Moderate':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      case 'Low':
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2.5">
                <span>Emergency Command & Incident Dispatch</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  DEFCON 2 ACTIVE
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                TURBINE POWER LOSS, SEVERE KATABATIC BLIZZARDS, CREVASSE RESCUE & RAPID MEDEVAC
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer"
            title="Refresh active incidents telemetry"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Sync C2</span>
          </button>

          {/* Declare Emergency Protocol */}
          <button
            onClick={() => setIsDeclareModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase font-mono tracking-wider transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400" />
            <span>Declare Incident</span>
          </button>

          {/* SOS Tactical Emergency Dispatch Button */}
          <button
            onClick={() => openSosModal(null)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs uppercase font-mono tracking-wider transition-all shadow-lg shadow-rose-950/70 border border-rose-400/40 cursor-pointer animate-pulse"
          >
            <Radio className="w-4 h-4 text-white" />
            <span>SOS Tactical Dispatch</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Incidents */}
        <div className="polar-card p-4 border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Recorded</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{stats.total}</span>
            <span className="text-[10px] font-mono text-slate-500">INCIDENTS</span>
          </div>
        </div>

        {/* Critical Alarms */}
        <div className="polar-card p-4 border-rose-500/40 bg-rose-950/20 polar-glow-danger">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-300 uppercase tracking-wider font-bold">Critical Alarms</span>
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-200">{stats.critical}</span>
            <span className="text-[10px] font-mono text-rose-400 font-bold">HIGH RISK</span>
          </div>
        </div>

        {/* Responding / En Route */}
        <div className="polar-card p-4 border-sky-500/40 bg-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-sky-300 uppercase tracking-wider font-bold">Responding</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-200">{stats.responding}</span>
            <span className="text-[10px] font-mono text-sky-400">UNDERWAY</span>
          </div>
        </div>

        {/* Dispatched SAR Units */}
        <div className="polar-card p-4 border-amber-500/40 bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider font-bold">Dispatched Teams</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-200">{stats.dispatchedUnits}</span>
            <span className="text-[10px] font-mono text-amber-400">VEHICLES</span>
          </div>
        </div>

        {/* Contained / Resolved */}
        <div className="polar-card p-4 border-emerald-500/40 bg-emerald-950/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider font-bold">Contained</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-200">{stats.resolved}</span>
            <span className="text-[10px] font-mono text-emerald-400">STABILIZED</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Code, Base, Title, Unit, Responder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:border-sky-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Severity</option>
              <option value="High">High Severity</option>
              <option value="Moderate">Moderate Severity</option>
              <option value="Low">Low Severity</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active / Assessing</option>
              <option value="Responding">Responding / En Route</option>
              <option value="Resolved">Resolved / Closed</option>
            </select>
          </div>

          {/* Base Filter */}
          <div>
            <select
              value={baseFilter}
              onChange={(e) => setBaseFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Antarctic Bases</option>
              {BASES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Category Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-slate-500 text-[11px] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {['All', 'Facility', 'Environmental', 'Medical', 'Logistics'].map((cat) => (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  typeFilter === cat
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {(searchQuery || severityFilter !== 'All' || statusFilter !== 'All' || baseFilter !== 'All' || typeFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('All');
                setStatusFilter('All');
                setBaseFilter('All');
                setTypeFilter('All');
              }}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Incidents List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="polar-card p-12 text-center text-slate-400 font-mono text-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span>SYNCHRONIZING ANTARCTIC INCIDENT TELEMETRY...</span>
            </div>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="polar-card p-12 text-center border-dashed border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white font-heading">No Incidents Matching Telemetry Filter</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono max-w-md mx-auto">
              All station sectors are currently reporting nominal containment or filters exclude current alerts.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('All');
                setStatusFilter('All');
                setBaseFilter('All');
                setTypeFilter('All');
              }}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono cursor-pointer"
            >
              Clear Telemetry Filters
            </button>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isCritical = inc.severity === 'Critical';
            const isActive = inc.status === 'Active' || inc.status === 'Reported' || inc.status === 'Assessing';
            const isResponding = inc.status === 'Responding';
            const isResolved = inc.status === 'Resolved' || inc.status === 'Closed';

            return (
              <div
                key={inc._id || inc.incidentNumber}
                className={`polar-card p-5 transition-all ${
                  isCritical && (isActive || isResponding)
                    ? 'border-rose-500/60 bg-rose-950/20 polar-glow-danger'
                    : isResponding
                    ? 'border-sky-500/40 bg-sky-950/15'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* Incident Card Top Row */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        {inc.incidentCode || inc.incidentNumber}
                      </span>
                      <StatusBadge status={inc.status} />
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${getSeverityStyle(
                          inc.severity
                        )}`}
                      >
                        {inc.severity} SEVERITY
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {inc.type} Incident
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-heading">{inc.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                      {inc.description}
                    </p>

                    {/* Metadata Strip */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{inc.baseName}</span>
                        {inc.location && inc.location !== inc.baseName && (
                          <span className="text-slate-500">({inc.location})</span>
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reporter: {inc.reporterName || 'Commander Radhika Roy'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(inc.createdAt || Date.now()).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Incident Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    {/* SOS Dispatch Action */}
                    {!isResolved && (
                      <button
                        onClick={() => openSosModal(inc)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/60 cursor-pointer"
                        title="Scramble SOS SAR deployment unit"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>{inc.dispatchDetails ? 'Reinforce SOS' : 'Dispatch SOS'}</span>
                      </button>
                    )}

                    {/* Log Action Step */}
                    <button
                      onClick={() => openActionModal(inc)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Step</span>
                    </button>

                    {/* Mark Resolved */}
                    {!isResolved && (
                      <button
                        onClick={() => handleResolveIncident(inc)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Mark incident as contained & stabilized"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {/* Full Dossier Inspector */}
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono cursor-pointer"
                      title="Inspect complete incident timeline & resources"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ACTIVE DISPATCH TRACKER BOX (if dispatched) */}
                {inc.dispatchDetails && (
                  <div className="mt-4 p-3.5 rounded-lg bg-slate-950 border border-sky-500/40 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 rounded bg-sky-500/20 border border-sky-500/40 text-sky-400 shrink-0">
                          <Truck className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">
                              {inc.dispatchDetails.unit}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              {inc.dispatchDetails.status || 'EN ROUTE'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] font-mono text-slate-400 mt-1">
                            <span>Lead: <strong className="text-slate-200">{inc.dispatchDetails.leadResponder}</strong></span>
                            <span>•</span>
                            <span className="text-sky-300 font-bold">ETA: {inc.dispatchDetails.eta || '15 Minutes'}</span>
                            {inc.dispatchDetails.dispatchedAt && (
                              <>
                                <span>•</span>
                                <span>Dispatched: {new Date(inc.dispatchDetails.dispatchedAt).toLocaleTimeString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {inc.dispatchDetails.notes && (
                        <div className="text-[11px] font-mono text-slate-300 sm:text-right max-w-sm">
                          <span className="text-slate-500 block text-[10px]">DIRECTIVE NOTES:</span>
                          <span className="italic">{inc.dispatchDetails.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MITIGATION & ACTION TIMELINE */}
                {inc.actions && inc.actions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Triage & Mitigation Step Log ({inc.actions.length} recorded)</span>
                      </span>
                      <button
                        onClick={() => openActionModal(inc)}
                        className="text-[10px] font-mono text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        + Add Action Step
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {inc.actions.map((act, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-slate-950/70 border border-slate-850 text-xs font-mono flex items-start justify-between gap-3 text-slate-300"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                            <div>
                              <span>{act.description}</span>
                              <span className="text-slate-400 text-[10px] ml-2">
                                — <strong className="text-slate-300">{act.performedBy}</strong>
                              </span>
                            </div>
                          </div>
                          <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                            {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SOS TACTICAL EMERGENCY DISPATCH MODAL */}
      <Modal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        title="SOS Tactical Emergency SAR Deployment"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSosDispatch} className="space-y-4 font-mono text-xs">
          {/* Top Banner Notice */}
          <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Antarctic Rapid Rescue Protocol - Scramble Command</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Mobilizing an Arctic SAR deployment unit dispatches emergency personnel and vehicles, alerts regional stations, and engages automated telemetry tracking under Antarctic Treaty Safety Code.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setSosForm({ ...sosForm, mode: 'existing' })}
              className={`py-2 px-3 rounded font-bold text-xs transition-colors cursor-pointer ${
                sosForm.mode === 'existing'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dispatch to Active Incident
            </button>
            <button
              type="button"
              onClick={() => setSosForm({ ...sosForm, mode: 'new' })}
              className={`py-2 px-3 rounded font-bold text-xs transition-colors cursor-pointer ${
                sosForm.mode === 'new'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Declare & Dispatch New Emergency
            </button>
          </div>

          {/* Target Incident Selection (if existing mode) */}
          {sosForm.mode === 'existing' ? (
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Select Active Emergency Incident <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={sosForm.incidentId}
                onChange={(e) => {
                  const found = incidents.find((i) => i._id === e.target.value);
                  setSosForm({
                    ...sosForm,
                    incidentId: e.target.value,
                    baseName: found?.baseName || sosForm.baseName,
                    location: found?.location || found?.baseName || sosForm.location,
                    severity: found?.severity || sosForm.severity,
                    type: found?.type || sosForm.type,
                  });
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="">-- Choose Active Incident --</option>
                {incidents
                  .filter((i) => i.status !== 'Resolved' && i.status !== 'Closed')
                  .map((inc) => (
                    <option key={inc._id} value={inc._id}>
                      [{inc.incidentCode || inc.incidentNumber}] {inc.title} ({inc.baseName})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            /* New Emergency Inputs */
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Emergency Situation Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sosForm.title}
                  onChange={(e) => setSosForm({ ...sosForm, title: e.target.value })}
                  placeholder="e.g. Crevasse Fall - Deep Traverse Team 3"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Category</label>
                  <select
                    value={sosForm.type}
                    onChange={(e) => setSosForm({ ...sosForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Medical">Medical Evacuation</option>
                    <option value="Environmental">Environmental Hazard</option>
                    <option value="Facility">Facility Failure</option>
                    <option value="Logistics">Logistics / Convoy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Severity</label>
                  <select
                    value={sosForm.severity}
                    onChange={(e) => setSosForm({ ...sosForm, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Critical">Critical (Threat to Life)</option>
                    <option value="High">High Severity</option>
                    <option value="Moderate">Moderate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Target Base</label>
                  <select
                    value={sosForm.baseName}
                    onChange={(e) => setSosForm({ ...sosForm, baseName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    {BASES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Operational Dispatch Allocation Fields */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Deployment Unit & Crew Assignment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Lead Field Responder */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Tactical SAR Lead Responder <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={sosForm.leadResponder}
                  onChange={(e) => setSosForm({ ...sosForm, leadResponder: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  {SAR_LEAD_RESPONDERS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name} — {r.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dispatched Vehicle / Unit */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Primary Response Vehicle / Unit <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={sosForm.dispatchUnit}
                  onChange={(e) => setSosForm({ ...sosForm, dispatchUnit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  {DISPATCH_VEHICLES.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.speed})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ETA */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Estimated En-Route Time (ETA) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={sosForm.eta}
                  onChange={(e) => setSosForm({ ...sosForm, eta: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="10 Minutes">10 Minutes (Rapid Helo / Air)</option>
                  <option value="15 Minutes">15 Minutes (Nominal Medevac)</option>
                  <option value="25 Minutes">25 Minutes (Snowcat Ground)</option>
                  <option value="45 Minutes">45 Minutes (Heavy Crane / PistenBully)</option>
                  <option value="90 Minutes">90 Minutes (Deep Ice Shelf Traverse)</option>
                </select>
              </div>

              {/* Exact Location */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Deploy Coordinates / Grid</label>
                <input
                  type="text"
                  value={sosForm.location}
                  onChange={(e) => setSosForm({ ...sosForm, location: e.target.value })}
                  placeholder="e.g. Maitri Sector 4, 70°45'S 11°44'E"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Directive Notes */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Mission Directives & Safety Instructions</label>
              <textarea
                rows={2}
                value={sosForm.operationalNotes}
                onChange={(e) => setSosForm({ ...sosForm, operationalNotes: e.target.value })}
                placeholder="Specify payload equipment (e.g. hyperbaric chamber, winch gear, blood plasma, warm tent)..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tactical Dispatch Confirmation Checkbox */}
          <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/40 flex items-start gap-3">
            <input
              type="checkbox"
              id="sos-confirm-checkbox"
              checked={sosForm.confirmed}
              onChange={(e) => setSosForm({ ...sosForm, confirmed: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="sos-confirm-checkbox" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
              <strong className="text-white block">Commander Radhika Roy SAR Authorization:</strong>
              I confirm the immediate scrambling of <span className="text-sky-300">{sosForm.dispatchUnit}</span> under lead responder <span className="text-amber-300">{sosForm.leadResponder}</span> to {sosForm.baseName}.
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSosModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingSos || !sosForm.confirmed}
              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-950/80 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>{isSubmittingSos ? 'Scrambling SAR Team...' : 'Execute SOS Dispatch'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DECLARE EMERGENCY PROTOCOL MODAL */}
      <Modal
        isOpen={isDeclareModalOpen}
        onClose={() => setIsDeclareModalOpen(false)}
        title="Declare Station Emergency Protocol"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleDeclare} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Emergency Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newIncident.title}
              onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
              placeholder="e.g. Primary Turbine Power Loss - Maitri Station"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Incident Category</label>
              <select
                value={newIncident.type}
                onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="Facility">Facility / Infrastructure Failure</option>
                <option value="Environmental">Environmental (Blizzard/Katabatic)</option>
                <option value="Medical">Medical Evacuation / Hypothermia</option>
                <option value="Logistics">Logistics / Convoy Strand</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Severity Level</label>
              <select
                value={newIncident.severity}
                onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="Critical">Critical (Immediate Life/Power Hazard)</option>
                <option value="High">High Severity</option>
                <option value="Moderate">Moderate Severity</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Station Base</label>
              <select
                value={newIncident.baseName}
                onChange={(e) => setNewIncident({ ...newIncident, baseName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
              >
                {BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Exact Sector or Grid</label>
            <input
              type="text"
              value={newIncident.location}
              onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
              placeholder="e.g. Generator Room 2 / Schirmacher Oasis Sector B"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Description & Immediate Threat <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
              placeholder="Current conditions, personnel at risk, immediate containment steps taken..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeclareModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-950/60"
            >
              Broadcast Emergency Signal
            </button>
          </div>
        </form>
      </Modal>

      {/* LOG MITIGATION ACTION MODAL */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setActionDesc('');
        }}
        title={`Log Mitigation Step: ${selectedIncident?.incidentCode || selectedIncident?.incidentNumber || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddAction} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Officer Recording Action</label>
            <input
              type="text"
              required
              value={actionPerformer}
              onChange={(e) => setActionPerformer(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Mitigation Step Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={actionDesc}
              onChange={(e) => setActionDesc(e.target.value)}
              placeholder="e.g. Switched to auxiliary fuel manifold; mobilized emergency thermal blankets and hot broth to stranded traverse team..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsActionModalOpen(false);
                setActionDesc('');
              }}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction || !actionDesc.trim()}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold uppercase transition-all cursor-pointer"
            >
              {isSubmittingAction ? 'Recording Step...' : 'Record Mitigation Step'}
            </button>
          </div>
        </form>
      </Modal>

      {/* FULL INCIDENT DOSSIER MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedIncident(null);
        }}
        title={`Incident Dossier: ${selectedIncident?.incidentCode || selectedIncident?.incidentNumber || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedIncident && (
          <div className="space-y-5 font-mono text-xs">
            {/* Header Telemetry */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${getSeverityStyle(
                      selectedIncident.severity
                    )}`}
                  >
                    {selectedIncident.severity} SEVERITY
                  </span>
                  <StatusBadge status={selectedIncident.status} />
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedIncident.type}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(selectedIncident.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>

              <h2 className="text-base font-bold text-white font-heading">{selectedIncident.title}</h2>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {selectedIncident.description}
              </p>

              {/* Station Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-850 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Base Outpost</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{selectedIncident.baseName}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Sector / Location</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block truncate">
                    {selectedIncident.location || 'Central Station Grid'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Reporting Officer</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{selectedIncident.reporterName || 'Commander Radhika Roy'}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Current Status</span>
                  <span className="text-sky-300 font-bold mt-0.5 block">
                    {selectedIncident.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Dispatched Unit Details */}
            {selectedIncident.dispatchDetails && (
              <div className="p-4 rounded-lg bg-sky-950/20 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Dispatched Tactical Response Unit</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {selectedIncident.dispatchDetails.status || 'EN ROUTE'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vehicle / Unit:</span>
                    <strong className="text-white">{selectedIncident.dispatchDetails.unit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Lead Responder:</span>
                    <strong className="text-slate-200">{selectedIncident.dispatchDetails.leadResponder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Arrival:</span>
                    <strong className="text-sky-300">{selectedIncident.dispatchDetails.eta || '15 Minutes'}</strong>
                  </div>
                </div>
                {selectedIncident.dispatchDetails.notes && (
                  <p className="text-[11px] text-slate-300 pt-1 border-t border-sky-900/40">
                    <span className="text-slate-400">Directives:</span> {selectedIncident.dispatchDetails.notes}
                  </p>
                )}
              </div>
            )}

            {/* Complete Action Timeline */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Mitigation & Audit Steps Log</span>
                </h4>
                <button
                  onClick={() => openActionModal(selectedIncident)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] cursor-pointer"
                >
                  + Add Action Step
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(!selectedIncident.actions || selectedIncident.actions.length === 0) ? (
                  <div className="py-6 text-center text-slate-500 text-[11px]">
                    No mitigation steps recorded yet.
                  </div>
                ) : (
                  selectedIncident.actions.map((act, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-900/70 border border-slate-850 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-bold text-teal-300">{act.performedBy}</span>
                        <span>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="text-slate-200">{act.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {selectedIncident.status !== 'Resolved' && (
                  <button
                    onClick={() => {
                      handleResolveIncident(selectedIncident);
                      setIsDetailModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve & Stand Down</span>
                  </button>
                )}

                {selectedIncident.status !== 'Resolved' && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openSosModal(selectedIncident);
                    }}
                    className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Dispatch / Scramble Team</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedIncident(null);
                }}
                className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmergencyPage;
