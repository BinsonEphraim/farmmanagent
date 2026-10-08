import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import MdDashboard from './MdDashboard';
import FinanceOverview from '../finance/FinanceOverview';
import HrDashboard from './HrDashboard';
import FarmManagerDashboard from './FarmManagerDashboard';
import StorekeeperDashboard from './StorekeeperDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import PlatformOwnerDashboard from './PlatformOwnerDashboard';

const RoleDashboardRouter = () => {
  const { user } = useAuth();
  const role = user?.role || 'Employee/Staff';

  // Organization administrator
  if (role === 'Farm Administrator') {
    return <AdminDashboard />;
  }

  // Platform Owner dashboard is introduced separately from customer administration.
  if (role === 'Platform Owner') {
    return <PlatformOwnerDashboard />;
  }

  // 2. Managing Director
  if (role === 'Managing Director') {
    return <MdDashboard />;
  }

  // 3. Finance Manager
  if (role === 'Finance Manager') {
    return <FinanceOverview />;
  }

  // 4. Human Resources Manager
  if (role === 'Human Resources Manager' || role === 'HR Manager') {
    return <HrDashboard />;
  }

  // 5. Farm Manager
  if (role === 'Farm Manager') {
    return <FarmManagerDashboard />;
  }

  // 6. Storekeeper
  if (role === 'Storekeeper') {
    return <StorekeeperDashboard />;
  }

  // 7. Employee/Staff
  if (role === 'Employee/Staff' || role === 'Employee') {
    return <EmployeeDashboard />;
  }

  // Default fallback for any other role
  return <EmployeeDashboard />;
};

export default RoleDashboardRouter;
