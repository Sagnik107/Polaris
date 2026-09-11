import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Printer,
  RotateCcw,
  Filter,
  Calendar,
  MapPin,
  Compass,
  Flame,
  ShieldAlert,
  Layers,
  Search,
  Activity,
  ChevronRight,
  Clock,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import StatusBadge from '../components/common/StatusBadge';

export const ReportsPage = () => {
  // Available report types
  const REPORT_MODULES = [
    {
      id: 'command-summary',
      name: 'Command Summary',
      icon: ShieldAlert,
      tag: 'EXECUTIVE OVERVIEW',
      desc: 'High-level operational health, cross-module KPI status, and critical hazard mitigation matrix.',
      statusOptions: ['All'],
    },
    {
      id: 'expeditions',
      name: 'Expeditions',
      icon: Compass,
      tag: 'TRAVERSE LOGS',
      desc: 'Scientific mission codes, milestone completion rates, traverse status, and risk assessment scores.',
      statusOptions: ['All', 'Active', 'Planning', 'Completed', 'Cancelled'],
    },
    {
      id: 'cargo',
      name: 'Cargo Manifests',
      icon: Layers,
      tag: 'COLD-CHAIN LOGISTICS',
      desc: 'Tracking numbers, weights, category breakdowns, pipeline status, and delayed route logs.',
      statusOptions: ['All', 'Planned', 'Packed', 'In Transit', 'At Base', 'Delivered', 'Delayed'],
    },
    {
      id: 'inventory',
      name: 'Inventory & Fuel',
      icon: Activity,
      tag: 'STATION RESERVES',
      desc: 'All inventory items, polar grade fuel reserves, safety thresholds, and sub-zero storage bays.',
      statusOptions: ['All', 'In Stock', 'Below Threshold'],
    },
    {
      id: 'personnel',
      name: 'Personnel Roster',
      icon: FileText,
      tag: 'OVERWINTERING CREW',
      desc: 'Active operational personnel, base deployments, roles, and emergency contacts.',
      statusOptions: ['All', 'Deployed', 'Available', 'At Base', 'In Transit', 'Emergency'],
    },
    {
      id: 'incidents',
      name: 'Emergency Incidents',
      icon: AlertTriangle,
      tag: 'HAZARD MITIGATION',
      desc: 'Severity levels, active triage states, environmental alarms, and timeline response logs.',
      statusOptions: ['All', 'Reported', 'Assessing', 'Responding', 'Resolved', 'Closed'],
    },
    {
      id: 'tasks',
      name: 'Tasks & Checklists',
      icon: CheckSquare,
      tag: 'OPERATIONAL TASKS',
      desc: 'Critical station checklists, generator maintenance, field protocols, and overdue directives.',
      statusOptions: ['All', 'Pending', 'In Progress', 'Overdue', 'Completed'],
    },
  ];

  // State
  const [selectedModule, setSelectedModule] = useState('command-summary');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBase, setSelectedBase] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Metadata for filter dropdowns
  const [bases, setBases] = useState([]);

  // Fetch available bases for filter
  useEffect(() => {
    const fetchBases = async () => {
      try {
        const res = await api.get('/bases');
        if (res.data?.success) {
          setBases(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch bases for report filter:', err);
      }
    };
    fetchBases();
  }, []);

  // Fetch operational report data
  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedModule,
        format: 'json',
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBase && selectedBase !== 'All') params.append('base', selectedBase);
      if (selectedStatus && selectedStatus !== 'All') params.append('status', selectedStatus);

      const res = await api.get(`/reports?${params.toString()}`);
      if (res.data?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load operational report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedStatus('All');
    fetchReport();
  }, [selectedModule]);

  // Handle CSV Download
  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const params = new URLSearchParams({
        type: selectedModule,
        format: 'csv',
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBase && selectedBase !== 'All') params.append('base', selectedBase);
      if (selectedStatus && selectedStatus !== 'All') params.append('status', selectedStatus);

      const res = await api.get(`/reports?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `POLARIS_${selectedModule.toUpperCase()}_REPORT_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('CSV Export failed. Check connection or telemetry logs.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Handle High-Fidelity Printable PDF Export
  const handlePrintPdf = () => {
    window.print();
  };

  // Active module object
  const activeModuleObj = REPORT_MODULES.find((m) => m.id === selectedModule) || REPORT_MODULES[0];

  // Filtered rows for table preview
  const tableRows = useMemo(() => {
    if (!reportData?.data) return [];
    if (!filterSearch.trim()) return reportData.data;
    const q = filterSearch.toLowerCase();
    return reportData.data.filter((item) => {
      return Object.values(item).some((val) =>
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [reportData, filterSearch]);

  const kpis = reportData?.kpis || {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    critical: 0,
    delayed: 0,
  };

  return (
    <div className="space-y-6">
      {/* Print-Only CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-dossier, #printable-report-dossier * {
            visibility: visible;
          }
          #printable-report-dossier {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 no-print">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-400" />
              Polar Command Intelligence & Mission Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
              OPERATIONAL TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            REAL-TIME STATION AUDITS, COLD-CHAIN MANIFESTS, HAZARD LOGS & COMPLIANCE BRIEFINGS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Refresh telemetry"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{downloadingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Module Selector Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        {REPORT_MODULES.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm shadow-sky-500/10 font-bold'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="polar-card p-4 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Station Base Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-[11px]">Station:</span>
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="All">All Stations</option>
              <option value="Maitri Station">Maitri Station</option>
              <option value="Bharati Station">Bharati Station</option>
              <option value="Himadri Station">Himadri Station</option>
              {bases.map((b) => (
                <option key={b._id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          {activeModuleObj.statusOptions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 text-[11px]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
              >
                {activeModuleObj.statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-[11px] focus:border-sky-500 focus:outline-none"
            />
            <span className="text-slate-600">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-[11px] focus:border-sky-500 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold cursor-pointer transition-all"
          >
            Apply Filters
          </button>

          {(selectedBase !== 'All' || selectedStatus !== 'All' || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedBase('All');
                setSelectedStatus('All');
                setStartDate('');
                setEndDate('');
                setTimeout(fetchReport, 10);
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick Search inside preview */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search within report..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Report Container (Printable Root) */}
      <div id="printable-report-dossier" className="space-y-6">
        {/* Dossier Header Info for Printing / Screen */}
        <div className="polar-card p-5 border-l-4 border-l-sky-500 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">
                {activeModuleObj.tag}
              </span>
              <h2 className="text-xl font-bold font-heading text-white tracking-tight mt-0.5">
                {reportData?.title || activeModuleObj.name}
              </h2>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400 space-y-0.5">
              <div>
                CLASSIFICATION: <span className="text-rose-400 font-bold">RESTRICTED // OPERATIONAL</span>
              </div>
              <div>
                GENERATED: {reportData?.generatedAt ? new Date(reportData.generatedAt).toLocaleString() : new Date().toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeModuleObj.desc}</p>
        </div>

        {/* KPIs Summary Strip (Shown BEFORE export) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Total Records</span>
              <FileText className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-white">{kpis.total}</div>
            <div className="text-[9px] font-mono text-slate-500">In filtered scope</div>
          </div>

          {/* Completed */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-300 uppercase">Completed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-emerald-300">{kpis.completed}</div>
            <div className="text-[9px] font-mono text-slate-500">Delivered / Finished</div>
          </div>

          {/* Pending */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-300 uppercase">Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-amber-300">{kpis.pending}</div>
            <div className="text-[9px] font-mono text-slate-500">Awaiting / In transit</div>
          </div>

          {/* Overdue */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-rose-300 uppercase font-bold">Overdue</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-rose-400">{kpis.overdue}</div>
            <div className="text-[9px] font-mono text-rose-400/80">Past deadline</div>
          </div>

          {/* Critical */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1">
                {kpis.critical > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                Critical
              </span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-rose-500">{kpis.critical}</div>
            <div className="text-[9px] font-mono text-slate-500">High hazard / Zero stock</div>
          </div>

          {/* Delayed */}
          <div className="polar-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-orange-300 uppercase">Delayed</span>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-heading text-orange-300">{kpis.delayed}</div>
            <div className="text-[9px] font-mono text-slate-500">Transit impedence</div>
          </div>
        </div>

        {/* COMMAND SUMMARY: CRITICAL OPERATIONAL ISSUES & IMPACT ANALYSIS */}
        {selectedModule === 'command-summary' && reportData?.criticalIssues && (
          <div className="polar-card p-5 space-y-4 border border-rose-500/40 bg-rose-950/10">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                    Critical Issues & Operational Impact Analysis
                  </h3>
                  <p className="text-[10px] font-mono text-rose-300">
                    DIRECT HAZARDS TO HABITAT INTEGRITY, GENERATOR POWER & LIFE-SUPPORT
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono text-xs font-bold">
                {reportData.criticalIssues.length} HIGH-PRIORITY ACTION ITEMS
              </span>
            </div>

            <div className="space-y-3">
              {reportData.criticalIssues.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-mono text-xs">
                  All station subsystems, fuel reserves, and logistics within nominal limits.
                </div>
              ) : (
                reportData.criticalIssues.map((issue, idx) => (
                  <div
                    key={issue.id || idx}
                    className="p-3.5 rounded-lg bg-slate-950/90 border border-rose-500/30 hover:border-rose-500/60 transition-colors space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {issue.severity || 'CRITICAL'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                          {issue.category}
                        </span>
                        <span className="text-xs font-bold text-white font-sans">{issue.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span>{issue.base}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-850">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                          Operational Impact:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                          {issue.impact}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">
                          Recommended Action:
                        </span>
                        <p className="text-emerald-300/90 text-[11px] leading-relaxed mt-0.5">
                          {issue.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Charts Section */}
        {reportData?.chartData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 no-print">
            {/* Status Breakdown Chart */}
            <div className="polar-card p-4 space-y-3">
              <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Operational Status Breakdown</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData.statusBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                      {(reportData.chartData.statusBreakdown || []).map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color || '#38BDF8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Base Distribution Chart */}
            <div className="polar-card p-4 space-y-3">
              <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Station Base Activity & Hazard Density</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData.baseDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="base" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="total" name="Total Items" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                    {selectedModule === 'command-summary' && (
                      <Bar dataKey="critical" name="Critical / Hazards" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Data Records Table Preview */}
        <div className="polar-card overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
              Telemetry Records Ledger ({tableRows.length} items)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              FILTERED VIEW // READY FOR AUDIT EXPORT
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  {reportData?.fields ? (
                    reportData.fields.map((f) => (
                      <th key={f} className="px-4 py-3">
                        {f.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </th>
                    ))
                  ) : (
                    <>
                      <th className="px-4 py-3">Identifier</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Station</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loading ? (
                  <tr>
                    <td colSpan={reportData?.fields?.length || 4} className="px-4 py-12 text-center text-slate-500">
                      <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                      <span>Loading operational report data...</span>
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportData?.fields?.length || 4} className="px-4 py-8 text-center text-slate-500">
                      No records match the selected operational filters.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => (
                    <tr key={row._id || row.id || idx} className="hover:bg-slate-900/40 transition-colors">
                      {reportData?.fields?.map((f) => {
                        const val = row[f];
                        let renderedVal = typeof val === 'object' && val ? val.name || val.expeditionCode || JSON.stringify(val) : String(val ?? '');

                        // Format specific columns nicely
                        if (f === 'status') {
                          return (
                            <td key={f} className="px-4 py-3">
                              <StatusBadge status={renderedVal || 'Nominal'} />
                            </td>
                          );
                        }
                        if (f === 'severity' || f === 'priority') {
                          const isCrit = renderedVal === 'Critical' || renderedVal === 'Urgent';
                          return (
                            <td key={f} className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isCrit
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : renderedVal === 'High'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {renderedVal}
                              </span>
                            </td>
                          );
                        }
                        if (f.toLowerCase().includes('date') && renderedVal) {
                          renderedVal = new Date(renderedVal).toLocaleDateString();
                        }

                        return (
                          <td key={f} className="px-4 py-3 text-slate-300 max-w-xs truncate">
                            {renderedVal || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formal Base Commander Sign-off Block (Visible in Print & Screen) */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
              OPERATIONAL COMPLIANCE & SIGN-OFF CERTIFICATION
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">VERIFIED AUTHENTIC</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono pt-2">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Operations Officer:</span>
              <div className="mt-1 font-bold text-white">Commander Radhika Roy</div>
              <div className="text-[10px] text-slate-400">Chief Polar Logistics Officer // POL-0001</div>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Validation Key:</span>
              <div className="mt-1 font-mono text-sky-400 tracking-wider">SHA256: 9f82...bc41a9</div>
              <div className="text-[10px] text-slate-500">Autonomous Telemetry Verification</div>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Dossier Authorization:</span>
              <div className="mt-3 border-b border-slate-700 w-48 text-slate-500 text-[9px] pb-1">
                [ SIGNED DIGITAL SIGNATURE ]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

