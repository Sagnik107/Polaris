import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { EmergencyProvider } from './context/EmergencyContext';
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

import AccessDenied from './components/common/AccessDenied';
import PolarisLogo from './components/common/PolarisLogo';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020914] flex flex-col items-center justify-center text-sky-400 font-mono text-xs gap-4">
        <PolarisLogo className="w-12 h-12" animated={true} glow={true} />
        <div className="flex items-center gap-2 tracking-widest text-[#7BD0FF]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>VERIFYING POLARIS COMMAND CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied allowedRoles={allowedRoles} />;
  }

  return children;
};

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <EmergencyProvider>
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
                <Route
                  path="/expeditions"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'ExpeditionManager', 'Viewer']}>
                      <ExpeditionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/expeditions/:id"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'ExpeditionManager', 'Viewer']}>
                      <ExpeditionDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cargo"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'LogisticsCoordinator', 'Viewer']}>
                      <CargoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'LogisticsCoordinator', 'InventoryManager', 'BaseOfficer', 'MedicalOfficer', 'Viewer']}>
                      <InventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'LogisticsCoordinator', 'InventoryManager', 'BaseOfficer', 'MedicalOfficer', 'Viewer']}>
                      <AssetsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/personnel"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'PersonnelManager', 'ExpeditionManager', 'BaseOfficer', 'MedicalOfficer', 'Viewer']}>
                      <PersonnelPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bases"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'BaseOfficer', 'ExpeditionManager', 'LogisticsCoordinator', 'Viewer']}>
                      <BasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'ExpeditionManager', 'LogisticsCoordinator', 'InventoryManager', 'BaseOfficer', 'MedicalOfficer', 'PersonnelManager', 'Viewer']}>
                      <TasksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emergency"
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin', 'MedicalOfficer', 'BaseOfficer']}>
                      <EmergencyPage />
                    </ProtectedRoute>
                  }
                />
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
      </EmergencyProvider>
    </SocketProvider>
  </AuthProvider>
);
}

export default App;
