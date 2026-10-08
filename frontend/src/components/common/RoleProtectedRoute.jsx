import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="loading-spinner-screen">Loading system permissions...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role || 'Employee/Staff';

  // Platform Owner has global access; customer administrators must be allowed explicitly.
  if (userRole === 'Platform Owner') {
    return children;
  }

  // Check if role or normalized role is allowed
  const isAllowed = allowedRoles?.some((r) => {
    if (r === userRole) return true;
    if (r === 'Administrator' && userRole === 'Farm Administrator') return true;
    if (r === 'HR Manager' && userRole === 'Human Resources Manager') return true;
    if (r === 'Human Resources Manager' && userRole === 'HR Manager') return true;
    if (r === 'Employee' && userRole === 'Employee/Staff') return true;
    if (r === 'Employee/Staff' && userRole === 'Employee') return true;
    return false;
  });

  if (allowedRoles && !isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
