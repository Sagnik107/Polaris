import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: 'Consumables & Fuel',
    quantity: 100,
    unit: 'Units',
    minThreshold: 20,
    base: 'Maitri',
  });

  const defaultInventory = [
    {
      sku: 'ITM-001',
      name: 'Arctic Grade Diesel Fuel',
      subtitle: 'High-viscosity sub-zero additive',
      category: 'Consumable',
      stock: 200,
      max: 1000,
      unit: 'L',
      threshold: 'Min 250 L',
      base: 'Maitri Base',
      status: 'LOW STOCK',
      icon: 'local_gas_station',
      iconColor: 'text-warning',
    },
    {
      sku: 'ITM-002',
      name: 'Caterpillar Polar Generator #2',
      subtitle: 'Primary heat-grid redundant unit',
      category: 'Machinery',
      stock: 2,
      max: 2,
      unit: 'Units',
      threshold: 'Min 2 Units',
      base: 'Bharati Station',
      status: 'MAINTENANCE',
      icon: 'precision_manufacturing',
      iconColor: 'text-ice-400',
    },
    {
      sku: 'ITM-003',
      name: 'Advanced Hypothermia Trauma Kit',
      subtitle: 'Thermal perfusion & re-warming units',
      category: 'Medical',
      stock: 15,
      max: 20,
      unit: 'Kits',
      threshold: 'Min 10 Kits',
      base: 'Larsemann Depot',
      status: 'IN STOCK',
      icon: 'medical_services',
      iconColor: 'text-success',
    },
    {
      sku: 'ITM-004',
      name: 'Iridium Extreme Satellite Handset',
      subtitle: 'Solar flare hardened transceivers',
      category: 'Communications',
      stock: 6,
      max: 8,
      unit: 'Units',
      threshold: 'Min 4 Units',
      base: 'Himadri Base',
      status: 'IN STOCK',
      icon: 'cell_tower',
      iconColor: 'text-aurora-400',
    },
    {
      sku: 'ITM-005',
      name: 'Sub-Ice Thermal Drill Bit Assembly',
      subtitle: 'Tungsten carbide coring cutters',
      category: 'Scientific',
      stock: 3,
      max: 6,
      unit: 'Bits',
      threshold: 'Min 4 Bits',
      base: 'Maitri Base',
      status: 'LOW STOCK',
      icon: 'build',
      iconColor: 'text-warning',
    },
  ];

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data?.data?.length > 0 ? res.data.data : defaultInventory);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setItems(defaultInventory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory', newItem);
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create inventory item');
    }
  };

  const filtered = items.filter((item) => {
    const status = item.status?.toLowerCase() || '';
    const matchesSegment =
      activeSegment === 'all'
        ? true
        : activeSegment === 'low'
        ? status.includes('low') || item.stock <= (item.minThreshold || 250)
        : activeSegment === 'maint'
        ? status.includes('maint')
        : activeSegment === 'critical'
        ? status.includes('critical') || status.includes('low')
        : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      item.sku?.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query);

    const matchesStation =
      stationFilter === 'all' ||
      item.base?.toLowerCase().includes(stationFilter.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      item.category?.toLowerCase().includes(categoryFilter.toLowerCase());

    return matchesSegment && matchesSearch && matchesStation && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* Page Header Section */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold tracking-tight text-text-primary">
              INVENTORY & ASSETS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider bg-ice-500/10 text-ice-300 border border-border-strong shadow-[0_0_8px_rgba(40,169,245,0.2)]">
              BASE LOGISTICS
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            Real-time resource depletion tracking, threshold monitoring, and maintenance scheduling across all polar stations.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
              const a = document.createElement('a');
              a.href = dataStr;
              a.download = "polaris_inventory_manifest.json";
              a.click();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            <span>Export Manifest</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-[#168FE0] hover:brightness-110 text-polar-950 font-semibold shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined font-bold text-sm">add</span>
            <span>+ Add New Item / Consumable</span>
          </button>
        </div>
      </section>

      {/* Reactive KPI Metrics Strip (4 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL ITEMS */}
        <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default hover:border-border-strong transition-all duration-200 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">TOTAL ITEMS</span>
            <span className="material-symbols-outlined text-ice-400 text-lg group-hover:scale-110 transition-transform">
              category
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-text-primary tracking-tight font-mono">1,240</span>
            <span className="text-xs font-mono text-aurora-400 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">arrow_upward</span>+12
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Active serialized assets across 4 bases</p>
          <div className="mt-3 w-full bg-polar-900 h-1 rounded-full overflow-hidden">
            <div className="bg-ice-400 h-full w-[94%]" style={{ boxShadow: '0 0 8px rgba(67, 184, 255, 0.6)' }} />
          </div>
        </div>

        {/* KPI 2: LOW STOCK ALERTS */}
        <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-warning/30 hover:border-warning/60 transition-all duration-200 relative overflow-hidden group shadow-[0_0_16px_rgba(246,200,95,0.08)]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-wider text-warning flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              LOW STOCK ALERTS
            </span>
            <span className="material-symbols-outlined text-warning text-lg group-hover:scale-110 transition-transform">
              report_problem
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-warning tracking-tight font-mono">28</span>
            <span className="text-[10px] font-mono text-warning/80 bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
              Action Req.
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Threshold violations flagged for resupply</p>
          <div className="mt-3 w-full bg-polar-900 h-1 rounded-full overflow-hidden">
            <div className="bg-warning h-full w-[28%]" style={{ boxShadow: '0 0 8px rgba(246, 200, 95, 0.6)' }} />
          </div>
        </div>

        {/* KPI 3: UNDER MAINTENANCE */}
        <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default hover:border-ice-400/50 transition-all duration-200 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-wider text-ice-300">UNDER MAINTENANCE</span>
            <span className="material-symbols-outlined text-ice-400 text-lg group-hover:scale-110 transition-transform">
              build
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-ice-300 tracking-tight font-mono">16</span>
            <span className="text-xs font-mono text-text-muted">4 scheduled today</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Scheduled sub-zero servicing</p>
          <div className="mt-3 w-full bg-polar-900 h-1 rounded-full overflow-hidden">
            <div className="bg-ice-300 h-full w-[16%]" style={{ boxShadow: '0 0 8px rgba(123, 208, 255, 0.5)' }} />
          </div>
        </div>

        {/* KPI 4: CRITICAL ASSETS */}
        <div className="p-4 rounded-xl bg-surface-1 backdrop-blur-md border border-danger/40 hover:border-danger transition-all duration-200 relative overflow-hidden group shadow-[0_0_16px_rgba(255,102,120,0.1)]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-wider text-danger flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger" />
              CRITICAL ASSETS
            </span>
            <span className="material-symbols-outlined text-danger text-lg group-hover:scale-110 transition-transform">
              emergency_home
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-danger tracking-tight font-mono">8</span>
            <span className="text-[10px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/30">
              Tier-1 Alert
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Life-support, generators, satellite modems</p>
          <div className="mt-3 w-full bg-polar-900 h-1 rounded-full overflow-hidden">
            <div className="bg-danger h-full w-[45%]" style={{ boxShadow: '0 0 8px rgba(255, 102, 120, 0.7)' }} />
          </div>
        </div>
      </section>

      {/* Filter and Segment Control Bar */}
      <section className="p-4 rounded-xl bg-surface-2 backdrop-blur-md border border-border-default flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => setActiveSegment('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeSegment === 'all'
                  ? 'bg-surface-3 border border-border-strong text-ice-300 font-semibold shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>All Items</span>
              <span className="px-1.5 py-0.2 rounded bg-polar-900 text-text-primary text-[10px]">1,240</span>
            </button>

            <button
              onClick={() => setActiveSegment('low')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeSegment === 'low'
                  ? 'bg-surface-3 border border-border-strong text-warning font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span>Low Stock</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-1 text-warning text-[10px]">28</span>
            </button>

            <button
              onClick={() => setActiveSegment('maint')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeSegment === 'maint'
                  ? 'bg-surface-3 border border-border-strong text-ice-300 font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-ice-400" />
              <span>Under Maintenance</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-1 text-ice-300 text-[10px]">16</span>
            </button>

            <button
              onClick={() => setActiveSegment('critical')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeSegment === 'critical'
                  ? 'bg-surface-3 border border-border-strong text-danger font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span>Critical Assets</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-1 text-danger text-[10px]">8</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-aurora-400">sensors</span>
              TELEMETRY: LIVE
            </span>
            <span className="text-border-strong">|</span>
            <span>UPDATED: 00:02:18 AGO</span>
          </div>
        </div>

        {/* Search Bar and Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs font-mono">
          <div className="relative md:col-span-6">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              placeholder="Search inventory by SKU, asset name, station, or category..."
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-border-focus cursor-pointer"
            >
              <option value="all">Station: All Polar Stations</option>
              <option value="maitri">Maitri Base (70°45'S)</option>
              <option value="bharati">Bharati Station (69°24'S)</option>
              <option value="himadri">Himadri Base (78°55'N)</option>
              <option value="larsemann">Larsemann Depot</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-polar-850 border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-border-focus cursor-pointer"
            >
              <option value="all">Category: All Categories</option>
              <option value="consumable">Consumables & Fuel</option>
              <option value="machinery">Heavy Machinery & Power</option>
              <option value="medical">Medical & Trauma Kits</option>
              <option value="communication">Communications & Uplinks</option>
              <option value="scientific">Scientific Instrumentation</option>
            </select>
          </div>
        </div>
      </section>

      {/* Featured Item Spotlight Card: ITM-001 (Direct from Stitch Screen) */}
      <section className="rounded-xl border border-border-strong bg-surface-1 backdrop-blur-md overflow-hidden relative shadow-[0_0_16px_rgba(40,169,245,0.15)] group">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-5 relative h-48 sm:h-56 lg:h-auto min-h-[190px] overflow-hidden">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA63ZjmYoDj71W2U6Hxf4vJxRHGHiSr7DvkEwIB0eVjAIeWAgp13yM9Ejxa1GhmzHcq-_NubKciEAufSaHd_ShQuqmvQ4KRPs361cF-N3FNqGNUyMMX7-2lRc0_QRzC7aZkb4QEuwYuuuieueYm5JSmyEgwZZl7MrpmXiQATOnAwZj2pOmDGlCkPmFr7UqDcqxzfTUQq-6dTqoRv4v0ogfPdxZs55bQogqzlIAGO3BR8HtFvIB6JFg9bQ"
              alt="Extreme climate polar industrial diesel fuel storage tank pod"
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-polar-950/40 to-surface-1 hidden lg:block" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-polar-950/80 backdrop-blur-md text-ice-300 border border-border-strong">
                DEPOT CAM: TANK-POD-01
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-aurora-500/20 text-aurora-400 border border-aurora-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-aurora-400 animate-pulse" />
                FEED LIVE
              </span>
            </div>
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-text-secondary bg-polar-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-border-default">
              LAT: 70°45'S | ELEV: 117m
            </div>
          </div>

          <div className="lg:col-span-7 p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-default pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-polar-800 border border-warning/40 flex items-center justify-center text-warning shadow-[0_0_8px_rgba(246,200,95,0.25)]">
                  <span className="material-symbols-outlined text-lg">local_gas_station</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-ice-400">ITM-001</span>
                    <span className="text-border-strong">•</span>
                    <span className="text-text-muted">PRIMARY RESERVE</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-warning/15 text-warning border border-warning/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      LOW STOCK ALERT
                    </span>
                  </div>
                  <h2 className="font-headline text-lg font-bold text-text-primary">
                    Arctic Grade Polar Diesel & Generator Station #2
                  </h2>
                </div>
              </div>
              <button className="inline-flex items-center gap-1 text-xs font-mono text-ice-400 hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-default cursor-pointer">
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>Calibrate Flow</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-polar-850 border border-border-default">
                <div className="text-text-muted text-[10px]">CURRENT TANK VOL</div>
                <div className="text-warning text-sm font-semibold mt-0.5">
                  200 L <span className="text-text-muted text-xs font-normal">/ 1,000 L</span>
                </div>
                <div className="w-full bg-polar-900 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-warning h-full w-[20%]" />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-850 border border-border-default">
                <div className="text-text-muted text-[10px]">SAFETY CRITICAL</div>
                <div className="text-text-primary text-sm font-semibold mt-0.5">Min 250 L</div>
                <div className="text-danger text-[10px] mt-1 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">arrow_downward</span>
                  -50 L Deficit
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-850 border border-border-default">
                <div className="text-text-muted text-[10px]">GEN OUTFEED TEMP</div>
                <div className="text-ice-300 text-sm font-semibold mt-0.5">+48.2°C</div>
                <div className="text-text-muted text-[10px] mt-1">Coolant nominal</div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-850 border border-border-default">
                <div className="text-text-muted text-[10px]">DRAIN RATE (HOURLY)</div>
                <div className="text-text-primary text-sm font-semibold mt-0.5">8.4 L/hr</div>
                <div className="text-aurora-400 text-[10px] mt-1 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">timelapse</span>
                  ~23.8 hrs left
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
              <div className="flex items-center gap-4 text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-ice-400">location_on</span>
                  Maitri Depot Outer Periphery
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-aurora-400">ac_unit</span>
                  Rime Ice Inhibitor Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Sensor Array Telemetry: All 12 thermal sensors online. Pressure nominal at 1.4 Bar.')}
                  className="px-3 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  View Sensor Array
                </button>
                <button
                  onClick={() => alert('Initiating priority fuel restock dispatch from Cape Town depot via RV Polar Star.')}
                  className="px-3 py-1 rounded bg-gradient-to-r from-ice-500 to-[#168FE0] hover:brightness-110 text-polar-950 font-semibold shadow-[0_0_12px_rgba(40,169,245,0.3)] cursor-pointer"
                >
                  Initiate Priority Restock
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Data Table (High Information Density) */}
      <section className="rounded-xl border border-border-default bg-surface-1 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="h-11 border-b border-border-strong bg-polar-800/80 uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2 font-semibold">Item SKU</th>
                <th className="px-4 py-2 font-semibold">Asset Name</th>
                <th className="px-4 py-2 font-semibold">Category</th>
                <th className="px-4 py-2 font-semibold">Current Stock</th>
                <th className="px-4 py-2 font-semibold">Safety Threshold</th>
                <th className="px-4 py-2 font-semibold">Station Location</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filtered.map((item, idx) => {
                const isLow = item.status === 'LOW STOCK' || item.stock <= (item.minThreshold || 10);
                const isMaint = item.status === 'MAINTENANCE';

                return (
                  <tr
                    key={item.sku || idx}
                    className="h-12 hover:bg-surface-2 transition-colors duration-150 group cursor-pointer"
                    onClick={() => setSelectedItemDetail(item)}
                  >
                    <td className="px-4 py-2 text-ice-300 font-semibold">{item.sku}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-text-primary flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${item.iconColor || 'text-ice-400'}`}>
                          {item.icon || 'inventory_2'}
                        </span>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-text-muted">{item.subtitle || 'Operational supply item'}</div>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      <span className="px-2 py-0.5 rounded bg-polar-850 border border-border-default text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isLow ? 'text-warning' : 'text-text-primary'}`}>
                          {item.stock || item.quantity} {item.unit || 'L'}
                        </span>
                        <span className="text-[10px] text-text-muted">/ {item.max || 100}</span>
                      </div>
                      <div className="w-24 bg-polar-900 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${isLow ? 'bg-warning' : isMaint ? 'bg-ice-400' : 'bg-success'}`}
                          style={{
                            width: `${Math.min(100, ((item.stock || item.quantity) / (item.max || 100)) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-text-muted">{item.threshold || `Min ${item.minThreshold || 20}`}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-ice-400" />
                        {item.base}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isLow
                            ? 'bg-warning/15 text-warning border border-warning/40 shadow-[0_0_8px_rgba(246,200,95,0.25)]'
                            : isMaint
                            ? 'bg-ice-500/15 text-ice-300 border border-border-strong'
                            : 'bg-success/15 text-success border border-success/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-warning animate-pulse' : isMaint ? 'bg-ice-400' : 'bg-success'}`} />
                        {item.status || (isLow ? 'LOW STOCK' : 'IN STOCK')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button className="inline-flex items-center gap-1 text-ice-400 hover:text-text-primary px-2 py-1 rounded bg-surface-1 border border-border-default hover:border-border-strong transition-all duration-150">
                        <span>View Detail</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ITEM DETAIL MODAL */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="text-ice-400 font-bold">{selectedItemDetail.sku}</span>
                <span className="text-text-primary font-bold">{selectedItemDetail.name}</span>
              </div>
              <button onClick={() => setSelectedItemDetail(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-polar-850">
                <span className="text-text-muted">LOCATION:</span>
                <span className="text-text-primary">{selectedItemDetail.base}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-850">
                <span className="text-text-muted">CURRENT STOCK:</span>
                <span className="text-ice-300 font-bold">{selectedItemDetail.stock || selectedItemDetail.quantity} {selectedItemDetail.unit}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-850">
                <span className="text-text-muted">SAFETY THRESHOLD:</span>
                <span className="text-warning">{selectedItemDetail.threshold || selectedItemDetail.minThreshold}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-850">
                <span className="text-text-muted">STATUS:</span>
                <span className="text-success font-semibold">{selectedItemDetail.status}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border-default flex justify-end gap-2">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-3 py-1.5 rounded bg-surface-1 border border-border-default text-text-secondary cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Dispatched automated restock requisition order to Cape Town logistics hub.');
                  setSelectedItemDetail(null);
                }}
                className="px-3 py-1.5 rounded bg-ice-500 text-polar-950 font-bold cursor-pointer hover:bg-ice-400"
              >
                Order Replenishment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">inventory_2</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">Add Inventory Resource</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Item SKU</label>
                  <input
                    type="text"
                    required
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="ITM-012"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Consumables & Fuel">Consumables & Fuel</option>
                    <option value="Heavy Machinery & Power">Heavy Machinery & Power</option>
                    <option value="Medical & Trauma Kits">Medical & Trauma Kits</option>
                    <option value="Communications & Uplinks">Communications & Uplinks</option>
                    <option value="Scientific Instrumentation">Scientific Instrumentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Asset / Item Name</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Synthetic Low-Freeze Hydraulic Oil"
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Unit</label>
                  <input
                    type="text"
                    required
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="Liters, Units, Kits"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Min Threshold</label>
                  <input
                    type="number"
                    required
                    value={newItem.minThreshold}
                    onChange={(e) => setNewItem({ ...newItem, minThreshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(40,169,245,0.3)]"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
