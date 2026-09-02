import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { farmService } from '../services/farmService';
import { userService } from '../services/userService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good morning');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Live database stats
  const [farmStats, setFarmStats] = useState({
    totalFarms: 0,
    activeFarms: 0,
    inactiveFarms: 0,
    totalCrops: 0,
    totalAnimals: 0,
    totalLandArea: 0,
    totalRevenue: 0,
    topFarms: [],
    monthlyPerformance: [],
  });

  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    recentActivities: [],
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [fStats, uStats] = await Promise.all([
          farmService.getFarmStats().catch(() => null),
          userService.getUserStats().catch(() => null),
        ]);

        if (fStats) setFarmStats(fStats);
        if (uStats) setUserStats(uStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Users & Roles', path: '/users', icon: '👥' },
    { name: 'Farm Management', path: '/farms', icon: '🌾' },
    { name: 'Crop Management', path: '/crops', icon: '🌱' },
    { name: 'Livestock', path: '/animals', icon: '🐄' },
    { name: 'Inventory', path: '/inventory', icon: '📦' },
    { name: 'Assets & Equipment', path: '/equipment', icon: '🔧' },
    { name: 'Finance', path: '/finance', icon: '💰' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'Notifications', path: '/notifications', icon: '🔔' },
    { name: 'Audit Logs', path: '/audit', icon: '📋' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const authUserAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${user?.firstName || 'Admin'} ${user?.lastName || 'User'}`
  )}&background=10b981&color=fff&bold=true`;

  if (loading) {
    return (
      <div className="dashboard-loading-container">
        <div className="dashboard-spinner"></div>
        <p>Loading UFMS Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-container">
      {/* ===== LEFT SIDEBAR ===== */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="dashboard-sidebar-brand">
          <div className="brand-leaf-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" />
              <path d="M11 20v-8a4 4 0 0 1 4-4h4" />
            </svg>
          </div>
          <div className="brand-text-group">
            <span className="brand-title">UFMS</span>
            <span className="brand-subtitle">Unified Farm Management</span>
          </div>
        </div>

        <div className="dashboard-sidebar-nav">
          <div className="nav-group">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`dashboard-nav-link ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-link-content">
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="dashboard-sidebar-user-card">
          <div className="user-card-info">
            <div className="user-card-avatar">
              <img src={authUserAvatar} alt="Profile" className="avatar-img" />
              <span className="online-dot"></span>
            </div>
            <div className="user-card-text">
              <span className="user-card-name">{user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : 'Admin User'}</span>
              <span className="user-card-role">{user?.role || 'System Administrator'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-sidebar-logout" title="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="dashboard-main-area">
        {/* TOP NAVBAR */}
        <header className="dashboard-top-navbar">
          <div className="top-nav-left">
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="top-nav-title">UFMS Overview Dashboard</h2>
          </div>

          <div className="top-nav-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Search anything across UFMS..."
              className="search-input-field"
            />
          </div>

          <div className="top-nav-right">
            <div className="top-user-profile">
              <img src={authUserAvatar} alt="Profile" className="top-avatar" />
              <div className="top-user-text">
                <span className="top-user-name">{user?.firstName || 'Admin User'}</span>
                <span className="top-user-role">{user?.role || 'System Administrator'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="dashboard-content-wrapper">
          {/* HERO GREETING BANNER */}
          <div className="dashboard-hero-card">
            <div className="hero-content">
              <div className="hero-badge">🌿 Agricultural Intelligence Platform</div>
              <h1 className="hero-title">{greeting}, {user?.firstName || 'Administrator'}! 👋</h1>
              <p className="hero-subtitle">
                Welcome to the Unified Farm Management System. Here is a real-time overview of your agricultural enterprise operations.
              </p>
            </div>
            <div className="hero-date-box">
              <span className="date-icon">📅</span>
              <div className="date-text-group">
                <span className="date-day">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="date-status">System Operational & Synced</span>
              </div>
            </div>
          </div>

          {/* 6 REAL DATABASE STAT CARDS */}
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <div className="stat-icon-box mint">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{farmStats.totalFarms}</span>
                <span className="stat-title">Total Farms</span>
                <span className="stat-badge green">Live database</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-box blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" /><path d="M11 20v-8a4 4 0 0 1 4-4h4" /></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{farmStats.totalCrops}</span>
                <span className="stat-title">Active Crops</span>
                <span className="stat-badge blue">In cultivation</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-box amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 10c.7-.7 1.6-1.2 2.6-1.4 1.3-.2 2.5.4 3.1 1.5.5.9.4 2.1-.2 2.9-.6.8-1.5 1.3-2.5 1.4-1.3.2-2.5-.4-3.1-1.5-.2-.3-.3-.7-.4-1z"/><circle cx="8" cy="10" r="3"/><path d="M12 21a9.004 9.004 0 0 0 8.71-6.75"/></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{farmStats.totalAnimals}</span>
                <span className="stat-title">Total Livestock</span>
                <span className="stat-badge amber">Healthy herds</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-box purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{Number(farmStats.totalLandArea).toLocaleString()} ha</span>
                <span className="stat-title">Total Land Area</span>
                <span className="stat-badge purple">Hectares mapped</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-box pink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 6v2m0 8v2" /></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">${Number(farmStats.totalRevenue).toLocaleString()}</span>
                <span className="stat-title">Total Revenue</span>
                <span className="stat-badge green">Live MTD</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-box cyan">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{userStats.totalUsers}</span>
                <span className="stat-title">System Users</span>
                <span className="stat-badge cyan">{userStats.totalRoles} Roles</span>
              </div>
            </div>
          </div>

          {/* DUAL COLUMN PERFORMANCE SECTION */}
          <div className="dashboard-middle-grid">
            {/* MONTHLY PERFORMANCE CHART */}
            <div className="dashboard-chart-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Enterprise Monthly Revenue & Operations</h3>
                  <p className="chart-card-sub">Aggregated performance from live farm sales records</p>
                </div>
                <div className="chart-legend-group">
                  <div className="legend-item">
                    <span className="legend-dot green"></span>
                    <span>Monthly Revenue</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot blue"></span>
                    <span>Production Trend</span>
                  </div>
                </div>
              </div>

              <div className="chart-svg-wrapper">
                <svg className="dashboard-svg-chart" viewBox="0 0 650 180" preserveAspectRatio="none">
                  <line x1="40" y1="20" x2="620" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="60" x2="620" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="100" x2="620" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="140" x2="620" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="160" x2="620" y2="160" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Left Y Labels */}
                  <text x="5" y="24" fill="#94a3b8" fontSize="10" fontWeight="600">High</text>
                  <text x="5" y="64" fill="#94a3b8" fontSize="10" fontWeight="600">Med+</text>
                  <text x="5" y="104" fill="#94a3b8" fontSize="10" fontWeight="600">Med</text>
                  <text x="5" y="144" fill="#94a3b8" fontSize="10" fontWeight="600">Low</text>
                  <text x="18" y="164" fill="#94a3b8" fontSize="10" fontWeight="600">$0</text>

                  {/* Monthly Bars */}
                  {(farmStats.monthlyPerformance || []).map((m, idx) => {
                    const barX = 64 + idx * 47;
                    return (
                      <rect
                        key={m.month}
                        x={barX}
                        y={160 - (m.barHeight || 0)}
                        width="10"
                        height={m.barHeight || 0}
                        rx="3"
                        fill="#10b981"
                      />
                    );
                  })}

                  {/* Line overlay */}
                  {farmStats.monthlyPerformance && farmStats.monthlyPerformance.length > 0 && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2"
                        points={farmStats.monthlyPerformance.map((m, idx) => `${69 + idx * 47},${m.lineY || 160}`).join(' ')}
                      />
                      {farmStats.monthlyPerformance.map((m, idx) => (
                        <circle
                          key={m.month}
                          cx={69 + idx * 47}
                          cy={m.lineY || 160}
                          r="3.5"
                          fill="#0284c7"
                        />
                      ))}
                    </>
                  )}

                  {/* Months */}
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                    <text key={month} x={60 + idx * 47} y="176" fill="#64748b" fontSize="10">
                      {month}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* TOP PERFORMING FARMS */}
            <div className="dashboard-top-farms-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Top Performing Farms</h3>
                  <p className="chart-card-sub">Ranked by revenue generation</p>
                </div>
                <Link to="/farms" className="btn-view-link">
                  Manage Farms →
                </Link>
              </div>

              <div className="top-farms-stack">
                {farmStats.topFarms && farmStats.topFarms.length > 0 ? (
                  farmStats.topFarms.map((item) => (
                    <div key={item.rank} className="top-farm-row-item">
                      <div className="farm-rank-info">
                        <span className="rank-num">{item.rank}</span>
                        <span className="farm-name-label">{item.name}</span>
                      </div>
                      <span className="farm-rev-value">{item.formattedRevenue}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                    No farm revenue recorded yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* THREE COLUMN SECTION */}
          <div className="dashboard-bottom-tri-grid">
            {/* QUICK NAVIGATION / ACTIONS */}
            <div className="bottom-card">
              <div className="bottom-card-header">
                <h4 className="bottom-card-title">⚡ Quick Management</h4>
              </div>
              <div className="quick-actions-list">
                <Link to="/farms" className="quick-action-btn">
                  <span className="action-icon">🌾</span>
                  <div className="action-text">
                    <span className="action-title">Farm Management</span>
                    <span className="action-sub">View and register enterprise farms</span>
                  </div>
                  <span className="action-chevron">→</span>
                </Link>

                <Link to="/users" className="quick-action-btn">
                  <span className="action-icon">👥</span>
                  <div className="action-text">
                    <span className="action-title">Users & Roles</span>
                    <span className="action-sub">Configure staff and access permissions</span>
                  </div>
                  <span className="action-chevron">→</span>
                </Link>

                <Link to="/crops" className="quick-action-btn">
                  <span className="action-icon">🌱</span>
                  <div className="action-text">
                    <span className="action-title">Crop Management</span>
                    <span className="action-sub">Track plantings, yields and harvests</span>
                  </div>
                  <span className="action-chevron">→</span>
                </Link>

                <Link to="/animals" className="quick-action-btn">
                  <span className="action-icon">🐄</span>
                  <div className="action-text">
                    <span className="action-title">Livestock Management</span>
                    <span className="action-sub">Monitor health, herds and breeds</span>
                  </div>
                  <span className="action-chevron">→</span>
                </Link>
              </div>
            </div>

            {/* RECENT NOTIFICATIONS */}
            <div className="bottom-card">
              <div className="bottom-card-header">
                <h4 className="bottom-card-title">🔔 Operational Alerts</h4>
                <span className="badge-pill-alert">Live</span>
              </div>
              <div className="alerts-list">
                <div className="alert-item">
                  <span className="alert-icon-sym green">🌱</span>
                  <div className="alert-text-block">
                    <span className="alert-main-title">Crop cycle active</span>
                    <span className="alert-timestamp">Continuous field monitoring</span>
                  </div>
                </div>
                <div className="alert-item">
                  <span className="alert-icon-sym blue">🐄</span>
                  <div className="alert-text-block">
                    <span className="alert-main-title">Livestock vaccination recorded</span>
                    <span className="alert-timestamp">Veterinary checks up to date</span>
                  </div>
                </div>
                <div className="alert-item">
                  <span className="alert-icon-sym amber">📦</span>
                  <div className="alert-text-block">
                    <span className="alert-main-title">Seed & fertilizer inventory synced</span>
                    <span className="alert-timestamp">Database reconciled</span>
                  </div>
                </div>
                <div className="alert-item">
                  <span className="alert-icon-sym purple">💰</span>
                  <div className="alert-text-block">
                    <span className="alert-main-title">Revenues aggregated in real-time</span>
                    <span className="alert-timestamp">Finance module operational</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT USER & SYSTEM ACTIVITIES */}
            <div className="bottom-card">
              <div className="bottom-card-header">
                <h4 className="bottom-card-title">📋 Recent System Activity</h4>
                <Link to="/audit" className="btn-sub-link">Audit log</Link>
              </div>
              <div className="activities-list">
                {userStats.recentActivities && userStats.recentActivities.length > 0 ? (
                  userStats.recentActivities.map((act) => (
                    <div key={act.id} className="activity-item-row">
                      <img src={act.avatar} alt="User" className="activity-user-avatar" />
                      <div className="activity-text-info">
                        <span className="activity-line">{act.text}</span>
                        <span className="activity-time-stamp">{act.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                    No recent activity records
                  </p>
                )}
              </div>
            </div>
          </div>

          <footer className="dashboard-footer">
            © 2025 UFMS - Unified Farm Management System. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;