import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export const ExpeditionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [expedition, setExpedition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpedition = async () => {
      try {
        const res = await api.get(`/expeditions/${id}`);
        setExpedition(res.data?.data);
      } catch (err) {
        console.error('Failed to load expedition detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpedition();
  }, [id]);

  const stages = [
    { num: 'STAGE 01', name: '1. Planning', status: 'Completed', active: false },
    { num: 'STAGE 02', name: '2. Personnel Assigned', status: 'Completed', active: false },
    { num: 'STAGE 03', name: '3. Resources Loaded', status: 'Completed', active: false },
    { num: 'STAGE 04', name: '4. Departed Goa', status: 'Completed', active: false },
    { num: 'STAGE 05', name: '5. In Polar Transit', status: 'ACTIVE - Day 42', active: true, progress: 75 },
    { num: 'STAGE 06', name: '6. At Ice Shelf Base', status: 'Pending Arrival', active: false },
    { num: 'STAGE 07', name: '7. Mission Completed', status: 'Target Q1 2026', active: false },
  ];

  const specialists = [
    {
      name: 'Dr. Ananya Roy',
      role: 'Lead Glaciologist',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCI7B8Wf8-SEAdroiyLRkajKQgr2qMLd_GSar4IZgEM2ka7VZ-Grj_sbMy6DYpw7mwMRJJolGyXbQXNiU0mROI9qU8-ASKFUbv_VZqyKSAVliG4egidJog69tHnXMKapGQRrnE0JcihF4Ee9UUqaR1aYo9zRbFrl6zUcakx1dxRaQNvoJFuDc2ik06N-NrmAcw6Kr3blOIH1P3ICYsm2LrHJQWHZRPQBqewYmI-kwhx3QD10cEfiKxvNg',
      bpm: '98 BPM',
      o2: 'O₂ 99%',
    },
    {
      name: 'Lt. Cdr. K. Sharma',
      role: 'Telemetry Engineer',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZ4n3DZfHE16yR8r7WSDVpFHH57yf_9TCxaWUE15d4jHauWLwIETJMbgeZzkYpMSQ_j90btunaF3iPpXBfPLBAzGJeWyOEeiyuF1IfA13b07IlTmU4yfzAla0QyROcrg9_MYKmJTXPL798YiQdLQrGXN-Gcabp1iLnhkBvC7HB0wCQ7S4WLBD9Vziw4IJwyGdv4XW4IypUrv-Wv7sgOm7t9fMRSD0h8G6yflVv7SjvaPtgbQpTrXBoqQ',
      bpm: '74 BPM',
      o2: 'O₂ 98%',
    },
    {
      name: 'Dr. Meera Nambiar',
      role: 'Station Medical Officer',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1cIzGC_JrQLYFd9COjoCOR55K9lYvxYRysTwU4epgC09Z6Hd4dyJ5ikOiKMF6wJuec7lCowyxLeIVtfWth9vFt8p2kmoxKqaKdHXI2ROGDF6ugL3Ge_60YFb9RQUjEzKU46Thp5n0_3JUxl63WzqOHJkeErnPX-AxWvhgHr-Q3xOURboVeyL1ZrKsESe-tA-XoUpZVFbvdcCgnU5Gtrv8mU3nqPDKb77sjUvX5DyiILhOeU7kVF0iTw',
      bpm: '71 BPM',
      o2: 'O₂ 100%',
    },
    {
      name: 'Tenzing Dorjee',
      role: 'Field Traverse Specialist',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDduXT0etghWsyI1rPA-2lzePxlQIp6JZWJOdmpLlnfBNXQ43kLVOipezf0j6WflxVwPjQ6MGSqiOFpIbawvzRLGyp7saXwkTxs2Bd-1QTPzhTHqShXvgZLpOWp5zJXHQebugRVu751_c_mPobYyS5ODgujN6_fdsEi_S4VtYcVlxYDObES9nG2MBu21EqasMtwkD36JGvTDpMISAmkt8L_CHssBfa-Y8DicyFgy1Dx4BJbUU_-8sh-Xw',
      bpm: '82 BPM',
      o2: 'O₂ 97%',
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* BREADCRUMBS */}
      <nav className="flex items-center gap-2 text-xs font-mono text-text-muted">
        <span
          onClick={() => navigate('/expeditions')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Expeditions
        </span>
        <span className="text-text-muted">/</span>
        <span className="text-ice-300 font-semibold">{expedition?.code || 'INAE-2026'}</span>
        <span className="text-text-muted">/</span>
        <span className="text-text-secondary">Mission Telemetry</span>
      </nav>

      {/* HEADER & STATUS BAR CARD */}
      <section className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Meta */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-headline font-bold text-text-primary tracking-tight">
                {expedition?.name || 'INAE-2026'}
              </h1>
              <span className="px-2.5 py-1 rounded-md bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono tracking-widest uppercase">
                {expedition?.code || 'ORD-44'}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-aurora-500/10 border border-aurora-500/40 text-aurora-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-aurora-400 animate-pulse shadow-[0_0_8px_rgba(41,214,176,0.6)]" />
                ACTIVE / ON TRACK
              </span>
            </div>
            <p className="text-sm text-text-secondary flex items-center gap-2">
              <span className="text-text-primary font-medium">
                {expedition?.description || '44th Indian Antarctic Expedition'}
              </span>
              <span>•</span>
              <span className="text-text-muted">{expedition?.region || 'East Antarctica Sector'}</span>
            </p>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 border border-border-default hover:border-border-strong text-text-primary transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">ios_share</span>
              <span>Export Mission Log</span>
            </button>
            <button
              onClick={() => navigate('/emergency')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-danger/10 border border-danger/40 hover:border-danger text-danger transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">warning</span>
              <span>Emergency Protocol</span>
            </button>
            <button
              onClick={() => navigate('/personnel')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 hover:brightness-110 text-polar-950 font-semibold transition-all duration-150 shadow-[0_0_16px_rgba(40,169,245,0.3)] active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>+ Assign Resource</span>
            </button>
          </div>
        </div>

        {/* Telemetry & Sub-badges Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border-default text-xs font-mono">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">verified</span>
            <div>
              <span className="block text-[10px] text-text-muted">FIELD READINESS</span>
              <span className="text-ice-300 font-semibold tracking-wide">
                {expedition?.readinessScore || 87}% CERTIFIED (0.94 CI)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">date_range</span>
            <div>
              <span className="block text-[10px] text-text-muted">MISSION WINDOW</span>
              <span className="text-text-primary">15 DEC 2025 — 28 MAR 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">home_pin</span>
            <div>
              <span className="block text-[10px] text-text-muted">OPERATIONAL BASES</span>
              <span className="text-text-primary">{expedition?.targetBase || 'Maitri & Bharati'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">near_me</span>
            <div>
              <span className="block text-[10px] text-text-muted">POLAR COORDINATES</span>
              <span className="text-ice-300 font-bold">70°45′57″ S 11°44′09″ E</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HORIZONTAL MISSION JOURNEY STAGE BAR ==================== */}
      <section className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-ice-400">timeline</span>
            <h2 className="font-headline text-lg font-semibold text-text-primary">Mission Journey Stage Progression</h2>
          </div>
          <span className="text-xs font-mono text-ice-300">OVERALL LOGISTIC COMPLETION: 71.4%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
          {stages.map((stage, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg flex flex-col justify-between h-24 ${
                stage.active
                  ? 'bg-surface-3 border-2 border-ice-400 shadow-[0_0_20px_rgba(40,169,245,0.35)] relative overflow-hidden'
                  : stage.status === 'Completed'
                  ? 'bg-surface-2 border border-border-default'
                  : 'bg-surface-2/40 border border-border-default opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${stage.active ? 'text-ice-300 font-bold' : 'text-text-muted'}`}>
                  {stage.num}
                </span>
                {stage.active ? (
                  <span className="w-2 h-2 rounded-full bg-ice-400 animate-ping" />
                ) : stage.status === 'Completed' ? (
                  <span className="material-symbols-outlined text-aurora-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-text-muted text-base">radio_button_unchecked</span>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-text-primary">{stage.name}</p>
                <span className={`text-[10px] font-mono ${stage.active ? 'text-ice-300 font-semibold' : stage.status === 'Completed' ? 'text-aurora-400' : 'text-text-muted'}`}>
                  {stage.status}
                </span>
              </div>

              {stage.active && (
                <div className="w-full bg-polar-950 h-1.5 rounded-full overflow-hidden mt-1 border border-border-default">
                  <div
                    className="bg-ice-400 h-full rounded-full shadow-[0_0_8px_rgba(40,169,245,0.8)]"
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ==================== TABBED NAVIGATION ==================== */}
      <div className="flex border-b border-border-default gap-8 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'overview'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">dashboard_customize</span>
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'personnel'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          <span>Personnel (12)</span>
        </button>
        <button
          onClick={() => setActiveTab('cargo')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'cargo'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">inventory</span>
          <span>Assigned Cargo & Assets (8)</span>
        </button>
        <button
          onClick={() => setActiveTab('waypoints')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'waypoints'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">route</span>
          <span>Waypoints & Weather</span>
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'telemetry'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">sensors</span>
          <span>Telemetry Feed</span>
        </button>
      </div>

      {/* ==================== 2-COLUMN CONTENT GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mission Scope Card */}
          <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-ice-400 text-xl">assignment</span>
                <h3 className="font-headline text-lg font-semibold text-text-primary">Mission Operational Scope</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono">
                POLAR PROTOCOL IV
              </span>
            </div>

            {/* Field Commander Highlight */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface-2 border border-border-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border border-border-strong overflow-hidden shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj-mB6JwDfqQe1Ln1kuYayRkw0BuPZUwtCw4lNH2aLJiF2ngVqjab95ANx7NgV8ozbpWr-mzFqlDW6q2v7z9CiT_tFAKCzyQg5_zlFRwVntncKWlNluiMpRnAGzGEJ5Irthiw5YJFAPwINyFP8wCZ3zZnkYnEM0SWX3_M5qSAcseKc0_SV657fla21XLgakhpg1lDoQ5tqpyHkwBE0QYFIpas99DqExAN7pdvMuJq5Mvt8lKXMceoArQ"
                    alt="Dr Vikram Malhotra"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Field Commander</span>
                  <h4 className="text-base font-semibold text-text-primary">
                    {expedition?.leader || 'Dr. Vikram Malhotra'}
                  </h4>
                  <p className="text-xs font-mono text-ice-300">NCPOR Polar Directorate • 6 Antarctic Traverses</p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end text-xs font-mono">
                <span className="text-[10px] text-text-muted">SAT-COM FREQ</span>
                <span className="text-aurora-400 font-semibold">148.825 MHz [SECURE]</span>
              </div>
            </div>

            {/* Objectives Bento Stack */}
            <div className="space-y-3">
              <span className="text-xs font-mono text-text-muted tracking-wider uppercase">
                Primary Scientific & Tactical Objectives
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3 rounded-lg bg-surface-2/70 border border-border-default hover:border-border-strong transition-all flex items-start gap-3">
                  <div className="p-1.5 rounded bg-surface-3 text-ice-400">
                    <span className="material-symbols-outlined text-base">science</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-text-primary">Core Ice Sampling at 70°S</h5>
                      <span className="text-xs font-mono text-ice-300">TARGET: 120m DEPTH</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Extract paleoclimate stratigraphic records from the Dronning Maud Land ice divide using thermal electro-drill assemblies.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2/70 border border-border-default hover:border-border-strong transition-all flex items-start gap-3">
                  <div className="p-1.5 rounded bg-surface-3 text-ice-400">
                    <span className="material-symbols-outlined text-base">waves</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-text-primary">Seismic Array Maintenance</h5>
                      <span className="text-xs font-mono text-aurora-400">8/8 NODES NOMINAL</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Replace ultra-low temp lithium battery packs and calibrate broad-band seismometer array along Schirmacher Oasis perimeter.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2/70 border border-border-default hover:border-border-strong transition-all flex items-start gap-3">
                  <div className="p-1.5 rounded bg-surface-3 text-ice-400">
                    <span className="material-symbols-outlined text-base">thermostat</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-text-primary">Permafrost Thermal Borehole Probe</h5>
                      <span className="text-xs font-mono text-warning">DATA SYNC SCHEDULED</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Deploy optical fiber Distributed Temperature Sensing (DTS) lines into subglacial active layer to monitor geothermal flux.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Personnel Snippet */}
          <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-ice-400">badge</span>
                <h3 className="font-headline text-lg font-semibold text-text-primary">Field Personnel (4 Key Specialists Shown)</h3>
              </div>
              <button
                onClick={() => navigate('/personnel')}
                className="text-xs font-mono text-ice-400 hover:text-ice-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View All 12 Crew Members</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {specialists.map((spec, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-surface-2 border border-border-default flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-ice-500/40 overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" src={spec.img} alt={spec.name} />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-text-primary leading-tight">{spec.name}</h5>
                      <span className="text-xs font-mono text-text-muted">{spec.role}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="inline-flex items-center gap-1 text-[10px] text-aurora-400 bg-aurora-500/10 px-2 py-0.5 rounded-full border border-aurora-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-aurora-400" />
                      {spec.bpm}
                    </span>
                    <span className="block text-[10px] text-text-muted mt-1">{spec.o2}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Sector Environmental Telemetry Card */}
          <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-ice-400">device_thermostat</span>
                <h3 className="font-headline text-lg font-semibold text-text-primary">Sector Environmental Telemetry</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-mono text-aurora-400">
                <span className="w-2 h-2 rounded-full bg-aurora-400 animate-pulse" />
                LIVE SENSOR FEED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                <div className="flex items-center justify-between text-text-muted text-xs">
                  <span>AMBIENT TEMP</span>
                  <span className="material-symbols-outlined text-ice-400 text-sm">ac_unit</span>
                </div>
                <p className="text-xl font-bold text-ice-300 mt-1">-38.4°C</p>
                <span className="text-[10px] text-text-muted">Windchill: -54.2°C</span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                <div className="flex items-center justify-between text-text-muted text-xs">
                  <span>KATABATIC WIND</span>
                  <span className="material-symbols-outlined text-sky-500 text-sm">air</span>
                </div>
                <p className="text-xl font-bold text-text-primary mt-1">42 kts</p>
                <span className="text-[10px] text-warning">Gusting 58 kts (SE)</span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                <div className="flex items-center justify-between text-text-muted text-xs">
                  <span>BAROMETER</span>
                  <span className="material-symbols-outlined text-ice-400 text-sm">speed</span>
                </div>
                <p className="text-xl font-bold text-text-primary mt-1">982 hPa</p>
                <span className="text-[10px] text-warning">Tendency: Falling</span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                <div className="flex items-center justify-between text-text-muted text-xs">
                  <span>ICE STABILITY</span>
                  <span className="material-symbols-outlined text-aurora-400 text-sm">terrain</span>
                </div>
                <p className="text-xl font-bold text-aurora-400 mt-1">94% SECURE</p>
                <span className="text-[10px] text-text-muted">Crevasse free: 12 NM</span>
              </div>
            </div>
          </div>

          {/* Communications & Satellite Array */}
          <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-aurora-400">satellite_alt</span>
                <h3 className="font-headline text-lg font-semibold text-text-primary">SATCOM Constellation Link</h3>
              </div>
              <span className="text-xs font-mono text-aurora-400 bg-aurora-500/10 px-2 py-0.5 rounded border border-aurora-500/30">
                100% LOCK
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between p-2.5 rounded bg-surface-2 border border-border-default">
                <span className="text-text-muted">PRIMARY TRANSCEIVER:</span>
                <span className="text-ice-300 font-semibold">IRIDIUM NEXT-7 [LEO-4]</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-2 border border-border-default">
                <span className="text-text-muted">LATENCY & JITTER:</span>
                <span className="text-aurora-400">42ms / 1.4ms (LOW)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-2 border border-border-default">
                <span className="text-text-muted">BACKUP SYSTEM:</span>
                <span className="text-text-primary">HF BLU-ESC 4.2 MHz</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpeditionDetailPage;
