import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Curated distinct polar expedition photography pool (including user images)
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

export const ExpeditionsPage = () => {
  const navigate = useNavigate();
  const [expeditions, setExpeditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [newExp, setNewExp] = useState({
    name: '',
    code: '',
    description: '',
    targetBase: 'Maitri',
    region: 'East Antarctica',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    leader: 'Dr. V. Sen',
    image: '',
  });

  const fetchExpeditions = async () => {
    try {
      const res = await api.get('/expeditions');
      setExpeditions(res.data?.data || []);
    } catch (err) {
      console.error('Error loading expeditions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpeditions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expeditions', newExp);
      setShowCreateModal(false);
      fetchExpeditions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create expedition');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/expeditions/${editExp._id}`, editExp);
      setShowEditModal(false);
      fetchExpeditions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update expedition');
    }
  };

  const openEditModal = (exp) => {
    setEditExp(exp);
    setShowEditModal(true);
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Are you sure you want to archive this expedition?')) return;
    try {
      await api.delete(`/expeditions/${id}`);
      fetchExpeditions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive expedition');
    }
  };

  const filtered = expeditions.filter((exp) => {
    const matchesTab =
      filterTab === 'all'
        ? true
        : filterTab === 'active'
        ? exp.status === 'Active' || exp.status === 'In Progress'
        : filterTab === 'planning'
        ? exp.status === 'Planning'
        : filterTab === 'completed'
        ? exp.status === 'Completed'
        : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      exp.name?.toLowerCase().includes(query) ||
      exp.code?.toLowerCase().includes(query) ||
      exp.leader?.toLowerCase().includes(query) ||
      exp.targetBase?.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

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
              Operational Fleet
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            Plan, manage and track all polar research and logistics missions across high-latitude sectors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expeditions, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", "polaris_expeditions_manifest.json");
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
            onClick={() => setShowCreateModal(true)}
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
          <div className="flex items-center p-1 rounded-lg bg-polar-900 border border-border-default w-fit text-xs font-mono">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              All ({expeditions.length || 5})
            </button>
            <button
              onClick={() => setFilterTab('planning')}
              className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'planning'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Planning (1)
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Active (3)
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'completed'
                  ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              Completed (1)
            </button>
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
              placeholder="Search expeditions by code, base, or leader..."
            />
          </div>
        </div>

        {/* Bottom Row: Multi-Dropdown Filters & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-default/60">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <span className="text-text-muted uppercase tracking-wider mr-1">Filter By:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-ice-400">near_me</span>
              <span>Target Base: All Stations</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-warning">warning</span>
              <span>Risk Level: Any</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polar-850 border border-border-default text-text-secondary">
              <span className="material-symbols-outlined text-sm text-ice-300">date_range</span>
              <span>Season 2025/2026</span>
            </div>
            <button
              onClick={() => {
                setFilterTab('all');
                setSearchQuery('');
              }}
              className="text-ice-400 hover:text-ice-200 underline ml-2 cursor-pointer"
            >
              Clear filters
            </button>
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

      {/* EXPEDITIONS CARD GRID (2 COLUMNS) */}
      {viewMode === 'grid' ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map((exp, idx) => {
            const isAtRisk = exp.riskLevel === 'High' || exp.riskLevel === 'Critical';
            const isCompleted = exp.status === 'Completed';

            return (
              <article
                key={exp._id || exp.code || idx}
                className="p-5 rounded-xl bg-surface-1 backdrop-blur-md border border-border-strong hover:border-ice-400/70 transition-all duration-200 group relative flex flex-col justify-between shadow-[0_4px_24px_rgba(2,9,20,0.6)]"
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
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-lg font-bold text-text-primary tracking-wide">
                          {exp.name}
                        </span>
                        <span className="text-xs font-mono text-text-muted px-2 py-0.5 rounded bg-polar-900 border border-border-default">
                          {exp.code || `EXP-${idx + 1}`}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary font-medium">
                        {exp.description || 'Indian Antarctic Research Traverse'}
                      </div>
                    </div>

                    {/* Status pill */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono tracking-wider uppercase font-semibold ${
                        isCompleted
                          ? 'bg-polar-800 text-text-secondary border border-border-default'
                          : isAtRisk
                          ? 'bg-warning/15 border border-warning/40 text-warning'
                          : 'bg-success/15 border border-success/40 text-success shadow-[0_0_12px_rgba(49,212,154,0.2)]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCompleted ? 'bg-slate-400' : isAtRisk ? 'bg-warning' : 'bg-success animate-pulse'
                        }`}
                      />
                      <span>
                        {isCompleted
                          ? 'COMPLETED'
                          : isAtRisk
                          ? 'ACTIVE / AT RISK'
                          : 'ACTIVE / ON TRACK'}
                      </span>
                    </div>
                  </div>

                  {/* Operational Meta Indicators */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-polar-900/80 border border-border-default text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">DESTINATION</span>
                      <span className="text-text-primary flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-sm text-ice-400">public</span>
                        {exp.region || 'East Antarctica'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">TARGET BASE</span>
                      <span className="text-text-primary flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-sm text-aurora-400">home_pin</span>
                        {exp.targetBase || exp.baseName || exp.destinationBase?.name || 'Maitri'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Telemetry Specs Bar */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center border-y border-border-default/60 text-xs font-mono">
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-[10px] text-text-muted">WINDOW</span>
                      <span className="text-ice-200 mt-1">Dec 25 — Mar 26</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 border-x border-border-default/60">
                      <span className="text-[10px] text-text-muted">PERSONNEL</span>
                      <span className="text-text-primary flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-xs text-aurora-400">groups</span>
                        {exp.personnel?.length || 8} PAX
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-[10px] text-text-muted">READINESS</span>
                      <span className="text-ice-300 font-bold mt-1">
                        {exp.readinessScore || 87}%
                      </span>
                    </div>
                  </div>

                  {/* Route Progress and Action */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1 mr-4">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-text-muted">Route Traversed</span>
                        <span className="text-ice-300 font-semibold">{exp.progress || exp.readinessScore || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-polar-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ice-500 to-aurora-400 rounded-full"
                          style={{ width: `${exp.progress || exp.readinessScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(exp);
                        }}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-text-muted hover:text-ice-300 text-xs font-mono transition-all cursor-pointer"
                        title="Edit Expedition"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(exp._id);
                        }}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-surface-2 hover:bg-danger/20 border border-border-strong text-text-muted hover:text-danger text-xs font-mono transition-all cursor-pointer"
                        title="Archive Expedition"
                      >
                        <span className="material-symbols-outlined text-sm">archive</span>
                      </button>
                      <button
                        onClick={() => navigate(`/expeditions/${exp._id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-ice-300 hover:text-text-primary text-xs font-mono transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>Detail</span>
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
        /* Table View */
        <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-11 border-b border-border-strong bg-polar-800/80 text-xs font-mono uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2 font-semibold">Expedition Code</th>
                  <th className="px-4 py-2 font-semibold">Mission Name</th>
                  <th className="px-4 py-2 font-semibold">Base / Region</th>
                  <th className="px-4 py-2 font-semibold">Leader</th>
                  <th className="px-4 py-2 font-semibold">Personnel</th>
                  <th className="px-4 py-2 font-semibold">Readiness</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-xs font-mono">
                {filtered.map((exp, idx) => (
                  <tr key={idx} className="h-12 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-2 text-ice-300 font-semibold">{exp.code || `EXP-${idx + 1}`}</td>
                    <td className="px-4 py-2 text-text-primary font-medium">{exp.name}</td>
                    <td className="px-4 py-2 text-text-secondary">{exp.targetBase || exp.baseName || exp.destinationBase?.name} ({exp.region || 'East Antarctica'})</td>
                    <td className="px-4 py-2 text-text-muted">{exp.leader || 'Dr. V. Sen'}</td>
                    <td className="px-4 py-2 text-aurora-400">{exp.personnel?.length || 8} PAX</td>
                    <td className="px-4 py-2 text-ice-300 font-bold">{exp.readinessScore || 87}%</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded bg-surface-container text-xs border ${
                        exp.status === 'Completed' ? 'text-text-secondary border-border-default' :
                        (exp.riskLevel === 'High' || exp.riskLevel === 'Critical' ? 'text-warning border-warning/30' : 'text-success border-success/30')
                      }`}>
                        {exp.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right flex gap-3 justify-end items-center h-12">
                      <button
                        onClick={() => navigate(`/expeditions/${exp._id}`)}
                        className="text-ice-400 hover:underline cursor-pointer"
                      >
                        Inspect →
                      </button>
                      <button
                        onClick={() => openEditModal(exp)}
                        className="text-text-muted hover:text-ice-300 cursor-pointer flex items-center"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleArchive(exp._id)}
                        className="text-text-muted hover:text-danger cursor-pointer flex items-center"
                        title="Archive"
                      >
                        <span className="material-symbols-outlined text-sm">archive</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CREATE EXPEDITION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">explore</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">Dispatch New Polar Expedition</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Mission Title</label>
                <input
                  type="text"
                  required
                  value={newExp.name}
                  onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                  placeholder="e.g. Queen Maud Land Bedrock Survey"
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Order / Code</label>
                  <input
                    type="text"
                    required
                    value={newExp.code}
                    onChange={(e) => setNewExp({ ...newExp, code: e.target.value })}
                    placeholder="QML-2026"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Operating Base</label>
                  <select
                    value={newExp.targetBase}
                    onChange={(e) => setNewExp({ ...newExp, targetBase: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Maitri">Maitri Base (70°45'S)</option>
                    <option value="Bharati">Bharati Station (69°24'S)</option>
                    <option value="Himadri">Himadri Base (78°55'N)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Mission Leader</label>
                <input
                  type="text"
                  required
                  value={newExp.leader}
                  onChange={(e) => setNewExp({ ...newExp, leader: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Scientific Scope & Description</label>
                <textarea
                  rows={3}
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  placeholder="Detailed objectives, sub-zero instruments, core drilling..."
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Expedition Picture (File or URL)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newExp.image}
                    onChange={(e) => setNewExp({ ...newExp, image: e.target.value })}
                    placeholder="https://... or browse local image"
                    className="flex-1 p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                  <label className="px-3 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-ice-300 hover:text-white cursor-pointer transition-all whitespace-nowrap">
                    <span>Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setNewExp({ ...newExp, image: ev.target.result });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {newExp.image && (
                  <div className="mt-2 relative w-full h-24 rounded-lg overflow-hidden border border-border-strong">
                    <img src={newExp.image} alt="Expedition Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewExp({ ...newExp, image: '' })}
                      className="absolute top-1 right-1 bg-polar-950/80 text-danger text-[10px] px-1.5 py-0.5 rounded border border-danger/40 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
                >
                  Issue Mission Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPEDITION MODAL */}
      {showEditModal && editExp && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">edit_document</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">Edit Polar Expedition</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Mission Title</label>
                <input
                  type="text"
                  required
                  value={editExp.name || ''}
                  onChange={(e) => setEditExp({ ...editExp, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Order / Code</label>
                  <input
                    type="text"
                    required
                    value={editExp.code || ''}
                    onChange={(e) => setEditExp({ ...editExp, code: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Operating Base</label>
                  <select
                    value={editExp.targetBase || editExp.baseName || editExp.destinationBase?.name || 'Maitri'}
                    onChange={(e) => setEditExp({ ...editExp, targetBase: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Maitri">Maitri Base (70°45'S)</option>
                    <option value="Bharati">Bharati Station (69°24'S)</option>
                    <option value="Himadri">Himadri Base (78°55'N)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Mission Leader</label>
                <input
                  type="text"
                  required
                  value={editExp.leader || ''}
                  onChange={(e) => setEditExp({ ...editExp, leader: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Status</label>
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

              <div>
                <label className="block text-text-muted mb-1 uppercase">Scientific Scope & Description</label>
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
                >
                  Save Changes
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
