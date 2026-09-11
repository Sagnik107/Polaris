import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';

// Dynamic environmental telemetry based on risk level
const getEnvironmentalTelemetry = (riskLevel) => {
  const level = (riskLevel || 'Moderate').toLowerCase();
  if (level === 'critical') {
    return {
      temp: '-56.8°C',
      tempSub: 'Windchill: -81.4°C [LETHAL EXPOSURE]',
      tempColor: 'text-danger',
      wind: '84 kts',
      windSub: 'Hurricane-Force Blizzard (Zero Visibility)',
      windColor: 'text-danger',
      pressure: '936 hPa',
      pressureSub: 'Tendency: Extreme Polar Low Depression',
      pressureColor: 'text-danger',
      ice: '19% FRACTURED',
      iceSub: 'Active Rifts & Crevasses Detected',
      iceColor: 'text-danger',
      satcomLock: '64% DEGRADED',
      satcomSub: 'Severe Geomagnetic Storm Attenuation',
      satcomColor: 'text-danger bg-danger/10 border-danger/30',
      statusTag: 'CRITICAL HAZARD PROTOCOL ACTIVE',
      hazards: [
        'Hurricane-force katabatic winds reaching 84-102 kts across traverse path',
        'Sub-zero deep freeze (-56.8°C with -81.4°C windchill): immediate frostbite threat',
        'Active crevasse shear zones & fractured ice within 0.8 NM corridor',
        'Total whiteout blizzard: zero horizon, magnetic compass degradation',
      ],
      recommendations:
        'Immediate shelter lockdown. Halt traverse convoy. Anchor tracked vehicles with deadman snow-stakes. Switch to Iridium satellite distress beacon standby.',
    };
  }
  if (level === 'high') {
    return {
      temp: '-46.5°C',
      tempSub: 'Windchill: -68.2°C [SEVERE FREEZE RISK]',
      tempColor: 'text-danger',
      wind: '62 kts',
      windSub: 'Severe Katabatic Gale / Snow Drift',
      windColor: 'text-warning',
      pressure: '955 hPa',
      pressureSub: 'Tendency: Rapidly Falling (Storm Front)',
      pressureColor: 'text-warning',
      ice: '42% HAZARDOUS',
      iceSub: 'Active Crevasses within 1.8 NM',
      iceColor: 'text-warning',
      satcomLock: '82% LOCK',
      satcomSub: 'Intermittent High-Latitude Multipath Fade',
      satcomColor: 'text-warning bg-warning/10 border-warning/30',
      statusTag: 'HIGH RISK ADVISORY IN EFFECT',
      hazards: [
        'Sustained katabatic gale winds (62 kts) with severe blowing snow',
        'Extreme windchill (-68.2°C): vehicle hydraulic fluid coagulation hazard',
        'Sub-surface crevasse field detected via satellite synthetic aperture radar',
        'Reduced visual range (< 50 meters) requiring convoy tethering',
      ],
      recommendations:
        'Deploy ground-penetrating radar snowcat lead. Rig safety tether lines between vehicles. Pre-heat generator batteries. Limit EVA to 15-minute intervals.',
    };
  }
  if (level === 'low') {
    return {
      temp: '-24.2°C',
      tempSub: 'Windchill: -31.5°C [NOMINAL COLD]',
      tempColor: 'text-ice-300',
      wind: '16 kts',
      windSub: 'Mild Polar Breeze (SSE)',
      windColor: 'text-text-primary',
      pressure: '1014 hPa',
      pressureSub: 'Tendency: High-Pressure Ridge Stable',
      pressureColor: 'text-text-muted',
      ice: '98% SECURE',
      iceSub: 'Crevasse-free: 28 NM Verified',
      iceColor: 'text-aurora-400',
      satcomLock: '100% LOCK',
      satcomSub: 'Carrier C/N0 48.2 dB-Hz (Optimal)',
      satcomColor: 'text-aurora-400 bg-aurora-500/10 border-aurora-500/30',
      statusTag: 'STABLE POLAR CORRIDOR',
      hazards: [
        'Clear sky corridor across Queen Maud Land traverse route',
        'Firm ice sheet surface with micro-sastrugi < 15cm height',
        'Full satellite constellation visibility (Iridium + GPS L1/L5)',
      ],
      recommendations:
        'Maintain standard traverse speed (18 km/h). Standard hourly sat-check protocol.',
    };
  }
  // Moderate (Default)
  return {
    temp: '-34.8°C',
    tempSub: 'Windchill: -48.5°C [MODERATE COLD]',
    tempColor: 'text-ice-300',
    wind: '36 kts',
    windSub: 'Katabatic Gusts to 45 kts (SE)',
    windColor: 'text-text-primary',
    pressure: '988 hPa',
    pressureSub: 'Tendency: Slowly Falling Barometer',
    pressureColor: 'text-text-muted',
    ice: '82% CAUTION',
    iceSub: 'Crevasse-free: 10 NM Corridor',
    iceColor: 'text-aurora-400',
    satcomLock: '98% LOCK',
    satcomSub: 'Normal LEO Constellation Link',
    satcomColor: 'text-aurora-400 bg-aurora-500/10 border-aurora-500/30',
    statusTag: 'MODERATE POLAR CONDITIONS',
    hazards: [
      'Periodic katabatic wind squalls (36-45 kts) causing drifting snow',
      'Surface sastrugi ridges up to 40cm requiring reduced crawler speed',
      'Sub-zero equipment wear on mechanical linkages',
    ],
    recommendations:
      'Proceed with standard safety margin. Conduct scheduled ice-radar scans every 20 km.',
  };
};

export const ExpeditionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [expedition, setExpedition] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [showAssignPersonnelModal, setShowAssignPersonnelModal] = useState(false);
  const [availablePersonnel, setAvailablePersonnel] = useState([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [personnelLoading, setPersonnelLoading] = useState(false);

  const [showAssignResourceModal, setShowAssignResourceModal] = useState(false);
  const [newResource, setNewResource] = useState({
    item: '',
    category: 'Equipment',
    quantity: 1,
    notes: '',
  });

  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    dueDate: '2026-12-01',
    status: 'pending',
    description: '',
  });

  // Manual Risk Profile Configuration Modal
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState({
    riskLevel: 'Moderate',
    aiRiskPrediction: '',
    riskScore: 50,
  });

  // Fetch full expedition details
  const fetchExpedition = useCallback(async () => {
    try {
      const res = await api.get(`/expeditions/${id}`);
      if (res.data?.data) {
        setExpedition(res.data.data);
        setRiskForm({
          riskLevel: res.data.data.riskLevel || 'Moderate',
          aiRiskPrediction: res.data.data.aiRiskPrediction || '',
          riskScore: res.data.data.riskScore || 50,
        });
      }
    } catch (err) {
      console.error('Failed to load expedition detail:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load expedition details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch timeline logs
  const fetchTimeline = useCallback(async () => {
    try {
      setTimelineLoading(true);
      const res = await api.get(`/expeditions/${id}/timeline`);
      setTimeline(res.data?.data || res.data || []);
    } catch (err) {
      console.warn('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExpedition();
  }, [fetchExpedition]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchTimeline();
    }
  }, [activeTab, fetchTimeline]);

  // Socket sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = (payload) => {
      const updatedDoc = payload.expedition || payload;
      const docId = updatedDoc._id || updatedDoc.id || updatedDoc.code;
      if (docId === id || updatedDoc.expeditionCode === id) {
        setExpedition((prev) => ({ ...prev, ...updatedDoc }));
      }
    };

    socket.on('expedition:updated', handleUpdate);
    socket.on('expedition:milestoneUpdated', handleUpdate);

    return () => {
      socket.off('expedition:updated', handleUpdate);
      socket.off('expedition:milestoneUpdated', handleUpdate);
    };
  }, [id]);

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Dynamic Telemetry Data based on Current Risk Level
  const environmentalData = useMemo(() => {
    return getEnvironmentalTelemetry(expedition?.riskLevel);
  }, [expedition?.riskLevel]);

  // ==================== MANUAL RISK PROFILE SUBMISSION ====================
  const handleUpdateRiskProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/expeditions/${id}`, {
        riskLevel: riskForm.riskLevel,
        aiRiskPrediction: riskForm.aiRiskPrediction,
        riskScore: Number(riskForm.riskScore),
      });

      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }

      setShowRiskModal(false);
      showNotification(
        `Risk Profile updated to ${riskForm.riskLevel.toUpperCase()}. Environmental telemetry adjusted.`
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update risk profile');
    }
  };

  // ==================== PERSONNEL ACTIONS ====================
  const handleOpenAssignPersonnel = async () => {
    setShowAssignPersonnelModal(true);
    setPersonnelLoading(true);
    try {
      const res = await api.get('/personnel?limit=50');
      const allPersonnel = res.data?.data || [];
      const assignedIds = new Set(
        (expedition?.assignedPersonnel || []).map((p) => p._id || p.id || p)
      );
      const unassigned = allPersonnel.filter((p) => !assignedIds.has(p._id || p.id));
      setAvailablePersonnel(unassigned);
      if (unassigned.length > 0) {
        setSelectedPersonnelId(unassigned[0]._id || unassigned[0].id);
      }
    } catch (err) {
      console.error('Failed to load personnel:', err);
    } finally {
      setPersonnelLoading(false);
    }
  };

  const handleAssignPersonnelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPersonnelId) return;

    try {
      const res = await api.post(`/expeditions/${id}/personnel`, {
        personnelId: selectedPersonnelId,
      });
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      setShowAssignPersonnelModal(false);
      showNotification('Personnel successfully deployed to expedition crew.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign personnel');
    }
  };

  const handleUnassignPersonnel = async (personnelId, name) => {
    if (!window.confirm(`Remove ${name || 'crew member'} from this expedition?`)) return;

    try {
      const res = await api.delete(`/expeditions/${id}/personnel/${personnelId}`);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      showNotification(`Crew member ${name || ''} detached from expedition.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unassign personnel');
    }
  };

  // ==================== RESOURCE ACTIONS ====================
  const handleAssignResourceSubmit = async (e) => {
    e.preventDefault();
    if (!newResource.item.trim()) return;

    try {
      const res = await api.post(`/expeditions/${id}/resources`, newResource);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      setShowAssignResourceModal(false);
      setNewResource({ item: '', category: 'Equipment', quantity: 1, notes: '' });
      showNotification('Resource unit allocated to expedition manifest.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate resource');
    }
  };

  const handleUnassignResource = async (resourceId, itemName) => {
    if (!window.confirm(`De-allocate "${itemName || 'item'}" from expedition manifest?`)) return;

    try {
      const res = await api.delete(`/expeditions/${id}/resources/${resourceId}`);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      showNotification(`Resource "${itemName || ''}" de-allocated.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove resource');
    }
  };

  // ==================== MILESTONE ACTIONS ====================
  const handleAddMilestoneSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/expeditions/${id}/milestones`, milestoneForm);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      setShowAddMilestoneModal(false);
      setMilestoneForm({ title: '', dueDate: '2026-12-01', status: 'pending', description: '' });
      showNotification('New operational milestone added.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create milestone');
    }
  };

  const handleUpdateMilestoneSubmit = async (e) => {
    e.preventDefault();
    if (!editingMilestone) return;

    try {
      const mId = editingMilestone._id || editingMilestone.id;
      const res = await api.put(`/expeditions/${id}/milestones/${mId}`, milestoneForm);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      setEditingMilestone(null);
      showNotification('Milestone successfully updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update milestone');
    }
  };

  // Set milestone status to pending, in_progress, or completed
  const handleSetMilestoneStatus = async (m, newStatus) => {
    const mId = m._id || m.id;
    try {
      const res = await api.put(`/expeditions/${id}/milestones/${mId}`, {
        status: newStatus,
      });
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      showNotification(
        `Milestone "${m.title}" set to ${newStatus.toUpperCase()}${
          newStatus === 'in_progress' ? ' (50% progress applied)' : ''
        }.`
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update milestone status');
    }
  };

  // Cycle status: Pending -> In Progress -> Completed -> Pending
  const handleCycleMilestoneStatus = (m) => {
    const current = (m.status || 'pending').toLowerCase();
    let nextStatus = 'in_progress';
    if (current === 'in_progress' || current === 'inprogress') {
      nextStatus = 'completed';
    } else if (current === 'completed') {
      nextStatus = 'pending';
    }
    handleSetMilestoneStatus(m, nextStatus);
  };

  const handleDeleteMilestone = async (m) => {
    const mId = m._id || m.id;
    if (!window.confirm(`Delete milestone "${m.title}"?`)) return;

    try {
      const res = await api.delete(`/expeditions/${id}/milestones/${mId}`);
      if (res.data?.data) {
        setExpedition(res.data.data);
      } else {
        await fetchExpedition();
      }
      showNotification('Milestone deleted.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete milestone');
    }
  };

  // Readiness breakdown metrics with accurate in_progress weighting
  const readinessMetrics = useMemo(() => {
    const personnelCount = expedition?.assignedPersonnel?.length || expedition?.personnel?.length || 0;
    const resourcesCount = expedition?.assignedResources?.length || 0;
    const milestones = expedition?.milestones || [];

    const completedMs = milestones.filter((m) => (m.status || '').toLowerCase() === 'completed').length;
    const inProgressMs = milestones.filter((m) => {
      const s = (m.status || '').toLowerCase();
      return s === 'in_progress' || s === 'inprogress' || s === 'in progress';
    }).length;
    const totalMs = milestones.length;

    // Personnel factor (35%)
    const personnelScore = Math.round(Math.min(personnelCount / 8, 1) * 35);
    // Resources factor (25%)
    const resourcesScore = Math.round(Math.min(resourcesCount / 5, 1) * 25);
    // Milestone factor: completed gives 1.0, in_progress gives 0.5 (40%)
    const weightedMilestones = completedMs * 1.0 + inProgressMs * 0.5;
    const milestoneScore = totalMs > 0 ? Math.round((weightedMilestones / totalMs) * 40) : 20;

    const calculatedReadiness =
      expedition?.readinessScore ?? (personnelScore + resourcesScore + milestoneScore);
    const calculatedProgress =
      expedition?.progress ??
      (totalMs > 0 ? Math.min(100, Math.round((weightedMilestones / totalMs) * 100)) : 0);

    return {
      personnelScore,
      resourcesScore,
      milestoneScore,
      calculatedReadiness,
      calculatedProgress,
      personnelCount,
      resourcesCount,
      completedMs,
      inProgressMs,
      totalMs,
    };
  }, [expedition]);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-ice-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-text-muted tracking-wider uppercase">
          Loading Mission Telemetry & Manifest...
        </p>
      </div>
    );
  }

  if (errorMessage && !expedition) {
    return (
      <div className="p-10 space-y-4 max-w-lg mx-auto text-center font-mono">
        <span className="material-symbols-outlined text-5xl text-danger">warning</span>
        <h2 className="text-lg font-bold text-text-primary">Expedition Not Found</h2>
        <p className="text-xs text-text-secondary">{errorMessage}</p>
        <button
          onClick={() => navigate('/expeditions')}
          className="px-4 py-2 rounded-lg bg-surface-2 border border-border-default text-ice-300 text-xs hover:bg-surface-3 cursor-pointer"
        >
          ← Return to Fleet Directory
        </button>
      </div>
    );
  }

  const baseDisplayName =
    expedition?.destinationBase?.name ||
    expedition?.baseName ||
    expedition?.targetBase ||
    'Bharati Station';

  const isHighOrCriticalRisk =
    expedition?.riskLevel === 'High' || expedition?.riskLevel === 'Critical';

  return (
    <div className="space-y-6 pb-12 font-body text-body-md">
      {/* SUCCESS / ERROR NOTIFICATIONS */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-surface-2 border border-success text-success text-xs font-mono shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* BREADCRUMBS */}
      <nav className="flex items-center gap-2 text-xs font-mono text-text-muted">
        <span
          onClick={() => navigate('/expeditions')}
          className="hover:text-ice-400 transition-colors cursor-pointer"
        >
          Expeditions
        </span>
        <span>/</span>
        <span className="text-ice-300 font-semibold">
          {expedition?.expeditionCode || expedition?.code || id}
        </span>
        <span>/</span>
        <span className="text-text-secondary">Mission Command & Telemetry</span>
      </nav>

      {/* ==================== HEADER & STATUS CARD ==================== */}
      <section className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-headline font-bold text-text-primary tracking-tight">
                {expedition?.name || 'Polar Expedition'}
              </h1>
              <span className="px-2.5 py-1 rounded-md bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono tracking-widest uppercase">
                {expedition?.expeditionCode || expedition?.code || 'EXP-01'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-polar-900 border border-border-default text-text-secondary text-xs font-mono">
                {expedition?.type || 'Antarctic'}
              </span>
              <span
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono ${
                  expedition?.status === 'Completed'
                    ? 'bg-polar-800 text-text-muted border border-border-default'
                    : expedition?.status === 'Planning'
                    ? 'bg-ice-500/15 border border-ice-500/40 text-ice-300'
                    : 'bg-aurora-500/10 border border-aurora-500/40 text-aurora-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-aurora-400 animate-pulse shadow-[0_0_8px_rgba(41,214,176,0.6)]" />
                {expedition?.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>
            <p className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
              <span className="text-text-primary font-medium">
                {expedition?.description || 'Indian Antarctic Research Traverse'}
              </span>
              <span>•</span>
              <span className="text-text-muted font-mono">{baseDisplayName}</span>
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 border border-border-default hover:border-border-strong text-text-primary transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">ios_share</span>
              <span>Export Manifest</span>
            </button>
            <button
              onClick={() => {
                setRiskForm({
                  riskLevel: expedition?.riskLevel || 'Moderate',
                  aiRiskPrediction: expedition?.aiRiskPrediction || '',
                  riskScore: expedition?.riskScore || 50,
                });
                setShowRiskModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-warning/15 hover:bg-warning/25 border border-warning/40 text-warning transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              <span>Configure Risk</span>
            </button>
            <button
              onClick={handleOpenAssignPersonnel}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-ice-300 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>+ Assign Crew</span>
            </button>
            <button
              onClick={() => setShowAssignResourceModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 hover:brightness-110 text-polar-950 font-semibold transition-all duration-150 shadow-[0_0_16px_rgba(40,169,245,0.3)] active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              <span>+ Allocate Resource</span>
            </button>
          </div>
        </div>

        {/* Telemetry & Sub-badges Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border-default text-xs font-mono">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">verified</span>
            <div>
              <span className="block text-[10px] text-text-muted">READINESS SCORE</span>
              <span className="text-ice-300 font-semibold tracking-wide">
                {readinessMetrics.calculatedReadiness}% OPERATIONAL
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">date_range</span>
            <div>
              <span className="block text-[10px] text-text-muted">MISSION DURATION</span>
              <span className="text-text-primary">
                {expedition?.startDate ? new Date(expedition.startDate).toLocaleDateString() : 'TBD'} —{' '}
                {expedition?.endDate ? new Date(expedition.endDate).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/60 border border-border-default">
            <span className="material-symbols-outlined text-ice-400">home_pin</span>
            <div>
              <span className="block text-[10px] text-text-muted">DESTINATION BASE</span>
              <span className="text-text-primary font-medium">{baseDisplayName}</span>
            </div>
          </div>

          {/* Interactive Risk Profile Badge with Manual Config trigger */}
          <div
            onClick={() => {
              setRiskForm({
                riskLevel: expedition?.riskLevel || 'Moderate',
                aiRiskPrediction: expedition?.aiRiskPrediction || '',
                riskScore: expedition?.riskScore || 50,
              });
              setShowRiskModal(true);
            }}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer group ${
              isHighOrCriticalRisk
                ? 'bg-danger/15 border-danger/40 hover:bg-danger/25'
                : expedition?.riskLevel === 'Moderate'
                ? 'bg-warning/15 border-warning/40 hover:bg-warning/25'
                : 'bg-success/15 border-success/40 hover:bg-success/25'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`material-symbols-outlined ${
                  isHighOrCriticalRisk
                    ? 'text-danger'
                    : expedition?.riskLevel === 'Moderate'
                    ? 'text-warning'
                    : 'text-success'
                }`}
              >
                shield
              </span>
              <div>
                <span className="block text-[10px] text-text-muted">RISK PROFILE (MANUAL)</span>
                <span
                  className={`font-bold ${
                    isHighOrCriticalRisk
                      ? 'text-danger'
                      : expedition?.riskLevel === 'Moderate'
                      ? 'text-warning'
                      : 'text-success'
                  }`}
                >
                  {expedition?.riskLevel?.toUpperCase() || 'MODERATE'}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-muted group-hover:text-text-primary text-sm">
              edit
            </span>
          </div>
        </div>
      </section>

      {/* ==================== WHAT IS THE RISK: DYNAMIC RISK ASSESSMENT BANNER ==================== */}
      <section
        className={`p-5 rounded-xl border transition-all space-y-3 font-mono text-xs ${
          isHighOrCriticalRisk
            ? 'bg-danger/10 border-danger/50 text-text-primary shadow-[0_0_24px_rgba(239,68,68,0.2)]'
            : expedition?.riskLevel === 'Moderate'
            ? 'bg-warning/10 border-warning/40 text-text-primary'
            : 'bg-success/10 border-success/30 text-text-primary'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-border-default/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`material-symbols-outlined text-xl ${
                isHighOrCriticalRisk
                  ? 'text-danger animate-pulse'
                  : expedition?.riskLevel === 'Moderate'
                  ? 'text-warning'
                  : 'text-success'
              }`}
            >
              {isHighOrCriticalRisk ? 'warning' : expedition?.riskLevel === 'Moderate' ? 'report' : 'verified_user'}
            </span>
            <div>
              <span className="font-bold text-sm tracking-wide">
                {environmentalData.statusTag}
              </span>
              <span className="block text-[11px] text-text-secondary">
                {expedition?.aiRiskPrediction ||
                  'Active telemetry evaluation and route safety parameters.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowRiskModal(true)}
            className="px-3 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-border-default text-text-primary text-[11px] w-fit cursor-pointer flex items-center gap-1 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-xs">tune</span>
            <span>Change Risk Level</span>
          </button>
        </div>

        {/* Breakdown of WHAT the Risk is */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1.5 font-bold">
              Specific Environmental & Operational Hazards Identified:
            </span>
            <ul className="space-y-1.5">
              {environmentalData.hazards.map((hazard, hIdx) => (
                <li key={hIdx} className="flex items-start gap-2 text-xs">
                  <span
                    className={`material-symbols-outlined text-sm shrink-0 mt-0.5 ${
                      isHighOrCriticalRisk ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    arrow_right
                  </span>
                  <span>{hazard}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-2/70 border border-border-default flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1 font-bold">
                Tactical Directive & Contingency Protocol:
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">
                {environmentalData.recommendations}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-border-default/40 flex items-center justify-between text-[10px] text-text-muted">
              <span>Sensor Feed: McMurdo / Larsemann Dome Radar</span>
              <span className="text-ice-300 font-bold">Telemetry Live</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MISSION READINESS & PROGRESS BAR ==================== */}
      <section className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-ice-400">analytics</span>
            <h2 className="font-headline text-lg font-semibold text-text-primary">
              Mission Execution & Readiness Metrics
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-text-muted">
              Milestone Progress:{' '}
              <strong className="text-ice-300 font-bold">{readinessMetrics.calculatedProgress}%</strong>
            </span>
            <span className="text-text-muted">
              Fleet Readiness:{' '}
              <strong className="text-aurora-400 font-bold">{readinessMetrics.calculatedReadiness}%</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar with in-progress awareness */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-text-muted">
                Milestones Breakdown ({readinessMetrics.completedMs} Completed • {readinessMetrics.inProgressMs} In Progress • of {readinessMetrics.totalMs} Total)
              </span>
              <span className="text-ice-300 font-semibold">{readinessMetrics.calculatedProgress}%</span>
            </div>
            <div className="w-full bg-polar-900 h-2.5 rounded-full overflow-hidden border border-border-default">
              <div
                className="bg-gradient-to-r from-ice-500 to-aurora-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${readinessMetrics.calculatedProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
              <div className="flex justify-between text-text-muted mb-1">
                <span>Personnel Factor</span>
                <span className="text-aurora-400 font-semibold">{readinessMetrics.personnelScore}/35 pts</span>
              </div>
              <span className="text-[11px] text-text-secondary">
                {readinessMetrics.personnelCount} crew assigned (Target: 8 PAX)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
              <div className="flex justify-between text-text-muted mb-1">
                <span>Resources Factor</span>
                <span className="text-ice-300 font-semibold">{readinessMetrics.resourcesScore}/25 pts</span>
              </div>
              <span className="text-[11px] text-text-secondary">
                {readinessMetrics.resourcesCount} units assigned (Target: 5 units)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-2 border border-border-default">
              <div className="flex justify-between text-text-muted mb-1">
                <span>Milestones Factor</span>
                <span className="text-sky-300 font-semibold">{readinessMetrics.milestoneScore}/40 pts</span>
              </div>
              <span className="text-[11px] text-text-secondary">
                {readinessMetrics.completedMs} completed, {readinessMetrics.inProgressMs} in progress (50% credit)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TABBED NAVIGATION ==================== */}
      <div className="flex border-b border-border-default gap-8 text-xs font-mono overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">dashboard_customize</span>
          <span>Overview & Environment</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'milestones'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">flag</span>
          <span>
            Milestones ({readinessMetrics.totalMs}){' '}
            {readinessMetrics.inProgressMs > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-warning/20 text-warning text-[10px]">
                {readinessMetrics.inProgressMs} Active
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('personnel')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'personnel'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          <span>Personnel ({readinessMetrics.personnelCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'resources'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">inventory</span>
          <span>Resources & Cargo ({readinessMetrics.resourcesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'text-ice-400 border-b-2 border-ice-400 font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          <span>Timeline History</span>
        </button>
      </div>

      {/* ==================== TAB 1: OVERVIEW & SECTOR TELEMETRY ==================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Objectives & Leader */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-ice-400 text-xl">assignment</span>
                  <h3 className="font-headline text-lg font-semibold text-text-primary">
                    Mission Operational Scope
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono">
                  POLAR DIRECTIVE
                </span>
              </div>

              {/* Commander Card */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-surface-2 border border-border-default">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border border-border-strong overflow-hidden shrink-0 bg-polar-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-ice-400 text-2xl">person</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      Mission Leader / Commander
                    </span>
                    <h4 className="text-base font-semibold text-text-primary">
                      {expedition?.leader || 'Dr. Rajesh Sharma'}
                    </h4>
                    <p className="text-xs font-mono text-ice-300">NCPOR Polar Directorate • Polar Expedition Lead</p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-xs font-mono">
                  <span className="text-[10px] text-text-muted">SAT-COM SECURE FREQ</span>
                  <span className="text-aurora-400 font-semibold">148.825 MHz</span>
                </div>
              </div>

              {/* Objectives List */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-text-muted tracking-wider uppercase">
                  Primary Objectives & Scientific Scope
                </span>
                <p className="text-xs text-text-secondary leading-relaxed bg-surface-2/60 p-4 rounded-lg border border-border-default">
                  {expedition?.description ||
                    'Premier polar research expedition executing ice-sheet seismic surveys, deep ice-core extraction, wind-energy turbine grid tests, and high-latitude telemetry array servicing.'}
                </p>

                {expedition?.objectives?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {expedition.objectives.map((obj, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-surface-2/70 border border-border-default flex items-start gap-3 text-xs"
                      >
                        <span className="material-symbols-outlined text-ice-400 text-sm mt-0.5">check</span>
                        <span className="text-text-primary">{obj}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sector Environmental & Comms (CHANGES DYNAMICALLY ACCORDING TO RISK LEVEL) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-ice-400">device_thermostat</span>
                  <div>
                    <h3 className="font-headline text-lg font-semibold text-text-primary">
                      Sector Environmental Telemetry
                    </h3>
                    <span className="text-[10px] font-mono text-text-muted">
                      Calibrated for {expedition?.riskLevel || 'Moderate'} Risk Sector
                    </span>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border ${
                    isHighOrCriticalRisk
                      ? 'text-danger bg-danger/10 border-danger/30'
                      : 'text-aurora-400 bg-aurora-500/10 border-aurora-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isHighOrCriticalRisk ? 'bg-danger animate-ping' : 'bg-aurora-400 animate-pulse'
                    }`}
                  />
                  {isHighOrCriticalRisk ? 'SEVERE SECTOR' : 'REAL-TIME'}
                </span>
              </div>

              {/* DYNAMIC TELEMETRY TILES */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                {/* Temperature */}
                <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span>AMBIENT TEMP</span>
                    <span className="material-symbols-outlined text-ice-400 text-sm">ac_unit</span>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${environmentalData.tempColor}`}>
                    {environmentalData.temp}
                  </p>
                  <span className="text-[10px] text-text-muted leading-tight block mt-0.5">
                    {environmentalData.tempSub}
                  </span>
                </div>

                {/* Wind */}
                <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span>KATABATIC WIND</span>
                    <span className="material-symbols-outlined text-sky-400 text-sm">air</span>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${environmentalData.windColor}`}>
                    {environmentalData.wind}
                  </p>
                  <span className="text-[10px] text-text-muted leading-tight block mt-0.5">
                    {environmentalData.windSub}
                  </span>
                </div>

                {/* Barometer */}
                <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span>BAROMETER</span>
                    <span className="material-symbols-outlined text-ice-400 text-sm">speed</span>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${environmentalData.pressureColor}`}>
                    {environmentalData.pressure}
                  </p>
                  <span className="text-[10px] text-text-muted leading-tight block mt-0.5">
                    {environmentalData.pressureSub}
                  </span>
                </div>

                {/* Ice Stability */}
                <div className="p-3.5 rounded-lg bg-surface-2 border border-border-default">
                  <div className="flex items-center justify-between text-text-muted text-xs">
                    <span>ICE STABILITY</span>
                    <span className="material-symbols-outlined text-aurora-400 text-sm">terrain</span>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${environmentalData.iceColor}`}>
                    {environmentalData.ice}
                  </p>
                  <span className="text-[10px] text-text-muted leading-tight block mt-0.5">
                    {environmentalData.iceSub}
                  </span>
                </div>
              </div>
            </div>

            {/* Comms link card */}
            <div className="p-6 rounded-xl bg-surface-1 backdrop-blur-md border border-border-default space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-aurora-400">satellite_alt</span>
                  <h3 className="font-headline text-lg font-semibold text-text-primary">
                    SATCOM Constellation Link
                  </h3>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded border ${environmentalData.satcomColor}`}
                >
                  {environmentalData.satcomLock}
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between p-2.5 rounded bg-surface-2 border border-border-default">
                  <span className="text-text-muted">PRIMARY TRANSCEIVER:</span>
                  <span className="text-ice-300 font-semibold">IRIDIUM NEXT-7 [LEO-4]</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-surface-2 border border-border-default">
                  <span className="text-text-muted">LINK TELEMETRY:</span>
                  <span className="text-text-primary font-semibold">{environmentalData.satcomSub}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: MILESTONES (WITH IN-PROGRESS SUPPORT & 3-WAY TOGGLE) ==================== */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-1 border border-border-default">
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary">
                Operational Milestones & Stage Execution
              </h3>
              <p className="text-xs font-mono text-text-muted">
                {readinessMetrics.completedMs} completed • {readinessMetrics.inProgressMs} in progress •{' '}
                {readinessMetrics.calculatedProgress}% weighted stage progress
              </p>
            </div>
            <button
              onClick={() => {
                setMilestoneForm({ title: '', dueDate: '2026-12-01', status: 'pending', description: '' });
                setShowAddMilestoneModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-500/40 text-xs font-mono cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>+ Add Milestone</span>
            </button>
          </div>

          {(!expedition?.milestones || expedition.milestones.length === 0) ? (
            <div className="p-12 text-center rounded-xl bg-surface-1 border border-border-default space-y-3 font-mono text-xs">
              <span className="material-symbols-outlined text-4xl text-text-muted">flag</span>
              <p className="text-text-muted">No operational milestones defined for this expedition.</p>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="px-4 py-2 rounded-lg bg-ice-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer"
              >
                Define First Milestone
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {expedition.milestones.map((m, idx) => {
                const mId = m._id || m.id || idx;
                const status = (m.status || 'pending').toLowerCase();
                const isCompleted = status === 'completed';
                const isInProgress = status === 'in_progress' || status === 'inprogress' || status === 'in progress';

                return (
                  <div
                    key={mId}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCompleted
                        ? 'bg-surface-1 border-success/40 shadow-[0_0_12px_rgba(49,212,154,0.1)]'
                        : isInProgress
                        ? 'bg-surface-1 border-warning/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                        : 'bg-surface-1 border-border-default hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Interactive Cycle Button */}
                      <button
                        onClick={() => handleCycleMilestoneStatus(m)}
                        className={`mt-0.5 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'text-success bg-success/15 border border-success/40 hover:bg-success/25'
                            : isInProgress
                            ? 'text-warning bg-warning/15 border border-warning/40 hover:bg-warning/25 animate-pulse'
                            : 'text-text-muted hover:text-ice-300 bg-surface-2 border border-border-default'
                        }`}
                        title={`Current: ${status.toUpperCase()}. Click to cycle (Pending → In Progress → Completed)`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {isCompleted ? 'check_circle' : isInProgress ? 'pending_actions' : 'radio_button_unchecked'}
                        </span>
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-sm font-bold ${
                              isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
                            }`}
                          >
                            {m.title}
                          </h4>

                          {/* Explicit Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-success/15 text-success border border-success/40'
                                : isInProgress
                                ? 'bg-warning/15 text-warning border border-warning/40 flex items-center gap-1'
                                : 'bg-polar-900 text-text-muted border border-border-default'
                            }`}
                          >
                            {isInProgress && (
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-ping" />
                            )}
                            {isCompleted
                              ? 'COMPLETED (100%)'
                              : isInProgress
                              ? 'IN PROGRESS (50% CREDIT)'
                              : 'PENDING (0%)'}
                          </span>
                        </div>

                        {m.description && (
                          <p className="text-xs text-text-secondary">{m.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono justify-between md:justify-end">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-text-muted block">TARGET DUE DATE</span>
                        <span className="text-text-primary">
                          {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>

                      {/* 3-State Direct Switcher Buttons */}
                      <div className="flex items-center p-0.5 rounded-lg bg-polar-900 border border-border-default">
                        <button
                          onClick={() => handleSetMilestoneStatus(m, 'pending')}
                          className={`px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                            !isCompleted && !isInProgress
                              ? 'bg-surface-3 text-text-primary font-bold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                          title="Set Pending"
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => handleSetMilestoneStatus(m, 'in_progress')}
                          className={`px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                            isInProgress
                              ? 'bg-warning/20 text-warning font-bold border border-warning/40'
                              : 'text-text-muted hover:text-warning'
                          }`}
                          title="Set In Progress (awards 50% credit)"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleSetMilestoneStatus(m, 'completed')}
                          className={`px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-success/20 text-success font-bold border border-success/40'
                              : 'text-text-muted hover:text-success'
                          }`}
                          title="Set Completed (awards 100% credit)"
                        >
                          Completed
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingMilestone(m);
                            setMilestoneForm({
                              title: m.title || '',
                              dueDate: m.dueDate ? m.dueDate.slice(0, 10) : '2026-12-01',
                              status: m.status || 'pending',
                              description: m.description || '',
                            });
                          }}
                          className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-ice-300 border border-border-default cursor-pointer"
                          title="Edit Milestone"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m)}
                          className="p-1.5 rounded-lg bg-surface-2 hover:bg-danger/20 text-text-muted hover:text-danger border border-border-default cursor-pointer"
                          title="Delete Milestone"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: PERSONNEL ==================== */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-1 border border-border-default">
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary">
                Assigned Expedition Crew & Specialists
              </h3>
              <p className="text-xs font-mono text-text-muted">
                {readinessMetrics.personnelCount} crew members currently deployed to this mission
              </p>
            </div>
            <button
              onClick={handleOpenAssignPersonnel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-500/40 text-xs font-mono cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>+ Assign Crew Member</span>
            </button>
          </div>

          {(!expedition?.assignedPersonnel || expedition.assignedPersonnel.length === 0) ? (
            <div className="p-12 text-center rounded-xl bg-surface-1 border border-border-default space-y-3 font-mono text-xs">
              <span className="material-symbols-outlined text-4xl text-text-muted">group_off</span>
              <p className="text-text-muted">No personnel currently assigned to this expedition.</p>
              <button
                onClick={handleOpenAssignPersonnel}
                className="px-4 py-2 rounded-lg bg-ice-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer"
              >
                Assign First Crew Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {expedition.assignedPersonnel.map((person, idx) => {
                const pId = person._id || person.id || person;
                const pName = person.name || `Crew Specialist #${idx + 1}`;
                const pRole = person.designation || person.role || 'Field Researcher';
                const pStatus = person.status || 'Active';
                const pSkills = person.skills || ['Traverse Operations', 'Field Telemetry'];

                return (
                  <div
                    key={pId || idx}
                    className="p-4 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border border-ice-500/40 bg-surface-2 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-ice-400 text-2xl">person</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text-primary leading-tight">{pName}</h4>
                          <span className="text-xs font-mono text-ice-300">{pRole}</span>
                          <span className="block text-[10px] font-mono text-text-muted">
                            {person.participantId || `PRS-${idx + 1}`}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-success/15 border border-success/30 text-success uppercase">
                        {pStatus}
                      </span>
                    </div>

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {pSkills.slice(0, 3).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded bg-polar-900 border border-border-default text-[10px] font-mono text-text-secondary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-border-default/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-text-muted">Active Assignment</span>
                      <button
                        onClick={() => handleUnassignPersonnel(pId, pName)}
                        className="text-xs font-mono text-danger hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">person_remove</span>
                        <span>Unassign</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: RESOURCES / CARGO ==================== */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-1 border border-border-default">
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary">
                Assigned Resources, Assets & Manifest Cargo
              </h3>
              <p className="text-xs font-mono text-text-muted">
                {readinessMetrics.resourcesCount} inventory & machinery units allocated to this traverse
              </p>
            </div>
            <button
              onClick={() => setShowAssignResourceModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ice-500/20 hover:bg-ice-500/30 text-ice-300 border border-ice-500/40 text-xs font-mono cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              <span>+ Allocate Resource</span>
            </button>
          </div>

          {(!expedition?.assignedResources || expedition.assignedResources.length === 0) ? (
            <div className="p-12 text-center rounded-xl bg-surface-1 border border-border-default space-y-3 font-mono text-xs">
              <span className="material-symbols-outlined text-4xl text-text-muted">inventory_2</span>
              <p className="text-text-muted">No resources or cargo units currently allocated.</p>
              <button
                onClick={() => setShowAssignResourceModal(true)}
                className="px-4 py-2 rounded-lg bg-ice-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer"
              >
                Allocate First Resource
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border-default bg-surface-1 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="h-10 bg-polar-900 border-b border-border-default text-text-muted uppercase">
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Item Name / Asset</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Operational Notes</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {expedition.assignedResources.map((res, idx) => {
                    const rId = res._id || res.id || idx;
                    return (
                      <tr key={rId} className="h-12 hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded bg-surface-3 border border-border-strong text-ice-300 text-[10px]">
                            {res.category || 'Equipment'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-semibold text-text-primary">{res.item}</td>
                        <td className="px-4 py-2 text-aurora-400 font-bold">{res.quantity || 1}</td>
                        <td className="px-4 py-2 text-text-secondary max-w-xs truncate">
                          {res.notes || 'Polar operational condition'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleUnassignResource(rId, res.item)}
                            className="text-danger hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <span className="material-symbols-outlined text-sm">remove_circle</span>
                            <span>De-allocate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: TIMELINE ==================== */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-1 border border-border-default">
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary">
                Chronological Mission Timeline & Audit History
              </h3>
              <p className="text-xs font-mono text-text-muted">
                System and command actions logged for {expedition?.name || 'this expedition'}
              </p>
            </div>
            <button
              onClick={fetchTimeline}
              disabled={timelineLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-strong text-ice-300 text-xs font-mono cursor-pointer transition-all"
            >
              <span
                className={`material-symbols-outlined text-sm ${timelineLoading ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
              <span>Refresh Log</span>
            </button>
          </div>

          {timelineLoading ? (
            <div className="p-12 text-center text-xs font-mono text-text-muted">
              Loading activity timeline logs...
            </div>
          ) : timeline.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-surface-1 border border-border-default space-y-2 font-mono text-xs text-text-muted">
              <span className="material-symbols-outlined text-4xl">history_toggle_off</span>
              <p>No logged timeline events recorded yet for this expedition.</p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-surface-1 border border-border-default space-y-6">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-default">
                {timeline.map((log, idx) => {
                  return (
                    <div key={log._id || idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-ice-400 border-2 border-polar-950" />
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-surface-3 border border-border-strong text-ice-300 font-bold text-[10px]">
                          {log.action || 'ACTIVITY'}
                        </span>
                        <span className="text-text-primary font-medium">{log.actorName || 'Command Officer'}</span>
                        <span className="text-text-muted text-[10px]">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary pt-0.5">
                        {log.description || 'Expedition operational state modified.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== MANUAL RISK PROFILE CONFIGURATION MODAL ==================== */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-warning text-2xl">shield</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  Configure Expedition Risk Profile
                </h3>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateRiskProfile} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Select Risk Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Low', 'Moderate', 'High', 'Critical'].map((level) => {
                    const isSelected = riskForm.riskLevel === level;
                    return (
                      <button
                        type="button"
                        key={level}
                        onClick={() => {
                          let defaultDesc = riskForm.aiRiskPrediction;
                          if (level === 'Critical') {
                            defaultDesc =
                              'Hurricane-force polar vortex gale (84 kts) & severe active crevasse fracturing.';
                          } else if (level === 'High') {
                            defaultDesc =
                              'Severe katabatic gale (62 kts) with -68°C windchill & sub-surface crevasse hazard.';
                          } else if (level === 'Moderate') {
                            defaultDesc =
                              'Moderate katabatic gusts & surface sastrugi drift. Standard polar precautions active.';
                          } else {
                            defaultDesc =
                              'Stable polar transit corridor. Sub-surface radar scans show 0 crevasse hazards.';
                          }
                          setRiskForm({
                            ...riskForm,
                            riskLevel: level,
                            aiRiskPrediction: defaultDesc,
                            riskScore:
                              level === 'Critical' ? 95 : level === 'High' ? 75 : level === 'Moderate' ? 45 : 15,
                          });
                        }}
                        className={`py-2 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? level === 'Critical' || level === 'High'
                              ? 'bg-danger text-white border-danger shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                              : level === 'Moderate'
                              ? 'bg-warning text-polar-950 border-warning shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                              : 'bg-success text-polar-950 border-success shadow-[0_0_12px_rgba(49,212,154,0.4)]'
                            : 'bg-polar-900 border-border-default text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Risk Assessment & Specific Hazard Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the specific hazards (e.g. Katabatic winds, crevasse rifts, hydraulic freeze)..."
                  value={riskForm.aiRiskPrediction}
                  onChange={(e) => setRiskForm({ ...riskForm, aiRiskPrediction: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <div className="flex justify-between text-text-muted mb-1 font-semibold">
                  <span className="uppercase">Risk Score Index</span>
                  <span className="text-ice-300 font-bold">{riskForm.riskScore}/100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={riskForm.riskScore}
                  onChange={(e) => setRiskForm({ ...riskForm, riskScore: Number(e.target.value) })}
                  className="w-full accent-ice-400 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-1 border border-border-default text-[11px] text-text-secondary leading-relaxed">
                <p className="font-semibold text-text-primary mb-1">Environmental Impact:</p>
                Setting risk level to <strong>{riskForm.riskLevel}</strong> will instantly adjust the
                sector's ambient temperature, katabatic winds, barometer, ice stability, and SATCOM
                telemetry across all mission command feeds.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowRiskModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer shadow-[0_0_14px_rgba(40,169,245,0.4)]"
                >
                  Save & Calibrate Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ASSIGN PERSONNEL MODAL ==================== */}
      {showAssignPersonnelModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">person_add</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  Deploy Crew Member to Expedition
                </h3>
              </div>
              <button
                onClick={() => setShowAssignPersonnelModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignPersonnelSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Select Candidate from Personnel Directory
                </label>
                {personnelLoading ? (
                  <p className="text-text-muted">Loading available personnel roster...</p>
                ) : availablePersonnel.length === 0 ? (
                  <p className="text-warning">All active personnel are currently assigned to expeditions.</p>
                ) : (
                  <select
                    value={selectedPersonnelId}
                    onChange={(e) => setSelectedPersonnelId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
                  >
                    {availablePersonnel.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.name} — {p.designation || 'Specialist'} ({p.status || 'Active'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 rounded-lg bg-surface-1 border border-border-default text-[11px] text-text-secondary">
                Assigning crew members updates mission readiness (+4.375% per specialist up to 35%) and
                updates the personnel's deployment status.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowAssignPersonnelModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availablePersonnel.length === 0}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  Confirm Deployment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ASSIGN RESOURCE MODAL ==================== */}
      {showAssignResourceModal && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">add_box</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  Allocate Resource to Expedition
                </h3>
              </div>
              <button
                onClick={() => setShowAssignResourceModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignResourceSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">Resource Category</label>
                <select
                  value={newResource.category}
                  onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
                >
                  <option value="Equipment">Equipment & Instrumentation</option>
                  <option value="Vehicle">Vehicle & Traverse Machinery</option>
                  <option value="Medical">Medical & Survival Kits</option>
                  <option value="Fuel">Fuel & Energy Reserves</option>
                  <option value="Ration">Food & Rations</option>
                  <option value="Scientific">Scientific Sampling Tools</option>
                </select>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Item Description / Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PistenBully 300 Polar Snowcat"
                  value={newResource.item}
                  onChange={(e) => setNewResource({ ...newResource, item: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newResource.quantity}
                  onChange={(e) => setNewResource({ ...newResource, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">Operational Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Certified for -50°C operation"
                  value={newResource.notes}
                  onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowAssignResourceModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer"
                >
                  Allocate Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD / EDIT MILESTONE MODAL ==================== */}
      {(showAddMilestoneModal || editingMilestone) && (
        <div className="fixed inset-0 z-50 bg-polar-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border-strong p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-ice-400">flag</span>
                <h3 className="font-headline text-lg font-bold text-text-primary">
                  {editingMilestone ? 'Edit Operational Milestone' : 'Add New Operational Milestone'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddMilestoneModal(false);
                  setEditingMilestone(null);
                }}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={editingMilestone ? handleUpdateMilestoneSubmit : handleAddMilestoneSubmit}
              className="space-y-4 text-xs font-mono"
            >
              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">
                  Milestone Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schirmacher Oasis Seismic Sensor Calibration"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 uppercase font-semibold">Status Option</label>
                  <select
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus cursor-pointer"
                  >
                    <option value="pending">Pending (0% stage credit)</option>
                    <option value="in_progress">In Progress (50% stage credit)</option>
                    <option value="completed">Completed (100% stage credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 uppercase font-semibold">Description / Scope</label>
                <textarea
                  rows={2}
                  placeholder="Operational details and completion criteria..."
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-polar-850 border border-border-default text-text-primary outline-none focus:border-border-focus"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-1 border border-border-default text-[11px] text-text-secondary">
                💡 <strong>Milestone Progress Policy:</strong> Setting status to <strong>In Progress</strong> will
                apply 50% partial progress to the expedition timeline and increase readiness accordingly.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMilestoneModal(false);
                    setEditingMilestone(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-surface-1 border border-border-default text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-ice-500 to-sky-500 text-polar-950 font-bold hover:brightness-110 cursor-pointer"
                >
                  {editingMilestone ? 'Save Changes' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpeditionDetailPage;
