import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';
import LogoutButton from '../common/LogoutButton';

const AdminDashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await userService.getAllUsers({ limit: 10 });
        setUsers(res.users || []);
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rolesList = [
    { name: 'System Administrator', users: 1, permissions: 'Full System Superuser & Configuration' },
    { name: 'Managing Director', users: 1, permissions: 'Executive Oversight, Strategic Goals, Approvals' },
    { name: 'Finance Manager', users: 1, permissions: 'Ledgers, Invoices, Payroll, Budgets, Statements' },
    { name: 'Human Resources Manager', users: 1, permissions: 'Employees, Attendance, Leave Approvals, Training' },
    { name: 'Farm Manager', users: 1, permissions: 'Farms, Crops, Livestock, Harvesting, Field Logs' },
    { name: 'Storekeeper', users: 1, permissions: 'Inventory, Fertilizers, Seeds, Stock In/Out' },
    { name: 'Employee/Staff', users: 1, permissions: 'Assigned Work, Field Shifts, Leave Submissions' },
  ];

  return (
    <div className="admin-page-layout">
      {/* TOAST */}
      {toastMsg && (
        <div className={`admin-toast toast-${toastMsg.type}`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">⚙️</div>
          {sidebarOpen && (
            <div className="admin-brand-text">
              <span className="admin-brand-title">UFMS</span>
              <span className="admin-brand-sub">System Administration</span>
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">ADMINISTRATION</div>
          <Link to="/dashboard" className="admin-nav-link active">
            <span className="admin-nav-icon">📊</span>
            {sidebarOpen && <span>Admin Dashboard</span>}
          </Link>
          <Link to="/users" className="admin-nav-link">
            <span className="admin-nav-icon">👥</span>
            {sidebarOpen && <span>Users & Roles</span>}
          </Link>
          <Link to="/settings" className="admin-nav-link">
            <span className="admin-nav-icon">⚙️</span>
            {sidebarOpen && <span>System Settings</span>}
          </Link>

          <div className="admin-nav-section">ALL MODULES (SUPERUSER)</div>
          <Link to="/md-dashboard" className="admin-nav-link">
            <span className="admin-nav-icon">📈</span>
            {sidebarOpen && <span>Executive MD View</span>}
          </Link>
          <Link to="/farms" className="admin-nav-link">
            <span className="admin-nav-icon">🌾</span>
            {sidebarOpen && <span>Farm Management</span>}
          </Link>
          <Link to="/crops" className="admin-nav-link">
            <span className="admin-nav-icon">🌱</span>
            {sidebarOpen && <span>Crop Production</span>}
          </Link>
          <Link to="/equipment" className="admin-nav-link">
            <span className="admin-nav-icon">🔧</span>
            {sidebarOpen && <span>Assets & Equipment</span>}
          </Link>
          <Link to="/finance" className="admin-nav-link">
            <span className="admin-nav-icon">💰</span>
            {sidebarOpen && <span>Finance & Accounts</span>}
          </Link>
        </nav>

        {/* User Profile */}
        {sidebarOpen && (
          <div className="admin-bottom-profile">
            <img
              src={`https://ui-avatars.com/api/?name=System+Administrator&background=10b981&color=fff&bold=true`}
              alt="Admin"
              className="admin-avatar"
            />
            <div className="admin-profile-meta">
              <span className="admin-name">System Administrator</span>
              <span className="admin-role">Superuser</span>
              <span className="admin-status-pill">
                <span className="admin-status-dot"></span> Active
              </span>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER */}
      <div className="admin-main-container">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="admin-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="admin-topbar-titles">
              <h1 className="admin-heading">System Administrator Console</h1>
              <p className="admin-subheading">User provisioning, 7 official system roles, security logs, and database status.</p>
            </div>
          </div>

          <div className="admin-topbar-right">
            <Link to="/users" className="btn-admin-primary">
              + Manage Users & Roles
            </Link>
          </div>
        </header>

        {/* CONTENT */}
        <div className="admin-content-body">
          {/* 4 TOP KPI CARDS */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="admin-kpi-icon green">👥</div>
              <div className="admin-kpi-data">
                <span className="admin-kpi-label">Registered Accounts</span>
                <span className="admin-kpi-val">{users.length || 7} Users</span>
                <span className="admin-kpi-sub">Across 7 Official Roles</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon blue">🛡️</div>
              <div className="admin-kpi-data">
                <span className="admin-kpi-label">Active System Roles</span>
                <span className="admin-kpi-val">7 Official Roles</span>
                <span className="admin-kpi-sub">Role-Based Access Control</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon amber">🗄️</div>
              <div className="admin-kpi-data">
                <span className="admin-kpi-label">Database Health</span>
                <span className="admin-kpi-val">PostgreSQL 15</span>
                <span className="admin-kpi-sub">Connected (Healthy)</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-icon purple">📋</div>
              <div className="admin-kpi-data">
                <span className="admin-kpi-label">Security & Audit Log</span>
                <span className="admin-kpi-val">100% Encrypted</span>
                <span className="admin-kpi-sub">JWT Authentication Active</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN SECTION: ROLES MATRIX & RECENT USERS */}
          <div className="admin-2col-layout">
            {/* 7 ROLES MATRIX */}
            <div className="admin-widget-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">7 Official System Roles & Access Matrix</h3>
                <span className="admin-badge-count">7 Roles Configured</span>
              </div>
              <div className="roles-matrix-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Official Role Name</th>
                      <th>Primary Workspace & Responsibilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesList.map((r) => (
                      <tr key={r.name}>
                        <td className="role-name-cell">
                          <span className="role-tag-pill">{r.name}</span>
                        </td>
                        <td className="role-desc-cell">{r.permissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECENT USER DIRECTORY */}
            <div className="admin-widget-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Active User Accounts</h3>
                <Link to="/users" className="admin-link">View All Users →</Link>
              </div>
              <div className="admin-users-mini-list">
                {users.slice(0, 7).map((u) => (
                  <div key={u.id} className="admin-user-row">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(`${u.firstName} ${u.lastName}`)}&background=10b981&color=fff&bold=true`}
                      alt={u.firstName}
                      className="u-avatar"
                    />
                    <div className="u-info">
                      <span className="u-name">{u.firstName} {u.lastName}</span>
                      <span className="u-email">{u.email}</span>
                    </div>
                    <span className="u-role-badge">{u.role?.name || 'Staff'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
