import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
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
  if (user.role !== 'Administrator') return <Navigate to="/dashboard" />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* ===== PUBLIC ROUTES ===== */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      {/* ===== PROTECTED ROUTES ===== */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crops"
        element={
          <ProtectedRoute>
            <CropList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CropList defaultTab="calendar" />
          </ProtectedRoute>
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
          <ProtectedRoute>
            <LivestockOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment"
        element={
          <ProtectedRoute>
            <AssetList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <AssetList />
          </ProtectedRoute>
        }
      />
      
      {/* ===== ADMIN ROUTES ===== */}
      <Route
        path="/users"
        element={
          <ProtectedAdminRoute>
            <UserList />
          </ProtectedAdminRoute>
        }
      />
      
      {/* ===== FARM ROUTES (Admin only) ===== */}
      <Route
        path="/farms"
        element={
          <ProtectedAdminRoute>
            <FarmList />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/farms/new"
        element={
          <ProtectedAdminRoute>
            <FarmForm />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/farms/:id"
        element={
          <ProtectedAdminRoute>
            <FarmDetail />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/farms/:id/edit"
        element={
          <ProtectedAdminRoute>
            <FarmForm />
          </ProtectedAdminRoute>
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
                      location.pathname.startsWith('/assets');

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