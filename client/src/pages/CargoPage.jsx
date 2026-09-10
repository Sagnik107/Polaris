import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const CargoPage = () => {
  const [cargoList, setCargoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState('ATX-103');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCargo, setNewCargo] = useState({
    trackingNumber: '',
    name: '',
    category: 'Scientific',
    origin: 'Goa Depot',
    destination: 'Bharati Base',
    status: 'In Transit',
    priority: 'High',
    eta: '2026-08-22',
  });

  const fetchCargo = async () => {
    try {
      const res = await api.get('/cargo');
      setCargoList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load cargo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCargo();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cargo', newCargo);
      setShowAddModal(false);
      fetchCargo();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create cargo consignment');
    }
  };

  const defaultShipments = [
    {
      trackingNumber: 'ATX-103',
      name: 'Ultra-Low Cryo-Freezer Array',
      category: 'Scientific',
      origin: 'Goa Depot',
      destination: 'Bharati Base',
      status: 'In Transit',
      eta: '22 Aug 2026 (ETA 4d)',
      priority: 'HIGH',
    },
    {
      trackingNumber: 'ATX-104',
      name: 'Arctic Diesel & Lubricants (40k L)',
      category: 'Consumable',
      origin: 'Cape Town',
      destination: 'Maitri Base',
      status: 'Delayed',
      eta: '28 Aug 2026 (+48h)',
      priority: 'CRITICAL',
    },
    {
      trackingNumber: 'ATX-108',
      name: 'Piston-Bully Track Spares',
      category: 'Equipment',
      origin: 'Bremerhaven',
      destination: 'Neumayer III',
      status: 'In Transit',
      eta: '02 Sep 2026',
      priority: 'MEDIUM',
    },
    {
      trackingNumber: 'ATX-112',
      name: 'High-Calorie Polar Rations',
      category: 'Provisions',
      origin: 'Christchurch',
      destination: 'Scott Base',
      status: 'Delivered',
      eta: 'Staged at Depot',
      priority: 'ROUTINE',
    },
    {
      trackingNumber: 'ATX-115',
      name: 'Autonomous Sled Telemetry Units',
      category: 'Electronics',
      origin: 'Tromsø',
      destination: 'Himadri',
      status: 'In Transit',
      eta: '24 Aug 2026',
      priority: 'HIGH',
    },
  ];

  const displayList = cargoList.length > 0 ? cargoList : defaultShipments;

  const filtered = displayList.filter((item) => {
    const status = item.status?.toLowerCase() || '';
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'transit'
        ? status.includes('transit')
        : activeTab === 'delayed'
        ? status.includes('delayed')
        : activeTab === 'delivered'
        ? status.includes('delivered')
        : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      item.trackingNumber?.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      item.origin?.toLowerCase().includes(query) ||
      item.destination?.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-text-primary tracking-tight">
              CARGO TRACKING
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-ice-300 bg-ice-500/10 border border-ice-400/30 shadow-[0_0_12px_rgba(67,184,255,0.25)] flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-ice-400 animate-pulse" />
              GLOBAL FREIGHT LOGISTICS
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Real-time multi-modal transit oversight across Arctic sea routes and Antarctic resupply vessels.
          </p>
        </div>

        {/* Action Button: Add Cargo Consignment */}
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-ice-500 to-[#168FE0] text-polar-950 font-semibold text-xs font-mono hover:shadow-[0_0_20px_rgba(40,169,245,0.4)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base font-bold">add</span>
            <span>Add Cargo Consignment</span>
          </button>
        </div>
      </div>

      {/* Reactive KPI Strip (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Shipments */}
        <div className="p-4 rounded-xl bg-surface-1 border border-border-default backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-ice-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">TOTAL SHIPMENTS</span>
            <span className="material-symbols-outlined text-ice-400 text-lg">inventory</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-text-primary tracking-tight">12</span>
            <span className="text-xs font-mono text-text-secondary">consignments</span>
          </div>
          <div className="mt-2 text-xs font-mono text-text-muted flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-ice-400" />
            <span>8 Active vessels / convoys</span>
          </div>
        </div>

        {/* KPI 2: In Transit */}
        <div className="p-4 rounded-xl bg-surface-1 border border-border-strong/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_16px_rgba(40,169,245,0.1)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-info/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ice-300">IN TRANSIT</span>
            <span className="material-symbols-outlined text-info text-lg">sailing</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-text-primary tracking-tight">8</span>
            <span className="text-xs font-mono text-info">active legs</span>
          </div>
          <div className="mt-2 text-xs font-mono text-aurora-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">check_circle</span>
            <span>On scheduled ETA</span>
          </div>
        </div>

        {/* KPI 3: Delayed */}
        <div className="p-4 rounded-xl bg-surface-1 border border-warning/30 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_16px_rgba(246,200,95,0.08)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-warning">DELAYED</span>
            <span className="material-symbols-outlined text-warning text-lg">warning</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-warning tracking-tight">2</span>
            <span className="text-xs font-mono text-text-muted">flagged</span>
          </div>
          <div className="mt-2 text-xs font-mono text-warning truncate flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning animate-ping" />
            <span className="truncate">Blizzard contingency at Cape Town</span>
          </div>
        </div>

        {/* KPI 4: Delivered */}
        <div className="p-4 rounded-xl bg-surface-1 border border-success/30 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_0_16px_rgba(49,212,154,0.08)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-success">DELIVERED</span>
            <span className="material-symbols-outlined text-success text-lg">task_alt</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-success tracking-tight">10</span>
            <span className="text-xs font-mono text-text-muted">secured</span>
          </div>
          <div className="mt-2 text-xs font-mono text-text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-success">verified</span>
            <span>Cleared ice staging this quarter</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-xl bg-surface-2 border border-border-default backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container-low border border-border-default/50 w-full lg:w-auto overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'all'
                ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Shipments (12)
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'transit'
                ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            In Transit (8)
          </button>
          <button
            onClick={() => setActiveTab('delayed')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'delayed'
                ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                : 'text-text-secondary hover:text-warning'
            }`}
          >
            Delayed (2)
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'delivered'
                ? 'bg-surface-3 text-ice-300 border border-border-strong shadow-[0_0_12px_rgba(40,169,245,0.2)]'
                : 'text-text-secondary hover:text-success'
            }`}
          >
            Delivered (10)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-base">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-polar-850 border border-border-default rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none transition-all"
            placeholder="Search shipment ID, manifest, vessel, or destination..."
          />
        </div>

        {/* Filter Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end text-xs font-mono">
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayList, null, 2));
              const a = document.createElement('a');
              a.href = dataStr;
              a.download = "polaris_cargo_manifest.json";
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-1 border border-border-default hover:border-border-strong text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export Manifest</span>
          </button>
        </div>
      </div>

      {/* Cargo Tracking Data Table */}
      <div className="rounded-xl bg-surface-2 border border-border-default backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-border-default bg-surface-container-low text-text-muted uppercase">
                <th className="py-3.5 px-4 font-medium">Shipment ID</th>
                <th className="py-3.5 px-4 font-medium">Cargo Manifest</th>
                <th className="py-3.5 px-4 font-medium">Category</th>
                <th className="py-3.5 px-4 font-medium">Origin → Destination</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium">ETA</th>
                <th className="py-3.5 px-4 font-medium">Priority</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50">
              {filtered.map((item, idx) => {
                const isSelected = selectedShipment === item.trackingNumber;
                const isDelayed = item.status === 'Delayed';
                const isDelivered = item.status === 'Delivered';

                return (
                  <tr
                    key={item.trackingNumber || idx}
                    onClick={() => setSelectedShipment(item.trackingNumber)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected ? 'bg-surface-3/60' : 'hover:bg-surface-1'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ice-400" />
                        <span className="font-semibold text-ice-300">{item.trackingNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-text-primary">{item.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-text-secondary border border-border-default">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <span>{item.origin}</span>
                        <span className="material-symbols-outlined text-xs text-text-muted">arrow_forward</span>
                        <span className="text-text-primary font-medium">{item.destination}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] ${
                          isDelayed
                            ? 'bg-warning/10 border border-warning/40 text-warning'
                            : isDelivered
                            ? 'bg-success/10 border border-success/30 text-success'
                            : 'bg-ice-500/10 border border-ice-400/30 text-ice-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDelayed ? 'bg-warning' : isDelivered ? 'bg-success' : 'bg-ice-400 animate-pulse'
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{item.eta || '3 Days'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.priority === 'CRITICAL' || item.priority === 'High'
                            ? 'bg-danger/15 border border-danger/40 text-danger'
                            : 'bg-surface-container text-text-secondary border border-border-default'
                        }`}
                      >
                        {item.priority || 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="px-2.5 py-1 rounded bg-surface-1 border border-border-strong hover:bg-surface-3 text-ice-300 text-xs transition-all">
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Interactive Route Preview (Below Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Journey Timeline Panel */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-surface-2 border border-border-default backdrop-blur-md flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-ice-400">route</span>
                <span className="font-headline text-lg font-semibold text-text-primary">
                  Shipment {selectedShipment} Journey Timeline
                </span>
              </div>
              <span className="text-xs font-mono text-aurora-400 bg-aurora-500/10 border border-aurora-500/20 px-2.5 py-0.5 rounded-full">
                Telemetry Synced (04m ago)
              </span>
            </div>

            {/* Stepper Bar */}
            <div className="mt-8 relative">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-polar-750" />
              <div className="absolute top-4 left-6 w-[56%] h-0.5 bg-gradient-to-r from-aurora-500 to-ice-400 shadow-[0_0_8px_rgba(40,169,245,0.6)]" />

              <div className="relative grid grid-cols-5 gap-2 font-mono text-xs">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-surface-3 border border-aurora-400 text-aurora-400 flex items-center justify-center shadow-[0_0_8px_rgba(41,214,176,0.4)] z-10">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <span className="text-text-primary mt-2">Planned</span>
                  <span className="text-[10px] text-text-muted">10 Aug</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-surface-3 border border-aurora-400 text-aurora-400 flex items-center justify-center shadow-[0_0_8px_rgba(41,214,176,0.4)] z-10">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                  <span className="text-text-primary mt-2">Packed</span>
                  <span className="text-[10px] text-text-muted">14 Aug</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-surface-3 border border-ice-400 text-ice-300 flex items-center justify-center shadow-[0_0_8px_rgba(40,169,245,0.6)] z-10">
                    <span className="w-2 h-2 rounded-full bg-ice-400 animate-ping" />
                  </div>
                  <span className="text-ice-300 font-bold mt-2">In Transit</span>
                  <span className="text-[10px] text-ice-400">Current</span>
                </div>

                <div className="flex flex-col items-center text-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-surface-1 border border-border-default text-text-muted flex items-center justify-center z-10">
                    <span className="text-xs">4</span>
                  </div>
                  <span className="text-text-muted mt-2">Ice Staging</span>
                  <span className="text-[10px] text-text-muted">22 Aug</span>
                </div>

                <div className="flex flex-col items-center text-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-surface-1 border border-border-default text-text-muted flex items-center justify-center z-10">
                    <span className="text-xs">5</span>
                  </div>
                  <span className="text-text-muted mt-2">Delivered</span>
                  <span className="text-[10px] text-text-muted">24 Aug</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-default/60 flex justify-between items-center text-xs font-mono text-text-secondary">
            <span>VESSEL: RV Polar Star (Callsign: WDE-90)</span>
            <span>CURRENT SPEED: 14.2 Knots SSE</span>
          </div>
        </div>

        {/* Container Telemetry Right Panel */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-surface-2 border border-border-default backdrop-blur-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
            <span className="font-headline text-sm font-semibold text-text-primary">Container Cryo-Telemetry</span>
            <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded border border-success/30">
              SEAL INTACT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-[10px] text-text-muted">INTERNAL CRYO-TEMP</span>
              <p className="text-lg font-bold text-ice-300 mt-1">-78.4°C</p>
              <span className="text-[10px] text-success">Target: -80°C (±2)</span>
            </div>

            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-[10px] text-text-muted">BATTERY RESERVE</span>
              <p className="text-lg font-bold text-aurora-400 mt-1">94%</p>
              <span className="text-[10px] text-text-muted">Est: 180 hrs</span>
            </div>

            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-[10px] text-text-muted">SHOCK / G-FORCE</span>
              <p className="text-lg font-bold text-text-primary mt-1">0.2g</p>
              <span className="text-[10px] text-success">Threshold: &lt; 2.0g</span>
            </div>

            <div className="p-3 rounded-lg bg-polar-850 border border-border-default">
              <span className="text-[10px] text-text-muted">AMBIENT BARO</span>
              <p className="text-lg font-bold text-text-primary mt-1">1014 hPa</p>
              <span className="text-[10px] text-text-muted">Atmosphere Normal</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-default/60 flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">RFID Hash: 994-CX-ANTARCTIC</span>
            <button className="text-ice-400 hover:underline cursor-pointer">Live Diagnostic →</button>
          </div>
        </div>
      </div>

      {/* ADD CARGO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">local_shipping</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">New Cargo Consignment</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Tracking ID</label>
                  <input
                    type="text"
                    required
                    value={newCargo.trackingNumber}
                    onChange={(e) => setNewCargo({ ...newCargo, trackingNumber: e.target.value })}
                    placeholder="ATX-120"
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Category</label>
                  <select
                    value={newCargo.category}
                    onChange={(e) => setNewCargo({ ...newCargo, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  >
                    <option value="Scientific">Scientific</option>
                    <option value="Consumable">Consumable & Fuel</option>
                    <option value="Equipment">Heavy Equipment</option>
                    <option value="Provisions">Provisions</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase">Cargo Manifest Description</label>
                <input
                  type="text"
                  required
                  value={newCargo.name}
                  onChange={(e) => setNewCargo({ ...newCargo, name: e.target.value })}
                  placeholder="e.g. Cryo Core Sample Preservation Unit"
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Origin Port</label>
                  <input
                    type="text"
                    required
                    value={newCargo.origin}
                    onChange={(e) => setNewCargo({ ...newCargo, origin: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase">Destination Base</label>
                  <input
                    type="text"
                    required
                    value={newCargo.destination}
                    onChange={(e) => setNewCargo({ ...newCargo, destination: e.target.value })}
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
                  Manifest Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoPage;
