import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './layouts/AppLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExpeditionsPage from './pages/ExpeditionsPage';
import ExpeditionDetailPage from './pages/ExpeditionDetailPage';
import CargoPage from './pages/CargoPage';
import InventoryPage from './pages/InventoryPage';
import AssetsPage from './pages/AssetsPage';
import PersonnelPage from './pages/PersonnelPage';
import BasesPage from './pages/BasesPage';
import TasksPage from './pages/TasksPage';
import EmergencyPage from './pages/EmergencyPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-polar-950 flex items-center justify-center text-sky-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          VERIFYING POLARIS CREDENTIALS...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expeditions" element={<ExpeditionsPage />} />
              <Route path="/expeditions/:id" element={<ExpeditionDetailPage />} />
              <Route path="/cargo" element={<CargoPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/personnel" element={<PersonnelPage />} />
              <Route path="/bases" element={<BasesPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/emergency" element={<EmergencyPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />

              {/* Admin only route */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['SuperAdmin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
