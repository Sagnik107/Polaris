import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';

// Curated distinct polar expedition photography pool
const EXPEDITION_PHOTOS = [
  {
    url: '/images/expedition_traverse.png',
    tag: 'LIVE CONVOY TRAVERSE FEED',
    title: 'Polar Expedition Traverse & Over-Ice Vehicles',
  },
  {
    url: '/images/polar_base.png',
    tag: 'STATION COMMAND FEED',
    title: 'Antarctic Base Outpost & Operations Center',
  },
  {
    url: '/images/polar_overview.png',
    tag: 'HIGH-LATITUDE SATELLITE RECON',
    title: 'Polar Ice Field & Traverse Reconnaissance',
  },
  {
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1XAS-cGiVStzv8bh8ztpU3ZcvwOM7DzMClTvIbLwMP1JoiSTeW_9ZEroxF3JXZUeznK9e3REfzfkdys3EujEsKKrzP-6Ukoy7YoNfyrz4qEHhkk0Z2RC3db9zsA4nWQ_mnpddZ4AlC9WKF5l6DDLi6aWsD-cprpoGIEio0U2h6w9HGTcvNaO4ni5M37KSVQho3ZEPTB557t7VGshh--bsfiSBQ1S1RQkHSHn77lVCFccp58YbLM7lU88WM',
    tag: 'MARITIME ICEBREAKER BRIDGE',
    title: 'Polar Research Vessel Navigating Pack Ice',
  },
  {
    url: '/images/inventory_depot.png',
    tag: 'DEPOT LOGISTICS RECON',
    title: 'Polar Supply Depot & Cargo Staging Area',
  },
  {
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1VL6Ze4liEEnPKoI0ByA9VlQwf4slB9Oe4hy18P6owN5ehFPm7W_DMTCgAMskZkN_H0S3ol-aqiExej0n3pkVhdo7oZgVF3pvVu7ZPUrBvgp9BrjvLyc32A9PAP-PIb_nGqL0siSFgJAizf6M5dFSGCUVia4zWrMPaiTvg5WwVcdiOAYmIRXHxK1BNmjhUXkS1n8_pZ-Yp2JMDKEGidr76TdCTy71tA59c8VUoEG3jgRKb_vTpWaI1Nh33t',
    tag: 'OPTICAL AURORA FLUX ARRAY',
    title: 'Glacial Twilight & Geomagnetic Aurora Survey',
  },
];

const BASES_LIST = [
  { id: 'Maitri Station', name: 'Maitri Station (70°45′58″S, 11°43′56″E)' },
  { id: 'Bharati Station', name: 'Bharati Station (69°24.41′S, 76°11.72′E)' },
  { id: 'Himadri Station', name: 'Himadri Station (78°55′N, 11°56′E)' },
];

const TYPES_LIST = [
  'Antarctic',
  'Arctic',
  'Southern Ocean',
  'Deep Field Traverse',
  'Glaciological',
  'Atmospheric',
];

export const ExpeditionsPage = () => {
  const navigate = useNavigate();
  const [expeditions, setExpeditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters & Controls
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterBase, setFilterBase] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editExp, setEditExp] = useState(null);

  const initialNewExp = {
    name: '',
    expeditionCode: '',
    type: 'Antarctic',
    destinationBase: 'Bharati Station',
    baseName: 'Bharati Station',
    region: 'East Antarctica',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    leader: 'Dr. Rajesh Sharma',
    budget: 1500000,
    description: '',
    image: '',
    status: 'Planning',
  };

  const [newExp, setNewExp] = useState(initialNewExp);

  const fetchExpeditions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expeditions');
      setExpeditions(res.data?.data || []);
      setErrorMessage('');
    } catch (err) {
      console.error('Error loading expeditions:', err);
      setErrorMessage('Failed to load expeditions from command server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpeditions();
  }, []);

  // Real-time socket listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = (newDoc) => {
      setExpeditions((prev) => {
        if (prev.some((e) => (e._id || e.id) === (newDoc._id || newDoc.id))) return prev;
        return [newDoc, ...prev];
      });
    };

    const handleUpdated = (updatedDoc) => {
      setExpeditions((prev) =>
        prev.map((e) => ((e._id || e.id) === (updatedDoc._id || updatedDoc.id) ? { ...e, ...updatedDoc } : e))
      );
    };

    const handleDeleted = ({ id }) => {
      setExpeditions((prev) => prev.filter((e) => (e._id || e.id) !== id && e.code !== id));
    };

    socket.on('expedition:created', handleCreated);
    socket.on('expedition:updated', handleUpdated);
    socket.on('expedition:deleted', handleDeleted);

    return () => {
      socket.off('expedition:created', handleCreated);
      socket.off('expedition:updated', handleUpdated);
      socket.off('expedition:deleted', handleDeleted);
    };
  }, []);

  // Live counts for status tabs
  const tabCounts = useMemo(() => {
    return {
      all: expeditions.length,
      planning: expeditions.filter((e) => e.status === 'Planning').length,
      active: expeditions.filter((e) => e.status === 'Active' || e.status === 'In Progress').length,
      completed: expeditions.filter((e) => e.status === 'Completed').length,
      archived: expeditions.filter((e) => e.status === 'Archived').length,
    };
  }, [expeditions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (new Date(newExp.endDate) < new Date(newExp.startDate)) {
      setErrorMessage('Mission End Date must be on or after Start Date.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...newExp,
        code: newExp.expeditionCode,
        baseName: newExp.destinationBase,
      };
      const res = await api.post('/expeditions', payload);
      const created = res.data?.data;
      if (created) {
        setExpeditions((prev) => [created, ...prev]);
      } else {
        await fetchExpeditions();
      }
      setShowCreateModal(false);
      setNewExp(initialNewExp);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch new expedition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (new Date(editExp.endDate) < new Date(editExp.startDate)) {
      setErrorMessage('Mission End Date must be on or after Start Date.');
      return;
    }

    try {
      setSubmitting(true);
      const id = editExp._id || editExp.id || editExp.code;
      const payload = {
        ...editExp,
        baseName: editExp.targetBase || editExp.destinationBase?.name || editExp.destinationBase || editExp.baseName,
      };
      const res = await api.put(`/expeditions/${id}`, payload);
      const updated = res.data?.data;
      if (updated) {
        setExpeditions((prev) =>
          prev.map((e) => ((e._id || e.id) === (updated._id || updated.id) ? updated : e))
        );
      } else {
        await fetchExpeditions();
      }
      setShowEditModal(false);
      setEditExp(null);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update expedition details');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (exp) => {
    setErrorMessage('');
    setEditExp({
      ...exp,
      expeditionCode: exp.expeditionCode || exp.code || '',
      targetBase: exp.destinationBase?.name || exp.baseName || exp.targetBase || 'Bharati Station',
      destinationBase: exp.destinationBase?._id || exp.destinationBase || exp.baseName || 'Bharati Station',
      startDate: exp.startDate ? exp.startDate.slice(0, 10) : '2026-11-01',
      endDate: exp.endDate ? exp.endDate.slice(0, 10) : '2027-02-28',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (exp) => {
    const id = exp._id || exp.id || exp.code;
    const expTitle = exp.name || exp.code;
    if (!window.confirm(`Are you sure you want to delete / decommission expedition "${expTitle}"?`)) return;
    
    try {
      await api.delete(`/expeditions/${id}`);
      setExpeditions((prev) => prev.filter((e) => (e._id || e.id) !== id && e.code !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove expedition');
    }
  };

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    return expeditions
      .filter((exp) => {
        // Status filter
        if (filterTab === 'planning' && exp.status !== 'Planning') return false;
        if (filterTab === 'active' && exp.status !== 'Active' && exp.status !== 'In Progress') return false;
        if (filterTab === 'completed' && exp.status !== 'Completed') return false;
        if (filterTab === 'archived' && exp.status !== 'Archived') return false;

        // Type filter
        if (filterType !== 'all' && exp.type?.toLowerCase() !== filterType.toLowerCase()) {
          return false;
        }

        // Base filter
        if (filterBase !== 'all') {
          const expBase = (exp.baseName || exp.destinationBase?.name || exp.targetBase || '').toLowerCase();
          if (!expBase.includes(filterBase.toLowerCase())) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            exp.name?.toLowerCase().includes(q) ||
            (exp.expeditionCode || exp.code)?.toLowerCase().includes(q) ||
            exp.leader?.toLowerCase().includes(q) ||
            exp.type?.toLowerCase().includes(q) ||
            (exp.baseName || exp.destinationBase?.name || exp.targetBase)?.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.startDate || b.createdAt || 0) - new Date(a.startDate || a.createdAt || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.startDate || a.createdAt || 0) - new Date(b.startDate || b.createdAt || 0);
        }
        if (sortBy === 'readiness') {
          return (b.readinessScore || 0) - (a.readinessScore || 0);
        }
        if (sortBy === 'progress') {
          return (b.progress || 0) - (a.progress || 0);
        }
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [expeditions, filterTab, filterType, filterBase, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-text-primary tracking-tight">
              EXPEDITIONS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono tracking-wider uppercase">
              Polar Operational Fleet
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 border border-success/30 text-success text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              TELEMETRY LIVE
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            Plan, dispatch and track polar research expeditions, traverse operations and Antarctic logistics missions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const dataStr =
                'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(expeditions, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', 'polaris_expeditions_manifest.json');
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-secondary hover:text-text-primary transition-all text-xs font-mono cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">file_download</span>
            <span>Export Manifest</span>
          </button>

          {/* Primary Ice-Blue Gradient Action Button */}
          <button
            onClick={() => {
              setErrorMessage('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] hover:brightness-110 text-polar-950 font-semibold text-xs font-mono transition-all shadow-[0_0_16px_rgba(40,169,245,0.35)] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg font-bold">add</span>
            <span>New Expedition</span>
          </button>
        </div>
      </section>

      {/* FILTER & CONTROL BAR */}
      <section className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-4 shadow-sm">
        {/* Top Row: Segmented Tabs & Search Input */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center p-1 rounded-lg bg-polar-900 border border-border-default text-xs font-mono gap-1">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              All ({tabCounts.all})
            </button>
            <button
              onClick={() => setFilterTab('planning')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'planning'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Planning ({tabCounts.planning})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Active ({tabCounts.active})
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'completed'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Completed ({tabCounts.completed})
            </button>
            {tabCounts.archived > 0 && (
              <button
                onClick={() => setFilterTab('archived')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filterTab === 'archived'
                    ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
                }`}
              >
                Archived ({tabCounts.archived})
              </button>
            )}
          </div>

          {/* Expedition Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <span className="material-symbols-outlined text-lg">search</span>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-polar-850 border border-border-default text-text-primary placeholder:text-text-muted text-xs font-mono focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-ice-500 transition-all"
              placeholder="Search by code, title, base or commander..."
            />
          </div>
        </div>

        {/* Bottom Row: Multi-Dropdown Filters & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-default/60">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            {/* Filter by Type */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-ice-400">category</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent border-none text-text-primary outline-none cursor-pointer"
              >
                <option value="all" className="bg-polar-900 text-text-primary">Type: All</option>
                {TYPES_LIST.map((t) => (
                  <option key={t} value={t} className="bg-polar-900 text-text-primary">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Base */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-ice-400">home_pin</span>
              <select
                value={filterBase}
                onChange={(e) => setFilterBase(e.target.value)}
                className="bg-transparent border-none text-text-primary outline-none cursor-pointer"
              >
                <option value="all" className="bg-polar-900 text-text-primary">Base: All Stations</option>
                <option value="Maitri" className="bg-polar-900 text-text-primary">Maitri</option>
                <option value="Bharati" className="bg-polar-900 text-text-primary">Bharati</option>
                <option value="Himadri" className="bg-polar-900 text-text-primary">Himadri</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-ice-400">sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-text-primary outline-none cursor-pointer"
              >
                <option value="newest" className="bg-polar-900 text-text-primary">Sort: Date (Newest)</option>
                <option value="oldest" className="bg-polar-900 text-text-primary">Sort: Date (Oldest)</option>
                <option value="readiness" className="bg-polar-900 text-text-primary">Sort: Readiness (High)</option>
                <option value="progress" className="bg-polar-900 text-text-primary">Sort: Progress (High)</option>
                <option value="name" className="bg-polar-900 text-text-primary">Sort: Name (A-Z)</option>
              </select>
            </div>

            {(filterTab !== 'all' || filterType !== 'all' || filterBase !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterTab('all');
                  setFilterType('all');
                  setFilterBase('all');
                  setSearchQuery('');
                }}
                className="text-ice-400 hover:text-ice-200 underline ml-2 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-polar-900 border border-border-default">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_8px_rgba(40,169,245,0.25)]'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_8px_rgba(40,169,245,0.25)]'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
            </button>
          </div>
        </div>
      </section>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-danger/15 border border-danger/40 text-danger text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-4 bg-surface-1 rounded-xl border border-border-default">
          <div className="w-10 h-10 border-2 border-ice-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-text-muted tracking-wider uppercase">
            Synchronizing Polar Expedition Manifests...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-4 bg-surface-1 rounded-xl border border-border-default text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted">explore_off</span>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">No Expeditions Found</h3>
            <p className="text-xs font-mono text-text-muted max-w-sm">
              No polar missions match your current filter criteria. Adjust your search or create a new expedition.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-500/40 text-xs font-mono cursor-pointer transition-all"
          >
            + Dispatch New Mission
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* EXPEDITIONS CARD GRID (2 COLUMNS) */
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map((exp, idx) => {
            const expId = exp._id || exp.id || exp.code;
            const isCompleted = exp.status === 'Completed';
            const isAtRisk = exp.riskLevel === 'High' || exp.riskLevel === 'Critical';
            const personnelCount = exp.assignedPersonnel?.length || exp.personnel?.length || 0;
            const resourcesCount = exp.assignedResources?.length || 0;
            const milestonesCount = exp.milestones?.length || 0;
            const completedMilestones = exp.milestones?.filter((m) => (m.status || '').toLowerCase() === 'completed')?.length || 0;
            const inProgressMilestones = exp.milestones?.filter((m) => {
              const s = (m.status || '').toLowerCase();
              return s === 'in_progress' || s === 'inprogress' || s === 'in progress';
            })?.length || 0;
            const expProgress = typeof exp.progress === 'number'
              ? exp.progress
              : milestonesCount > 0
              ? Math.min(100, Math.round(((completedMilestones * 1.0 + inProgressMilestones * 0.5) / milestonesCount) * 100))
              : 0;
            const baseDisplayName = exp.baseName || exp.destinationBase?.name || exp.targetBase || 'Station Base';

            return (
              <article
                key={expId || idx}
                onClick={() => navigate(`/expeditions/${expId}`)}
                className="p-5 rounded-xl bg-surface-1 backdrop-blur-md border border-border-strong hover:border-ice-400/70 transition-all duration-200 group relative flex flex-col justify-between shadow-[0_4px_24px_rgba(2,9,20,0.6)] cursor-pointer"
              >
                {/* Photo Banner */}
                {(() => {
                  const photoItem = EXPEDITION_PHOTOS[idx % EXPEDITION_PHOTOS.length];
                  const imgSrc = exp.image || photoItem.url;
                  const imgTag = photoItem.tag;
                  const imgTitle = photoItem.title;

                  return (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden mb-4 border border-border-default/80 group-hover:border-ice-400/50 transition-all">
                      <img
                        src={imgSrc}
                        alt={imgTitle}
                        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-all duration-500"
                        onError={(e) => {
                          e.currentTarget.src = photoItem.url;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-polar-950 via-polar-950/20 to-transparent" />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2/90 backdrop-blur-md border border-border-default text-[10px] font-mono text-ice-200 shadow-sm">
                        <span className="material-symbols-outlined text-xs text-aurora-400">satellite_alt</span>
                        <span>{imgTag}</span>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-polar-950/80 backdrop-blur-md border border-border-default text-[10px] font-mono text-text-muted flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span>CAM-0{((idx % 6) + 1)} [{exp.region || 'POLAR SECTOR'}]</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  {/* Header & Status Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-headline text-lg font-bold text-text-primary tracking-wide">
                          {exp.name}
                        </span>
                        <span className="text-xs font-mono text-ice-300 font-semibold px-2 py-0.5 rounded bg-polar-900 border border-border-default">
                          {exp.expeditionCode || exp.code || `EXP-${idx + 1}`}
                        </span>
                        {exp.type && (
                          <span className="text-[10px] font-mono text-text-secondary px-2 py-0.5 rounded bg-surface-2 border border-border-default">
                            {exp.type}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary font-medium line-clamp-2">
                        {exp.description || 'Indian Antarctic Research Traverse & Glaciological Sampling Mission'}
                      </div>
                    </div>

                    {/* Status pill */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono tracking-wider uppercase font-semibold shrink-0 ${
                        isCompleted
                          ? 'bg-polar-800 text-text-secondary border border-border-default'
                          : exp.status === 'Planning'
                          ? 'bg-ice-500/15 border border-ice-500/40 text-ice-300'
                          : isAtRisk
                          ? 'bg-warning/15 border border-warning/40 text-warning'
                          : 'bg-success/15 border border-success/40 text-success shadow-[0_0_12px_rgba(49,212,154,0.2)]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCompleted
                            ? 'bg-slate-400'
                            : exp.status === 'Planning'
                            ? 'bg-ice-400'
                            : isAtRisk
                            ? 'bg-warning'
                            : 'bg-success animate-pulse'
                        }`}
                      />
                      <span>{exp.status || 'Active'}</span>
                    </div>
                  </div>

                  {/* Operational Meta Indicators */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-polar-900/80 border border-border-default text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">OPERATIONAL BASE</span>
                      <span className="text-text-primary flex items-center gap-1.5 mt-0.5 font-medium">
                        <span className="material-symbols-outlined text-sm text-aurora-400">home_pin</span>
                        {baseDisplayName}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">EXPEDITION COMMANDER</span>
                      <span className="text-text-primary flex items-center gap-1.5 mt-0.5 font-medium">
                        <span className="material-symbols-outlined text-sm text-ice-400">person</span>
                        {exp.leader || 'Dr. Rajesh Sharma'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Telemetry Specs Bar */}
                  <div className="grid grid-cols-4 gap-1 py-2 text-center border-y border-border-default/60 text-xs font-mono">
                    <div className="flex flex-col items-center justify-center p-1">
                      <span className="text-[10px] text-text-muted">CREW</span>
                      <span className="text-aurora-400 font-bold mt-0.5 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">groups</span>
                        {personnelCount} PAX
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1 border-l border-border-default/60">
                      <span className="text-[10px] text-text-muted">RESOURCES</span>
                      <span className="text-ice-300 font-bold mt-0.5 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">inventory</span>
                        {resourcesCount} Units
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1 border-l border-border-default/60">
                      <span className="text-[10px] text-text-muted">MILESTONES</span>
                      <span className="text-text-primary font-bold mt-0.5">
                        {completedMilestones}/{milestonesCount}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1 border-l border-border-default/60">
                      <span className="text-[10px] text-text-muted">READINESS</span>
                      <span
                        className={`font-bold mt-0.5 ${
                          (exp.readinessScore || 0) >= 80
                            ? 'text-success'
                            : (exp.readinessScore || 0) >= 50
                            ? 'text-warning'
                            : 'text-danger'
                        }`}
                      >
                        {exp.readinessScore || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Route Progress and Action */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1 mr-4">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-text-muted">Milestone Progress</span>
                        <span className="text-ice-300 font-semibold">{expProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ice-500 to-aurora-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, expProgress))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(exp)}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-text-muted hover:text-ice-300 text-xs font-mono transition-all cursor-pointer"
                        title="Edit Expedition"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(exp)}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-surface-2 hover:bg-danger/20 border border-border-strong text-text-muted hover:text-danger text-xs font-mono transition-all cursor-pointer"
                        title="Decommission / Delete Expedition"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                      <button
                        onClick={() => navigate(`/expeditions/${expId}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-ice-300 hover:text-text-primary text-xs font-mono transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>Details</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* TABLE VIEW */
        <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-11 border-b border-border-strong bg-polar-800/80 text-xs font-mono uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2 font-semibold">Code / ID</th>
                  <th className="px-4 py-2 font-semibold">Mission Name</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Target Base</th>
                  <th className="px-4 py-2 font-semibold">Commander</th>
                  <th className="px-4 py-2 font-semibold">Crew</th>
                  <th className="px-4 py-2 font-semibold">Progress</th>
                  <th className="px-4 py-2 font-semibold">Readiness</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-xs font-mono">
                {filtered.map((exp, idx) => {
                  const expId = exp._id || exp.id || exp.code;
                  const msCount = exp.milestones?.length || 0;
                  const compCount = exp.milestones?.filter((m) => (m.status || '').toLowerCase() === 'completed')?.length || 0;
                  const inProgCount = exp.milestones?.filter((m) => {
                    const s = (m.status || '').toLowerCase();
                    return s === 'in_progress' || s === 'inprogress' || s === 'in progress';
                  })?.length || 0;
                  const tableProgress = typeof exp.progress === 'number'
                    ? exp.progress
                    : msCount > 0
                    ? Math.min(100, Math.round(((compCount * 1.0 + inProgCount * 0.5) / msCount) * 100))
                    : 0;

                  return (
                    <tr
                      key={expId || idx}
                      onClick={() => navigate(`/expeditions/${expId}`)}
                      className="h-12 hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2 text-ice-300 font-semibold font-mono">
                        {exp.expeditionCode || exp.code || `EXP-${idx + 1}`}
                      </td>
                      <td className="px-4 py-2 text-text-primary font-medium">{exp.name}</td>
                      <td className="px-4 py-2 text-text-secondary">{exp.type || 'Antarctic'}</td>
                      <td className="px-4 py-2 text-text-secondary">
                        {exp.baseName || exp.destinationBase?.name || exp.targetBase || 'Bharati'}
                      </td>
                      <td className="px-4 py-2 text-text-muted">{exp.leader || 'Dr. Rajesh Sharma'}</td>
                      <td className="px-4 py-2 text-aurora-400 font-semibold">
                        {exp.assignedPersonnel?.length || exp.personnel?.length || 0} PAX
                      </td>
                      <td className="px-4 py-2 text-ice-300 font-bold">{tableProgress}%</td>
                      <td className="px-4 py-2">
                        <span
                          className={`font-bold ${
                            (exp.readinessScore || 0) >= 80
                              ? 'text-success'
                              : (exp.readinessScore || 0) >= 50
                              ? 'text-warning'
                              : 'text-danger'
                          }`}
                        >
                          {exp.readinessScore || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            exp.status === 'Completed'
                              ? 'text-text-secondary border-border-default bg-surface-container'
                              : exp.status === 'Planning'
                              ? 'text-ice-300 border-ice-500/40 bg-ice-500/10'
                              : 'text-success border-success/30 bg-success/10'
                          }`}
                        >
                          {exp.status || 'Active'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2 text-right flex gap-2 justify-end items-center h-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/expeditions/${expId}`)}
                          className="text-ice-400 hover:underline cursor-pointer"
                        >
                          Inspect →
                        </button>
                        <button
                          onClick={() => openEditModal(exp)}
                          className="text-text-muted hover:text-ice-300 cursor-pointer flex items-center p-1"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(exp)}
                          className="text-text-muted hover:text-danger cursor-pointer flex items-center p-1"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ==================== CREATE EXPEDITION MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400 text-2xl">explore</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  Dispatch New Polar Expedition
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-danger/20 border border-danger/40 text-danger text-xs font-mono">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Mission Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newExp.name}
                    onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                    placeholder="e.g. 45th Indian Antarctic Expedition"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Expedition Code / ID <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newExp.expeditionCode}
                    onChange={(e) => setNewExp({ ...newExp, expeditionCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. INAE-45"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Mission Type</label>
                  <select
                    value={newExp.type}
                    onChange={(e) => setNewExp({ ...newExp, type: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    {TYPES_LIST.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Destination Base</label>
                  <select
                    value={newExp.destinationBase}
                    onChange={(e) =>
                      setNewExp({ ...newExp, destinationBase: e.target.value, baseName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    {BASES_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Initial Status</label>
                  <select
                    value={newExp.status}
                    onChange={(e) => setNewExp({ ...newExp, status: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newExp.startDate}
                    onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newExp.endDate}
                    onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Mission Commander / Leader <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newExp.leader}
                    onChange={(e) => setNewExp({ ...newExp, leader: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Budget Allocation (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={newExp.budget}
                    onChange={(e) => setNewExp({ ...newExp, budget: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Scientific Objectives & Description
                </label>
                <textarea
                  rows={3}
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  placeholder="Primary scientific scope, paleoclimate ice drilling, seismic survey..."
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_14px_rgba(40,169,245,0.4)] disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Mission Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT EXPEDITION MODAL ==================== */}
      {showEditModal && editExp && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400 text-2xl">edit_document</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  Edit Polar Expedition Order
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-danger/20 border border-danger/40 text-danger text-xs font-mono">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Mission Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editExp.name || ''}
                    onChange={(e) => setEditExp({ ...editExp, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Expedition Code / ID <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editExp.expeditionCode || editExp.code || ''}
                    onChange={(e) =>
                      setEditExp({ ...editExp, expeditionCode: e.target.value.toUpperCase(), code: e.target.value.toUpperCase() })
                    }
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Mission Type</label>
                  <select
                    value={editExp.type || 'Antarctic'}
                    onChange={(e) => setEditExp({ ...editExp, type: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    {TYPES_LIST.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Destination Base</label>
                  <select
                    value={editExp.targetBase || editExp.baseName || 'Bharati Station'}
                    onChange={(e) =>
                      setEditExp({
                        ...editExp,
                        targetBase: e.target.value,
                        baseName: e.target.value,
                        destinationBase: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    {BASES_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Operational Status</label>
                  <select
                    value={editExp.status || 'Active'}
                    onChange={(e) => setEditExp({ ...editExp, status: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editExp.startDate || ''}
                    onChange={(e) => setEditExp({ ...editExp, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editExp.endDate || ''}
                    onChange={(e) => setEditExp({ ...editExp, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Mission Commander</label>
                  <input
                    type="text"
                    required
                    value={editExp.leader || ''}
                    onChange={(e) => setEditExp({ ...editExp, leader: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Risk Level</label>
                  <select
                    value={editExp.riskLevel || 'Moderate'}
                    onChange={(e) => setEditExp({ ...editExp, riskLevel: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Budget (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={editExp.budget || 0}
                    onChange={(e) => setEditExp({ ...editExp, budget: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Scientific Objectives & Description
                </label>
                <textarea
                  rows={3}
                  value={editExp.description || ''}
                  onChange={(e) => setEditExp({ ...editExp, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_14px_rgba(40,169,245,0.4)] disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpeditionsPage;
