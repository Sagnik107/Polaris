import React, { useState, useEffect } from 'react';
import {
  Radio,
  AlertOctagon,
  Truck,
  Shield,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Compass,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import Modal from '../common/Modal';

// Standard Indian Personnel for Antarctic SAR and Dispatch
const SAR_LEAD_RESPONDERS = [
  { name: 'Capt. Amitav Banerjee', role: 'Search & Rescue Lead / Operations' },
  { name: 'Dr. Rajesh Sharma', role: 'Station Chief & Medical Lead' },
  { name: 'Dr. Maya Patel', role: 'Chief Medical Officer / Triage' },
  { name: 'Arjun Nair', role: 'Logistics Coordinator & Heavy Machinery Specialist' },
  { name: 'Vikram Sengupta', role: 'Polar Field Operations & Deep Field Lead' },
  { name: 'Pooja Deshmukh', role: 'Communications & Navigation Specialist' },
  { name: 'Devendra Pratap', role: 'Geophysicist & Ice Shelf Surveyor' },
  { name: 'Sanjay Deshmukh', role: 'Power Systems & Turbine Chief Engineer' },
];

// Tactical Dispatch Vehicles / Units
const DISPATCH_VEHICLES = [
  { id: 'mi8', name: 'Mil Mi-8 Heavy Medevac Helo (Rotary Flight Alpha)', speed: '130 kts', type: 'Air' },
  { id: 'bv206', name: 'Bv206 Polar All-Terrain Snowcat Unit-04', speed: '35 km/h', type: 'Tracked Ground' },
  { id: 'pistenbully', name: 'PistenBully 300 Polar Search & Rescue Crane Rig', speed: '25 km/h', type: 'Heavy Tracked' },
  { id: 'skidoo', name: 'Skidoo Rapid Response Recon Pair (Bravo)', speed: '65 km/h', type: 'Light Snowmobile' },
  { id: 'hagglunds', name: 'Hägglunds Dual-Cabin Emergency Ambulance Unit', speed: '40 km/h', type: 'Tracked Medical' },
];

const BASES = [
  { name: 'Maitri Station', sector: 'Schirmacher Oasis', coords: "70°45'S 11°44'E" },
  { name: 'Bharati Station', sector: 'Larsemann Hills', coords: "69°24'S 76°11'E" },
  { name: 'Dakshin Gangotri Ice Camp', sector: 'Historical Ice Shelf', coords: "70°05'S 12°00'E" },
  { name: 'Larsemann Logistics Ridge', sector: 'East Ridge Depot', coords: "69°26'S 76°18'E" },
];

export const SosDispatchModal = () => {
  const { isSosModalOpen, sosInitialData, closeSosModal, activeIncidents, notifySosSuccess } = useEmergency();
  const { user } = useAuth();

  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Medical');
  const [severity, setSeverity] = useState('Critical');
  const [baseName, setBaseName] = useState('Maitri Station');
  const [location, setLocation] = useState('');
  const [leadResponder, setLeadResponder] = useState('Capt. Amitav Banerjee');
  const [dispatchUnit, setDispatchUnit] = useState('Mil Mi-8 Heavy Medevac Helo (Rotary Flight Alpha)');
  const [eta, setEta] = useState('15 Minutes');
  const [operationalNotes, setOperationalNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Synchronize initial data when modal opens
  useEffect(() => {
    if (isSosModalOpen) {
      setErrorMsg('');
      setSuccessData(null);
      setConfirmed(false);

      if (sosInitialData) {
        if (sosInitialData.incidentId) {
          setMode('existing');
          setSelectedIncidentId(sosInitialData.incidentId);
        } else {
          setMode('new');
        }

        if (sosInitialData.title) setTitle(sosInitialData.title);
        if (sosInitialData.description) setDescription(sosInitialData.description);
        if (sosInitialData.type) setCategory(sosInitialData.type);
        if (sosInitialData.severity) setSeverity(sosInitialData.severity);
        if (sosInitialData.baseName) setBaseName(sosInitialData.baseName);
        if (sosInitialData.location) setLocation(sosInitialData.location);
        if (sosInitialData.leadResponder) setLeadResponder(sosInitialData.leadResponder);
        if (sosInitialData.dispatchUnit) setDispatchUnit(sosInitialData.dispatchUnit);
        if (sosInitialData.notes) setOperationalNotes(sosInitialData.notes);
      } else {
        // Default behavior: if active incidents exist, offer existing, else new
        const firstActive = activeIncidents[0];
        if (firstActive) {
          setMode('existing');
          setSelectedIncidentId(firstActive._id);
          setBaseName(firstActive.baseName || 'Maitri Station');
          setLocation(firstActive.location || firstActive.baseName || '');
          setSeverity(firstActive.severity || 'Critical');
          setCategory(firstActive.type || 'Medical');
        } else {
          setMode('new');
          setTitle('');
          setDescription('');
          setCategory('Medical');
          setSeverity('Critical');
          setBaseName('Maitri Station');
          setLocation('');
        }
      }
    }
  }, [isSosModalOpen, sosInitialData, activeIncidents]);

  if (!isSosModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setErrorMsg('Commander Radhika Roy SAR Authorization Checkbox must be checked to mobilize tactical teams.');
      return;
    }

    if (isSubmitting) return; // Prevent duplicate dispatch

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const payload = {
        incidentId: mode === 'existing' ? selectedIncidentId : undefined,
        title: mode === 'new' ? (title.trim() || `SOS EMERGENCY DISPATCH: ${category} Alert at ${baseName}`) : undefined,
        description: description.trim() || `Tactical SOS response mobilized to ${location || baseName}.`,
        type: category,
        severity,
        baseName,
        location: location.trim() || `${baseName} Perimeter`,
        leadResponder,
        dispatchUnit,
        eta,
        operationalNotes: operationalNotes.trim(),
      };

      const res = await api.post('/incidents/sos', payload);
      if (res.data?.success) {
        setSuccessData(res.data.data);
        notifySosSuccess(res.data.data);
      } else {
        setErrorMsg(res.data?.message || 'Failed to dispatch SOS response team.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Network error executing SOS dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    closeSosModal();
  };

  return (
    <Modal
      isOpen={isSosModalOpen}
      onClose={handleClose}
      title="Tactical Emergency SOS Deployment Command"
      maxWidth="max-w-3xl"
    >
      {successData ? (
        /* SUCCESS CONFIRMATION VIEW */
        <div className="space-y-5 font-mono text-xs text-slate-200">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide font-heading">
                SOS Rapid Deployment Mobilized Successfully
              </h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Emergency response unit has been scrambled under Antarctic Treaty SAR Code. Real-time telemetry is broadcast to all C2 station outposts.
              </p>
            </div>
          </div>

          {/* Telemetry Summary Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 text-xs">{successData.incidentCode || successData.incidentNumber}</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase">
                {successData.status || 'Responding'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Dispatched Unit:</span>
                <strong className="text-white">{successData.dispatchDetails?.unit || dispatchUnit}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Field Commander:</span>
                <strong className="text-amber-300">{successData.dispatchDetails?.leadResponder || leadResponder}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Station & Sector:</span>
                <strong className="text-slate-200">{successData.baseName} ({successData.location})</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Estimated Arrival (ETA):</span>
                <strong className="text-cyan-300">{successData.dispatchDetails?.eta || eta}</strong>
              </div>
            </div>

            {successData.dispatchDetails?.notes && (
              <div className="text-[11px] text-slate-400 border-t border-slate-850 pt-2">
                <span className="text-slate-500">Field Directives:</span> {successData.dispatchDetails.notes}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      ) : (
        /* DISPATCH FORM VIEW */
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Tactical Warning Notice */}
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Red Alert SOS Scramble Protocol — Antarctic Command</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Mobilizing an Arctic SAR deployment unit immediately scambles emergency air/ground units, transmits distress telemetry across all polar stations, and logs military-grade audit tracking.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`py-2 px-3 rounded font-bold text-xs transition-colors cursor-pointer ${
                mode === 'existing'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reinforce Active Incident
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`py-2 px-3 rounded font-bold text-xs transition-colors cursor-pointer ${
                mode === 'new'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Declare & Dispatch New SOS
            </button>
          </div>

          {/* Incident Source Fields */}
          {mode === 'existing' ? (
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Select Active Emergency Incident <span className="text-rose-400">*</span>
              </label>
              {activeIncidents.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                  No currently open incidents found. Switch to "Declare & Dispatch New SOS".
                </div>
              ) : (
                <select
                  required
                  value={selectedIncidentId}
                  onChange={(e) => {
                    setSelectedIncidentId(e.target.value);
                    const found = activeIncidents.find((i) => i._id === e.target.value);
                    if (found) {
                      setBaseName(found.baseName || baseName);
                      setLocation(found.location || found.baseName || location);
                      setSeverity(found.severity || severity);
                      setCategory(found.type || category);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                >
                  {activeIncidents.map((inc) => (
                    <option key={inc._id} value={inc._id}>
                      [{inc.incidentCode || inc.incidentNumber}] {inc.title} ({inc.baseName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Emergency Situation Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Crevasse Hazard Encounter / Stranded Convoy #3"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Medical">Medical Evacuation</option>
                    <option value="Environmental">Environmental Hazard</option>
                    <option value="Facility">Facility Failure</option>
                    <option value="Logistics">Logistics / Convoy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Critical">Critical (Immediate Hazard)</option>
                    <option value="High">High Severity</option>
                    <option value="Moderate">Moderate Severity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nearest Station Outpost</label>
                  <select
                    value={baseName}
                    onChange={(e) => {
                      setBaseName(e.target.value);
                      const b = BASES.find((item) => item.name === e.target.value);
                      if (b && !location) setLocation(b.coords);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-rose-500 focus:outline-none"
                  >
                    {BASES.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} ({b.sector})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Incident Description & Hazard Details <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail current weather conditions, stranded personnel, critical machinery impact..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* SAR Unit & Personnel Assignment */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>SAR Deployment Team & Unit Scramble Allocation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Lead Field Commander <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={leadResponder}
                  onChange={(e) => setLeadResponder(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  {SAR_LEAD_RESPONDERS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name} — {r.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Primary Scramble Unit / Vehicle <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={dispatchUnit}
                  onChange={(e) => setDispatchUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  {DISPATCH_VEHICLES.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.speed})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Estimated En-Route Time (ETA) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="10 Minutes">10 Minutes (Rapid Helo / Air)</option>
                  <option value="15 Minutes">15 Minutes (Nominal Medevac)</option>
                  <option value="25 Minutes">25 Minutes (Snowcat Ground)</option>
                  <option value="45 Minutes">45 Minutes (Heavy Crane / PistenBully)</option>
                  <option value="90 Minutes">90 Minutes (Deep Ice Shelf Traverse)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Target Grid / Coordinates</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 70°45'S 11°44'E (Maitri Sector 4)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Mission Directives & Payload Check</label>
              <input
                type="text"
                value={operationalNotes}
                onChange={(e) => setOperationalNotes(e.target.value)}
                placeholder="Specify payload equipment (e.g. hyperbaric pod, blood plasma, winch cable, warm shelter)..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Authorization Checkbox */}
          <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/40 flex items-start gap-3">
            <input
              type="checkbox"
              id="sos-modal-confirm-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="sos-modal-confirm-checkbox" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
              <strong className="text-white block">Commander Radhika Roy SAR Authorization:</strong>
              I confirm the immediate scrambling of <span className="text-sky-300">{dispatchUnit}</span> under lead commander <span className="text-amber-300">{leadResponder}</span> to {baseName}.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmed}
              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-950/80 transition-all cursor-pointer"
            >
              <Radio className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Scrambling SAR Unit...' : 'Execute SOS Dispatch'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SosDispatchModal;
