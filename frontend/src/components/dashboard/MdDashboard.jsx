import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mdService } from '../../services/mdService';
import { useAuth } from '../../context/AuthContext';
import './MdDashboard.css';

// Formatter Helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return String(dateString);
  }
};

// SVG Production Donut Chart with Center Text
const ProductionDonutChart = ({ data, totalText = '482 tons', size = 180, strokeWidth = 26 }) => {
  const total = data.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="md-donut-chart-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="md-donut-svg">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((slice, i) => {
            if (!slice.amount || slice.amount <= 0) return null;
            const ratio = slice.amount / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += ratio * circumference;

            return (
              <circle
                key={slice.name || i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color || '#10b981'}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="md-donut-segment"
              />
            );
          })}
        </g>
      </svg>
      <div className="md-donut-center-text">
        <span className="donut-center-sub">Total Production</span>
        <span className="donut-center-val">{totalText}</span>
      </div>
    </div>
  );
};

// SVG Dual Line Chart for Farm Performance (Revenue vs Expenses)
const FarmPerformanceChart = ({ data, height = 180 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 480;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = 300000;
  const minVal = 0;

  const revPoints = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.revenue - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, revenue: d.revenue, month: d.month };
  });

  const expPoints = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.expenses - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, expenses: d.expenses, month: d.month };
  });

  const createSmoothPath = (pts) => {
    return pts.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = arr[i - 1];
      const cpX1 = prev.x + (point.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (point.x - prev.x) / 2;
      const cpY2 = point.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
    }, '');
  };

  const revPath = createSmoothPath(revPoints);
  const expPath = createSmoothPath(expPoints);

  return (
    <div className="md-line-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="md-chart-svg">
        {/* Grid lines */}
        {[0, 0.333, 0.5, 0.666, 0.833, 1].map((p, idx) => {
          const y = paddingTop + chartHeight * (1 - p);
          const valLabel = p === 0 ? '$0' : `$${Math.round((maxVal * p) / 1000)}K`;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        <path d={revPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        <path d={expPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

        {/* Nodes */}
        {revPoints.map((p, i) => (
          <circle
            key={`r-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 5 : 3.5}
            fill="#ffffff"
            stroke="#10b981"
            strokeWidth="2.5"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {expPoints.map((p, i) => (
          <circle
            key={`e-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 5 : 3.5}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="2.5"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* X Labels */}
        {revPoints.map((p, i) => (
          <text key={`l-${i}`} x={p.x} y={height - 8} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
            {p.month}
          </text>
        ))}
      </svg>

      {hoveredIdx !== null && (
        <div
          className="md-chart-tooltip"
          style={{
            left: `${(revPoints[hoveredIdx].x / width) * 100}%`,
            top: `${(Math.min(revPoints[hoveredIdx].y, expPoints[hoveredIdx].y) / height) * 100}%`,
          }}
        >
          <strong>{data[hoveredIdx].month}</strong>
          <div className="tip-rev">Revenue: {formatCurrency(data[hoveredIdx].revenue)}</div>
          <div className="tip-exp">Expenses: {formatCurrency(data[hoveredIdx].expenses)}</div>
        </div>
      )}
    </div>
  );
};

const MdDashboard = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // State
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [isNewApprovalModalOpen, setIsNewApprovalModalOpen] = useState(false);
  const [newApprovalData, setNewApprovalData] = useState({
    title: '',
    category: 'Budget',
    amount: '',
    meta: '',
    requestedBy: '',
  });

  const showToast = (msg, type = 'success') => {
    setNotificationMsg({ text: msg, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mdService.getMdStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load MD dashboard stats:', err);
      showToast('Failed to load executive statistics', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Decision Approval Status Change
  const handleUpdateApproval = async (id, status) => {
    try {
      await mdService.updateApprovalStatus(id, status);
      showToast(`Decision updated to ${status}`);
      setIsDecisionModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error updating approval:', err);
      showToast('Failed to update decision', 'error');
    }
  };

  // Handle New Approval Creation
  const handleCreateApproval = async (e) => {
    e.preventDefault();
    try {
      if (!newApprovalData.title) {
        showToast('Please enter approval title', 'error');
        return;
      }
      await mdService.createApproval(newApprovalData);
      showToast(`Decision request "${newApprovalData.title}" submitted!`);
      setIsNewApprovalModalOpen(false);
      setNewApprovalData({ title: '', category: 'Budget', amount: '', meta: '', requestedBy: '' });
      loadData();
    } catch (err) {
      console.error('Error creating approval request:', err);
      showToast('Failed to submit approval request', 'error');
    }
  };

  const getDecisionBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'badge-decision-approved';
      case 'FOR_REVIEW':
        return 'badge-decision-review';
      case 'PENDING':
        return 'badge-decision-pending';
      case 'REJECTED':
        return 'badge-decision-rejected';
      default:
        return 'badge-decision-pending';
    }
  };

  const getStatusDisplay = (status) => {
    if (status === 'FOR_REVIEW') return 'For Review';
    if (status === 'APPROVED') return 'Approved';
    if (status === 'REJECTED') return 'Rejected';
    return 'Pending';
  };

  return (
    <div className="md-dashboard-layout">
      {/* ===== NOTIFICATION TOAST ===== */}
      {notificationMsg && (
        <div className={`md-toast toast-${notificationMsg.type}`}>
          <span>{notificationMsg.text}</span>
          <button onClick={() => setNotificationMsg(null)}>✕</button>
        </div>
      )}

      {/* ===== LEFT SIDEBAR (DARK FOREST GREEN) ===== */}
      <aside className={`md-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="md-sidebar-brand">
          <div className="brand-leaf-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" />
              <path d="M11 20v-8a4 4 0 0 1 4-4h4" />
            </svg>
          </div>
          {sidebarOpen && (
            <div className="brand-text">
              <span className="brand-title">UFMS</span>
              <span className="brand-sub">Unified Farm Management System</span>
            </div>
          )}
        </div>

        <nav className="md-sidebar-nav">
          {/* DASHBOARD ACTIVE GROUP */}
          <div className="sidebar-group-active">
            <div className="sidebar-group-header">
              <span className="sidebar-icon">🏠</span>
              {sidebarOpen && <span>Dashboard</span>}
            </div>
            {sidebarOpen && (
              <div className="sidebar-sublinks">
                <Link to="/dashboard" className="sublink active">Overview</Link>
                <button className="sublink btn-sublink" onClick={() => showToast('Opening Reports view...')}>Reports</button>
                <button className="sublink btn-sublink" onClick={() => setIsNewApprovalModalOpen(true)}>Approvals</button>
                <button className="sublink btn-sublink" onClick={() => showToast('Scrolling to Farm Performance')}>Farm Performance</button>
                <Link to="/finance" className="sublink">Financial Summary</Link>
                <button className="sublink btn-sublink" onClick={() => showToast('Displaying Strategic Goals')}>Strategic Goals</button>
              </div>
            )}
          </div>

          {/* OPERATIONS */}
          {sidebarOpen && <div className="nav-section-label">OPERATIONS</div>}
          <Link to="/farms" className="md-sidebar-link">
            <span className="sidebar-icon">🌾</span>
            {sidebarOpen && <span>Farm Management</span>}
          </Link>
          <Link to="/crops" className="md-sidebar-link">
            <span className="sidebar-icon">🌱</span>
            {sidebarOpen && <span>Crop Management</span>}
          </Link>
          <Link to="/animals" className="md-sidebar-link">
            <span className="sidebar-icon">🐄</span>
            {sidebarOpen && <span>Livestock Management</span>}
          </Link>
          <Link to="/inventory" className="md-sidebar-link">
            <span className="sidebar-icon">📦</span>
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link to="/equipment" className="md-sidebar-link">
            <span className="sidebar-icon">🔧</span>
            {sidebarOpen && <span>Assets & Equipment</span>}
          </Link>

          {/* PEOPLE */}
          {sidebarOpen && <div className="nav-section-label">PEOPLE</div>}
          <Link to="/users" className="md-sidebar-link">
            <span className="sidebar-icon">👥</span>
            {sidebarOpen && <span>Human Resources</span>}
          </Link>

          {/* FINANCE */}
          {sidebarOpen && <div className="nav-section-label">FINANCE</div>}
          <Link to="/finance" className="md-sidebar-link">
            <span className="sidebar-icon">💰</span>
            {sidebarOpen && <span>Finance Management</span>}
          </Link>

          {/* PROJECTS */}
          {sidebarOpen && <div className="nav-section-label">PROJECTS</div>}
          <button className="md-sidebar-link btn-link" onClick={() => showToast('Projects view')}>
            <span className="sidebar-icon">📋</span>
            {sidebarOpen && <span>Projects</span>}
          </button>

          {/* SYSTEM */}
          {sidebarOpen && <div className="nav-section-label">SYSTEM</div>}
          <Link to="/settings" className="md-sidebar-link">
            <span className="sidebar-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* Sidebar Bottom Profile */}
        {sidebarOpen && (
          <div className="sidebar-bottom-md">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Managing Director"
              className="md-avatar"
            />
            <div className="md-profile-info">
              <span className="md-name">Managing Director</span>
              <span className="md-title">System User</span>
              <span className="md-online-badge">
                <span className="dot-online"></span> Online
              </span>
            </div>
            <div className="md-profile-caret">▾</div>
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="md-main-area">
        {/* ===== TOPBAR ===== */}
        <header className="md-topbar">
          <div className="topbar-title-section">
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="title-text-group">
              <h1 className="topbar-heading">Managing Director Dashboard</h1>
              <p className="topbar-subheading">Overall performance and strategic overview of the farm.</p>
            </div>
          </div>

          <div className="topbar-center-search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search anything... (e.g. farm, project, report, etc.)"
              className="search-input-field"
            />
          </div>

          <div className="topbar-actions-right">
            <button className="topbar-badge-btn" title="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notif-badge red">3</span>
            </button>

            <button className="topbar-badge-btn" title="Messages">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span className="notif-badge green">2</span>
            </button>

            <div className="topbar-user-badge">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="MD Profile"
                className="user-headshot"
              />
              <div className="user-text-col">
                <span className="user-fullname">Managing Director</span>
                <span className="user-sub">System User</span>
              </div>
            </div>
          </div>
        </header>

        {/* ===== DASHBOARD BODY ===== */}
        <div className="md-content-body">
          {/* DATE SELECTOR BAR */}
          <div className="date-filter-banner">
            <div className="date-range-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>May 1, 2025 - May 31, 2025</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          {/* ===== 6 TOP EXECUTIVE KPI CARDS ===== */}
          <div className="md-kpi-grid">
            {/* 1. Total Farm Area */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap green-light">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Total Farm Area</span>
                <span className="kpi-stat-number">{stats?.summary?.totalFarmArea ? `${stats.summary.totalFarmArea.toLocaleString()} ha` : '1,250 ha'}</span>
                <span className="kpi-rate-text positive">↑ 5.2% from last month</span>
              </div>
            </div>

            {/* 2. Total Crop Production */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap blue-light">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Total Crop Production</span>
                <span className="kpi-stat-number">{stats?.summary?.totalCropProduction ? `${stats.summary.totalCropProduction.toLocaleString()} tons` : '482 tons'}</span>
                <span className="kpi-rate-text positive">↑ 12.6% from last month</span>
              </div>
            </div>

            {/* 3. Total Livestock */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap purple-light">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Total Livestock</span>
                <span className="kpi-stat-number">{stats?.summary?.totalLivestock ? stats.summary.totalLivestock.toLocaleString() : '1,248'}</span>
                <span className="kpi-rate-text positive">↑ 8.4% from last month</span>
              </div>
            </div>

            {/* 4. Total Revenue */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap orange-light">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Total Revenue</span>
                <span className="kpi-stat-number">{formatCurrency(stats?.summary?.totalRevenue ?? 245780)}</span>
                <span className="kpi-rate-text positive">↑ 15.3% from last month</span>
              </div>
            </div>

            {/* 5. Total Expenses */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap red-light">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Total Expenses</span>
                <span className="kpi-stat-number">{formatCurrency(stats?.summary?.totalExpenses ?? 98450)}</span>
                <span className="kpi-rate-text positive">↑ 6.8% from last month</span>
              </div>
            </div>

            {/* 6. Net Profit */}
            <div className="md-kpi-card">
              <div className="kpi-icon-wrap green-wallet">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                  <line x1="12" y1="6" x2="12" y2="8"></line>
                  <line x1="12" y1="16" x2="12" y2="18"></line>
                </svg>
              </div>
              <div className="kpi-content-col">
                <span className="kpi-title-text">Net Profit</span>
                <span className="kpi-stat-number">{formatCurrency(stats?.summary?.netProfit ?? 147330)}</span>
                <span className="kpi-rate-text positive">↑ 21.7% from last month</span>
              </div>
            </div>
          </div>

          {/* ===== 3-COLUMN MIDDLE ROW ===== */}
          <div className="md-3col-grid">
            {/* 1. Farm Performance Overview */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Farm Performance Overview</h3>
                <select className="widget-time-dropdown" defaultValue="This Year">
                  <option value="This Year">This Year</option>
                  <option value="Last Year">Last Year</option>
                </select>
              </div>
              <div className="card-legend-row">
                <div className="legend-indicator">
                  <span className="dot green"></span>
                  <span>Revenue</span>
                </div>
                <div className="legend-indicator">
                  <span className="dot blue"></span>
                  <span>Expenses</span>
                </div>
              </div>
              <FarmPerformanceChart data={stats?.farmPerformanceOverview || []} height={175} />
            </div>

            {/* 2. Production by Category */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Production by Category</h3>
                <select className="widget-time-dropdown" defaultValue="This Year">
                  <option value="This Year">This Year</option>
                  <option value="Last Year">Last Year</option>
                </select>
              </div>
              <div className="donut-row-wrapper">
                <ProductionDonutChart
                  data={stats?.productionByCategory || []}
                  totalText={`${stats?.summary?.totalCropProduction || 482} tons`}
                  size={150}
                />
                <div className="donut-legend-stack">
                  {stats?.productionByCategory?.map((cat) => (
                    <div key={cat.name} className="donut-legend-row">
                      <div className="legend-label-group">
                        <span className="donut-dot" style={{ backgroundColor: cat.color }}></span>
                        <span className="legend-title">{cat.name}</span>
                      </div>
                      <span className="legend-figure">
                        {cat.percentage}% ({cat.amount} t)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Key Decisions & Approvals */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Key Decisions & Approvals</h3>
                <button className="view-all-link" onClick={() => setIsNewApprovalModalOpen(true)}>
                  View All
                </button>
              </div>
              <div className="approvals-list-stack">
                {stats?.keyDecisions?.map((item) => (
                  <div
                    key={item.id}
                    className="approval-item-row"
                    onClick={() => {
                      setSelectedDecision(item);
                      setIsDecisionModalOpen(true);
                    }}
                  >
                    <div className={`approval-icon-box cat-${item.category?.toLowerCase() || 'budget'}`}>
                      {item.category === 'Budget' ? '💰' : item.category === 'Procurement' ? '📄' : item.category === 'HR' ? '👥' : item.category === 'Finance' ? '📈' : '🚜'}
                    </div>
                    <div className="approval-text-col">
                      <span className="approval-main-title">{item.title}</span>
                      <span className="approval-meta-sub">
                        {formatDate(item.date)} {item.meta ? `• ${item.meta}` : ''}
                      </span>
                    </div>
                    <span className={`decision-status-pill ${getDecisionBadgeClass(item.status)}`}>
                      {getStatusDisplay(item.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== 3-COLUMN ROW 2 ===== */}
          <div className="md-3col-grid">
            {/* 1. Recent Activities */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Recent Activities</h3>
                <button className="view-all-link" onClick={() => showToast('Viewing all activities')}>
                  View All
                </button>
              </div>
              <div className="activities-list-stack">
                {stats?.recentActivities?.map((act) => (
                  <div key={act.id} className="activity-item-row">
                    <div className={`act-icon-box type-${act.type?.toLowerCase() || 'crop'}`}>
                      {act.type === 'CROP' ? '🌱' : act.type === 'LIVESTOCK' ? '🛡️' : act.type === 'PROJECT' ? '🎯' : act.type === 'FINANCE' ? '📝' : '👤'}
                    </div>
                    <div className="activity-text-col">
                      <span className="activity-title-text">{act.title}</span>
                      <span className="activity-time-sub">2 hours ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Strategic Goals Progress */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Strategic Goals Progress</h3>
                <button className="view-all-link" onClick={() => showToast('Managing Strategic Goals')}>
                  View All
                </button>
              </div>
              <div className="goals-progress-stack">
                {stats?.strategicGoals?.map((goal) => (
                  <div key={goal.id} className="goal-progress-item">
                    <div className="goal-header-row">
                      <div className="goal-icon-label-wrap">
                        <div className={`goal-mini-icon cat-${goal.category?.toLowerCase() || 'crop'}`}>
                          {goal.category === 'PRODUCTION' ? '🌱' : goal.category === 'LIVESTOCK' ? '🛡️' : goal.category === 'PROFITABILITY' ? '📊' : '💧'}
                        </div>
                        <div className="goal-title-group">
                          <span className="goal-name-text">{goal.title}</span>
                          <span className="goal-target-sub">{goal.target}</span>
                        </div>
                      </div>
                      <span className="goal-pct-badge">{goal.progressPercent}%</span>
                    </div>
                    <div className="goal-track-bar">
                      <div
                        className={`goal-fill-bar ${goal.category?.toLowerCase() || 'production'}`}
                        style={{ width: `${goal.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Farm Performance by Location */}
            <div className="md-widget-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Farm Performance by Location</h3>
                <select className="widget-time-dropdown" defaultValue="This Year">
                  <option value="This Year">This Year</option>
                  <option value="Last Year">Last Year</option>
                </select>
              </div>
              <div className="table-responsive">
                <table className="location-rank-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Area (ha)</th>
                      <th>Production (t)</th>
                      <th>Revenue ($)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.farmPerformanceByLocation?.map((loc) => (
                      <tr key={loc.location}>
                        <td className="loc-name-col">
                          <span className="loc-pin-icon">📍</span>
                          <span>{loc.location}</span>
                        </td>
                        <td>{loc.area}</td>
                        <td>{loc.production}</td>
                        <td className="loc-rev-val">{formatCurrency(loc.revenue)}</td>
                        <td>
                          <span className={`status-pill ${loc.status === 'Good' ? 'pill-good' : 'pill-fair'}`}>
                            {loc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ===== BOTTOM ROW: RECENT REPORTS & MISSION CARD ===== */}
          <div className="md-bottom-grid">
            {/* 1. Recent Reports */}
            <div className="md-widget-card recent-reports-card">
              <div className="widget-card-header">
                <h3 className="card-heading">Recent Reports</h3>
                <button className="view-all-link" onClick={() => showToast('Opening Report Archive')}>
                  View All
                </button>
              </div>
              <div className="reports-cards-row">
                {stats?.recentReports?.map((rep) => (
                  <div key={rep.id} className="report-badge-box">
                    <div className="rep-icon-wrap">
                      <span className="rep-doc-icon">{rep.format === 'Excel' ? '📊' : '📄'}</span>
                    </div>
                    <div className="rep-info-col">
                      <span className="rep-title-text">{rep.title}</span>
                      <span className="rep-date-sub">{formatDate(rep.date)}</span>
                    </div>
                    <div className="rep-footer-row">
                      <span className={`rep-format-pill ${rep.format === 'Excel' ? 'excel' : 'pdf'}`}>
                        {rep.format}
                      </span>
                      <button className="rep-download-btn" title="Download report" onClick={() => showToast(`Downloading ${rep.title}...`)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Mission Card: Together for a Better Harvest */}
            <div className="md-mission-banner-card">
              <div className="mission-tree-icon">🌱</div>
              <h4 className="mission-heading">Together for a Better Harvest</h4>
              <p className="mission-quote-text">
                "We are committed to sustainable farming, food security and long-term growth."
              </p>
              <span className="mission-signature">— Managing Director</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL 1: DECISION DETAILS & APPROVAL ACTION ===== */}
      {isDecisionModalOpen && selectedDecision && (
        <div className="modal-overlay" onClick={() => setIsDecisionModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Executive Decision Approval</h2>
              <button className="close-btn" onClick={() => setIsDecisionModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="decision-preview-box">
                <span className="dp-title">{selectedDecision.title}</span>
                <span className="dp-meta">
                  Category: <strong>{selectedDecision.category}</strong> • Date: <strong>{formatDate(selectedDecision.date)}</strong>
                </span>
                {selectedDecision.amount && (
                  <span className="dp-amount">Amount: {formatCurrency(selectedDecision.amount)}</span>
                )}
                <span className={`decision-status-pill ${getDecisionBadgeClass(selectedDecision.status)}`}>
                  Current Status: {getStatusDisplay(selectedDecision.status)}
                </span>
              </div>
              <p className="modal-instruction">
                As Managing Director, authorize or reject this operational request.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-danger"
                onClick={() => handleUpdateApproval(selectedDecision.id, 'REJECTED')}
              >
                Reject Request
              </button>
              <button
                className="btn-primary-green"
                onClick={() => handleUpdateApproval(selectedDecision.id, 'APPROVED')}
              >
                Authorize Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: SUBMIT NEW APPROVAL REQUEST ===== */}
      {isNewApprovalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewApprovalModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Decision / Approval Request</h2>
              <button className="close-btn" onClick={() => setIsNewApprovalModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateApproval} className="modal-form">
              <div className="form-group">
                <label>Decision Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Warehouse Cold Storage Upgrade"
                  value={newApprovalData.title}
                  onChange={(e) => setNewApprovalData({ ...newApprovalData, title: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newApprovalData.category}
                    onChange={(e) => setNewApprovalData({ ...newApprovalData, category: e.target.value })}
                  >
                    <option value="Budget">Budget Approval</option>
                    <option value="Procurement">Procurement</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Financial Review</option>
                    <option value="Asset">Asset Purchase</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25000"
                    value={newApprovalData.amount}
                    onChange={(e) => setNewApprovalData({ ...newApprovalData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsNewApprovalModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-green">
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MdDashboard;
