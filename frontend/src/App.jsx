import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';
import UserList from './components/users/UserList';

// ===== NEW FARM & CROP IMPORTS =====
import FarmList from './components/farms/FarmList';
import FarmForm from './components/farms/FarmForm';
import FarmDetail from './components/farms/FarmDetail';
import CropList from './components/crops/CropList';
import LivestockOverview from './components/livestock/LivestockOverview';
import InventoryOverview from './components/inventory/InventoryOverview';
import AssetList from './components/assets/AssetList';
import FinanceOverview from './components/finance/FinanceOverview';
import MdDashboard from './components/dashboard/MdDashboard';
import RoleDashboardRouter from './components/dashboard/RoleDashboardRouter';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Admin-only protected route
const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" />;
  if (!['Administrator', 'System Administrator'].includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* ===== PUBLIC ROUTES ===== */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      {/* ===== PROTECTED ROUTES ===== */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleDashboardRouter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/md-dashboard"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
            <MdDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleDashboardRouter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crops"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <CropList />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <CropList defaultTab="calendar" />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <CropList defaultTab="crop-reports" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <CropList defaultTab="settings" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animals"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <LivestockOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <InventoryOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/equipment"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <AssetList />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <AssetList />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Finance Manager']}>
            <FinanceOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Finance Manager']}>
            <FinanceOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Finance Manager']}>
            <FinanceOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Finance Manager']}>
            <FinanceOverview />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Finance Manager', 'Human Resources Manager', 'HR Manager']}>
            <FinanceOverview />
          </RoleProtectedRoute>
        }
      />
      
      {/* ===== ADMIN ROUTES ===== */}
      <Route
        path="/users"
        element={
            <RoleProtectedRoute allowedRoles={['Administrator', 'System Administrator']}>
            <UserList />
          </RoleProtectedRoute>
        }
      />
      
      {/* ===== FARM ROUTES ===== */}
      <Route
        path="/farms"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <FarmList />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/farms/new"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <FarmForm />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/farms/:id"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <FarmDetail />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/farms/:id/edit"
        element={
          <RoleProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Farm Manager']}>
            <FarmForm />
          </RoleProtectedRoute>
        }
      />
    </Routes>
  );
}

const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/dashboard') || 
                      location.pathname.startsWith('/users') ||
                      location.pathname.startsWith('/farms') ||
                      location.pathname.startsWith('/crops') ||
                      location.pathname.startsWith('/calendar') ||
                      location.pathname.startsWith('/reports') ||
                      location.pathname.startsWith('/settings') ||
                      location.pathname.startsWith('/animals') ||
                      location.pathname.startsWith('/inventory') ||
                      location.pathname.startsWith('/equipment') ||
                      location.pathname.startsWith('/assets') ||
                      location.pathname.startsWith('/finance') ||
                      location.pathname.startsWith('/invoices') ||
                      location.pathname.startsWith('/payments') ||
                      location.pathname.startsWith('/budgets') ||
                      location.pathname.startsWith('/payroll');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <AppRoutes />
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;