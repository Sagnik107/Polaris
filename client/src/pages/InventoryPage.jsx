import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Wrench,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
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
  Truck,
  Eye,
  Calendar,
  Layers,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import Modal from '../components/common/Modal';

// Tactical category icon mapping
const CATEGORY_META = {
  'Consumables & Fuel': { icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'Fuel': { icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'Medical & Trauma Kits': { icon: Activity, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  'Medical': { icon: Activity, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  'Rations': { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  'Food': { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  'Heavy Machinery & Power': { icon: Zap, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  'Machinery': { icon: Zap, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  'Communications & Uplinks': { icon: Radio, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  'Communication': { icon: Radio, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  'Scientific Instrumentation': { icon: Crosshair, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  'Scientific': { icon: Crosshair, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  'Safety': { icon: Shield, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
  'Vehicle': { icon: Truck, color: 'text-ice-400', bg: 'bg-ice-500/10 border-ice-500/30' },
  'PowerGenerator': { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'default': { icon: Package, color: 'text-slate-400', bg: 'bg-slate-800/40 border-slate-700/40' },
};

const getCategoryBadge = (cat) => {
  return CATEGORY_META[cat] || CATEGORY_META['default'];
};

export const InventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'inventory';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };


  // Data States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [invStats, setInvStats] = useState(null);
  const [assetStats, setAssetStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search (Inventory)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('all'); // 'all', 'low', 'critical', 'instock'
  const [stationFilter, setStationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-updatedAt');
  const [spotlightSku, setSpotlightSku] = useState(null);

  // Filters & Search (Assets)
  const [assetSearch, setAssetSearch] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetConditionFilter, setAssetConditionFilter] = useState('all');
  const [assetStatusFilter, setAssetStatusFilter] = useState('all');
  const [assetStationFilter, setAssetStationFilter] = useState('all');
  const [assetViewMode, setAssetViewMode] = useState('grid'); // 'grid' or 'table'

  // Modals (Inventory)
  const [showAddInvModal, setShowAddInvModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditInvModal, setShowEditInvModal] = useState(false);
  const [showDeleteInvModal, setShowDeleteInvModal] = useState(false);
  const [selectedInvItem, setSelectedInvItem] = useState(null);

  // Modals (Assets)
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [showAssetHistoryModal, setShowAssetHistoryModal] = useState(false);
  const [showDeleteAssetModal, setShowDeleteAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Form States - Add Inventory
  const [newInv, setNewInv] = useState({
    name: '',
    sku: '',
    category: 'Consumables & Fuel',
    quantity: 100,
    unit: 'Liters',
    minThreshold: 20,
    maxCapacity: 1000,
    baseName: 'Maitri Station',
    locationDetails: 'Depot Sector A-1',
    unitCost: 15,
    notes: 'Initial stock intake',
  });

  // Form States - Adjust Stock
  const [adjustData, setAdjustData] = useState({
    delta: 10,
    reason: 'Routine Consumption',
    notes: '',
  });

  // Form States - Transfer Stock
  const [transferData, setTransferData] = useState({
    toBaseName: 'Bharati Station',
    quantity: 10,
    notes: 'Convoy logistics allocation',
  });

  // Form States - Add Asset
  const [newAsset, setNewAsset] = useState({
    name: '',
    assetTag: '',
    category: 'Vehicle',
    model: '',
    serialNumber: '',
    baseName: 'Bharati Station',
    assignedPersonnelName: 'Unassigned',
    condition: 'Good',
    status: 'Operational',
    maintenanceIntervalDays: 90,
  });

  // Form States - Log Maintenance
  const [maintData, setMaintData] = useState({
    type: 'Routine',
    notes: '',
    performedBy: 'Station Technical Crew',
    cost: 150,
    condition: 'Good',
    nextMaintenanceDate: '',
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, astRes, invStatsRes, astStatsRes] = await Promise.allSettled([
        api.get('/inventory?limit=100'),
        api.get('/assets?limit=100'),
        api.get('/inventory/stats'),
        api.get('/assets/stats'),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value.data?.data) {
        setInventoryItems(invRes.value.data.data);
      }
      if (astRes.status === 'fulfilled' && astRes.value.data?.data) {
        setAssets(astRes.value.data.data);
      }
      if (invStatsRes.status === 'fulfilled' && invStatsRes.value.data?.data) {
        setInvStats(invStatsRes.value.data.data);
      }
      if (astStatsRes.status === 'fulfilled' && astStatsRes.value.data?.data) {
        setAssetStats(astStatsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setError('Unable to load depot telemetry. Operating in tactical offline cache.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onInvUpdated = () => fetchData();
    const onAstUpdated = () => fetchData();
    const onStatsUpdated = (d) => {
      if (d?.module === 'inventory' || d?.module === 'assets' || !d?.module) {
        fetchData();
      }
    };

    socket.on('inventory:updated', onInvUpdated);
    socket.on('assets:updated', onAstUpdated);
    socket.on('dashboard:statsUpdated', onStatsUpdated);

    return () => {
      socket.off('inventory:updated', onInvUpdated);
      socket.off('assets:updated', onAstUpdated);
      socket.off('dashboard:statsUpdated', onStatsUpdated);
    };
  }, [fetchData]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventoryItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const sku = (item.sku || item.itemCode || '').toLowerCase();
      const name = (item.name || item.itemName || '').toLowerCase();
      const base = (item.baseName || (item.base && item.base.name) || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const loc = (item.locationDetails || '').toLowerCase();

      const matchesSearch = !q || sku.includes(q) || name.includes(q) || base.includes(q) || cat.includes(q) || loc.includes(q);

      const qty = Number(item.quantity) || 0;
      const min = Number(item.minThreshold) || 10;
      const isCritical = qty === 0 || qty <= Math.max(1, Math.floor(min * 0.5));
      const isLow = qty <= min && !isCritical;
      const isNominal = qty > min;

      let matchesSegment = true;
      if (activeSegment === 'low') matchesSegment = isLow || isCritical;
      else if (activeSegment === 'critical') matchesSegment = isCritical;
      else if (activeSegment === 'instock') matchesSegment = isNominal;

      const matchesStation = stationFilter === 'all' || base.includes(stationFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || cat.includes(categoryFilter.toLowerCase());

      return matchesSearch && matchesSegment && matchesStation && matchesCategory;
    });
  }, [inventoryItems, searchQuery, activeSegment, stationFilter, categoryFilter]);

  // Spotlighted item
  const spotlightItem = useMemo(() => {
    if (spotlightSku) {
      const found = inventoryItems.find((i) => (i.sku || i.itemCode) === spotlightSku);
      if (found) return found;
    }
    return filteredInventory[0] || inventoryItems[0] || null;
  }, [spotlightSku, inventoryItems, filteredInventory]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const q = assetSearch.toLowerCase().trim();
      const tag = (asset.assetTag || asset.assetCode || '').toLowerCase();
      const name = (asset.name || asset.assetName || '').toLowerCase();
      const model = (asset.model || '').toLowerCase();
      const serial = (asset.serialNumber || '').toLowerCase();
      const base = (asset.baseName || '').toLowerCase();
      const op = (asset.assignedPersonnelName || '').toLowerCase();

      const matchesSearch = !q || tag.includes(q) || name.includes(q) || model.includes(q) || serial.includes(q) || base.includes(q) || op.includes(q);
      const matchesCategory = assetCategoryFilter === 'all' || asset.category?.toLowerCase() === assetCategoryFilter.toLowerCase();
      const matchesCondition = assetConditionFilter === 'all' || asset.condition?.toLowerCase() === assetConditionFilter.toLowerCase();
      const matchesStatus = assetStatusFilter === 'all' || asset.status?.toLowerCase() === assetStatusFilter.toLowerCase();
      const matchesStation = assetStationFilter === 'all' || base.includes(assetStationFilter.toLowerCase());

      return matchesSearch && matchesCategory && matchesCondition && matchesStatus && matchesStation;
    });
  }, [assets, assetSearch, assetCategoryFilter, assetConditionFilter, assetStatusFilter, assetStationFilter]);

  // Unified chronological history
  const unifiedHistory = useMemo(() => {
    const list = [];

    // Inventory movement logs
    inventoryItems.forEach((inv) => {
      const history = inv.movementHistory || [];
      history.forEach((h) => {
        list.push({
          id: h._id || `${inv._id}-${h.timestamp}`,
          sourceType: 'INVENTORY',
          itemCode: inv.sku || inv.itemCode,
          itemName: inv.name || inv.itemName,
          type: h.type || 'Adjustment',
          quantity: h.quantity,
          unit: inv.unit || 'Units',
          from: h.fromBaseName || inv.baseName,
          to: h.toBaseName || inv.baseName,
          actor: h.performedByName || 'Logistics Officer',
          notes: h.notes,
          timestamp: h.timestamp,
        });
      });
    });

    // Asset service logs
    assets.forEach((ast) => {
      const history = ast.maintenanceHistory || [];
      history.forEach((m) => {
        list.push({
          id: m._id || `${ast._id}-${m.date}`,
          sourceType: 'ASSET',
          itemCode: ast.assetTag || ast.assetCode,
          itemName: ast.name || ast.assetName,
          type: `Service [${m.type}]`,
          cost: m.cost ? `$${m.cost}` : null,
          from: ast.baseName,
          to: ast.baseName,
          actor: m.performedBy || 'Station Engineer',
          notes: m.notes,
          timestamp: m.date,
        });
      });
    });

    list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    return list;
  }, [inventoryItems, assets]);

  // Handlers - Inventory CRUD
  const handleCreateInventory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory', newInv);
      setShowAddInvModal(false);
      setNewInv({
        name: '',
        sku: '',
        category: 'Consumables & Fuel',
        quantity: 100,
        unit: 'Liters',
        minThreshold: 20,
        maxCapacity: 1000,
        baseName: 'Maitri Station',
        locationDetails: 'Depot Sector A-1',
        unitCost: 15,
        notes: 'Initial stock intake',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add inventory item');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    try {
      const deltaVal = Number(adjustData.delta);
      await api.post(`/inventory/${selectedInvItem._id}/adjust`, {
        delta: deltaVal,
        reason: `${adjustData.reason}${adjustData.notes ? ` - ${adjustData.notes}` : ''}`,
      });
      setShowAdjustModal(false);
      setSelectedInvItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust inventory stock');
    }
  };

  const handleTransferStock = async (e) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    try {
      await api.post(`/inventory/${selectedInvItem._id}/transfer`, {
        toBaseName: transferData.toBaseName,
        quantity: Number(transferData.quantity),
        notes: transferData.notes,
      });
      setShowTransferModal(false);
      setSelectedInvItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer stock');
    }
  };

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    try {
      await api.put(`/inventory/${selectedInvItem._id}`, selectedInvItem);
      setShowEditInvModal(false);
      setSelectedInvItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item details');
    }
  };

  const handleDeleteInventory = async () => {
    if (!selectedInvItem) return;
    try {
      await api.delete(`/inventory/${selectedInvItem._id}`);
      setShowDeleteInvModal(false);
      setSelectedInvItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete inventory item');
    }
  };

  // Handlers - Asset CRUD
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assets', newAsset);
      setShowAddAssetModal(false);
      setNewAsset({
        name: '',
        assetTag: '',
        category: 'Vehicle',
        model: '',
        serialNumber: '',
        baseName: 'Bharati Station',
        assignedPersonnelName: 'Unassigned',
        condition: 'Good',
        status: 'Operational',
        maintenanceIntervalDays: 90,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register polar asset');
    }
  };

  const handleLogMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await api.post(`/assets/${selectedAsset._id}/maintenance`, maintData);
      setShowMaintModal(false);
      setSelectedAsset(null);
      setMaintData({
        type: 'Routine',
        notes: '',
        performedBy: 'Station Technical Crew',
        cost: 150,
        condition: 'Good',
        nextMaintenanceDate: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log maintenance');
    }
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await api.put(`/assets/${selectedAsset._id}`, selectedAsset);
      setShowEditAssetModal(false);
      setSelectedAsset(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update asset');
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    try {
      await api.delete(`/assets/${selectedAsset._id}`);
      setShowDeleteAssetModal(false);
      setSelectedAsset(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset');
    }
  };

  // Export manifest as JSON download
  const handleExportManifest = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      facility: 'POLARIS Polar Operations Network',
      activeTab,
      data: activeTab === 'inventory' ? filteredInventory : activeTab === 'assets' ? filteredAssets : unifiedHistory,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `polaris_${activeTab}_manifest_${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="space-y-6 pb-16 font-body text-body-md text-text-primary">
      {/* Top Page Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold tracking-tight text-text-primary">
              INVENTORY & ASSETS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider bg-ice-500/10 text-ice-300 border border-border-strong shadow-[0_0_8px_rgba(40,169,245,0.2)]">
              TACTICAL LOGISTICS
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-aurora-500/10 text-aurora-400 border border-aurora-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-aurora-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs lg:text-sm text-text-secondary mt-1 max-w-3xl">
            Real-time Antarctic depot depletion surveillance, safety buffer thresholds, and tracked machinery maintenance schedules.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={fetchData}
            title="Refresh Telemetry"
            className="p-2.5 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportManifest}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-ice-400" />
            <span>Export Manifest</span>
          </button>
          {activeTab === 'inventory' ? (
            <button
              onClick={() => setShowAddInvModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] hover:brightness-110 text-polar-950 font-semibold shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>+ Add Consumable</span>
            </button>
          ) : activeTab === 'assets' ? (
            <button
              onClick={() => setShowAddAssetModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-ice-500 hover:brightness-110 text-polar-950 font-semibold shadow-[0_0_16px_rgba(67,184,255,0.35)] transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>+ Register Polar Asset</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* Error / Alert Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="underline hover:text-amber-200 cursor-pointer">
            Retry Connection
          </button>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <section className="flex items-center gap-2 border-b border-border-default pb-3 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => handleTabChange('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
            activeTab === 'inventory'
              ? 'bg-surface-3 border border-border-strong text-ice-300 font-bold shadow-[0_0_14px_rgba(40,169,245,0.25)]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
          }`}
        >
          <Package className="w-4 h-4 text-ice-400" />
          <span>Depot Consumables & Supplies</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-polar-900 text-ice-300 border border-border-default">
            {inventoryItems.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('assets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
            activeTab === 'assets'
              ? 'bg-surface-3 border border-border-strong text-ice-300 font-bold shadow-[0_0_14px_rgba(40,169,245,0.25)]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
          }`}
        >
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span>Tracked Machinery & Polar Fleet</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-polar-900 text-cyan-300 border border-border-default">
            {assets.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
            activeTab === 'history'
              ? 'bg-surface-3 border border-border-strong text-ice-300 font-bold shadow-[0_0_14px_rgba(40,169,245,0.25)]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
          }`}
        >
          <Clock className="w-4 h-4 text-aurora-400" />
          <span>Movement & Maintenance Audit</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-polar-900 text-aurora-300 border border-border-default">
            {unifiedHistory.length}
          </span>
        </button>
      </section>


      {/* ========================================================================= */}
      {/* TAB 1: CONSUMABLES & INVENTORY                                            */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Reactive KPI Metric Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: TOTAL DEPOT SKUs */}
            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default hover:border-border-strong transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">TOTAL DEPOT SKUs</span>
                <div className="p-1.5 rounded-lg bg-ice-500/10 border border-ice-500/20 text-ice-400">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-text-primary tracking-tight font-mono">
                  {invStats?.totalItems ?? inventoryItems.length}
                </span>
                <span className="text-xs font-mono text-aurora-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Nominal
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {(invStats?.totalUnits ?? inventoryItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)).toLocaleString()} total volume units across 4 polar depots
              </p>
              <div className="mt-3 w-full bg-polar-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-ice-400 h-full w-[88%]" style={{ boxShadow: '0 0 8px rgba(67, 184, 255, 0.6)' }} />
              </div>
            </div>

            {/* KPI 2: LOW STOCK ALERTS */}
            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-warning/30 hover:border-warning/60 transition-all relative overflow-hidden group shadow-[0_0_16px_rgba(246,200,95,0.06)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-warning flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
                  LOW STOCK ALERTS
                </span>
                <div className="p-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-warning tracking-tight font-mono">
                  {invStats?.lowStockCount ?? inventoryItems.filter((i) => (Number(i.quantity) || 0) <= (Number(i.minThreshold) || 10)).length}
                </span>
                <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                  Resupply Reqd
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Items at or below safety threshold</p>
              <div className="mt-3 w-full bg-polar-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-warning h-full w-[38%]" style={{ boxShadow: '0 0 8px rgba(246, 200, 95, 0.6)' }} />
              </div>
            </div>

            {/* KPI 3: CRITICAL DEPLETION */}
            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-danger/40 hover:border-danger transition-all relative overflow-hidden group shadow-[0_0_16px_rgba(255,102,120,0.08)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-danger flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                  CRITICAL DEFICIT
                </span>
                <div className="p-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-danger tracking-tight font-mono">
                  {invStats?.criticalCount ?? inventoryItems.filter((i) => (Number(i.quantity) || 0) <= Math.max(1, Math.floor((Number(i.minThreshold) || 10) * 0.5))).length}
                </span>
                <span className="text-[10px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/30">
                  Priority Drop
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Immediate life-support / fuel replenishment</p>
              <div className="mt-3 w-full bg-polar-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-danger h-full w-[18%]" style={{ boxShadow: '0 0 8px rgba(255, 102, 120, 0.7)' }} />
              </div>
            </div>

            {/* KPI 4: INVENTORY VALUATION */}
            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default hover:border-ice-400/50 transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ice-300">DEPOT ASSET VALUE</span>
                <div className="p-1.5 rounded-lg bg-ice-500/10 border border-ice-500/20 text-ice-300">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ice-300 tracking-tight font-mono">
                  ${(invStats?.totalValuation ? Math.round(invStats.totalValuation / 1000) : 485)}k
                </span>
                <span className="text-xs font-mono text-text-muted">USD Est.</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Cataloged polar supply inventory</p>
              <div className="mt-3 w-full bg-polar-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-ice-300 h-full w-[72%]" style={{ boxShadow: '0 0 8px rgba(123, 208, 255, 0.5)' }} />
              </div>
            </div>
          </section>

          {/* Filter, Segment & Search Strip */}
          <section className="p-4 rounded-xl bg-surface-2 backdrop-blur-md border border-border-default space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
                <button
                  onClick={() => setActiveSegment('all')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeSegment === 'all'
                      ? 'bg-surface-3 border border-border-strong text-ice-300 font-semibold shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All Items ({inventoryItems.length})
                </button>
                <button
                  onClick={() => setActiveSegment('low')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeSegment === 'low'
                      ? 'bg-surface-3 border border-border-strong text-warning font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span>Low Stock ({inventoryItems.filter((i) => (Number(i.quantity) || 0) <= (Number(i.minThreshold) || 10)).length})</span>
                </button>
                <button
                  onClick={() => setActiveSegment('critical')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeSegment === 'critical'
                      ? 'bg-surface-3 border border-border-strong text-danger font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span>Critical ({inventoryItems.filter((i) => (Number(i.quantity) || 0) <= Math.max(1, Math.floor((Number(i.minThreshold) || 10) * 0.5))).length})</span>
                </button>
                <button
                  onClick={() => setActiveSegment('instock')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeSegment === 'instock'
                      ? 'bg-surface-3 border border-border-strong text-success font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span>Optimal Stock</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                <span className="flex items-center gap-1.5 text-aurora-400">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  DEPOT ARRAY: SYNCHRONIZED
                </span>
              </div>
            </div>

            {/* Inputs & Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
              <div className="relative md:col-span-5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, item name, depot sector, station..."
                  className="w-full pl-9 pr-4 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="all">Station: All Polar Outposts</option>
                  <option value="Maitri">Maitri Base (70°45'S)</option>
                  <option value="Bharati">Bharati Station (69°24'S)</option>
                  <option value="Himadri">Himadri Station (78°55'N)</option>
                  <option value="Larsemann">Larsemann Depot</option>
                  <option value="Vessel">RV Bharati Icebreaker</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="Fuel">Consumables & Fuel</option>
                  <option value="Medical">Medical & Trauma Kits</option>
                  <option value="Rations">Food & Rations</option>
                  <option value="Machinery">Heavy Machinery Parts</option>
                  <option value="Communication">Communications</option>
                  <option value="Scientific">Scientific Instrumentation</option>
                  <option value="Safety">Safety Equipment</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="-updatedAt">Sort: Recent Update</option>
                  <option value="quantity">Stock: Low to High</option>
                  <option value="-quantity">Stock: High to Low</option>
                  <option value="name">Name: A to Z</option>
                  <option value="threshold">Highest Min Threshold</option>
                </select>
              </div>
            </div>
          </section>

          {/* Featured Spotlight Tactical Telemetry Card (Zero raster photos) */}
          {spotlightItem && (() => {
            const qty = Number(spotlightItem.quantity) || 0;
            const min = Number(spotlightItem.minThreshold) || 10;
            const max = Number(spotlightItem.maxCapacity) || 1000;
            const isCritical = qty === 0 || qty <= Math.max(1, Math.floor(min * 0.5));
            const isLow = qty <= min && !isCritical;
            const percent = Math.min(100, Math.round((qty / max) * 100));
            const catBadge = getCategoryBadge(spotlightItem.category);
            const CatIcon = catBadge.icon;

            return (
              <section className="rounded-xl border border-border-strong bg-surface-1 backdrop-blur-md overflow-hidden relative shadow-[0_0_20px_rgba(40,169,245,0.12)]">
                <div className="p-5 flex flex-col gap-4">
                  {/* Spotlight Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${catBadge.bg} ${catBadge.color} shadow-sm`}>
                        <CatIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-ice-400 font-bold tracking-wider">{spotlightItem.sku || spotlightItem.itemCode}</span>
                          <span className="text-border-strong">•</span>
                          <span className="text-text-muted uppercase text-[11px]">{spotlightItem.category}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isCritical
                                ? 'bg-danger/15 text-danger border-danger/40'
                                : isLow
                                ? 'bg-warning/15 text-warning border-warning/40'
                                : 'bg-success/15 text-success border-success/40'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-danger animate-pulse' : isLow ? 'bg-warning animate-pulse' : 'bg-success'}`} />
                            {isCritical ? 'CRITICAL DEFICIT' : isLow ? 'LOW STOCK WARNING' : 'NOMINAL BUFFER'}
                          </span>
                        </div>
                        <h2 className="font-headline text-lg sm:text-xl font-bold text-text-primary mt-0.5">
                          {spotlightItem.name || spotlightItem.itemName}
                        </h2>
                      </div>
                    </div>

                    {/* Spotlight Quick Action Buttons */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        onClick={() => {
                          setSelectedInvItem(spotlightItem);
                          setAdjustData({ delta: 10, reason: 'Routine Consumption', notes: '' });
                          setShowAdjustModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-ice-400 text-text-primary cursor-pointer transition-all"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-ice-400" />
                        <span>Adjust Stock</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvItem(spotlightItem);
                          setTransferData({ toBaseName: 'Bharati Station', quantity: Math.min(qty, 10), notes: '' });
                          setShowTransferModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-cyan-400 text-text-primary cursor-pointer transition-all"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Transfer</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvItem({ ...spotlightItem });
                          setShowEditInvModal(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvItem(spotlightItem);
                          setShowDeleteInvModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-danger/20 border border-border-default hover:border-danger/40 text-text-muted hover:text-danger cursor-pointer transition-all"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
                      <div className="text-text-muted text-[10px]">CURRENT STOCK VOLUME</div>
                      <div className={`text-base font-bold mt-1 ${isCritical ? 'text-danger' : isLow ? 'text-warning' : 'text-ice-300'}`}>
                        {qty.toLocaleString()} {spotlightItem.unit || 'Units'}
                      </div>
                      <div className="flex justify-between text-[10px] text-text-muted mt-1">
                        <span>Cap: {max.toLocaleString()}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-polar-900 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all ${isCritical ? 'bg-danger' : isLow ? 'bg-warning' : 'bg-ice-400'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
                      <div className="text-text-muted text-[10px]">SAFETY BUFFER THRESHOLD</div>
                      <div className="text-text-primary text-base font-bold mt-1">
                        Min {min.toLocaleString()} {spotlightItem.unit}
                      </div>
                      <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${isCritical ? 'text-danger font-semibold' : isLow ? 'text-warning' : 'text-success'}`}>
                        {isCritical ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Deficit: -{(min - qty)} {spotlightItem.unit}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Buffer Safe (+{(qty - min)})</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
                      <div className="text-text-muted text-[10px]">STATION & SECTOR LOCATION</div>
                      <div className="text-ice-300 text-sm font-bold mt-1 truncate">
                        {spotlightItem.baseName || 'Maitri Station'}
                      </div>
                      <div className="text-text-muted text-[10px] mt-1 truncate">
                        {spotlightItem.locationDetails || 'Main Depot Bay'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
                      <div className="text-text-muted text-[10px]">STORAGE ENVIRONMENT</div>
                      <div className="text-aurora-400 text-sm font-bold mt-1 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Climate Shielded</span>
                      </div>
                      <div className="text-text-muted text-[10px] mt-1">
                        Sub-zero thermal integrity nominal
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* High-Density Tactical Table */}
          <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="h-11 border-b border-border-strong bg-polar-800/80 uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2 w-10 text-center">Status</th>
                    <th className="px-4 py-2 font-semibold">SKU / Code</th>
                    <th className="px-4 py-2 font-semibold">Resource Name</th>
                    <th className="px-4 py-2 font-semibold">Category</th>
                    <th className="px-4 py-2 font-semibold">Stock Level</th>
                    <th className="px-4 py-2 font-semibold">Min Threshold</th>
                    <th className="px-4 py-2 font-semibold">Station Depot</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-muted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="w-8 h-8 text-text-muted opacity-50" />
                          <p>No consumable resources matching active search criteria.</p>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setActiveSegment('all');
                              setStationFilter('all');
                              setCategoryFilter('all');
                            }}
                            className="text-xs text-ice-400 hover:underline mt-1 cursor-pointer"
                          >
                            Reset all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const min = Number(item.minThreshold) || 10;
                      const max = Number(item.maxCapacity) || 1000;
                      const isCritical = qty === 0 || qty <= Math.max(1, Math.floor(min * 0.5));
                      const isLow = qty <= min && !isCritical;
                      const percent = Math.min(100, Math.round((qty / max) * 100));
                      const isCurrentSpotlight = (spotlightItem?.sku || spotlightItem?.itemCode) === (item.sku || item.itemCode);
                      const catBadge = getCategoryBadge(item.category);
                      const CatIcon = catBadge.icon;

                      return (
                        <tr
                          key={item._id || item.sku}
                          onClick={() => setSpotlightSku(item.sku || item.itemCode)}
                          className={`h-14 hover:bg-surface-2 transition-colors cursor-pointer ${
                            isCurrentSpotlight ? 'bg-surface-2/70 border-l-2 border-ice-400' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                isCritical
                                  ? 'bg-danger animate-ping'
                                  : isLow
                                  ? 'bg-warning animate-pulse'
                                  : 'bg-success'
                              }`}
                              title={isCritical ? 'Critical Deficit' : isLow ? 'Low Stock' : 'Optimal'}
                            />
                          </td>

                          <td className="px-4 py-2 font-bold text-ice-300">
                            {item.sku || item.itemCode}
                          </td>

                          <td className="px-4 py-2">
                            <div className="font-semibold text-text-primary flex items-center gap-2">
                              <CatIcon className={`w-3.5 h-3.5 ${catBadge.color}`} />
                              <span>{item.name || item.itemName}</span>
                            </div>
                            <div className="text-[10px] text-text-muted truncate max-w-xs">
                              {item.locationDetails || 'Sub-zero Storage Depot'}
                            </div>
                          </td>

                          <td className="px-4 py-2 text-text-secondary">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${catBadge.bg} ${catBadge.color}`}>
                              {item.category}
                            </span>
                          </td>

                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isCritical ? 'text-danger' : isLow ? 'text-warning' : 'text-text-primary'}`}>
                                {qty.toLocaleString()} {item.unit || 'Units'}
                              </span>
                              <span className="text-[10px] text-text-muted">/ {max}</span>
                            </div>
                            <div className="w-24 bg-polar-900 h-1 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full ${isCritical ? 'bg-danger' : isLow ? 'bg-warning' : 'bg-ice-400'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </td>

                          <td className="px-4 py-2 text-text-muted">
                            Min {min.toLocaleString()} {item.unit}
                          </td>

                          <td className="px-4 py-2 text-text-secondary">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-ice-400" />
                              <span>{item.baseName || (item.base && item.base.name) || 'Maitri Station'}</span>
                            </div>
                          </td>

                          <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedInvItem(item);
                                  setAdjustData({ delta: 5, reason: 'Routine Consumption', notes: '' });
                                  setShowAdjustModal(true);
                                }}
                                className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-ice-400 text-ice-300 text-[11px] cursor-pointer"
                                title="Adjust Stock"
                              >
                                +/-
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInvItem(item);
                                  setTransferData({ toBaseName: 'Bharati Station', quantity: Math.min(qty, 5), notes: '' });
                                  setShowTransferModal(true);
                                }}
                                className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-cyan-400 text-cyan-300 text-[11px] cursor-pointer"
                                title="Transfer to Station"
                              >
                                Move
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInvItem({ ...item });
                                  setShowEditInvModal(true);
                                }}
                                className="p-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default text-text-muted hover:text-text-primary cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInvItem(item);
                                  setShowDeleteInvModal(true);
                                }}
                                className="p-1 rounded bg-surface-2 hover:bg-danger/20 border border-border-default hover:border-danger/40 text-text-muted hover:text-danger cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MACHINERY & POLAR FLEET ASSETS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Asset KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">TRACKED POLAR ASSETS</span>
                <Wrench className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-text-primary">{assetStats?.totalAssets ?? assets.length}</span>
                <span className="text-xs text-text-muted">Serialized units</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Carriers, generators, satellite uplinks</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-success/30 shadow-[0_0_12px_rgba(49,212,154,0.06)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-success">OPERATIONAL FLEET</span>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-success">
                  {assetStats?.operationalCount ?? assets.filter((a) => a.status === 'Operational').length}
                </span>
                <span className="text-xs text-success/80">
                  ({assetStats?.operationalRate ?? 80}%)
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Ready for sub-zero traverse & power grid</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-warning/30 shadow-[0_0_12px_rgba(246,200,95,0.06)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-warning">MAINTENANCE / OVERDUE</span>
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-warning">
                  {assets.filter((a) => a.status === 'Under Maintenance' || a.maintenanceStatus === 'Overdue' || a.maintenanceStatus === 'In Maintenance').length}
                </span>
                <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                  Service Reqd
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Scheduled filter, track & fluid overhauls</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ice-300">SERVICE CADENCE</span>
                <Shield className="w-4 h-4 text-ice-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-ice-300">90 Days</span>
                <span className="text-xs text-text-muted">Standard</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">Extreme cold weather maintenance protocol</p>
            </div>
          </section>

          {/* Asset Filters & View Toggle */}
          <section className="p-4 rounded-xl bg-surface-2 backdrop-blur-md border border-border-default flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search asset tag, model, serial, operator..."
                className="w-full pl-9 pr-4 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={assetCategoryFilter}
                onChange={(e) => setAssetCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Vehicle">Tracked Vehicles</option>
                <option value="PowerGenerator">Power Generators</option>
                <option value="Communication">SATCOM</option>
                <option value="Scientific Instrument">Scientific Instruments</option>
              </select>

              <select
                value={assetConditionFilter}
                onChange={(e) => setAssetConditionFilter(e.target.value)}
                className="px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="all">Condition: All</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>

              <select
                value={assetStatusFilter}
                onChange={(e) => setAssetStatusFilter(e.target.value)}
                className="px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="Operational">Operational</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Standby">Standby</option>
              </select>

              <select
                value={assetStationFilter}
                onChange={(e) => setAssetStationFilter(e.target.value)}
                className="px-3 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="all">All Stations</option>
                <option value="Bharati">Bharati Station</option>
                <option value="Maitri">Maitri Station</option>
                <option value="Himadri">Himadri Station</option>
              </select>

              <div className="flex items-center border border-border-default rounded-lg overflow-hidden">
                <button
                  onClick={() => setAssetViewMode('grid')}
                  className={`px-3 py-2 cursor-pointer ${assetViewMode === 'grid' ? 'bg-surface-3 text-ice-300 font-bold' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setAssetViewMode('table')}
                  className={`px-3 py-2 cursor-pointer ${assetViewMode === 'table' ? 'bg-surface-3 text-ice-300 font-bold' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Table
                </button>
              </div>
            </div>
          </section>

          {/* Assets Grid View */}
          {assetViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-text-muted">
                  <Wrench className="w-8 h-8 mx-auto text-text-muted opacity-50 mb-2" />
                  <p>No polar assets found matching the selected filters.</p>
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isOverdue =
                    asset.nextMaintenanceDate &&
                    new Date(asset.nextMaintenanceDate) < new Date() &&
                    asset.status !== 'Decommissioned';

                  const catMeta = getCategoryBadge(asset.category);
                  const Icon = catMeta.icon;

                  return (
                    <div
                      key={asset._id || asset.assetTag}
                      className={`rounded-xl border bg-surface-1 backdrop-blur-md p-5 flex flex-col justify-between transition-all hover:border-border-strong ${
                        isOverdue ? 'border-danger/50 shadow-[0_0_14px_rgba(255,102,120,0.1)]' : 'border-border-default'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-border-default pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${catMeta.bg} ${catMeta.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs font-mono font-bold text-ice-300">{asset.assetTag || asset.assetCode}</span>
                              <h3 className="font-headline font-bold text-text-primary text-sm line-clamp-1">
                                {asset.name || asset.assetName}
                              </h3>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                              asset.status === 'Operational'
                                ? 'bg-success/15 text-success border-success/30'
                                : asset.status === 'Under Maintenance' || asset.status === 'Maintenance'
                                ? 'bg-warning/15 text-warning border-warning/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {asset.status}
                          </span>
                        </div>

                        {/* Specs & Attributes */}
                        <div className="mt-3 space-y-2 text-xs font-mono">
                          <div className="flex justify-between text-text-secondary">
                            <span className="text-text-muted">Model / Serial:</span>
                            <span className="text-text-primary font-medium truncate max-w-[170px]">
                              {asset.model || asset.serialNumber || 'Arctic Spec'}
                            </span>
                          </div>

                          <div className="flex justify-between text-text-secondary">
                            <span className="text-text-muted">Assigned Operator:</span>
                            <span className="text-ice-300 truncate max-w-[170px]">
                              {asset.assignedPersonnelName || 'Station Pool'}
                            </span>
                          </div>

                          <div className="flex justify-between text-text-secondary">
                            <span className="text-text-muted">Station Outpost:</span>
                            <span className="text-text-primary">{asset.baseName}</span>
                          </div>

                          <div className="flex justify-between text-text-secondary">
                            <span className="text-text-muted">Condition:</span>
                            <span
                              className={`font-semibold ${
                                asset.condition === 'Excellent' || asset.condition === 'Good'
                                  ? 'text-success'
                                  : asset.condition === 'Fair'
                                  ? 'text-warning'
                                  : 'text-danger'
                              }`}
                            >
                              {asset.condition || 'Good'}
                            </span>
                          </div>

                          <div className="flex justify-between text-text-secondary pt-1 border-t border-border-default/60">
                            <span className="text-text-muted">Next Service Due:</span>
                            <span className={`font-semibold ${isOverdue ? 'text-danger flex items-center gap-1' : 'text-text-primary'}`}>
                              {isOverdue && <AlertTriangle className="w-3 h-3 text-danger animate-pulse" />}
                              {asset.nextMaintenanceDate
                                ? new Date(asset.nextMaintenanceDate).toLocaleDateString()
                                : 'Scheduled 90d'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between font-mono text-xs">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssetHistoryModal(true);
                          }}
                          className="text-text-muted hover:text-ice-300 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Logs ({asset.maintenanceHistory?.length || 0})</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAsset(asset);
                              setMaintData({
                                type: 'Routine',
                                notes: '',
                                performedBy: 'Station Technical Crew',
                                cost: 120,
                                condition: 'Good',
                                nextMaintenanceDate: '',
                              });
                              setShowMaintModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-500/40 text-[11px] font-bold cursor-pointer"
                          >
                            Log Service
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAsset({ ...asset });
                              setShowEditAssetModal(true);
                            }}
                            className="p-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default text-text-muted hover:text-text-primary cursor-pointer"
                            title="Edit Asset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAsset(asset);
                              setShowDeleteAssetModal(true);
                            }}
                            className="p-1 rounded bg-surface-2 hover:bg-danger/20 border border-border-default text-text-muted hover:text-danger cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Assets Table View */
            <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="h-11 border-b border-border-strong bg-polar-800/80 uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-2 font-semibold">Asset Tag</th>
                      <th className="px-4 py-2 font-semibold">Equipment Name</th>
                      <th className="px-4 py-2 font-semibold">Category</th>
                      <th className="px-4 py-2 font-semibold">Base Station</th>
                      <th className="px-4 py-2 font-semibold">Condition</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Next Service</th>
                      <th className="px-4 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {filteredAssets.map((asset) => {
                      const isOverdue =
                        asset.nextMaintenanceDate &&
                        new Date(asset.nextMaintenanceDate) < new Date() &&
                        asset.status !== 'Decommissioned';

                      return (
                        <tr key={asset._id || asset.assetTag} className="h-14 hover:bg-surface-2 transition-colors">
                          <td className="px-4 py-2 font-bold text-ice-300">{asset.assetTag || asset.assetCode}</td>
                          <td className="px-4 py-2">
                            <div className="font-semibold text-text-primary">{asset.name || asset.assetName}</div>
                            <div className="text-[10px] text-text-muted">{asset.model || asset.serialNumber}</div>
                          </td>
                          <td className="px-4 py-2 text-text-secondary">{asset.category}</td>
                          <td className="px-4 py-2 text-text-secondary">{asset.baseName}</td>
                          <td className="px-4 py-2">
                            <span className="font-semibold text-text-primary">{asset.condition}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-polar-850 border border-border-default">
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={isOverdue ? 'text-danger font-bold flex items-center gap-1' : 'text-text-muted'}>
                              {isOverdue && <AlertTriangle className="w-3 h-3 text-danger" />}
                              {asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setShowMaintModal(true);
                                }}
                                className="px-2 py-1 rounded bg-ice-500/20 text-ice-300 border border-ice-500/40 text-[11px] font-bold cursor-pointer"
                              >
                                Service
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAsset({ ...asset });
                                  setShowEditAssetModal(true);
                                }}
                                className="p-1 rounded bg-surface-2 text-text-muted hover:text-text-primary cursor-pointer"
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
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MOVEMENT & MAINTENANCE AUDIT HISTORY                                */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md p-6">
          <div className="flex items-center justify-between border-b border-border-default pb-4 mb-4">
            <div>
              <h2 className="text-base font-headline font-bold text-text-primary">
                TACTICAL LOGISTICS AUDIT TRAIL
              </h2>
              <p className="text-xs font-mono text-text-muted mt-0.5">
                Cryptographically synchronized sequence of inventory adjustments, depot transfers, and engineering service records.
              </p>
            </div>
            <span className="text-xs font-mono text-aurora-400 bg-aurora-500/10 px-2.5 py-1 rounded border border-aurora-500/30">
              {unifiedHistory.length} Logged Events
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {unifiedHistory.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Clock className="w-8 h-8 mx-auto text-text-muted opacity-50 mb-2" />
                <p>No movement or maintenance logs recorded yet.</p>
              </div>
            ) : (
              unifiedHistory.map((item) => {
                const isAsset = item.sourceType === 'ASSET';
                const isTransfer = item.type?.toLowerCase().includes('transfer');
                const isAddition = item.type?.toLowerCase().includes('addition');
                const isConsumption = item.type?.toLowerCase().includes('consumption');

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-polar-850 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                          isAsset
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : isTransfer
                            ? 'bg-ice-500/10 text-ice-300 border-ice-500/30'
                            : isAddition
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-warning/10 text-warning border-warning/30'
                        }`}
                      >
                        {isAsset ? <Wrench className="w-4 h-4" /> : isTransfer ? <ArrowRightLeft className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-ice-400 font-bold">{item.itemCode}</span>
                          <span className="text-text-primary font-semibold">{item.itemName}</span>
                          <span
                            className={`px-2 py-0.2 text-[10px] rounded border ${
                              isAsset
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                : isAddition
                                ? 'bg-success/15 text-success border-success/30'
                                : isTransfer
                                ? 'bg-ice-500/15 text-ice-300 border-ice-500/30'
                                : 'bg-warning/15 text-warning border-warning/30'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5">
                          {item.notes || 'Routine protocol'}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center text-[11px] text-text-muted shrink-0">
                      <div className="text-text-primary font-semibold">
                        {item.quantity ? `${item.quantity} ${item.unit}` : item.cost || 'Routine'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span>{item.actor}</span>
                        <span>•</span>
                        <span>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALS: ADD INVENTORY                                                     */}
      {/* ========================================================================= */}
      <Modal isOpen={showAddInvModal} onClose={() => setShowAddInvModal(false)} title="Add Consumable Depot Resource">
        <form onSubmit={handleCreateInventory} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">SKU / Item Code</label>
              <input
                type="text"
                value={newInv.sku}
                onChange={(e) => setNewInv({ ...newInv, sku: e.target.value })}
                placeholder="e.g. FUEL-JET-A1-05"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Category</label>
              <select
                value={newInv.category}
                onChange={(e) => setNewInv({ ...newInv, category: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Consumables & Fuel">Consumables & Fuel</option>
                <option value="Medical & Trauma Kits">Medical & Trauma Kits</option>
                <option value="Rations">Food & Rations</option>
                <option value="Heavy Machinery & Power">Heavy Machinery & Power</option>
                <option value="Communications & Uplinks">Communications & Uplinks</option>
                <option value="Scientific Instrumentation">Scientific Instrumentation</option>
                <option value="Safety">Safety Equipment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Resource Name</label>
            <input
              type="text"
              required
              value={newInv.name}
              onChange={(e) => setNewInv({ ...newInv, name: e.target.value })}
              placeholder="e.g. Synthetic Low-Freeze Hydraulic Oil ISO 15"
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Initial Quantity</label>
              <input
                type="number"
                required
                min={0}
                value={newInv.quantity}
                onChange={(e) => setNewInv({ ...newInv, quantity: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Unit of Measure</label>
              <input
                type="text"
                required
                value={newInv.unit}
                onChange={(e) => setNewInv({ ...newInv, unit: e.target.value })}
                placeholder="Liters, Packs, Units"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Safety Min Threshold</label>
              <input
                type="number"
                required
                min={0}
                value={newInv.minThreshold}
                onChange={(e) => setNewInv({ ...newInv, minThreshold: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Depot Base Outpost</label>
              <select
                value={newInv.baseName}
                onChange={(e) => setNewInv({ ...newInv, baseName: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Maitri Station">Maitri Station (70°45'S)</option>
                <option value="Bharati Station">Bharati Station (69°24'S)</option>
                <option value="Himadri Station">Himadri Station (78°55'N)</option>
                <option value="Larsemann Depot">Larsemann Depot</option>
                <option value="RV Bharati">RV Bharati Icebreaker</option>
              </select>
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Storage Location Details</label>
              <input
                type="text"
                value={newInv.locationDetails}
                onChange={(e) => setNewInv({ ...newInv, locationDetails: e.target.value })}
                placeholder="e.g. Hangar Cryo Bay 2"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowAddInvModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
            >
              Save to Manifest
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: QUICK ADJUST STOCK (+/-)                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedInvItem(null);
        }}
        title={`Adjust Stock: ${selectedInvItem?.name || selectedInvItem?.itemName || ''}`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-polar-850 border border-border-default flex items-center justify-between">
            <span className="text-text-muted">Current Stock:</span>
            <span className="text-ice-300 font-bold text-sm">
              {selectedInvItem?.quantity} {selectedInvItem?.unit}
            </span>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Stock Change Delta (+ or -)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, delta: adjustData.delta - 5 })}
                className="px-3 py-2 rounded bg-surface-2 hover:bg-surface-3 border border-border-default font-bold text-sm cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, delta: adjustData.delta - 1 })}
                className="px-3 py-2 rounded bg-surface-2 hover:bg-surface-3 border border-border-default font-bold text-sm cursor-pointer"
              >
                -1
              </button>
              <input
                type="number"
                required
                value={adjustData.delta}
                onChange={(e) => setAdjustData({ ...adjustData, delta: Number(e.target.value) })}
                className="flex-1 p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary text-center font-bold text-sm outline-none focus:border-border-focus"
              />
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, delta: adjustData.delta + 1 })}
                className="px-3 py-2 rounded bg-surface-2 hover:bg-surface-3 border border-border-default font-bold text-sm cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, delta: adjustData.delta + 5 })}
                className="px-3 py-2 rounded bg-surface-2 hover:bg-surface-3 border border-border-default font-bold text-sm cursor-pointer"
              >
                +5
              </button>
            </div>
            <p className="text-[11px] text-text-muted mt-1.5">
              New Projected Balance: {(Number(selectedInvItem?.quantity) || 0) + Number(adjustData.delta)} {selectedInvItem?.unit}
            </p>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Adjustment Reason</label>
            <select
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
            >
              <option value="Routine Consumption">Routine Station Consumption</option>
              <option value="Expedition Allocation">Expedition Field Sortie Allocation</option>
              <option value="Supply Delivery">Inbound Supply Flight Replenishment</option>
              <option value="Waste / Spillage">Extreme Cold Damage / Spillage Write-off</option>
              <option value="Physical Audit Count">Depot Physical Count Reconciliation</option>
            </select>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Notes / Reference (Optional)</label>
            <input
              type="text"
              value={adjustData.notes}
              onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
              placeholder="e.g. Authorized by Base Officer Capt. Thomas"
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: INTER-BASE TRANSFER                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedInvItem(null);
        }}
        title={`Inter-Station Stock Transfer: ${selectedInvItem?.name || selectedInvItem?.itemName || ''}`}
      >
        <form onSubmit={handleTransferStock} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-text-muted text-[10px] block">ORIGIN OUTPOST</span>
              <span className="text-ice-300 font-bold text-xs">{selectedInvItem?.baseName || 'Maitri Station'}</span>
              <span className="text-text-muted text-[10px] block mt-1">Available: {selectedInvItem?.quantity} {selectedInvItem?.unit}</span>
            </div>
            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-text-muted text-[10px] block">DESTINATION OUTPOST</span>
              <select
                value={transferData.toBaseName}
                onChange={(e) => setTransferData({ ...transferData, toBaseName: e.target.value })}
                className="w-full mt-1 bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
              >
                <option value="Bharati Station">Bharati Station</option>
                <option value="Maitri Station">Maitri Station</option>
                <option value="Himadri Station">Himadri Station</option>
                <option value="Larsemann Depot">Larsemann Depot</option>
                <option value="RV Bharati">RV Bharati Icebreaker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Transfer Volume ({selectedInvItem?.unit})</label>
            <input
              type="number"
              required
              min={1}
              max={selectedInvItem?.quantity || 1}
              value={transferData.quantity}
              onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary font-bold text-sm outline-none focus:border-border-focus"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Transport Convoy / Flight Notes</label>
            <input
              type="text"
              required
              value={transferData.notes}
              onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
              placeholder="e.g. Basler BT-67 Polar Flight 2026-03 or PistenBully sled traverse"
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-ice-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(67,184,255,0.3)]"
            >
              Dispatch Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: EDIT INVENTORY                                                    */}
      {/* ========================================================================= */}
      {selectedInvItem && showEditInvModal && (
        <Modal
          isOpen={showEditInvModal}
          onClose={() => {
            setShowEditInvModal(false);
            setSelectedInvItem(null);
          }}
          title={`Edit Resource: ${selectedInvItem.name || selectedInvItem.itemName}`}
        >
          <form onSubmit={handleUpdateInventory} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Item Name</label>
              <input
                type="text"
                required
                value={selectedInvItem.name || selectedInvItem.itemName}
                onChange={(e) =>
                  setSelectedInvItem({ ...selectedInvItem, name: e.target.value, itemName: e.target.value })
                }
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Category</label>
                <select
                  value={selectedInvItem.category}
                  onChange={(e) => setSelectedInvItem({ ...selectedInvItem, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                >
                  <option value="Consumables & Fuel">Consumables & Fuel</option>
                  <option value="Medical & Trauma Kits">Medical & Trauma Kits</option>
                  <option value="Rations">Food & Rations</option>
                  <option value="Heavy Machinery & Power">Heavy Machinery & Power</option>
                  <option value="Communications & Uplinks">Communications & Uplinks</option>
                  <option value="Scientific Instrumentation">Scientific Instrumentation</option>
                  <option value="Safety">Safety Equipment</option>
                </select>
              </div>
              <div>
                <label className="block text-text-muted mb-1 uppercase">Safety Min Threshold</label>
                <input
                  type="number"
                  required
                  value={selectedInvItem.minThreshold}
                  onChange={(e) => setSelectedInvItem({ ...selectedInvItem, minThreshold: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Base Outpost</label>
                <input
                  type="text"
                  value={selectedInvItem.baseName}
                  onChange={(e) => setSelectedInvItem({ ...selectedInvItem, baseName: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1 uppercase">Storage Location Details</label>
                <input
                  type="text"
                  value={selectedInvItem.locationDetails}
                  onChange={(e) => setSelectedInvItem({ ...selectedInvItem, locationDetails: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setShowEditInvModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODALS: DELETE CONFIRMATION (INVENTORY)                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showDeleteInvModal}
        onClose={() => {
          setShowDeleteInvModal(false);
          setSelectedInvItem(null);
        }}
        title="Confirm Inventory Resource Deletion"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Irreversible Depot Manifest Action</div>
              <div className="text-[11px] text-danger/90 mt-1">
                Are you sure you want to permanently decommission and delete{' '}
                <span className="font-bold text-white">{selectedInvItem?.name || selectedInvItem?.itemName}</span> (
                {selectedInvItem?.sku || selectedInvItem?.itemCode}) from the polar inventory database?
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              onClick={() => setShowDeleteInvModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteInventory}
              className="px-4 py-2 rounded-lg bg-danger text-white font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(255,102,120,0.4)]"
            >
              Delete Resource
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: REGISTER POLAR ASSET                                              */}
      {/* ========================================================================= */}
      <Modal isOpen={showAddAssetModal} onClose={() => setShowAddAssetModal(false)} title="Register Heavy Machinery / Polar Asset">
        <form onSubmit={handleCreateAsset} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Asset Tag</label>
              <input
                type="text"
                value={newAsset.assetTag}
                onChange={(e) => setNewAsset({ ...newAsset, assetTag: e.target.value })}
                placeholder="e.g. AST-VEH-04"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Asset Category</label>
              <select
                value={newAsset.category}
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Vehicle">Tracked Vehicle / Snow Groomer</option>
                <option value="PowerGenerator">Power Generator / Heat-Grid</option>
                <option value="Communication">Satellite Ground Terminal (SATCOM)</option>
                <option value="Scientific Instrument">Scientific Deep Corer / Spectrometer</option>
                <option value="Safety Equipment">Safety Equipment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Asset Equipment Name</label>
            <input
              type="text"
              required
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              placeholder="e.g. Bombardier Ski-Doo Alpine III Heavy Utility"
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Model Specification</label>
              <input
                type="text"
                value={newAsset.model}
                onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                placeholder="e.g. Alpine III Rotax 900"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Serial Number</label>
              <input
                type="text"
                value={newAsset.serialNumber}
                onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                placeholder="e.g. SKI-2025-0819"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Station Outpost</label>
              <select
                value={newAsset.baseName}
                onChange={(e) => setNewAsset({ ...newAsset, baseName: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Bharati Station">Bharati Station</option>
                <option value="Maitri Station">Maitri Station</option>
                <option value="Himadri Station">Himadri Station</option>
              </select>
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Condition</label>
              <select
                value={newAsset.condition}
                onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Status</label>
              <select
                value={newAsset.status}
                onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              >
                <option value="Operational">Operational</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Standby">Standby</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Assigned Operator / Tech</label>
              <input
                type="text"
                value={newAsset.assignedPersonnelName}
                onChange={(e) => setNewAsset({ ...newAsset, assignedPersonnelName: e.target.value })}
                placeholder="e.g. Arjun Nair"
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Service Interval (Days)</label>
              <input
                type="number"
                value={newAsset.maintenanceIntervalDays}
                onChange={(e) => setNewAsset({ ...newAsset, maintenanceIntervalDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowAddAssetModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-ice-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(67,184,255,0.3)]"
            >
              Register Asset
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: LOG ASSET MAINTENANCE                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showMaintModal}
        onClose={() => {
          setShowMaintModal(false);
          setSelectedAsset(null);
        }}
        title={`Log Maintenance Service: ${selectedAsset?.name || selectedAsset?.assetName || ''}`}
      >
        <form onSubmit={handleLogMaintenance} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Maintenance Type</label>
              <select
                value={maintData.type}
                onChange={(e) => setMaintData({ ...maintData, type: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
              >
                <option value="Routine">Routine Inspection & Fluid Flush</option>
                <option value="Repair">Component Repair / Replacement</option>
                <option value="Overhaul">Sub-Zero Winterization Overhaul</option>
                <option value="Emergency">Emergency Field Triage</option>
              </select>
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Condition After Service</label>
              <select
                value={maintData.condition}
                onChange={(e) => setMaintData({ ...maintData, condition: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
              >
                <option value="Good">Good</option>
                <option value="Excellent">Excellent</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1 uppercase">Work Performed / Service Notes</label>
            <textarea
              required
              rows={3}
              value={maintData.notes}
              onChange={(e) => setMaintData({ ...maintData, notes: e.target.value })}
              placeholder="Describe overhaul actions, replaced parts, hydraulic pressure checks..."
              className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Lead Technician / Engineer</label>
              <input
                type="text"
                required
                value={maintData.performedBy}
                onChange={(e) => setMaintData({ ...maintData, performedBy: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 uppercase">Service Cost (USD)</label>
              <input
                type="number"
                min={0}
                value={maintData.cost}
                onChange={(e) => setMaintData({ ...maintData, cost: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setShowMaintModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
            >
              Save Service Record
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODALS: ASSET SERVICE HISTORY DRAWER                                      */}
      {/* ========================================================================= */}
      {selectedAsset && showAssetHistoryModal && (
        <Modal
          isOpen={showAssetHistoryModal}
          onClose={() => {
            setShowAssetHistoryModal(false);
            setSelectedAsset(null);
          }}
          title={`Maintenance History: ${selectedAsset.name || selectedAsset.assetName}`}
        >
          <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
            <div className="flex justify-between items-center pb-2 border-b border-border-default text-text-muted">
              <span>Tag: {selectedAsset.assetTag || selectedAsset.assetCode}</span>
              <span>Total Records: {selectedAsset.maintenanceHistory?.length || 0}</span>
            </div>

            {(!selectedAsset.maintenanceHistory || selectedAsset.maintenanceHistory.length === 0) ? (
              <p className="text-text-muted py-6 text-center">No maintenance logs recorded for this equipment yet.</p>
            ) : (
              selectedAsset.maintenanceHistory.map((log, idx) => (
                <div key={log._id || idx} className="p-3 rounded-lg bg-polar-850 border border-border-default space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-ice-300">Service: {log.type}</span>
                    <span className="text-[10px] text-text-muted">{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-text-secondary text-[11px]">{log.notes}</p>
                  <div className="flex justify-between items-center text-[10px] text-text-muted pt-1 border-t border-border-default/50">
                    <span>Tech: {log.performedBy || 'Station Tech'}</span>
                    <span>Cost: {log.cost ? `$${log.cost}` : 'Covered'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODALS: EDIT ASSET                                                        */}
      {/* ========================================================================= */}
      {selectedAsset && showEditAssetModal && (
        <Modal
          isOpen={showEditAssetModal}
          onClose={() => {
            setShowEditAssetModal(false);
            setSelectedAsset(null);
          }}
          title={`Edit Asset: ${selectedAsset.name || selectedAsset.assetName}`}
        >
          <form onSubmit={handleUpdateAsset} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-text-muted mb-1 uppercase">Asset Name</label>
              <input
                type="text"
                required
                value={selectedAsset.name || selectedAsset.assetName}
                onChange={(e) =>
                  setSelectedAsset({ ...selectedAsset, name: e.target.value, assetName: e.target.value })
                }
                className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Status</label>
                <select
                  value={selectedAsset.status}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, status: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="Operational">Operational</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Standby">Standby</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Condition</label>
                <select
                  value={selectedAsset.condition}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, condition: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Repair">Needs Repair</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted mb-1 uppercase">Base Outpost</label>
                <input
                  type="text"
                  value={selectedAsset.baseName}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, baseName: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Assigned Operator</label>
                <input
                  type="text"
                  value={selectedAsset.assignedPersonnelName}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, assignedPersonnelName: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setShowEditAssetModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
              >
                Save Asset
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODALS: DELETE ASSET                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showDeleteAssetModal}
        onClose={() => {
          setShowDeleteAssetModal(false);
          setSelectedAsset(null);
        }}
        title="Confirm Asset Decommissioning / Deletion"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Permanent Equipment Removal</div>
              <div className="text-[11px] text-danger/90 mt-1">
                Are you sure you want to delete polar asset{' '}
                <span className="font-bold text-white">{selectedAsset?.name || selectedAsset?.assetName}</span> (
                {selectedAsset?.assetTag || selectedAsset?.assetCode})?
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
            <button
              onClick={() => setShowDeleteAssetModal(false)}
              className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAsset}
              className="px-4 py-2 rounded-lg bg-danger text-white font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(255,102,120,0.4)]"
            >
              Delete Asset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;
