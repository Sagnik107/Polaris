import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  Phone,
  Award,
  Filter,
  Plus,
  ArrowRightLeft,
  SlidersHorizontal,
  Edit3,
  Trash2,
  Download,
  Flame,
  Droplets,
  Zap,
  Radio,
  Crosshair,
  Shield,
  Clock,
  MapPin,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  UserCheck,
  Briefcase,
  Compass,
  LayoutGrid,
  List,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import Modal from '../components/common/Modal';

// Status badge styling metadata
const STATUS_CONFIG = {
  'Active': { label: 'Active', color: 'text-emerald-300', bg: 'bg-emerald-950/60 border-emerald-700/60', dot: 'bg-emerald-400' },
  'Available': { label: 'Available', color: 'text-teal-300', bg: 'bg-teal-950/60 border-teal-700/60', dot: 'bg-teal-400' },
  'Deployed': { label: 'Deployed (Field)', color: 'text-cyan-300', bg: 'bg-cyan-950/60 border-cyan-700/60', dot: 'bg-cyan-400 animate-pulse' },
  'At Base': { label: 'At Base Station', color: 'text-sky-300', bg: 'bg-sky-950/60 border-sky-700/60', dot: 'bg-sky-400' },
  'In Transit': { label: 'In Transit Corridor', color: 'text-amber-300', bg: 'bg-amber-950/60 border-amber-700/60', dot: 'bg-amber-400 animate-ping' },
  'Standby': { label: 'Standby', color: 'text-purple-300', bg: 'bg-purple-950/60 border-purple-700/60', dot: 'bg-purple-400' },
  'On Leave': { label: 'On Leave', color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700/40', dot: 'bg-slate-500' },
  'Emergency': { label: 'Emergency Protocol', color: 'text-rose-300', bg: 'bg-rose-950/60 border-rose-700/60', dot: 'bg-rose-400 animate-ping' },
};

// Department configuration
const DEPARTMENTS = [
  'All',
  'Science',
  'Operations',
  'Medical',
  'Command',
  'Logistics',
  'Engineering',
];

const DEPT_BADGES = {
  'Science': { color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/40' },
  'Operations': { color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/40' },
  'Medical': { color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/40' },
  'Command': { color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40' },
  'Logistics': { color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/40' },
  'Engineering': { color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40' },
  'General': { color: 'text-slate-400', bg: 'bg-slate-800/40 border-slate-700/40' },
};

// Defensive helper to guarantee array format
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

// Error boundary to prevent black screen crashes
class PersonnelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('PersonnelErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-xl bg-slate-900/90 border border-rose-500/50 text-center text-slate-300 space-y-3 font-mono">
          <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-600 text-rose-400 flex items-center justify-center mx-auto text-lg font-bold">
            !
          </div>
          <h3 className="text-base font-bold text-rose-300">Personnel Dossier Stream Alert</h3>
          <p className="text-xs text-slate-400">
            A telemetry parsing issue was intercepted safely. Click below to reset operator selection.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Reset Operator Selection
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PersonnelPage = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [baseFilter, setBaseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [newPerson, setNewPerson] = useState({
    name: '',
    designation: '',
    role: '',
    rank: 'Specialist',
    department: 'Science',
    team: '',
    shift: 'Alpha (Day)',
    baseName: 'Maitri Station',
    bloodGroup: 'O+',
    medicalClearance: 'Cleared',
    status: 'Active',
    skills: '',
    certifications: 'Polar Survival V4, First Aid',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    email: '',
    phone: '',
  });

  const [editPerson, setEditPerson] = useState(null);

  const [reassignForm, setReassignForm] = useState({
    personnelId: '',
    personnelName: '',
    currentBase: '',
    targetBaseName: 'Bharati Station',
    notes: '',
  });

  // Fetch Personnel Roster and Stats
  const fetchPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        api.get(`/personnel?sort=${sortBy}`),
        api.get('/personnel/stats').catch(() => ({ data: { data: null } })),
      ]);

      if (res.data?.success) {
        const items = res.data.data || [];
        setPersonnel(items);
        if (items.length > 0 && !selectedPersonnelId) {
          setSelectedPersonnelId(items[0]._id || items[0].participantId);
        }
      }

      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch personnel:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedPersonnelId]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = () => {
      fetchPersonnel();
    };

    socket.on('personnel:created', handleUpdate);
    socket.on('personnel:movement', handleUpdate);
    socket.on('dashboard:statsUpdated', (data) => {
      if (data.module === 'personnel') fetchPersonnel();
    });

    return () => {
      socket.off('personnel:created', handleUpdate);
      socket.off('personnel:movement', handleUpdate);
      socket.off('dashboard:statsUpdated');
    };
  }, [fetchPersonnel]);

  // Filtered Crew List
  const filtered = useMemo(() => {
    return personnel.filter((p) => {
      // Search matches
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
        (p.participantId && p.participantId.toLowerCase().includes(q)) ||
        (p.designation && p.designation.toLowerCase().includes(q)) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        (p.baseName && p.baseName.toLowerCase().includes(q)) ||
        toArray(p.skills).some((s) => typeof s === 'string' && s.toLowerCase().includes(q)) ||
        toArray(p.certifications).some((c) => typeof c === 'string' && c.toLowerCase().includes(q));

      // Department filter
      const matchesDept = deptFilter === 'All' || p.department === deptFilter;

      // Base filter
      const matchesBase =
        baseFilter === 'All' ||
        (p.baseName && p.baseName.toLowerCase().includes(baseFilter.toLowerCase())) ||
        p.currentBase === baseFilter;

      // Status filter
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

      // Shift filter
      const matchesShift = shiftFilter === 'All' || (p.shift && p.shift.includes(shiftFilter));

      return matchesSearch && matchesDept && matchesBase && matchesStatus && matchesShift;
    });
  }, [personnel, search, deptFilter, baseFilter, statusFilter, shiftFilter]);

  // Selected Personnel Record
  const selectedPersonnel = useMemo(() => {
    if (!personnel.length) return null;
    return (
      personnel.find(
        (p) =>
          p._id === selectedPersonnelId ||
          p.participantId === selectedPersonnelId ||
          p.employeeId === selectedPersonnelId
      ) || personnel[0]
    );
  }, [personnel, selectedPersonnelId]);

  // Computed KPI stats if fallback needed
  const kpiData = useMemo(() => {
    if (stats) return stats;
    const totalCrew = personnel.length;
    const deployed = personnel.filter((p) => p.status === 'Deployed').length;
    const atBase = personnel.filter((p) => p.status === 'At Base' || p.status === 'Active').length;
    const inTransit = personnel.filter((p) => p.status === 'In Transit').length;
    const cleared = personnel.filter((p) => p.medicalClearance === 'Cleared').length;
    const medicalClearanceRate = totalCrew > 0 ? Math.round((cleared / totalCrew) * 100) : 100;

    return {
      totalCrew,
      deployed,
      atBase,
      inTransit,
      medicalClearanceRate,
    };
  }, [stats, personnel]);

  // Handlers
  const handleOpenCreate = () => {
    setNewPerson({
      name: '',
      designation: '',
      role: '',
      rank: 'Specialist',
      department: 'Science',
      team: 'Polar Research Flight Unit',
      shift: 'Alpha (Day)',
      baseName: 'Maitri Station',
      bloodGroup: 'O+',
      medicalClearance: 'Cleared',
      status: 'Active',
      skills: 'Cryo-sampling, Radio Comms',
      certifications: 'Polar Survival V4, Wilderness First Aid',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      email: '',
      phone: '',
    });
    setShowAddModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPerson,
        skills: typeof newPerson.skills === 'string'
          ? newPerson.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : toArray(newPerson.skills),
        certifications: typeof newPerson.certifications === 'string'
          ? newPerson.certifications.split(',').map((c) => c.trim()).filter(Boolean)
          : toArray(newPerson.certifications),
        emergencyContact: {
          name: (newPerson.emergencyContactName || '').trim() || 'Next of Kin',
          phone: (newPerson.emergencyContactPhone || '').trim() || '+91-11-24360000',
          relationship: (newPerson.emergencyContactRelation || '').trim() || 'Official Contact',
        },
      };
      const res = await api.post('/personnel', payload);
      setShowAddModal(false);
      await fetchPersonnel();
      if (res.data?.data?._id) {
        setSelectedPersonnelId(res.data.data._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to onboard personnel');
    }
  };

  const handleOpenEdit = (p) => {
    setEditPerson({
      _id: p._id,
      participantId: p.participantId || p.employeeId,
      name: p.name,
      designation: p.designation || p.role,
      role: p.role || p.designation,
      rank: p.rank || 'Specialist',
      department: p.department || 'Science',
      team: p.team || '',
      shift: p.shift || 'Alpha (Day)',
      baseName: p.baseName || 'Maitri Station',
      bloodGroup: p.bloodGroup || 'O+',
      medicalClearance: p.medicalClearance || 'Cleared',
      status: p.status || 'Active',
      skills: Array.isArray(p.skills) ? p.skills.join(', ') : p.skills || '',
      certifications: Array.isArray(p.certifications) ? p.certifications.join(', ') : p.certifications || '',
      email: p.email || '',
      phone: p.phone || '',
      emergencyContactName: p.emergencyContact?.name || '',
      emergencyContactPhone: p.emergencyContact?.phone || (typeof p.emergencyContact === 'string' ? p.emergencyContact : ''),
      emergencyContactRelation: p.emergencyContact?.relationship || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editPerson,
        skills: typeof editPerson.skills === 'string'
          ? editPerson.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : toArray(editPerson.skills),
        certifications: typeof editPerson.certifications === 'string'
          ? editPerson.certifications.split(',').map((c) => c.trim()).filter(Boolean)
          : toArray(editPerson.certifications),
        emergencyContact: {
          name: (editPerson.emergencyContactName || '').trim() || 'Next of Kin',
          phone: (editPerson.emergencyContactPhone || '').trim() || '+91-11-24360000',
          relationship: (editPerson.emergencyContactRelation || '').trim() || 'Official Contact',
        },
      };
      await api.put(`/personnel/${editPerson._id}`, payload);
      setShowEditModal(false);
      await fetchPersonnel();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update personnel');
    }
  };

  const handleOpenReassign = (p) => {
    setReassignForm({
      personnelId: p._id || p.participantId,
      personnelName: p.name,
      currentBase: p.baseName || 'Maitri Station',
      targetBaseName: p.baseName === 'Bharati Station' ? 'Maitri Station' : 'Bharati Station',
      notes: '',
    });
    setShowReassignModal(true);
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/personnel/${reassignForm.personnelId}/reassign`, {
        targetBaseName: reassignForm.targetBaseName,
        notes: reassignForm.notes,
      });
      setShowReassignModal(false);
      await fetchPersonnel();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign personnel');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedPersonnel) return;
    try {
      await api.delete(`/personnel/${selectedPersonnel._id || selectedPersonnel.participantId}`);
      setShowDeleteModal(false);
      setSelectedPersonnelId(null);
      await fetchPersonnel();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete personnel record');
    }
  };

  const exportRosterJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(personnel, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `polaris_personnel_roster_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-14 font-body text-slate-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-cyan-400" />
              <span>POLAR PERSONNEL & SCIENCE ROSTER</span>
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(40,169,245,0.25)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              STATION CREW ACTIVE
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Wintering crew manifests, in-field science deployments, medical clearances, and inter-station transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs font-mono">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid Dossier View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={exportRosterJson}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Roster</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-semibold text-xs font-mono shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Personnel</span>
          </button>
        </div>
      </div>

      {/* Reactive KPI Roster Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Crew */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">TOTAL CREW COMPLEMENT</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.totalCrew}</span>
            <span className="text-xs font-mono text-slate-400">scientists & crew</span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Across 4 polar sectors</span>
          </div>
        </div>

        {/* KPI 2: Field Deployed */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(40,169,245,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300">FIELD DEPLOYED</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300">{kpiData.deployed}</span>
            <span className="text-xs font-mono text-cyan-400/80">traverses & camps</span>
          </div>
          <div className="mt-2 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Active outside base perimeter</span>
          </div>
        </div>

        {/* KPI 3: Station Resident */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(49,212,154,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-300">STATION RESIDENT</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-300">{kpiData.atBase}</span>
            <span className="text-xs font-mono text-slate-400">sheltered at base</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400/80 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nominal life support coverage</span>
          </div>
        </div>

        {/* KPI 4: In Transit Corridor */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(246,200,95,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-300">IN TRANSIT</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">{kpiData.inTransit}</span>
            <span className="text-xs font-mono text-slate-400">en-route</span>
          </div>
          <div className="mt-2 text-xs font-mono text-amber-400 truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Air/Vessel courier legs</span>
          </div>
        </div>

        {/* KPI 5: Medical Clearance Rate */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">MEDICAL READINESS</span>
            <HeartPulse className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.medicalClearanceRate}%</span>
            <span className="text-xs font-mono text-slate-400">Class-1 Cleared</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sub-zero fitness verified</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Department Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 w-full lg:w-auto overflow-x-auto text-xs font-mono">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
                deptFilter === dept
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, role, skills, certifications..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Base:</span>
            <select
              value={baseFilter}
              onChange={(e) => setBaseFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Bases</option>
              <option value="Maitri" className="bg-slate-900 text-slate-200">Maitri Station</option>
              <option value="Bharati" className="bg-slate-900 text-slate-200">Bharati Station</option>
              <option value="Himadri" className="bg-slate-900 text-slate-200">Himadri Station</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="Active" className="bg-slate-900 text-slate-200">Active</option>
              <option value="Deployed" className="bg-slate-900 text-slate-200">Deployed (Field)</option>
              <option value="At Base" className="bg-slate-900 text-slate-200">At Base</option>
              <option value="In Transit" className="bg-slate-900 text-slate-200">In Transit</option>
              <option value="Standby" className="bg-slate-900 text-slate-200">Standby</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Shift:</span>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Shifts</option>
              <option value="Alpha" className="bg-slate-900 text-slate-200">Alpha (Day)</option>
              <option value="Bravo" className="bg-slate-900 text-slate-200">Bravo (Night)</option>
              <option value="Charlie" className="bg-slate-900 text-slate-200">Charlie (Swing)</option>
              <option value="Continuous" className="bg-slate-900 text-slate-200">Continuous</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Split Layout: Crew Grid/Table (Left) & Operator Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personnel List View */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'grid' ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-2 p-12 text-center text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No personnel match your criteria</p>
                  <p className="text-xs text-slate-500 mt-1">Try resetting search queries or department filters</p>
                </div>
              ) : (
                filtered.map((p) => {
                  const isSelected =
                    selectedPersonnel?._id === p._id || selectedPersonnel?.participantId === p.participantId;
                  const statusMeta = STATUS_CONFIG[p.status] || STATUS_CONFIG['Active'];
                  const deptMeta = DEPT_BADGES[p.department] || DEPT_BADGES['General'];

                  return (
                    <div
                      key={p._id || p.participantId}
                      onClick={() => setSelectedPersonnelId(p._id || p.participantId)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/80 shadow-[0_0_16px_rgba(40,169,245,0.2)]'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        {/* Top Card Line */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-700 border border-cyan-400/40 flex items-center justify-center font-bold text-sm text-slate-950 shadow-md">
                              {p.name ? p.name.charAt(0) : 'P'}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
                                {p.name}
                              </h3>
                              <span className="text-[11px] font-mono text-cyan-400 block font-semibold">
                                {p.employeeId || p.participantId} • {p.rank || 'Specialist'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            {p.status}
                          </span>
                        </div>

                        {/* Middle Specs Line */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-slate-400">
                            <span>Role / Title:</span>
                            <span className="text-slate-200 font-semibold truncate max-w-[170px]">
                              {p.role || p.designation}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Department:</span>
                            <span className={`font-semibold ${deptMeta.color}`}>{p.department}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Deployment:</span>
                            <span className="text-slate-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400/80" />
                              <span>{p.baseName}</span>
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Shift / Watch:</span>
                            <span className="text-slate-300">{p.shift || 'Alpha (Day)'}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Medical:</span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {p.medicalClearance} ({p.bloodGroup || 'O+'})
                            </span>
                          </div>
                        </div>

                        {/* Skills Tags */}
                        {toArray(p.skills).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {toArray(p.skills).slice(0, 3).map((skill, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                              >
                                {skill}
                              </span>
                            ))}
                            {toArray(p.skills).length > 3 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-500 border border-slate-800">
                                +{toArray(p.skills).length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Quick Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                          {p.phone || p.email}
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenReassign(p)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-600 text-cyan-300 text-[11px] transition-all cursor-pointer"
                            title="Reassign Station"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Dense Table View */
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-[11px]">
                      <th className="py-3 px-4 font-medium">Operator</th>
                      <th className="py-3 px-4 font-medium">Role & Department</th>
                      <th className="py-3 px-4 font-medium">Base Station</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Shift</th>
                      <th className="py-3 px-4 font-medium">Medical</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.map((p) => {
                      const isSelected =
                        selectedPersonnel?._id === p._id || selectedPersonnel?.participantId === p.participantId;
                      const statusMeta = STATUS_CONFIG[p.status] || STATUS_CONFIG['Active'];
                      const deptMeta = DEPT_BADGES[p.department] || DEPT_BADGES['General'];

                      return (
                        <tr
                          key={p._id || p.participantId}
                          onClick={() => setSelectedPersonnelId(p._id || p.participantId)}
                          className={`transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-slate-800/90 border-l-4 border-l-cyan-400 shadow-inner'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              <span className="font-bold text-slate-100 group-hover:text-cyan-300">
                                {p.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              {p.employeeId || p.participantId}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-sans text-slate-200">
                            <div className="font-semibold text-xs">{p.role || p.designation}</div>
                            <span className={`text-[10px] font-mono ${deptMeta.color}`}>{p.department}</span>
                          </td>

                          <td className="py-3 px-4 text-slate-300">
                            <span className="text-slate-200 font-medium">{p.baseName}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.color}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${statusMeta.dot}`} />
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-300">{p.shift || 'Alpha'}</td>

                          <td className="py-3 px-4 text-emerald-400 font-medium">
                            {p.medicalClearance} ({p.bloodGroup || 'O+'})
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenReassign(p)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-600 text-cyan-300 text-[11px] transition-all cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Deep Personnel Dossier */}
        <div className="lg:col-span-4 space-y-6">
          <PersonnelErrorBoundary onReset={() => setSelectedPersonnelId(null)}>
            {selectedPersonnel ? (
            <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl space-y-6">
              {/* Dossier Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-700 border border-cyan-400/40 flex items-center justify-center font-bold text-base text-slate-950 shadow-md">
                    {selectedPersonnel.name ? selectedPersonnel.name.charAt(0) : 'P'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-sans tracking-wide">
                      {selectedPersonnel.name}
                    </h3>
                    <div className="text-xs font-mono text-cyan-400 mt-0.5">
                      {selectedPersonnel.employeeId || selectedPersonnel.participantId} • {selectedPersonnel.rank}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(selectedPersonnel)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                    title="Edit Record"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Personnel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Station Deployment Banner */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>CURRENT STATION ASSIGNMENT</span>
                  <span className="text-cyan-400 font-bold">{selectedPersonnel.department}</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    {selectedPersonnel.baseName}
                  </span>
                  <button
                    onClick={() => handleOpenReassign(selectedPersonnel)}
                    className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Transfer Station
                  </button>
                </div>
              </div>

              {/* Core Credentials Grid */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ROLE / SPECIALTY</span>
                  <span className="text-xs font-bold text-slate-200 block truncate mt-0.5">
                    {selectedPersonnel.role || selectedPersonnel.designation}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Team: {selectedPersonnel.team || 'Standard Crew'}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">SHIFT ROTATION</span>
                  <span className="text-xs font-bold text-cyan-300 block truncate mt-0.5">
                    {selectedPersonnel.shift || 'Alpha (Day)'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Status: {selectedPersonnel.status}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MEDICAL STATUS</span>
                  <span className="text-xs font-bold text-emerald-400 block truncate mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedPersonnel.medicalClearance}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Blood Type: {selectedPersonnel.bloodGroup || 'O+'}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">CONTACT UPLINK</span>
                  <span className="text-xs font-bold text-slate-300 block truncate mt-0.5">
                    {selectedPersonnel.phone || '+91-XXX'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">{selectedPersonnel.email || 'N/A'}</span>
                </div>
              </div>

              {/* Emergency Contact */}
              {selectedPersonnel.emergencyContact && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">NEXT OF KIN / EMERGENCY CALLOUT</span>
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>
                      {typeof selectedPersonnel.emergencyContact === 'object'
                        ? selectedPersonnel.emergencyContact.name || 'Emergency Contact On File'
                        : 'Emergency Contact'}
                    </span>
                    <span className="text-cyan-400">
                      {typeof selectedPersonnel.emergencyContact === 'object'
                        ? selectedPersonnel.emergencyContact.phone || '+91-11-24360000'
                        : String(selectedPersonnel.emergencyContact || 'N/A')}
                    </span>
                  </div>
                  {typeof selectedPersonnel.emergencyContact === 'object' && selectedPersonnel.emergencyContact.relationship && (
                    <span className="text-[10px] text-slate-500 block">
                      Relationship: {selectedPersonnel.emergencyContact.relationship}
                    </span>
                  )}
                </div>
              )}

              {/* Certifications and Skills */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Polar Qualifications & Certifications</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {toArray(selectedPersonnel.certifications).length > 0 ? (
                    toArray(selectedPersonnel.certifications).map((cert, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 border border-cyan-700/60 text-cyan-300"
                      >
                        {typeof cert === 'string' ? cert : JSON.stringify(cert)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Standard Polar Certification V4</span>
                  )}
                </div>
              </div>

              {/* Movement & Deployment History */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deployment Timeline ({selectedPersonnel.movementHistory?.length || 0})</span>
                  </span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedPersonnel.movementHistory && selectedPersonnel.movementHistory.length > 0 ? (
                    selectedPersonnel.movementHistory.map((step, idx) => (
                      <div key={step._id || idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300">{step.event}</span>
                          <span className="text-[10px] text-slate-500">
                            {step.timestamp ? new Date(step.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Logged'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{step.location || step.baseName || 'Station'}</span>
                        </div>
                        {step.notes && <p className="text-[11px] text-slate-400 font-sans mt-1">{step.notes}</p>}
                        {step.updatedBy && <span className="text-[10px] text-slate-600 block mt-1">Logged by: {step.updatedBy}</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 font-mono py-2">No movement logs recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">Select an operator</p>
              <p className="text-xs text-slate-500 mt-1">Click any card to inspect credentials and deployment timeline.</p>
            </div>
          )}
          </PersonnelErrorBoundary>
        </div>
      </div>

      {/* ONBOARD PERSONNEL MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard New Polar Personnel"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">FULL NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Lucas Lindeman"
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">DEPARTMENT *</label>
              <select
                value={newPerson.department}
                onChange={(e) => setNewPerson({ ...newPerson, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Science">Science</option>
                <option value="Operations">Operations</option>
                <option value="Medical">Medical</option>
                <option value="Command">Command</option>
                <option value="Logistics">Logistics</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">ROLE / TITLE *</label>
              <input
                type="text"
                required
                placeholder="e.g. Lead Glaciologist"
                value={newPerson.designation}
                onChange={(e) => setNewPerson({ ...newPerson, designation: e.target.value, role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">RANK</label>
              <input
                type="text"
                placeholder="e.g. Senior Specialist"
                value={newPerson.rank}
                onChange={(e) => setNewPerson({ ...newPerson, rank: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">SHIFT ROTATION</label>
              <select
                value={newPerson.shift}
                onChange={(e) => setNewPerson({ ...newPerson, shift: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Alpha (Day)">Alpha (Day)</option>
                <option value="Bravo (Night)">Bravo (Night)</option>
                <option value="Charlie (Swing)">Charlie (Swing)</option>
                <option value="Continuous Watch">Continuous Watch</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">DEPLOYMENT BASE *</label>
              <select
                value={newPerson.baseName}
                onChange={(e) => setNewPerson({ ...newPerson, baseName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Maitri Station">Maitri Station</option>
                <option value="Bharati Station">Bharati Station</option>
                <option value="Himadri Station">Himadri Station</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">MEDICAL CLEARANCE</label>
              <select
                value={newPerson.medicalClearance}
                onChange={(e) => setNewPerson({ ...newPerson, medicalClearance: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Cleared">Cleared (Full Arctic/Antarctic)</option>
                <option value="Conditional">Conditional (Indoor Base Duty)</option>
                <option value="Restricted Duty">Restricted Duty</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">BLOOD GROUP</label>
              <select
                value={newPerson.bloodGroup}
                onChange={(e) => setNewPerson({ ...newPerson, bloodGroup: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">EMAIL / UPLINK</label>
              <input
                type="email"
                placeholder="name@polaris.aq"
                value={newPerson.email}
                onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="+91-9876543210"
                value={newPerson.phone}
                onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">SKILLS & SPECIALTIES (COMMA SEPARATED)</label>
            <input
              type="text"
              placeholder="Deep Ice-Coring, Crevasse Radar, Cryo-Handling, Lidar"
              value={newPerson.skills}
              onChange={(e) => setNewPerson({ ...newPerson, skills: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">EMERGENCY CONTACT NAME</label>
              <input
                type="text"
                placeholder="Kin Name"
                value={newPerson.emergencyContactName}
                onChange={(e) => setNewPerson({ ...newPerson, emergencyContactName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">EMERGENCY PHONE</label>
              <input
                type="text"
                placeholder="+91-..."
                value={newPerson.emergencyContactPhone}
                onChange={(e) => setNewPerson({ ...newPerson, emergencyContactPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">RELATIONSHIP</label>
              <input
                type="text"
                placeholder="Spouse / Parent / Sibling"
                value={newPerson.emergencyContactRelation}
                onChange={(e) => setNewPerson({ ...newPerson, emergencyContactRelation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-bold hover:brightness-110 shadow-[0_0_12px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
            >
              Authorize & Onboard
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PERSONNEL MODAL */}
      {editPerson && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Personnel Record: ${editPerson.name} (${editPerson.participantId})`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 font-mono text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={editPerson.name}
                  onChange={(e) => setEditPerson({ ...editPerson, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">DEPARTMENT</label>
                <select
                  value={editPerson.department}
                  onChange={(e) => setEditPerson({ ...editPerson, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="Science">Science</option>
                  <option value="Operations">Operations</option>
                  <option value="Medical">Medical</option>
                  <option value="Command">Command</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Engineering">Engineering</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">ROLE / TITLE</label>
                <input
                  type="text"
                  value={editPerson.role}
                  onChange={(e) => setEditPerson({ ...editPerson, role: e.target.value, designation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">RANK</label>
                <input
                  type="text"
                  value={editPerson.rank}
                  onChange={(e) => setEditPerson({ ...editPerson, rank: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">STATUS</label>
                <select
                  value={editPerson.status}
                  onChange={(e) => setEditPerson({ ...editPerson, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="Active">Active</option>
                  <option value="Deployed">Deployed</option>
                  <option value="At Base">At Base</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Standby">Standby</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">SKILLS (COMMA SEPARATED)</label>
                <input
                  type="text"
                  value={editPerson.skills}
                  onChange={(e) => setEditPerson({ ...editPerson, skills: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">MEDICAL CLEARANCE</label>
                <select
                  value={editPerson.medicalClearance}
                  onChange={(e) => setEditPerson({ ...editPerson, medicalClearance: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="Cleared">Cleared</option>
                  <option value="Conditional">Conditional</option>
                  <option value="Restricted Duty">Restricted Duty</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
              >
                Save Record Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* REASSIGN STATION MODAL */}
      <Modal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        title={`Reassign Station: ${reassignForm.personnelName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">CURRENT STATION</span>
            <span className="text-sm font-bold text-slate-200">{reassignForm.currentBase}</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">TARGET POLAR OUTPOST / STATION *</label>
            <select
              value={reassignForm.targetBaseName}
              onChange={(e) => setReassignForm({ ...reassignForm, targetBaseName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-bold"
            >
              <option value="Maitri Station">Maitri Station (Schirmacher Oasis)</option>
              <option value="Bharati Station">Bharati Station (Larsemann Hills)</option>
              <option value="Himadri Station">Himadri Station (Ny-Ålesund, Svalbard)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">TRANSFER ORDERS / FLIGHT NOTES</label>
            <textarea
              rows={3}
              placeholder="e.g. Authorized transfer for season core-drilling campaign via Ski-Plane flight SK-902."
              value={reassignForm.notes}
              onChange={(e) => setReassignForm({ ...reassignForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowReassignModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-bold hover:brightness-110 shadow-[0_0_12px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
            >
              Confirm Transfer Order
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Personnel Removal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">Permanent Record Deletion</p>
              <p className="text-slate-400 mt-1">
                Are you sure you want to delete the record for <strong className="text-slate-200">{selectedPersonnel?.name}</strong> ({selectedPersonnel?.employeeId || selectedPersonnel?.participantId})? This will archive all assignment timelines.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSubmit}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PersonnelPage;
