import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

const EmergencyContext = createContext(null);

export const EmergencyProvider = ({ children }) => {
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosInitialData, setSosInitialData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    responding: 0,
    active: 0,
    resolved: 0,
    dispatchedUnits: 0,
  });
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [lastDispatched, setLastDispatched] = useState(null);

  // Fetch telemetry
  const fetchEmergencyTelemetry = useCallback(async () => {
    try {
      const [statsRes, incRes] = await Promise.allSettled([
        api.get('/incidents/stats'),
        api.get('/incidents'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
      }
      if (incRes.status === 'fulfilled' && incRes.value.data?.success) {
        const list = incRes.value.data.data || [];
        setActiveIncidents(list.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed'));
      }
    } catch (err) {
      console.warn('Emergency telemetry sync error:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmergencyTelemetry();

    // Listen to real-time emergency events from backend sockets
    try {
      const socket = getSocket();
      if (socket) {
        socket.on('emergency:created', fetchEmergencyTelemetry);
        socket.on('emergency:sosDispatched', (payload) => {
          setLastDispatched(payload.incident);
          fetchEmergencyTelemetry();
        });
        socket.on('emergency:updated', fetchEmergencyTelemetry);
      }
    } catch (e) {
      // socket fallback
    }

    const interval = setInterval(fetchEmergencyTelemetry, 25000);
    return () => clearInterval(interval);
  }, [fetchEmergencyTelemetry]);

  // Open SOS modal with optional initial context (e.g. from Base, Cargo, or Header)
  const openSosModal = (initialData = null) => {
    setSosInitialData(initialData);
    setIsSosModalOpen(true);
  };

  const closeSosModal = () => {
    setIsSosModalOpen(false);
    setSosInitialData(null);
  };

  const notifySosSuccess = (incident) => {
    setLastDispatched(incident);
    fetchEmergencyTelemetry();
  };

  return (
    <EmergencyContext.Provider
      value={{
        isSosModalOpen,
        sosInitialData,
        openSosModal,
        closeSosModal,
        stats,
        activeIncidents,
        lastDispatched,
        fetchEmergencyTelemetry,
        notifySosSuccess,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

export default EmergencyContext;
