import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Users,
  Activity,
  Radio,
  AlertTriangle,
  Plus,
  Compass,
  Thermometer,
  Wind,
  Gauge,
  Eye,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Layers,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  X,
  Sparkles,
  Download,
  Package,
  Wrench,
  Truck,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useEmergency } from '../context/EmergencyContext';
import Modal from '../components/common/Modal';

// Status badge styling metadata
const STATUS_BADGES = {
  'Operational': { label: 'Operational', color: 'text-emerald-300', bg: 'bg-emerald-950/60 border-emerald-700/60', dot: 'bg-emerald-400' },
  'Limited': { label: 'Limited Operations', color: 'text-amber-300', bg: 'bg-amber-950/60 border-amber-700/60', dot: 'bg-amber-400 animate-pulse' },
  'Critical': { label: 'Critical Condition', color: 'text-rose-300', bg: 'bg-rose-950/60 border-rose-700/60', dot: 'bg-rose-400 animate-ping' },
  'Maintenance': { label: 'Maintenance Hold', color: 'text-cyan-300', bg: 'bg-cyan-950/60 border-cyan-700/60', dot: 'bg-cyan-400' },
  'Evacuated': { label: 'Evacuated Pod', color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700/40', dot: 'bg-slate-500' },
};

// Base types
const BASE_TYPES = ['All', 'Permanent Station', 'Research Station'];

// Custom Leaflet Marker for Bases
const createBaseMarkerIcon = (status, isSelected) => {
  let color = '#29d6b0'; // emerald
  if (status === 'Limited') color = '#f6c85f'; // amber
  if (status === 'Critical') color = '#f43f5e'; // rose

  const size = isSelected ? 34 : 26;

  return L.divIcon({
    className: 'custom-base-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: ${size * 0.55}px; height: ${size * 0.55}px; border-radius: 50%; background: #020914; border: 2.5px solid ${color}; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map View Controller for animated presets
const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

export const BasesPage = () => {
  const { openSosModal } = useEmergency();
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [detailedBase, setDetailedBase] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapTarget, setMapTarget] = useState({ center: [-70.0, 45.0], zoom: 3 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Forms
  const [newBase, setNewBase] = useState({
    name: '',
    code: '',
    location: '',
    type: 'Permanent Station',
    capacity: 50,
    currentPersonnel: 12,
    elevationMeters: 50,
    operationalStatus: 'Operational',
    commsStatus: 'Optimal',
    description: '',
    facilities: 'Life Support Microgrid, Medical Suite, Satellite Comms',
    lat: -70.0,
    lng: 20.0,
  });

  const [editBaseData, setEditBaseData] = useState(null);

  // Fetch Bases List and Stats
  const fetchBases = useCallback(async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        api.get('/bases'),
        api.get('/bases/stats').catch(() => ({ data: { data: null } })),
      ]);

      if (res.data?.success) {
        const items = res.data.data || [];
        setBases(items);
        if (items.length > 0 && !selectedBaseId) {
          setSelectedBaseId(items[0]._id || items[0].code);
        }
      }

      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load bases:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBaseId]);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = () => {
      fetchBases();
    };

    socket.on('base:updated', handleUpdate);
    socket.on('dashboard:statsUpdated', (data) => {
      if (data.module === 'bases') fetchBases();
    });

    return () => {
      socket.off('base:updated', handleUpdate);
      socket.off('dashboard:statsUpdated');
    };
  }, [fetchBases]);

  // Fetch detailed base data (with resident personnel, assets, inventory, cargo, alerts)
  const fetchBaseDetails = async (baseId) => {
    try {
      setDetailedLoading(true);
      const res = await api.get(`/bases/${baseId}`);
      if (res.data?.success) {
        setDetailedBase(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch station telemetry details');
    } finally {
      setDetailedLoading(false);
    }
  };

  // Filtered Bases
  const filteredBases = useMemo(() => {
    return bases.filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.code && b.code.toLowerCase().includes(q)) ||
        (b.location && b.location.toLowerCase().includes(q)) ||
        (b.type && b.type.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All' ||
        b.operationalStatus === statusFilter ||
        b.status === statusFilter;

      const matchesType = typeFilter === 'All' || b.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [bases, search, statusFilter, typeFilter]);

  // Selected base record
  const selectedBase = useMemo(() => {
    if (!bases.length) return null;
    return bases.find((b) => b._id === selectedBaseId || b.code === selectedBaseId) || bases[0];
  }, [bases, selectedBaseId]);

  // Computed KPI stats if backend fallback needed
  const kpiData = useMemo(() => {
    if (stats) return stats;
    const totalBases = bases.length;
    const operational = bases.filter((b) => (b.operationalStatus || b.status) === 'Operational').length;
    const totalCapacity = bases.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    const totalPersonnel = bases.reduce((acc, b) => acc + (Number(b.currentPersonnel) || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalPersonnel / totalCapacity) * 100) : 0;
    const meanTemp = '-16.8';

    return {
      totalBases,
      operational,
      totalCapacity,
      totalPersonnel,
      occupancyRate,
      meanTemp,
    };
  }, [stats, bases]);

  // Handlers for Add/Edit/Delete
  const handleOpenCreate = () => {
    setNewBase({
      name: '',
      code: '',
      location: '',
      type: 'Permanent Station',
      capacity: 50,
      currentPersonnel: 10,
      elevationMeters: 45,
      operationalStatus: 'Operational',
      commsStatus: 'Optimal',
      description: '',
      facilities: 'Life Support Microgrid, Medical Trauma Suite, Satellite Uplink',
      lat: -71.2,
      lng: 24.5,
    });
    setShowAddModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newBase,
        coordinates: {
          lat: Number(newBase.lat),
          lng: Number(newBase.lng),
        },
        facilities: newBase.facilities.split(',').map((f) => f.trim()).filter(Boolean),
      };
      const res = await api.post('/bases', payload);
      setShowAddModal(false);
      await fetchBases();
      if (res.data?.data?._id) {
        setSelectedBaseId(res.data.data._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to provision new base station');
    }
  };

  const handleOpenEdit = (base) => {
    setEditBaseData({
      _id: base._id,
      name: base.name,
      code: base.code,
      location: base.location || '',
      type: base.type || 'Permanent Station',
      capacity: base.capacity || 50,
      currentPersonnel: base.currentPersonnel || 0,
      elevationMeters: base.elevationMeters || 0,
      operationalStatus: base.operationalStatus || base.status || 'Operational',
      commsStatus: base.commsStatus || 'Optimal',
      description: base.description || '',
      facilities: Array.isArray(base.facilities) ? base.facilities.join(', ') : base.facilities || '',
      lat: base.coordinates?.lat ?? -70.0,
      lng: base.coordinates?.lng ?? 15.0,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editBaseData,
        coordinates: {
          lat: Number(editBaseData.lat),
          lng: Number(editBaseData.lng),
        },
        facilities: editBaseData.facilities.split(',').map((f) => f.trim()).filter(Boolean),
      };
      await api.put(`/bases/${editBaseData._id}`, payload);
      setShowEditModal(false);
      await fetchBases();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update base parameters');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedBase) return;
    try {
      await api.delete(`/bases/${selectedBase._id || selectedBase.code}`);
      setShowDeleteModal(false);
      setSelectedBaseId(null);
      await fetchBases();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decommission base');
    }
  };

  const exportBasesJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bases, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `polaris_stations_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Map center calculation
  const mapCenter = useMemo(() => {
    if (selectedBase?.coordinates?.lat && selectedBase?.coordinates?.lng) {
      return [selectedBase.coordinates.lat, selectedBase.coordinates.lng];
    }
    return [-70.0, 45.0];
  }, [selectedBase]);

  return (
    <div className="space-y-6 pb-14 font-body text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-cyan-400" />
              <span>POLAR BASE COMMAND & OUTPOST TELEMETRY</span>
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(40,169,245,0.25)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              GLOBAL GRID ONLINE
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Continental Antarctic stations, Arctic high-latitude outposts, environmental telemetry, and life-support capacities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
              showMap
                ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-300 shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{showMap ? 'Hide Polar Map' : 'Show Polar Map'}</span>
          </button>

          {selectedBase && (
            <button
              onClick={() => fetchBaseDetails(selectedBase._id || selectedBase.code)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/70 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.2)] active:scale-95"
              title="Open complete station telemetry, crew, inventory, assets, and active alerts dossier"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Station Dossier ({selectedBase.name.split(' ')[0]})</span>
            </button>
          )}

          <button
            onClick={exportBasesJson}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Registry</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-semibold text-xs font-mono shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Station</span>
          </button>
        </div>
      </div>

      {/* Reactive Station Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Bases */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">POLAR STATIONS</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.totalBases}</span>
            <span className="text-xs font-mono text-slate-400">active bases</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{kpiData.operational} fully operational</span>
          </div>
        </div>

        {/* KPI 2: Total Base Capacity */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">GLOBAL CAPACITY</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.totalCapacity}</span>
            <span className="text-xs font-mono text-slate-400">berths & quarters</span>
          </div>
          <div className="mt-2 text-xs font-mono text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Overwintering rated</span>
          </div>
        </div>

        {/* KPI 3: Total Station Personnel */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(40,169,245,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300">STATION RESIDENTS</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300">{kpiData.totalPersonnel}</span>
            <span className="text-xs font-mono text-cyan-400/80">scientists & crew</span>
          </div>
          <div className="mt-2 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Occupancy Rate: <strong>{kpiData.occupancyRate}%</strong></span>
          </div>
        </div>

        {/* KPI 4: Mean Ambient Temperature */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">MEAN AMBIENT TEMP</span>
            <Thermometer className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.meanTemp}°C</span>
            <span className="text-xs font-mono text-slate-400">sub-zero</span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Thermal life-support 100%</span>
          </div>
        </div>

        {/* KPI 5: SatCom Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(49,212,154,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-300">SATCOM TELEMETRY</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-300">100%</span>
            <span className="text-xs font-mono text-slate-400">uplink lock</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400/80 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ka/C-band dual redundancy</span>
          </div>
        </div>
      </div>

      {/* Interactive Global Polar Station Map */}
      {showMap && (
        <div className="rounded-xl border border-slate-800 bg-polar-950 overflow-hidden shadow-2xl relative">
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10 relative">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                GLOBAL POLAR COMMAND RADAR • CONTINENTAL DISTRIBUTION
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/70 text-sky-300 border border-sky-500/40">
                LEAFLET RADAR VIEW
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {/* Presets */}
              <button
                type="button"
                onClick={() => setMapTarget({ center: [-70.5, 45.0], zoom: 3 })}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors cursor-pointer text-[11px]"
                title="Focus Antarctica Continental Sector"
              >
                Antarctica Preset
              </button>
              <button
                type="button"
                onClick={() => setMapTarget({ center: [78.9, 15.0], zoom: 4 })}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors cursor-pointer text-[11px]"
                title="Focus Arctic Ny-Ålesund Sector"
              >
                Arctic Preset
              </button>

              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Selected: <strong className="text-cyan-300">{selectedBase?.name}</strong></span>
              </div>

              <button
                onClick={fetchBases}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Sync Coordinates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[360px] w-full relative">
            <MapContainer
              center={mapTarget.center}
              zoom={mapTarget.zoom}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', background: '#020914' }}
            >
              <MapViewController center={mapTarget.center} zoom={mapTarget.zoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {bases.map((base) => {
                if (!base.coordinates?.lat || !base.coordinates?.lng) return null;
                const isSelected = selectedBase?._id === base._id || selectedBase?.code === base.code;
                const occPercent = Math.min(Math.round(((base.currentPersonnel || 0) / (base.capacity || 1)) * 100), 100);

                return (
                  <Marker
                    key={base._id || base.code}
                    position={[base.coordinates.lat, base.coordinates.lng]}
                    icon={createBaseMarkerIcon(base.operationalStatus || base.status, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedBaseId(base._id || base.code);
                        setMapTarget({ center: [base.coordinates.lat, base.coordinates.lng], zoom: 4 });
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={isSelected}>
                      <span className="font-mono text-xs font-semibold">
                        {base.name} ({base.currentPersonnel}/{base.capacity})
                      </span>
                    </Tooltip>
                    <Popup>
                      <div className="p-2.5 font-mono text-xs text-slate-100 bg-slate-950 rounded-lg border border-slate-800 min-w-[240px] space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-sm text-cyan-300">{base.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${STATUS_BADGES[base.operationalStatus || base.status]?.color || 'text-slate-300'} ${STATUS_BADGES[base.operationalStatus || base.status]?.bg || 'bg-slate-900 border-slate-800'}`}>
                            {base.operationalStatus || base.status}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[10px]">{base.location}</div>

                        {/* Occupancy bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Crew Occupancy ({occPercent}%)</span>
                            <strong className="text-cyan-300">{base.currentPersonnel} / {base.capacity}</strong>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-850 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                              style={{ width: `${occPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Telemetry */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-400 border-t border-slate-850">
                          <div>Temp: <strong className="text-cyan-300">{base.weatherTelemetry?.temperature ?? -25}°C</strong></div>
                          <div>Elev: <strong className="text-slate-200">{base.elevationMeters || 0}m</strong></div>
                          <div>Wind: <strong className="text-slate-200">{base.weatherTelemetry?.windSpeed || '18 kt'}</strong></div>
                          <div>Condition: <strong className="text-slate-300 truncate">{base.weatherTelemetry?.condition || 'Fair'}</strong></div>
                        </div>

                        {/* Action buttons inside Popup */}
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => fetchBaseDetails(base._id || base.code)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Instant Station Dossier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openSosModal({
                              baseName: base.name,
                              location: `${base.name} (${base.location})`,
                              severity: (base.operationalStatus === 'Critical' || base.status === 'Critical') ? 'Critical' : 'High'
                            })}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                          >
                            <Radio className="w-3 h-3" />
                            <span>Scramble SOS Dispatch</span>
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Base Type Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 w-full lg:w-auto overflow-x-auto text-xs font-mono">
          {BASE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
                typeFilter === t
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search base name, code, sector, facilities..."
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

        {/* Status Dropdown */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="Operational" className="bg-slate-900 text-slate-200">Operational</option>
              <option value="Limited" className="bg-slate-900 text-slate-200">Limited Operations</option>
              <option value="Critical" className="bg-slate-900 text-slate-200">Critical Condition</option>
            </select>
          </div>
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBases.map((base) => {
          const isSelected = selectedBase?._id === base._id || selectedBase?.code === base.code;
          const statusMeta = STATUS_BADGES[base.operationalStatus || base.status] || STATUS_BADGES['Operational'];
          const occupancyRate = Math.round(((base.currentPersonnel || 0) / (base.capacity || 1)) * 100);
          const weather = base.weatherTelemetry || {};

          return (
            <div
              key={base._id || base.code}
              onClick={() => setSelectedBaseId(base._id || base.code)}
              className={`p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-5 relative ${
                isSelected
                  ? 'bg-slate-900/95 border-cyan-500/80 shadow-[0_0_20px_rgba(40,169,245,0.2)]'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="space-y-4">
                {/* Top Station Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{base.code}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusMeta.bg} ${statusMeta.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        {base.operationalStatus || base.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 font-sans mt-1.5 tracking-wide">
                      {base.name}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate max-w-sm">{base.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEdit(base)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                      title="Edit Station Parameters"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBaseId(base._id || base.code);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Decommission Station"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {base.description && (
                  <p className="text-xs font-sans text-slate-400 leading-relaxed line-clamp-2">
                    {base.description}
                  </p>
                )}

                {/* Occupancy Progress Bar */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Personnel Occupancy:</span>
                    <span className="text-cyan-300 font-bold">
                      {base.currentPersonnel} / {base.capacity} ({occupancyRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancyRate > 90
                          ? 'bg-rose-500'
                          : occupancyRate > 75
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Live Weather & Telemetry Strip */}
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">AMBIENT TEMP</span>
                    <span className="text-sm font-bold text-cyan-300">
                      {weather.temperature !== undefined ? `${weather.temperature}°C` : '-24°C'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      {weather.condition || 'Partly Cloudy'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">WIND GUSTS</span>
                    <span className="text-sm font-bold text-slate-200">
                      {weather.windSpeed || '18 kt'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      Gust: {weather.windGust || '28 kt'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">ELEVATION</span>
                    <span className="text-sm font-bold text-slate-200">
                      {base.elevationMeters || 0} m
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      Baro: {weather.baroPressure || '984 hPa'}
                    </span>
                  </div>
                </div>

                {/* Facilities Tags */}
                {base.facilities && base.facilities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      ON-SITE CRITICAL FACILITIES
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {base.facilities.map((fac, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Bar: Detailed Resources Inspector */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-[11px] text-slate-500">
                  COORDS: {base.coordinates?.lat?.toFixed(2)}°, {base.coordinates?.lng?.toFixed(2)}°
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openSosModal({
                        baseName: base.name,
                        location: `${base.name} (${base.location})`,
                        severity: (base.operationalStatus === 'Critical' || base.status === 'Critical') ? 'Critical' : 'High',
                      });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600 hover:text-white text-rose-300 font-bold transition-all cursor-pointer text-xs"
                    title="Scramble SOS Emergency Deployment for this station"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>SOS</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchBaseDetails(base._id || base.code);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(40,169,245,0.15)] active:scale-95"
                    title="Open complete station telemetry, crew, inventory, assets, and active alerts dossier"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Instant Station Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEEP STATION INSPECTION MODAL */}
      {showDetailModal && detailedBase && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Polar Station Dossier: ${detailedBase.name} (${detailedBase.code})`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-6 font-mono text-xs text-slate-300">
            {/* Top Bar Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">SECTOR & ELEVATION</span>
                <span className="font-bold text-slate-200 mt-1 block">{detailedBase.location}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{detailedBase.elevationMeters || 0}m ASL • {detailedBase.type}</span>
                <span className="text-[10px] text-cyan-400 mt-0.5 block font-mono">
                  {detailedBase.dmsCoordinates || detailedBase.coordinates?.dms || `${detailedBase.coordinates?.lat?.toFixed(4)}°, ${detailedBase.coordinates?.lng?.toFixed(4)}°`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">CREW OCCUPANCY</span>
                <span className="font-bold text-cyan-300 mt-1 block">
                  {detailedBase.currentPersonnel} / {detailedBase.capacity} Personnel
                </span>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.round((detailedBase.currentPersonnel / (detailedBase.capacity || 1)) * 100))}%` }}
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">METEOROLOGICAL TELEMETRY</span>
                <span className="font-bold text-slate-200 mt-1 block">
                  {detailedBase.weatherTelemetry?.temperature ?? -25}°C • {detailedBase.weatherTelemetry?.condition || 'Snow Drift'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Wind: {detailedBase.weatherTelemetry?.windSpeed || '18 kt'} (Gusts {detailedBase.weatherTelemetry?.windGust || '30 kt'})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">C2 TELEMETRY & UPLINK</span>
                <span className="font-bold text-emerald-400 mt-1 block flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {detailedBase.commsStatus || 'Optimal (Ka-Band)'}
                </span>
                <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                  Status: {detailedBase.operationalStatus || detailedBase.status}
                </span>
              </div>
            </div>

            {/* Station Overview & Facilities */}
            <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Station Strategic Role & Facilities</span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans mb-2.5">
                {detailedBase.description || 'Year-round national polar research outpost operating high-latitude laboratories.'}
              </p>
              {detailedBase.facilities && detailedBase.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailedBase.facilities.map((fac, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-300">
                      ✓ {fac}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active Station Alerts if any */}
            {detailedBase.alerts && detailedBase.alerts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5 border-b border-rose-900/40 pb-1.5">
                  <span className="text-xs font-bold text-rose-300 uppercase flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>Active Station Alerts & Warnings ({detailedBase.alerts.length})</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {detailedBase.alerts.map((al, idx) => (
                    <div key={al._id || idx} className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-rose-300 block">{al.title}</span>
                        <p className="text-slate-300 text-[11px] mt-0.5 font-sans">{al.message}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold shrink-0">
                        {al.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resident Personnel Roster */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Resident Station Crew ({detailedBase.personnel?.length || 0})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {detailedBase.personnel && detailedBase.personnel.length > 0 ? (
                  detailedBase.personnel.map((p, i) => (
                    <div key={p._id || i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">{p.name}</span>
                        <span className="text-[11px] text-slate-400">{p.role || p.designation} • {p.department}</span>
                        {p.rank && <span className="text-[10px] text-cyan-400/80 block mt-0.5">Rank: {p.rank}</span>}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                        {p.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-slate-500 py-3 text-center">No crew members stationed on-site.</div>
                )}
              </div>
            </div>

            {/* Station Critical Equipment Assets & Inventory Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2 border-b border-slate-850 pb-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Equipment & Machinery ({detailedBase.assets?.length || 0})</span>
                </span>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {detailedBase.assets && detailedBase.assets.length > 0 ? (
                    detailedBase.assets.map((a, i) => (
                      <div key={a._id || i} className="p-2 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-200 block">{a.name || a.assetName}</span>
                          <span className="text-[10px] text-slate-400">{a.category} • Condition: {a.condition}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {a.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-center py-4">No assets cataloged.</div>
                  )}
                </div>
              </div>

              {/* Station Inventory Reserves */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2 border-b border-slate-850 pb-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Inventory Reserves ({detailedBase.inventory?.length || 0})</span>
                </span>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {detailedBase.inventory && detailedBase.inventory.length > 0 ? (
                    detailedBase.inventory.map((inv, i) => (
                      <div key={inv._id || i} className="p-2 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-200 block truncate max-w-[200px]">{inv.itemName || inv.name}</span>
                          <span className="text-[10px] text-slate-400">{inv.quantity} {inv.unit} (Min: {inv.minThreshold})</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                          inv.status === 'Critical' || inv.quantity < inv.minThreshold
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {inv.status || (inv.quantity < inv.minThreshold ? 'Low' : 'Optimal')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-center py-4">No inventory stockpiled.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Inbound Cargo Consignments */}
            {detailedBase.cargo && detailedBase.cargo.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>Inbound Freight Deliveries ({detailedBase.cargo.length})</span>
                  </span>
                </div>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {detailedBase.cargo.map((c, i) => (
                    <div key={c._id || i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-cyan-300">{c.cargoCode}</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-sans">{c.description || c.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  openSosModal({
                    baseName: detailedBase.name,
                    location: `${detailedBase.name} (${detailedBase.location})`,
                    severity: (detailedBase.operationalStatus === 'Critical' || detailedBase.status === 'Critical') ? 'Critical' : 'High',
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white font-bold transition-all cursor-pointer text-xs"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Scramble SOS Dispatch</span>
              </button>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer font-bold"
              >
                Close Station Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PROVISION BASE MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Provision New Polar Base / Outpost"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">STATION NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maitri Polar Outpost"
                value={newBase.name}
                onChange={(e) => setNewBase({ ...newBase, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">STATION CODE *</label>
              <input
                type="text"
                required
                placeholder="e.g. DG-REFUGE"
                value={newBase.code}
                onChange={(e) => setNewBase({ ...newBase, code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">GEOGRAPHIC SECTOR LOCATION *</label>
            <input
              type="text"
              required
              placeholder="e.g. Princess Astrid Coast Ice Shelf Margin, Antarctica"
              value={newBase.location}
              onChange={(e) => setNewBase({ ...newBase, location: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">STATION TYPE</label>
              <select
                value={newBase.type}
                onChange={(e) => setNewBase({ ...newBase, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Permanent Station">Permanent Station</option>
                <option value="Research Station">Research Station</option>
                <option value="Camp">Camp</option>
                <option value="Refuge Pod">Refuge Pod</option>
                <option value="Mobile Vessel">Mobile Vessel</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">CAPACITY (BERTHS)</label>
              <input
                type="number"
                value={newBase.capacity}
                onChange={(e) => setNewBase({ ...newBase, capacity: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">CURRENT CREW</label>
              <input
                type="number"
                value={newBase.currentPersonnel}
                onChange={(e) => setNewBase({ ...newBase, currentPersonnel: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">LATITUDE (°)</label>
              <input
                type="number"
                step="0.001"
                placeholder="-70.767"
                value={newBase.lat}
                onChange={(e) => setNewBase({ ...newBase, lat: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">LONGITUDE (°)</label>
              <input
                type="number"
                step="0.001"
                placeholder="11.733"
                value={newBase.lng}
                onChange={(e) => setNewBase({ ...newBase, lng: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">ELEVATION (M)</label>
              <input
                type="number"
                placeholder="117"
                value={newBase.elevationMeters}
                onChange={(e) => setNewBase({ ...newBase, elevationMeters: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">CRITICAL FACILITIES (COMMA SEPARATED)</label>
            <input
              type="text"
              placeholder="Life Support Microgrid, Emergency Medical Bay, Radio Transceiver, Emergency Food Cache"
              value={newBase.facilities}
              onChange={(e) => setNewBase({ ...newBase, facilities: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">STATION OPERATIONAL DESCRIPTION</label>
            <textarea
              rows={2}
              placeholder="Operational focus, environmental conditions, seasonal staffing requirements..."
              value={newBase.description}
              onChange={(e) => setNewBase({ ...newBase, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-sans"
            />
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
              Authorize & Provision
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT BASE MODAL */}
      {editBaseData && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Station Parameters: ${editBaseData.name}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 font-mono text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">STATION NAME *</label>
                <input
                  type="text"
                  required
                  value={editBaseData.name}
                  onChange={(e) => setEditBaseData({ ...editBaseData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">OPERATIONAL STATUS</label>
                <select
                  value={editBaseData.operationalStatus}
                  onChange={(e) => setEditBaseData({ ...editBaseData, operationalStatus: e.target.value, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="Operational">Operational</option>
                  <option value="Limited">Limited Operations</option>
                  <option value="Critical">Critical Condition</option>
                  <option value="Maintenance">Maintenance Hold</option>
                  <option value="Evacuated">Evacuated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">BERTH CAPACITY</label>
                <input
                  type="number"
                  value={editBaseData.capacity}
                  onChange={(e) => setEditBaseData({ ...editBaseData, capacity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">CURRENT CREW</label>
                <input
                  type="number"
                  value={editBaseData.currentPersonnel}
                  onChange={(e) => setEditBaseData({ ...editBaseData, currentPersonnel: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ELEVATION (M)</label>
                <input
                  type="number"
                  value={editBaseData.elevationMeters}
                  onChange={(e) => setEditBaseData({ ...editBaseData, elevationMeters: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">FACILITIES (COMMA SEPARATED)</label>
              <input
                type="text"
                value={editBaseData.facilities}
                onChange={(e) => setEditBaseData({ ...editBaseData, facilities: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">DESCRIPTION</label>
              <textarea
                rows={2}
                value={editBaseData.description}
                onChange={(e) => setEditBaseData({ ...editBaseData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-sans"
              />
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
                Save Configuration
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE BASE CONFIRMATION */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Base Decommissioning"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">Permanent Station Decommissioning</p>
              <p className="text-slate-400 mt-1">
                Are you sure you want to decommission station <strong className="text-slate-200">{selectedBase?.name}</strong> ({selectedBase?.code})? Ensure all personnel and critical equipment have been evacuated.
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
              Confirm Decommission
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BasesPage;
