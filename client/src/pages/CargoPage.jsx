import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Ship,
  Plane,
  Radio,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  Thermometer,
  BatteryCharging,
  Zap,
  Activity,
  Shield,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Trash2,
  QrCode,
  Layers,
  ChevronRight,
  Eye,
  X,
  Compass,
  Navigation,
  Sparkles,
  Calendar,
  Anchor,
  Box,
  Share2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useEmergency } from '../context/EmergencyContext';
import Modal from '../components/common/Modal';

// Status badge styling metadata
const STATUS_CONFIG = {
  'Planned': { label: 'Planned', color: 'text-slate-300', bg: 'bg-slate-800/80 border-slate-700/60', dot: 'bg-slate-400' },
  'Packed': { label: 'Packed', color: 'text-sky-300', bg: 'bg-sky-950/60 border-sky-800/60', dot: 'bg-sky-400' },
  'Dispatched': { label: 'Dispatched', color: 'text-blue-300', bg: 'bg-blue-950/60 border-blue-800/60', dot: 'bg-blue-400' },
  'In Transit': { label: 'In Transit', color: 'text-cyan-300', bg: 'bg-cyan-950/60 border-cyan-700/60', dot: 'bg-cyan-400 animate-pulse' },
  'Delayed': { label: 'Delayed', color: 'text-amber-300', bg: 'bg-amber-950/60 border-amber-700/60', dot: 'bg-amber-400 animate-ping' },
  'At Base': { label: 'At Base', color: 'text-indigo-300', bg: 'bg-indigo-950/60 border-indigo-700/60', dot: 'bg-indigo-400' },
  'Delivered': { label: 'Delivered', color: 'text-emerald-300', bg: 'bg-emerald-950/60 border-emerald-700/60', dot: 'bg-emerald-400' },
  'Cancelled': { label: 'Cancelled', color: 'text-rose-300', bg: 'bg-rose-950/60 border-rose-800/60', dot: 'bg-rose-400' },
};

// Priority badge styling
const PRIORITY_CONFIG = {
  'Critical': { label: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40' },
  'Urgent': { label: 'URGENT', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40' },
  'High': { label: 'HIGH', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'Medium': { label: 'MEDIUM', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  'Standard': { label: 'STANDARD', color: 'text-slate-300', bg: 'bg-slate-800/60 border-slate-700/50' },
  'Routine': { label: 'ROUTINE', color: 'text-slate-400', bg: 'bg-slate-800/40 border-slate-700/30' },
};

// Tactical Category icons
const CATEGORY_ICONS = {
  'Fuel': { icon: Zap, color: 'text-amber-400' },
  'Equipment': { icon: Truck, color: 'text-cyan-400' },
  'Scientific': { icon: Activity, color: 'text-purple-400' },
  'Provisions': { icon: Box, color: 'text-emerald-400' },
  'Medical': { icon: Shield, color: 'text-rose-400' },
  'Communication': { icon: Radio, color: 'text-sky-400' },
  'General': { icon: Box, color: 'text-slate-400' },
};

// Standard Polar Stations and Gateways for Leaflet Map
const POLAR_WAYPOINTS = [
  { name: 'Maitri Station', lat: -70.7661, lng: 11.7322, type: 'Station', code: 'MAITRI' },
  { name: 'Bharati Station', lat: -69.4068, lng: 76.1953, type: 'Station', code: 'BHARATI' },
  { name: 'Himadri Station', lat: 78.9167, lng: 11.9333, type: 'Arctic Base', code: 'HIMADRI' },
  { name: 'Cape Town Port', lat: -33.924, lng: 18.424, type: 'Gateway Port', code: 'CPT' },
  { name: 'Bremerhaven Port', lat: 53.540, lng: 8.580, type: 'Gateway Port', code: 'BRV' },
  { name: 'Christchurch Logistics', lat: -43.532, lng: 172.636, type: 'Gateway Port', code: 'CHC' },
  { name: 'Longyearbyen Port', lat: 78.223, lng: 15.646, type: 'Arctic Gateway', code: 'LYR' },
  { name: 'Punta Arenas Gateway', lat: -53.163, lng: -70.917, type: 'Gateway Port', code: 'PUQ' },
];

// Leaflet custom marker generator
const createMarkerIcon = (status, isSelected) => {
  let color = '#28a9f5'; // default cyan
  if (status === 'Delayed') color = '#f6c85f';
  if (status === 'Delivered') color = '#31d49a';
  if (status === 'Critical' || status === 'Urgent') color = '#f43f5e';

  const size = isSelected ? 34 : 26;
  const pulseScale = isSelected ? 'scale-125' : 'scale-100';

  return L.divIcon({
    className: 'custom-cargo-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: ${size * 0.55}px; height: ${size * 0.55}px; border-radius: 50%; background: #020914; border: 2.5px solid ${color}; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createStationIcon = () => {
  return L.divIcon({
    className: 'custom-station-marker',
    html: `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 10px; height: 10px; transform: rotate(45deg); background: #051422; border: 2px solid #29d6b0; box-shadow: 0 0 6px rgba(41,214,176,0.6);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Cargo Map View Controller for animated presets
const CargoMapViewController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

export const CargoPage = () => {
  const { openSosModal } = useEmergency();
  const [cargoList, setCargoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mapTarget, setMapTarget] = useState({ center: [-65.0, 35.0], zoom: 3 });
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);

  // Filters & Searching
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [showMap, setShowMap] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    cargoCode: '',
    trackingNumber: '',
    description: '',
    category: 'Scientific',
    origin: 'Cape Town Port',
    destination: 'Maitri Base',
    carrier: 'RV Vasiliy Golovnin',
    priority: 'High',
    status: 'Planned',
    weightKg: 500,
    volumeM3: 1.5,
    eta: '3 Days',
    temperatureRequirement: 'Standard Ambient',
    currentTemperature: -5.0,
    batteryReserve: 100,
    shockGForce: 0.1,
    notes: '',
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: 'In Transit',
    location: '',
    notes: '',
    currentTemperature: '',
    batteryReserve: '',
    shockGForce: '',
  });

  // Fetch cargo data & stats
  const fetchCargoData = useCallback(async () => {
    try {
      setLoading(true);
      const [cargoRes, statsRes] = await Promise.all([
        api.get(`/cargo?sort=${sortBy}`),
        api.get('/cargo/stats').catch(() => ({ data: { data: null } })),
      ]);

      const items = cargoRes.data?.data || [];
      setCargoList(items);
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }

      // Default selection
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0]._id || items[0].cargoCode);
      }
    } catch (err) {
      console.error('Failed to load cargo:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedId]);

  useEffect(() => {
    fetchCargoData();
  }, [fetchCargoData]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCargoUpdate = (data) => {
      fetchCargoData();
    };

    const handleStatsUpdate = (data) => {
      if (data.module === 'cargo') {
        fetchCargoData();
      }
    };

    socket.on('cargo:statusUpdated', handleCargoUpdate);
    socket.on('cargo:created', handleCargoUpdate);
    socket.on('dashboard:statsUpdated', handleStatsUpdate);

    return () => {
      socket.off('cargo:statusUpdated', handleCargoUpdate);
      socket.off('cargo:created', handleCargoUpdate);
      socket.off('dashboard:statsUpdated', handleStatsUpdate);
    };
  }, [fetchCargoData]);

  // Selected cargo record
  const selectedCargo = useMemo(() => {
    if (!cargoList.length) return null;
    return (
      cargoList.find((c) => c._id === selectedId || c.cargoCode === selectedId || c.trackingNumber === selectedId) ||
      cargoList[0]
    );
  }, [cargoList, selectedId]);

  // Filtered Cargo items
  const filteredCargos = useMemo(() => {
    return cargoList.filter((item) => {
      // Tab filter
      if (activeTab === 'transit') {
        if (item.status !== 'In Transit' && item.status !== 'Dispatched') return false;
      } else if (activeTab === 'delayed') {
        if (item.status !== 'Delayed') return false;
      } else if (activeTab === 'delivered') {
        if (item.status !== 'Delivered') return false;
      }

      // Priority filter
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;

      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const code = (item.cargoCode || item.trackingNumber || '').toLowerCase();
        const desc = (item.description || item.title || item.name || '').toLowerCase();
        const origin = (item.origin || '').toLowerCase();
        const dest = (item.destination || item.destinationBaseName || '').toLowerCase();
        const carrier = (item.carrier || '').toLowerCase();

        return code.includes(q) || desc.includes(q) || origin.includes(q) || dest.includes(q) || carrier.includes(q);
      }

      return true;
    });
  }, [cargoList, activeTab, priorityFilter, categoryFilter, searchQuery]);

  // Derived KPI metrics if stats endpoint fallback
  const kpiData = useMemo(() => {
    if (stats) return stats;
    const totalShipments = cargoList.length;
    const inTransit = cargoList.filter((c) => c.status === 'In Transit' || c.status === 'Dispatched').length;
    const delayed = cargoList.filter((c) => c.status === 'Delayed').length;
    const delivered = cargoList.filter((c) => c.status === 'Delivered').length;
    const totalWeightKg = cargoList.reduce((acc, c) => acc + (Number(c.weightKg) || 0), 0);
    const totalTons = (totalWeightKg / 1000).toFixed(1);

    return {
      totalShipments,
      inTransit,
      delayed,
      delivered,
      totalTons,
    };
  }, [stats, cargoList]);

  // Handlers for CRUD
  const handleOpenCreate = () => {
    setFormData({
      cargoCode: '',
      trackingNumber: '',
      description: '',
      category: 'Scientific',
      origin: 'Cape Town Port',
      destination: 'Maitri Base',
      carrier: 'RV Vasiliy Golovnin',
      priority: 'High',
      status: 'Planned',
      weightKg: 500,
      volumeM3: 1.5,
      eta: '4 Days (16 Sep 2026)',
      temperatureRequirement: 'Cryo-Heated (-10°C to +5°C)',
      currentTemperature: -4.0,
      batteryReserve: 100,
      shockGForce: 0.1,
      notes: 'New polar consignment registered',
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (cargo) => {
    setFormData({
      _id: cargo._id,
      cargoCode: cargo.cargoCode,
      trackingNumber: cargo.trackingNumber,
      description: cargo.description || cargo.title || cargo.name,
      category: cargo.category || 'General',
      origin: cargo.origin || '',
      destination: cargo.destination || '',
      carrier: cargo.carrier || '',
      priority: cargo.priority || 'Standard',
      status: cargo.status || 'Planned',
      weightKg: cargo.weightKg || 0,
      volumeM3: cargo.volumeM3 || 0,
      eta: cargo.eta || '',
      temperatureRequirement: cargo.temperatureRequirement || 'Standard Ambient',
      currentTemperature: cargo.currentTemperature ?? -5,
      batteryReserve: cargo.batteryReserve ?? 100,
      shockGForce: cargo.shockGForce ?? 0.1,
      notes: '',
    });
    setShowEditModal(true);
  };

  const handleOpenStatusModal = (cargo) => {
    setStatusUpdateForm({
      cargoId: cargo._id || cargo.cargoCode,
      cargoCode: cargo.cargoCode || cargo.trackingNumber,
      status: cargo.status === 'Delivered' ? 'Delivered' : 'In Transit',
      location: cargo.currentLocation || cargo.destination || '',
      notes: '',
      currentTemperature: cargo.currentTemperature ?? '',
      batteryReserve: cargo.batteryReserve ?? '',
      shockGForce: cargo.shockGForce ?? '',
    });
    setShowStatusModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/cargo', formData);
      setShowCreateModal(false);
      await fetchCargoData();
      if (res.data?.data?._id) {
        setSelectedId(res.data.data._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create cargo consignment');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/cargo/${formData._id}`, formData);
      setShowEditModal(false);
      await fetchCargoData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cargo consignment');
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/cargo/${statusUpdateForm.cargoId}/status`, {
        status: statusUpdateForm.status,
        location: statusUpdateForm.location,
        notes: statusUpdateForm.notes,
        currentTemperature: statusUpdateForm.currentTemperature !== '' ? Number(statusUpdateForm.currentTemperature) : undefined,
        batteryReserve: statusUpdateForm.batteryReserve !== '' ? Number(statusUpdateForm.batteryReserve) : undefined,
        shockGForce: statusUpdateForm.shockGForce !== '' ? Number(statusUpdateForm.shockGForce) : undefined,
      });
      setShowStatusModal(false);
      await fetchCargoData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update waypoint status');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedCargo) return;
    try {
      await api.delete(`/cargo/${selectedCargo._id || selectedCargo.cargoCode}`);
      setShowDeleteModal(false);
      setSelectedId(null);
      await fetchCargoData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete cargo');
    }
  };

  const exportManifestJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cargoList, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `polaris_cargo_manifest_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Map center calculation
  const mapCenter = useMemo(() => {
    if (selectedCargo?.currentCoordinates?.lat && selectedCargo?.currentCoordinates?.lng) {
      return [selectedCargo.currentCoordinates.lat, selectedCargo.currentCoordinates.lng];
    }
    return [-70.0, 45.0];
  }, [selectedCargo]);

  // Selected cargo polyline
  const activePolyline = useMemo(() => {
    if (!selectedCargo?.routeCoordinates || !selectedCargo.routeCoordinates.length) return null;
    return selectedCargo.routeCoordinates.map((pt) => [pt.lat, pt.lng]);
  }, [selectedCargo]);

  return (
    <div className="space-y-6 pb-14 font-body text-slate-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
              <Truck className="w-7 h-7 text-cyan-400" />
              <span>CARGO & FREIGHT LOGISTICS</span>
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(40,169,245,0.25)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Global polar multimodal tracking, sea-ice route vectors, cryogenic environmental monitoring, and manifest clearance.
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
            <span>{showMap ? 'Hide Route Map' : 'Show Route Map'}</span>
          </button>

          <button
            onClick={exportManifestJson}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Manifest</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-semibold text-xs font-mono shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch Consignment</span>
          </button>
        </div>
      </div>

      {/* Reactive KPI Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Shipments */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">TOTAL CONSIGNMENTS</span>
            <Box className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.totalShipments}</span>
            <span className="text-xs font-mono text-slate-400">active manifests</span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{cargoList.length} trackable units</span>
          </div>
        </div>

        {/* KPI 2: In Transit */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(40,169,245,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300">IN TRANSIT</span>
            <Ship className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300">{kpiData.inTransit}</span>
            <span className="text-xs font-mono text-cyan-400/80">convoys & vessels</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active sea & air routes</span>
          </div>
        </div>

        {/* KPI 3: Delayed Weather Contingency */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(246,200,95,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-300">DELAYED</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">{kpiData.delayed}</span>
            <span className="text-xs font-mono text-slate-400">flagged</span>
          </div>
          <div className="mt-2 text-xs font-mono text-amber-400 truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Blizzard / fast-ice holds</span>
          </div>
        </div>

        {/* KPI 4: Delivered Secured */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-800/50 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_14px_rgba(49,212,154,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-300">DELIVERED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-300">{kpiData.delivered}</span>
            <span className="text-xs font-mono text-slate-400">cleared</span>
          </div>
          <div className="mt-2 text-xs font-mono text-emerald-400/80 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transferred to base stores</span>
          </div>
        </div>

        {/* KPI 5: Gross Polar Tonnage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">GROSS TONNAGE</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{kpiData.totalTons || '10.3'}</span>
            <span className="text-xs font-mono text-slate-400">Metric Tons</span>
          </div>
          <div className="mt-2 text-xs font-mono text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Logistics capacity: Nominal</span>
          </div>
        </div>
      </div>

      {/* Interactive Polar Route Map Section */}
      {showMap && (
        <div className="rounded-xl border border-slate-800 bg-polar-950 overflow-hidden shadow-2xl relative">
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  TACTICAL CARGO MAP • LEAFLET SATELLITE AIS
                </span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-[10px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LEAFLET AIS RADAR
              </span>
            </div>

            {/* Presets and Layer Toggles */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                <button
                  onClick={() => setMapTarget({ center: [-72.0, 30.0], zoom: 3 })}
                  className="px-2.5 py-1 rounded text-[11px] hover:text-cyan-300 hover:bg-slate-800/80 text-slate-300 transition-colors cursor-pointer"
                  title="Focus Antarctica Supply Network"
                >
                  Antarctica
                </button>
                <button
                  onClick={() => setMapTarget({ center: [78.9, 15.0], zoom: 4 })}
                  className="px-2.5 py-1 rounded text-[11px] hover:text-cyan-300 hover:bg-slate-800/80 text-slate-400 transition-colors cursor-pointer"
                  title="Focus Arctic / Svalbard Corridor"
                >
                  Arctic
                </button>
                <button
                  onClick={() => setMapTarget({ center: [-20.0, 25.0], zoom: 2 })}
                  className="px-2.5 py-1 rounded text-[11px] hover:text-cyan-300 hover:bg-slate-800/80 text-slate-400 transition-colors cursor-pointer"
                  title="Global Supply Route Overview"
                >
                  Global
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span>Routes</span>
                </label>
                <span className="text-slate-700">|</span>
                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={showWaypoints}
                    onChange={(e) => setShowWaypoints(e.target.checked)}
                    className="accent-emerald-400 rounded cursor-pointer"
                  />
                  <span>Bases</span>
                </label>
              </div>

              <button
                onClick={fetchCargoData}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Refresh Satellite Coordinates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[420px] w-full relative">
            <MapContainer
              center={mapTarget.center}
              zoom={mapTarget.zoom}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', background: '#020914' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <CargoMapViewController center={mapTarget.center} zoom={mapTarget.zoom} />

              {/* Station Base Waypoints */}
              {showWaypoints &&
                POLAR_WAYPOINTS.map((station) => (
                  <Marker key={station.code} position={[station.lat, station.lng]} icon={createStationIcon()}>
                    <Popup>
                      <div className="p-2 text-slate-900 font-mono text-xs max-w-xs">
                        <div className="font-bold text-sm text-cyan-950 flex items-center justify-between">
                          <span>{station.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold">
                            {station.code}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5">{station.type}</div>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[11px] text-slate-500">
                          Coords: {station.lat.toFixed(2)}°, {station.lng.toFixed(2)}°
                        </div>
                        <button
                          onClick={() => {
                            openSosModal({
                              title: `Waystation Alert: ${station.name} (${station.code})`,
                              category: 'Base Distress',
                              priority: 'Critical',
                              base: station.name,
                              description: `Emergency alert initiated at logistical waypoint ${station.name}. Coords: [${station.lat}, ${station.lng}]. Immediate SAR and emergency personnel mobilization requested.`,
                            });
                          }}
                          className="mt-2 w-full py-1 px-2 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Radio className="w-3 h-3 text-rose-200 animate-pulse" />
                          <span>Dispatch SOS to Station</span>
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Route Polylines for Cargos */}
              {showRoutes &&
                cargoList.map((cargo) => {
                  if (!cargo.routeCoordinates || cargo.routeCoordinates.length < 2) return null;
                  const isSelected = selectedCargo?._id === cargo._id || selectedCargo?.cargoCode === cargo.cargoCode;
                  const positions = cargo.routeCoordinates.map((pt) => [pt.lat, pt.lng]);

                  return (
                    <Polyline
                      key={`route-${cargo._id || cargo.cargoCode}`}
                      positions={positions}
                      pathOptions={{
                        color: isSelected ? '#38bdf8' : '#0284c7',
                        weight: isSelected ? 3.5 : 1.8,
                        dashArray: isSelected ? '6, 8' : '3, 6',
                        opacity: isSelected ? 0.95 : 0.45,
                      }}
                    />
                  );
                })}

              {/* Active Cargo Position Markers */}
              {cargoList.map((cargo) => {
                if (!cargo.currentCoordinates?.lat || !cargo.currentCoordinates?.lng) return null;
                const isSelected = selectedCargo?._id === cargo._id || selectedCargo?.cargoCode === cargo.cargoCode;

                return (
                  <Marker
                    key={cargo._id || cargo.cargoCode}
                    position={[cargo.currentCoordinates.lat, cargo.currentCoordinates.lng]}
                    icon={createMarkerIcon(cargo.status, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedId(cargo._id || cargo.cargoCode);
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={isSelected}>
                      <span className="font-mono text-xs font-semibold">
                        {cargo.cargoCode} • {cargo.status}
                      </span>
                    </Tooltip>
                    <Popup>
                      <div className="p-2 text-slate-900 font-mono text-xs max-w-sm">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                          <div>
                            <span className="font-bold text-sm text-cyan-950">{cargo.cargoCode}</span>
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {cargo.priority}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                            {cargo.status}
                          </span>
                        </div>

                        <div className="mt-1.5 font-semibold text-xs text-slate-800">
                          {cargo.description || cargo.title || 'Polar Consignment'}
                        </div>

                        <div className="mt-2 space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80">
                          <div className="flex justify-between">
                            <strong className="text-slate-500">Route:</strong>
                            <span className="font-medium text-slate-800">{cargo.origin} &rarr; {cargo.destination || cargo.destinationBaseName}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong className="text-slate-500">Carrier:</strong>
                            <span className="font-medium text-slate-800">{cargo.carrier || 'Polar Fleet'}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong className="text-slate-500">ETA:</strong>
                            <span className="font-medium text-slate-800">{cargo.eta || 'TBD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong className="text-slate-500">Telemetry:</strong>
                            <span className="font-medium text-slate-800">{cargo.currentTemperature ?? -5}°C | {cargo.batteryReserve ?? 95}% Batt</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedId(cargo._id || cargo.cargoCode)}
                            className="flex-1 py-1.5 px-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] transition-colors cursor-pointer text-center"
                          >
                            Inspect Details
                          </button>
                          <button
                            onClick={() => {
                              openSosModal({
                                title: `Convoy Distress: ${cargo.cargoCode} (${cargo.carrier || 'Polar Fleet'})`,
                                category: 'Logistics Disturbance',
                                priority: 'Critical',
                                base: cargo.destination || cargo.destinationBaseName || 'Maitri Research Station',
                                description: `Convoy distress signal transmitted for shipment ${cargo.cargoCode} (${cargo.description || 'Cargo Transport'}). Location: [${cargo.currentCoordinates.lat.toFixed(2)}, ${cargo.currentCoordinates.lng.toFixed(2)}]. Status: ${cargo.status}. Temp: ${cargo.currentTemperature ?? -5}°C. Urgent field recovery requested.`,
                              });
                            }}
                            className="py-1.5 px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Scramble Emergency SAR for this Convoy"
                          >
                            <Radio className="w-3 h-3 text-rose-200 animate-pulse" />
                            <span>Convoy SOS</span>
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
        {/* Status Tab Group */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 w-full lg:w-auto overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Shipments ({cargoList.length})
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'transit'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(40,169,245,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Transit ({kpiData.inTransit})
          </button>
          <button
            onClick={() => setActiveTab('delayed')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'delayed'
                ? 'bg-slate-800 text-amber-300 font-semibold shadow-[0_0_10px_rgba(246,200,95,0.2)]'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Delayed ({kpiData.delayed})
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'delivered'
                ? 'bg-slate-800 text-emerald-300 font-semibold shadow-[0_0_10px_rgba(49,212,154,0.2)]'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Delivered ({kpiData.delivered})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, manifest, vessel, destination..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All</option>
              <option value="Critical" className="bg-slate-900 text-slate-200">Critical</option>
              <option value="Urgent" className="bg-slate-900 text-slate-200">Urgent</option>
              <option value="High" className="bg-slate-900 text-slate-200">High</option>
              <option value="Medium" className="bg-slate-900 text-slate-200">Medium</option>
              <option value="Standard" className="bg-slate-900 text-slate-200">Standard</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All</option>
              <option value="Fuel" className="bg-slate-900 text-slate-200">Fuel</option>
              <option value="Equipment" className="bg-slate-900 text-slate-200">Equipment</option>
              <option value="Scientific" className="bg-slate-900 text-slate-200">Scientific</option>
              <option value="Provisions" className="bg-slate-900 text-slate-200">Provisions</option>
              <option value="Medical" className="bg-slate-900 text-slate-200">Medical</option>
              <option value="Communication" className="bg-slate-900 text-slate-200">Communication</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Cargo Manifest Table (Left) & Deep Inspection Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cargo Data Table */}
        <div className="lg:col-span-8 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                Consignment Manifests ({filteredCargos.length})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Click row to inspect telemetry & timeline
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px]">
                  <th className="py-3 px-4 font-medium">Consignment</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium">Origin → Dest</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">ETA</th>
                  <th className="py-3 px-4 font-medium">Priority</th>
                  <th className="py-3 px-4 font-medium text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCargos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-300">No cargo consignments found</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting search filters or dispatch a new consignment</p>
                    </td>
                  </tr>
                ) : (
                  filteredCargos.map((item) => {
                    const isSelected = selectedCargo?._id === item._id || selectedCargo?.cargoCode === item.cargoCode;
                    const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG['In Transit'];
                    const priorityMeta = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['Standard'];
                    const CategoryMeta = CATEGORY_ICONS[item.category] || CATEGORY_ICONS['General'];
                    const CatIcon = CategoryMeta.icon;

                    return (
                      <tr
                        key={item._id || item.cargoCode}
                        onClick={() => setSelectedId(item._id || item.cargoCode)}
                        className={`transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-slate-800/90 border-l-4 border-l-cyan-400 shadow-inner'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                              {item.cargoCode || item.trackingNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                            {item.carrier || 'Polar Fleet'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-sans font-medium text-slate-200 max-w-xs">
                          <div className="truncate font-semibold text-xs">{item.description || item.title || item.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-slate-400">
                            <CatIcon className={`w-3 h-3 ${CategoryMeta.color}`} />
                            <span>{item.category || 'General'}</span>
                            <span>•</span>
                            <span>{item.weightKg ? `${item.weightKg} kg` : 'N/A'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <div className="flex items-center gap-1 text-slate-400">
                            <span className="truncate max-w-[80px]">{item.origin}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-slate-200 font-semibold truncate max-w-[90px]">
                              {item.destination || item.destinationBaseName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <span className="text-slate-200 font-medium">{item.eta || 'Pending'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityMeta.bg} ${priorityMeta.color}`}
                          >
                            {priorityMeta.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                openSosModal({
                                  title: `Convoy Distress: ${item.cargoCode}`,
                                  category: 'Logistics Disturbance',
                                  priority: 'Critical',
                                  base: item.destination || item.destinationBaseName || 'Maitri Research Station',
                                  description: `Emergency alert for cargo consignment ${item.cargoCode} (${item.description || item.title || 'Polar Cargo'}). Origin: ${item.origin}, Destination: ${item.destination || item.destinationBaseName}. Carrier: ${item.carrier}. Urgent field escort / recovery required.`,
                                })
                              }
                              className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 hover:border-rose-500 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                              title="Scramble Emergency SOS for this Convoy"
                            >
                              <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                              <span>SOS</span>
                            </button>
                            <button
                              onClick={() => handleOpenStatusModal(item)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-600 text-cyan-300 text-[11px] transition-all cursor-pointer"
                              title="Update Waypoint Status"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                              title="Edit Manifest"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Inspection Dossier (Right Column) */}
        <div className="lg:col-span-4 space-y-6">
          {selectedCargo ? (
            <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl space-y-6">
              {/* Dossier Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{selectedCargo.cargoCode}</span>
                    <span className="text-xs font-mono text-slate-500">•</span>
                    <span className="text-xs font-mono text-slate-400">{selectedCargo.category}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-1 font-sans">
                    {selectedCargo.description || selectedCargo.title || selectedCargo.name}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Carrier: {selectedCargo.carrier || 'Polar Logistics Sling'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500 transition-all cursor-pointer"
                  title="Generate Consignment QR Code"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenStatusModal(selectedCargo)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-950/80 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.2)]"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Update Waypoint</span>
                </button>

                <button
                  onClick={() =>
                    openSosModal({
                      title: `Distress Call: ${selectedCargo.cargoCode}`,
                      category: 'Logistics Disturbance',
                      priority: 'Critical',
                      base: selectedCargo.destination || selectedCargo.destinationBaseName || 'Maitri Research Station',
                      description: `Emergency alert from consignment dossier: ${selectedCargo.cargoCode} (${selectedCargo.description || selectedCargo.title}). Carrier: ${selectedCargo.carrier || 'Polar Transport'}. Current location: ${selectedCargo.currentLocation || 'In Transit Corridor'}. Current temp: ${selectedCargo.currentTemperature ?? -5}°C. Urgent field recovery requested.`,
                    })
                  }
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-950/80 border border-rose-600/70 hover:border-rose-400 text-rose-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                  title="Scramble Convoy SOS"
                >
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>SOS</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(selectedCargo)}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-all cursor-pointer"
                  title="Edit Manifest"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-all cursor-pointer"
                  title="Delete Consignment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Route Trajectory Strip */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>ORIGIN PORT</span>
                  <span>DESTINATION BASE</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>{selectedCargo.origin}</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300">{selectedCargo.destination || selectedCargo.destinationBaseName}</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
                  <span>CURRENT LOCATION:</span>
                  <span className="text-amber-400 font-semibold truncate max-w-[170px]">
                    {selectedCargo.currentLocation || 'In Transit Corridor'}
                  </span>
                </div>
              </div>

              {/* Cryo / Environmental Telemetry Grid */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cryo-Telemetry & Container Telemetry</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded">
                    SEAL INTEGRITY: 100%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CONTAINER TEMP</span>
                    <span className="text-base font-bold text-cyan-300">
                      {selectedCargo.currentTemperature !== undefined ? `${selectedCargo.currentTemperature}°C` : '-5.0°C'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                      Req: {selectedCargo.temperatureRequirement || 'Standard Ambient'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">BATTERY RESERVE</span>
                    <span className="text-base font-bold text-emerald-400">
                      {selectedCargo.batteryReserve ?? 95}%
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Est. ~180 operating hrs
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">SHOCK / G-FORCE</span>
                    <span className="text-base font-bold text-slate-200">
                      {selectedCargo.shockGForce ?? 0.2}G
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      Within Safe Limits (&lt;2.0G)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">GROSS MASS / VOL</span>
                    <span className="text-base font-bold text-purple-300">
                      {selectedCargo.weightKg ? `${selectedCargo.weightKg} kg` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Vol: {selectedCargo.volumeM3 ? `${selectedCargo.volumeM3} m³` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Journey Timeline Stepper */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tracking Milestones ({selectedCargo.trackingHistory?.length || 0})</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    ETA: {selectedCargo.eta || '3 Days'}
                  </span>
                </div>

                <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                  {selectedCargo.trackingHistory && selectedCargo.trackingHistory.length > 0 ? (
                    selectedCargo.trackingHistory.map((step, idx) => {
                      const isLatest = idx === selectedCargo.trackingHistory.length - 1;
                      return (
                        <div key={step._id || idx} className="flex items-start gap-3 relative font-mono text-xs">
                          {/* Stepper line */}
                          {idx < selectedCargo.trackingHistory.length - 1 && (
                            <div className="absolute top-5 left-2 w-0.5 h-full bg-slate-800" />
                          )}
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 ${
                              isLatest
                                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(40,169,245,0.8)]'
                                : 'bg-slate-800 text-emerald-400 border border-slate-700'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                          </div>

                          <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200">{step.status}</span>
                              <span className="text-[10px] text-slate-500">
                                {step.timestamp ? new Date(step.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                              </span>
                            </div>
                            <div className="text-[11px] text-cyan-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400/80" />
                              <span>{step.location || 'Checkpoint'}</span>
                            </div>
                            {step.notes && (
                              <p className="text-[11px] text-slate-400 mt-1 font-sans">{step.notes}</p>
                            )}
                            {step.updatedByName && (
                              <span className="text-[10px] text-slate-600 block mt-1">Logged by: {step.updatedByName}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 font-mono py-2">No milestone history available.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400">
              <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">Select a consignment</p>
              <p className="text-xs text-slate-500 mt-1">Click any cargo manifest to inspect details and route.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CONSIGNMENT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Dispatch New Polar Cargo Consignment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">CARGO MANIFEST TITLE / CODE</label>
              <input
                type="text"
                placeholder="Auto-generated (e.g. CRG-2026-009)"
                value={formData.cargoCode}
                onChange={(e) => setFormData({ ...formData, cargoCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">CATEGORY *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Fuel">Consumables & Fuel</option>
                <option value="Equipment">Heavy Equipment & Spares</option>
                <option value="Scientific">Scientific Instrumentation</option>
                <option value="Provisions">Polar Rations & Provisions</option>
                <option value="Medical">Medical & Cryo Vaults</option>
                <option value="Communication">Satellite & Comms Uplinks</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">MANIFEST DESCRIPTION *</label>
            <input
              type="text"
              required
              placeholder="e.g. Caterpillar 3406 Crankshaft & Prime Alternator Overhaul Kit"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">ORIGIN PORT / DEPOT *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cape Town Port Pier 4"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">DESTINATION STATION *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maitri Station Base"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">ASSIGNED CARRIER</label>
              <input
                type="text"
                placeholder="RV Vasiliy Golovnin"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">INITIAL STATUS</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Planned">Planned</option>
                <option value="Packed">Packed</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Transit">In Transit</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">PRIORITY</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Standard">Standard</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">WEIGHT (KG)</label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">VOLUME (M³)</label>
              <input
                type="number"
                step="0.1"
                value={formData.volumeM3}
                onChange={(e) => setFormData({ ...formData, volumeM3: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">ESTIMATED ARRIVAL (ETA)</label>
              <input
                type="text"
                placeholder="e.g. 4 Days (16 Sep 2026)"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">CRYO / THERMAL REQ</label>
              <input
                type="text"
                placeholder="e.g. Ultra-Low Cryo (-80°C) or Standard Ambient"
                value={formData.temperatureRequirement}
                onChange={(e) => setFormData({ ...formData, temperatureRequirement: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">CURRENT SENSOR TEMP (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.currentTemperature}
                onChange={(e) => setFormData({ ...formData, currentTemperature: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">DISPATCH NOTES / MANIFEST REMARKS</label>
            <textarea
              rows={2}
              placeholder="Operational notes, handling requirements, seal barcodes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-bold hover:brightness-110 shadow-[0_0_12px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
            >
              Authorize & Dispatch
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CONSIGNMENT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Consignment ${formData.cargoCode || formData.trackingNumber}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div>
            <label className="block text-slate-400 mb-1">MANIFEST DESCRIPTION *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">CARRIER / VESSEL</label>
              <input
                type="text"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">PRIORITY</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Standard">Standard</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">ORIGIN PORT</label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">DESTINATION BASE</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">WEIGHT (KG)</label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">VOLUME (M³)</label>
              <input
                type="number"
                step="0.1"
                value={formData.volumeM3}
                onChange={(e) => setFormData({ ...formData, volumeM3: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">ETA</label>
              <input
                type="text"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE STATUS / WAYPOINT MODAL */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Advance Waypoint & Status: ${statusUpdateForm.cargoCode}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4 font-mono text-xs text-slate-300">
          <div>
            <label className="block text-slate-400 mb-1">NEW STATUS *</label>
            <select
              value={statusUpdateForm.status}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-semibold"
            >
              <option value="Planned">Planned</option>
              <option value="Packed">Packed (Sealed at Depot)</option>
              <option value="Dispatched">Dispatched (Vessel Departed)</option>
              <option value="In Transit">In Transit (Sea/Air Corridor)</option>
              <option value="Delayed">Delayed (Weather / Technical Hold)</option>
              <option value="At Base">At Base (Staged for Offloading)</option>
              <option value="Delivered">Delivered (Inspected & Cataloged)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">WAYPOINT / CURRENT LOCATION</label>
            <input
              type="text"
              placeholder="e.g. Southern Ocean Waypoint Bravo (Lat -64.5°, Lng 22.0°)"
              value={statusUpdateForm.location}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, location: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">TEMP (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="-5.0"
                value={statusUpdateForm.currentTemperature}
                onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, currentTemperature: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">BATTERY (%)</label>
              <input
                type="number"
                placeholder="95"
                value={statusUpdateForm.batteryReserve}
                onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, batteryReserve: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">SHOCK (G)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.2"
                value={statusUpdateForm.shockGForce}
                onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, shockGForce: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">WAYPOINT LOG ENTRY / FIELD NOTES</label>
            <textarea
              rows={3}
              placeholder="e.g. Vessel cleared pack ice shelf corridor. Temperature nominal. Proceeding at 14 knots."
              value={statusUpdateForm.notes}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-bold hover:brightness-110 shadow-[0_0_12px_rgba(40,169,245,0.3)] transition-all cursor-pointer"
            >
              Confirm Waypoint Update
            </button>
          </div>
        </form>
      </Modal>

      {/* QR CODE MANIFEST MODAL */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={`Tactical QR Manifest: ${selectedCargo?.cargoCode}`}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center font-mono text-xs">
          <div className="p-4 rounded-xl bg-white shadow-2xl border-4 border-slate-800">
            <QRCodeSVG
              value={JSON.stringify({
                system: 'POLARIS-LOGISTICS',
                code: selectedCargo?.cargoCode,
                manifest: selectedCargo?.description || selectedCargo?.title,
                origin: selectedCargo?.origin,
                destination: selectedCargo?.destination || selectedCargo?.destinationBaseName,
                status: selectedCargo?.status,
                carrier: selectedCargo?.carrier,
                temp: selectedCargo?.currentTemperature,
                barcode: selectedCargo?.barcodeValue,
              })}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          <div>
            <span className="font-bold text-slate-100 text-sm block">{selectedCargo?.cargoCode}</span>
            <span className="text-slate-400 text-xs mt-0.5 block max-w-xs">{selectedCargo?.description || selectedCargo?.title}</span>
            <span className="text-[11px] text-cyan-400 block mt-2">
              BARCODE: {selectedCargo?.barcodeValue || 'POLARIS-CARGO-VAULT-2026'}
            </span>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 flex justify-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              Close Scanner Window
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Consignment Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">Permanent Record Removal</p>
              <p className="text-slate-400 mt-1">
                Are you sure you want to delete consignment <strong className="text-slate-200">{selectedCargo?.cargoCode}</strong>? This will remove all associated waypoint milestones and sensor logs.
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

export default CargoPage;
