import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { farmService } from '../../services/farmService';
import { useAuth } from '../../context/AuthContext';
import UserForm from './UserForm';
import './UserList.css';
import LogoutButton from '../common/LogoutButton';

const DEFAULT_SYSTEM_ROLES = [
  'Farm Administrator',
  'Managing Director',
  'Finance Manager',
  'Human Resources Manager',
  'HR Manager',
  'Farm Manager',
  'Storekeeper',
  'Employee/Staff',
  'Employee',
].map((name, id) => ({ id: `default-${id}`, name }));

const UserList = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(DEFAULT_SYSTEM_ROLES);
  const [farms, setFarms] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsers: 0,
    totalRoles: 0,
    roleDistribution: [],
    recentActivities: [],
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all | active | inactive

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    farmId: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  // Fetch Users with real-time pagination & filters
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = activeTab === 'all' ? '' : activeTab;
      const response = await userService.getAllUsers({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        role: filters.role,
        farmId: filters.farmId,
        search: filters.search,
      });

      if (response && response.users) {
        const mappedUsers = response.users.map((u) => ({
          ...u,
          roleType: getRoleType(u.role?.name),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'
          )}&background=047857&color=fff&bold=true`,
          formattedLastLogin: u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Never logged in',
        }));
        setUsers(mappedUsers);
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching real users:', err);
      setError(err.response?.data?.error || 'Failed to load users from server');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab, filters.role, filters.farmId, filters.search]);

  // Fetch Stats & Role Metrics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await userService.getUserStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch All Roles for Dropdowns & Forms
  const fetchRoles = useCallback(async () => {
    try {
      const data = await userService.getAllRoles();
      if (Array.isArray(data)) {
        setRoles(data.length > 0 ? data : DEFAULT_SYSTEM_ROLES);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles(DEFAULT_SYSTEM_ROLES);
    }
  }, []);

  // Fetch All Farms for Dropdowns & Assignments
  const fetchFarms = useCallback(async () => {
    try {
      const data = await farmService.getAllFarms();
      if (Array.isArray(data)) {
        setFarms(data);
      }
    } catch (err) {
      console.error('Error fetching farms:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
    fetchRoles();
    fetchFarms();
  }, [fetchStats, fetchRoles, fetchFarms]);

  const getRoleType = (roleName) => {
    if (!roleName) return 'default';
    const lower = roleName.toLowerCase();
    if (lower.includes('admin')) return 'admin';
    if (lower.includes('finance')) return 'finance';
    if (lower.includes('farm')) return 'farm';
    if (lower.includes('hr')) return 'hr';
    if (lower.includes('operation')) return 'operations';
    if (lower.includes('project')) return 'project';
    if (lower.includes('store')) return 'storekeeper';
    if (lower.includes('procurement')) return 'procurement';
    return 'default';
  };

  const handleSearch = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRoleFilter = (e) => {
    setFilters((prev) => ({ ...prev, role: e.target.value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFarmFilter = (e) => {
    setFilters((prev) => ({ ...prev, farmId: e.target.value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(id);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error('Delete user error:', err);
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
  };

  const handleExportCSV = () => {
    if (users.length === 0) {
      alert('No user data to export');
      return;
    }
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Assigned Farm', 'Farm Location', 'Status', 'Last Login'];
    const rows = users.map((u) => [
      u.id,
      `"${u.firstName || ''}"`,
      `"${u.lastName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.role?.name || ''}"`,
      `"${u.farm?.name || 'Headquarters / Global'}"`,
      `"${u.farm?.location || 'All Locations'}"`,
      u.isActive ? 'Active' : 'Inactive',
      `"${u.formattedLastLogin || 'Never'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ufms_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute multi-segment SVG donut chart offsets from real role distribution
  let currentOffset = 25;
  const donutSegments = (stats.roleDistribution || []).map((item) => {
    const percentNum = item.percentageNumber || 0;
    const dashArray = `${percentNum} ${100 - percentNum}`;
    const offset = currentOffset;
    currentOffset -= percentNum;
    return {
      ...item,
      dashArray,
      dashOffset: offset,
    };
  });

  const authUserAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${authUser?.firstName || 'Admin'} ${authUser?.lastName || 'User'}`
  )}&background=10b981&color=fff&bold=true`;

  const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="users-page-container">
      {/* ===== SIDEBAR ===== */}
      <aside className="users-sidebar">
        <div className="users-sidebar-brand">
          <div className="brand-leaf-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" />
              <path d="M11 20v-8a4 4 0 0 1 4-4h4" />
            </svg>
          </div>
          <div className="brand-text-group">
            <span className="brand-title">UFMS</span>
            <span className="brand-subtitle">Unified Farm Management System</span>
          </div>
        </div>

        <div className="users-sidebar-nav">
          <div className="nav-group">
            <Link to="/dashboard" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </div>
            </Link>
            <Link to="/users" className="nav-link active">
              <div className="nav-link-content">
                <span className="nav-icon">👥</span>
                <span>Users & Roles</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="user-card-info">
            <div className="user-card-avatar">
              <img
                src={authUserAvatar}
                alt="User"
                className="avatar-img"
              />
              <span className="online-dot"></span>
            </div>
            <div className="user-card-text">
              <span className="user-card-name">{authUser?.firstName ? `${authUser.firstName} ${authUser?.lastName || ''}`.trim() : 'Admin'}</span>
              <span className="user-card-role">{authUser?.role || 'Admin'}</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="users-main-area">
        {/* TOP NAVBAR */}
        <header className="users-top-navbar">
          <div className="top-nav-left">
            <button className="btn-top-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back</span>
            </button>
            <h2 className="top-nav-title">Users & Roles</h2>
          </div>

          <div className="top-nav-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Search users by name, email or role..."
              className="search-input-field"
              value={filters.search}
              onChange={handleSearch}
            />
          </div>

          <div className="top-nav-right">
            <div className="top-user-profile">
              <img
                src={authUserAvatar}
                alt="Profile"
                className="top-avatar"
              />
              <div className="top-user-text">
                <span className="top-user-name">{authUser?.firstName ? `${authUser.firstName} ${authUser?.lastName || ''}`.trim() : 'Admin'}</span>
                <span className="top-user-role">{authUser?.role || 'Admin'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="users-content-wrapper">
          {/* PAGE TITLE + ACTION ROW */}
          <div className="page-header-row">
            <div className="page-title-group">
              <div className="title-with-back-row">
                <button className="btn-page-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Dashboard</span>
                </button>
                <h1>Users & Roles</h1>
              </div>
              <p>Manage system users, their roles and permissions in real-time</p>
            </div>

            <button
              onClick={() => { setEditingUser(null); setShowForm(true); }}
              className="btn-add-user"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              <span>Add New User</span>
            </button>
          </div>

          {/* 5 REAL STAT CARDS ROW */}
          <div className="stats-cards-grid">
            <div className="stat-card-item">
              <div className="stat-icon-wrapper mint">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.totalUsers}</span>
                <span className="stat-label-text">Total Users</span>
                <span className="stat-trend-badge up">Live in database</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : (stats.totalRoles || roles.length)}</span>
                <span className="stat-label-text">Roles</span>
                <span className="stat-trend-badge neutral">Configured</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.activeUsers}</span>
                <span className="stat-label-text">Active Users</span>
                <span className="stat-trend-badge up">Active status</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper pink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.inactiveUsers}</span>
                <span className="stat-label-text">Inactive Users</span>
                <span className="stat-trend-badge down">Disabled status</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.newUsers}</span>
                <span className="stat-label-text">New Users (30d)</span>
                <span className="stat-trend-badge up">Recent</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID */}
          <div className="users-layout-grid">
            {/* LEFT MAIN TABLE CARD */}
            <div className="table-section-card">
              {/* CONTROL TABS & SEARCH */}
              <div className="table-controls-header">
                <div className="tabs-group">
                  <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('all'); setPagination((prev) => ({ ...prev, page: 1 })); }}
                  >
                    All Users ({stats.totalUsers})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('active'); setPagination((prev) => ({ ...prev, page: 1 })); }}
                  >
                    Active Users ({stats.activeUsers})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'inactive' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('inactive'); setPagination((prev) => ({ ...prev, page: 1 })); }}
                  >
                    Inactive Users ({stats.inactiveUsers})
                  </button>
                </div>

                <div className="table-right-tools">
                  <select
                    className="role-select-dropdown"
                    value={filters.farmId}
                    onChange={handleFarmFilter}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="">Filter All Farms</option>
                    <option value="unassigned">🏢 Headquarters / Global</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        🌾 {f.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="role-select-dropdown"
                    value={filters.role}
                    onChange={handleRoleFilter}
                  >
                    <option value="">Filter All Roles</option>
                    {roles.map((r) => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <div className="table-search-box">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="table-search-input"
                      value={filters.search}
                      onChange={handleSearch}
                    />
                  </div>

                  <button
                    className="btn-icon-export"
                    title="Export users to CSV"
                    onClick={handleExportCSV}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="table-responsive">
                <table className="users-data-table">
                  <thead>
                    <tr>
                      <th>
                        <div className="th-content">
                          <span>User</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <span>Email</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <span>Role</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <span>Assigned Farm</span>
                        </div>
                      </th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          Loading users from database...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#ef4444' }}>
                          {error}
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                          No users found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-profile-cell">
                              <img
                                src={user.avatar}
                                alt={user.firstName}
                                className="user-table-avatar"
                              />
                              <div className="user-name-box">
                                <span className="user-full-name">{user.firstName} {user.lastName}</span>
                                <span className="user-phone-number">ID #{user.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="user-email-text">{user.email}</td>
                          <td>
                            <span className={`role-pill-badge ${user.roleType || 'default'}`}>
                              {user.role?.name || 'User'}
                            </span>
                          </td>
                          <td>
                            {user.farm ? (
                              <div className="user-farm-badge">
                                <span className="farm-pin-icon">🌾</span>
                                <div className="farm-badge-info">
                                  <span className="farm-badge-name">{user.farm.name}</span>
                                  {user.farm.location && (
                                    <span className="farm-badge-location">{user.farm.location}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="farm-unassigned-tag">
                                <span>🏢</span>
                                <span>Headquarters / Global</span>
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`status-dot-indicator ${user.isActive ? 'active' : 'inactive'}`}>
                              <span className={`dot-bullet ${user.isActive ? 'green' : 'red'}`}></span>
                              <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>
                          <td className="last-login-text">{user.formattedLastLogin}</td>
                          <td>
                            <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn-action-icon"
                                title="View details"
                                onClick={() => handleView(user)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                              </button>
                              <button
                                className="btn-action-icon"
                                title="Edit user"
                                onClick={() => handleEdit(user)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                              </button>
                              <button
                                className="btn-action-icon"
                                title="Delete user"
                                onClick={() => handleDelete(user.id)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* DYNAMIC PAGINATION FOOTER */}
              <div className="table-pagination-footer">
                <span className="pagination-showing-text">
                  Showing {startIndex} to {endIndex} of {pagination.total} users
                </span>

                <div className="pagination-controls-group">
                  <button
                    className="btn-page-step"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - pagination.page) <= 1
                      );
                    })
                    .map((pageNum, idx, arr) => (
                      <React.Fragment key={pageNum}>
                        {idx > 0 && pageNum - arr[idx - 1] > 1 && (
                          <span style={{ color: '#94a3b8', fontSize: '12px', padding: '0 4px' }}>...</span>
                        )}
                        <button
                          className={`btn-page-step ${pagination.page === pageNum ? 'active' : ''}`}
                          onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    className="btn-page-step"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    &gt;
                  </button>

                  <select
                    className="page-limit-select"
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination((prev) => ({ ...prev, page: 1, limit: Number(e.target.value) }))
                    }
                  >
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR WIDGETS */}
            <div className="widgets-right-column">
              {/* WIDGET 1: REAL ROLE DISTRIBUTION */}
              <div className="widget-card">
                <div className="widget-title-row">
                  <h3 className="widget-title">Role Distribution</h3>
                </div>

                <div className="donut-chart-container">
                  {/* SVG Multi-segment Donut Chart */}
                  <svg className="donut-svg-box" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="5"></circle>

                    {donutSegments.length === 0 ? (
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="5"></circle>
                    ) : (
                      donutSegments.map((seg) => (
                        <circle
                          key={seg.id || seg.name}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="5"
                          strokeDasharray={seg.dashArray}
                          strokeDashoffset={seg.dashOffset}
                        ></circle>
                      ))
                    )}
                  </svg>

                  <div className="role-legend-list">
                    {stats.roleDistribution && stats.roleDistribution.length > 0 ? (
                      stats.roleDistribution.map((item) => (
                        <div key={item.name} className="legend-item-row">
                          <div className="legend-color-label">
                            <span className="legend-dot-circle" style={{ backgroundColor: item.color }}></span>
                            <span>{item.name}</span>
                          </div>
                          <span className="legend-value-text">{item.count} ({item.percent})</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '10px 0' }}>
                        No role metrics recorded
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* WIDGET 2: QUICK ACTIONS */}
              <div className="widget-card">
                <div className="widget-title-row">
                  <h3 className="widget-title">Quick Actions</h3>
                </div>

                <div className="quick-actions-list">
                  <div className="quick-action-item" onClick={() => { setEditingUser(null); setShowForm(true); }}>
                    <div className="action-icon-box green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
                    </div>
                    <div className="action-text-group">
                      <span className="action-title">Add New User</span>
                      <span className="action-sub">Create a new system user</span>
                    </div>
                  </div>

                  <div className="quick-action-item" onClick={handleExportCSV}>
                    <div className="action-icon-box emerald">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </div>
                    <div className="action-text-group">
                      <span className="action-title">Export Users</span>
                      <span className="action-sub">Download current users list (CSV)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WIDGET 3: RECENT ACTIVITY */}
              <div className="widget-card">
                <div className="widget-title-row">
                  <h3 className="widget-title">Recent Activity</h3>
                </div>

                <div className="activity-timeline-list">
                  {stats.recentActivities && stats.recentActivities.length > 0 ? (
                    stats.recentActivities.map((act) => (
                      <div key={act.id} className="activity-timeline-item">
                        <img src={act.avatar} alt="User" className="activity-avatar-icon" />
                        <div className="activity-text-box">
                          <span className="activity-message">{act.text}</span>
                          <span className="activity-time-stamp">{act.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
                      No recent user activity
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== ADD / EDIT MODAL ===== */}
      {showForm && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <button style={modalStyles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            <UserForm
              user={editingUser}
              roles={roles}
              farms={farms}
              onSuccess={() => {
                setShowForm(false);
                fetchUsers();
                fetchStats();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* ===== VIEW USER MODAL ===== */}
      {viewingUser && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <button style={modalStyles.closeBtn} onClick={() => setViewingUser(null)}>✕</button>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <img
                src={viewingUser.avatar}
                alt={viewingUser.firstName}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981' }}
              />
              <h2 style={{ margin: '12px 0 4px', fontSize: '20px', color: '#0f172a' }}>
                {viewingUser.firstName} {viewingUser.lastName}
              </h2>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>User ID: #{viewingUser.id}</p>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div><strong>Email:</strong> {viewingUser.email}</div>
                <div><strong>Role:</strong> {viewingUser.role?.name || 'User'}</div>
                <div>
                  <strong>Assigned Farm:</strong>{' '}
                  {viewingUser.farm ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '6px', fontWeight: '600', fontSize: '13px' }}>
                      🌾 {viewingUser.farm.name} {viewingUser.farm.location ? `(${viewingUser.farm.location})` : ''}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: '6px', fontSize: '13px' }}>
                      🏢 Headquarters / Global (No specific farm)
                    </span>
                  )}
                </div>
                <div><strong>Status:</strong> {viewingUser.isActive ? 'Active' : 'Inactive'}</div>
                <div><strong>Verified:</strong> {viewingUser.isVerified ? 'Yes' : 'No'}</div>
                <div><strong>Last Login:</strong> {viewingUser.formattedLastLogin}</div>
                {viewingUser.createdAt && (
                  <div><strong>Created:</strong> {new Date(viewingUser.createdAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#f1f5f9',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default UserList;
