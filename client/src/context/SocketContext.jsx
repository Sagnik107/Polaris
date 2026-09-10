import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/alerts/unread-count');
        if (res.data?.success) {
          setUnreadAlertsCount(res.data.data.unreadCount || 0);
        }
      } catch (err) {
        console.warn('Failed to fetch unread alerts count:', err);
      }
    };
    fetchUnread();
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAlertCreated = (data) => {
      setUnreadAlertsCount((prev) => prev + 1);
      setLatestAlert(data);
      setRecentEvents((prev) => [
        { id: Date.now(), type: 'alert', title: data.title || 'New Alert', time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);
    };

    const handleEmergency = (data) => {
      setActiveEmergency(data);
      setRecentEvents((prev) => [
        { id: Date.now(), type: 'emergency', title: data.title || 'Emergency Incident', time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);
    };

    const handleCargoUpdate = (data) => {
      setRecentEvents((prev) => [
        { id: Date.now(), type: 'cargo', title: `Cargo ${data.trackingNumber || ''} status: ${data.status || ''}`, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);
    };

    socket.on('alert:created', handleAlertCreated);
    socket.on('emergency:declared', handleEmergency);
    socket.on('emergency:updated', handleEmergency);
    socket.on('cargo:statusUpdated', handleCargoUpdate);

    return () => {
      socket.off('alert:created', handleAlertCreated);
      socket.off('emergency:declared', handleEmergency);
      socket.off('emergency:updated', handleEmergency);
      socket.off('cargo:statusUpdated', handleCargoUpdate);
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        unreadAlertsCount,
        setUnreadAlertsCount,
        latestAlert,
        activeEmergency,
        recentEvents,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || {};
};
