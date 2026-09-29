import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { financeService } from '../../services/financeService';
import { farmService } from '../../services/farmService';
import { useAuth } from '../../context/AuthContext';
import './FinanceOverview.css';
import LogoutButton from '../common/LogoutButton';

// Formatter Helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

const getCategoryBadgeClass = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('sales') || cat.includes('revenue')) return 'badge-cat-sales';
  if (cat.includes('farm input') || cat.includes('fertilizer') || cat.includes('seed')) return 'badge-cat-inputs';
  if (cat.includes('payroll') || cat.includes('salaries') || cat.includes('wage')) return 'badge-cat-payroll';
  if (cat.includes('fuel') || cat.includes('transport')) return 'badge-cat-fuel';
  if (cat.includes('animal') || cat.includes('vet')) return 'badge-cat-animal';
  if (cat.includes('receivable')) return 'badge-cat-receivable';
  if (cat.includes('utilities') || cat.includes('electric') || cat.includes('water')) return 'badge-cat-utilities';
  return 'badge-cat-other';
};

const getInvoiceBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'badge-inv-paid';
    case 'SENT':
      return 'badge-inv-sent';
    case 'PENDING':
      return 'badge-inv-pending';
    case 'OVERDUE':
      return 'badge-inv-overdue';
    default:
      return 'badge-inv-pending';
  }
};

// Donut Chart Component (pure SVG)
const DonutChart = ({ data, size = 150, strokeWidth = 24 }) => {
  const total = data.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="fin-donut-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="fin-donut-svg">
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
                className="fin-donut-segment"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// Income vs Expenses Dual Line Chart (pure SVG)
const IncomeExpensesChart = ({ data, height = 180 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = 100000;
  const minVal = 0;

  const incomePoints = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.income - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, val: d.income, month: d.month };
  });

  const expensePoints = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.expenses - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, val: d.expenses, month: d.month };
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

  const incomePath = createSmoothPath(incomePoints);
  const expensePath = createSmoothPath(expensePoints);

  return (
    <div className="fin-line-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="fin-chart-svg">
        {/* Grid lines */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, idx) => {
          const y = paddingTop + chartHeight * (1 - p);
          const valLabel = p === 0 ? '$0' : `$${Math.round((maxVal * p) / 1000)}K`;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        <path d={incomePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

        {/* Points */}
        {incomePoints.map((p, i) => (
          <circle
            key={`inc-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 5 : 3.5}
            fill="#ffffff"
            stroke="#10b981"
            strokeWidth="2.5"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {expensePoints.map((p, i) => (
          <circle
            key={`exp-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 5 : 3.5}
            fill="#ffffff"
            stroke="#ef4444"
            strokeWidth="2.5"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* X Axis Labels */}
        {incomePoints.map((p, i) => (
          <text key={`lbl-${i}`} x={p.x} y={height - 8} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
            {p.month}
          </text>
        ))}
      </svg>

      {hoveredIndex !== null && (
        <div
          className="fin-chart-tooltip"
          style={{
            left: `${(incomePoints[hoveredIndex].x / width) * 100}%`,
            top: `${(Math.min(incomePoints[hoveredIndex].y, expensePoints[hoveredIndex].y) / height) * 100}%`,
          }}
        >
          <strong>{data[hoveredIndex].month}</strong>
          <div className="tooltip-inc">Income: {formatCurrency(data[hoveredIndex].income)}</div>
          <div className="tooltip-exp">Expense: {formatCurrency(data[hoveredIndex].expenses)}</div>
        </div>
      )}
    </div>
  );
};

// Cash Flow Summary Grouped Bar Chart + Net Line
const CashFlowChart = ({ data, height = 190 }) => {
  if (!data || data.length === 0) return null;

  const width = 640;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = 100000;
  const minVal = -50000;
  const range = maxVal - minVal;

  const getY = (val) => {
    return paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
  };

  const zeroY = getY(0);

  const barGroupWidth = chartWidth / data.length;
  const singleBarWidth = barGroupWidth * 0.28;

  const netPoints = data.map((d, i) => {
    const x = paddingLeft + (i + 0.5) * barGroupWidth;
    const y = getY(d.netFlow);
    return { x, y, netFlow: d.netFlow, month: d.month };
  });

  const netPath = netPoints.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    const cpY2 = point.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
  }, '');

  return (
    <div className="cash-flow-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="fin-chart-svg">
        {/* Y Axis Grid */}
        {[-50000, -25000, 0, 25000, 50000, 75000, 100000].map((val, idx) => {
          const y = getY(val);
          const label = val === 0 ? '$0' : `${val < 0 ? '-$' : '$'}${Math.abs(val) / 1000}K`;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke={val === 0 ? '#cbd5e1' : '#f1f5f9'} strokeDasharray={val === 0 ? 'none' : '3 3'} />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">
                {label}
              </text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {data.map((d, i) => {
          const groupX = paddingLeft + i * barGroupWidth;
          const inflowX = groupX + barGroupWidth * 0.18;
          const outflowX = groupX + barGroupWidth * 0.52;

          const inflowY = getY(d.inflow);
          const inflowH = Math.max(0, zeroY - inflowY);

          const outflowY = getY(d.outflow);
          const outflowH = Math.max(0, zeroY - outflowY);

          return (
            <g key={`bar-${i}`}>
              {/* Inflow Green Bar */}
              <rect
                x={inflowX}
                y={inflowY}
                width={singleBarWidth}
                height={inflowH}
                fill="#10b981"
                rx="3"
              />
              {/* Outflow Red Bar */}
              <rect
                x={outflowX}
                y={outflowY}
                width={singleBarWidth}
                height={outflowH}
                fill="#ef4444"
                rx="3"
              />
              {/* X Month Label */}
              <text x={groupX + barGroupWidth / 2} y={height - 8} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
                {d.month}
              </text>
            </g>
          );
        })}

        {/* Net Cash Flow Line */}
        <path d={netPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
        {netPoints.map((p, i) => (
          <circle key={`np-${i}`} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.5" />
        ))}
      </svg>
    </div>
  );
};

const FinanceOverview = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    type: 'All Types',
    account: 'All Accounts',
    dateRange: 'All Dates',
  });

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Form States
  const [txFormData, setTxFormData] = useState({
    type: 'EXPENSE',
    description: '',
    category: 'Farm Inputs',
    account: 'Operating Account',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    farmId: '',
    notes: '',
  });

  const [invoiceFormData, setInvoiceFormData] = useState({
    title: '',
    customer: '',
    customerEmail: '',
    amount: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    farmId: '',
    notes: '',
  });

  const [budgetFormData, setBudgetFormData] = useState({
    name: '',
    category: 'Farm Inputs',
    allocatedAmount: '',
    period: '2025 Season A',
    farmId: '',
  });

  // Show Toast
  const showNotification = (msg, type = 'success') => {
    setNotificationMsg({ text: msg, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Load Dashboard Stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await financeService.getFinanceStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load finance stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.type && filters.type !== 'All Types') params.type = filters.type;
      if (filters.account && filters.account !== 'All Accounts') params.account = filters.account;

      const res = await financeService.getAllTransactions(params);
      setTransactions(res.transactions || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      showNotification('Failed to load transactions from database', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Load Accounts and Farms for Selectors
  const loadDropdowns = useCallback(async () => {
    try {
      const [accRes, farmsRes] = await Promise.all([
        financeService.getAllAccounts(),
        farmService.getAllFarms({ limit: 100 }),
      ]);
      setAccounts(accRes.accounts || []);
      setFarms(Array.isArray(farmsRes) ? farmsRes : farmsRes.farms || []);
    } catch (err) {
      console.error('Failed to load dropdowns:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadDropdowns();
  }, [loadStats, loadDropdowns]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Handle Search & Filter Change
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open New Transaction Modal
  const handleOpenTxModal = (type = 'EXPENSE') => {
    setTxFormData({
      type,
      description: '',
      category: type === 'INCOME' ? 'Sales Revenue' : 'Farm Inputs',
      account: type === 'INCOME' ? 'Sales Account' : 'Operating Account',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      farmId: farms[0]?.id || '',
      notes: '',
    });
    setIsTxModalOpen(true);
  };

  // Save Transaction
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    try {
      if (!txFormData.description || !txFormData.amount) {
        showNotification('Please fill in required fields (*)', 'error');
        return;
      }

      await financeService.createTransaction(txFormData);
      showNotification(`Transaction "${txFormData.description}" recorded successfully!`);
      setIsTxModalOpen(false);
      loadTransactions();
      loadStats();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      showNotification(err.response?.data?.error || 'Failed to record transaction', 'error');
    }
  };

  // Save Invoice
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    try {
      if (!invoiceFormData.title || !invoiceFormData.amount || !invoiceFormData.dueDate) {
        showNotification('Please fill in required invoice fields (*)', 'error');
        return;
      }

      await financeService.createInvoice(invoiceFormData);
      showNotification(`Invoice "${invoiceFormData.title}" created successfully!`);
      setIsInvoiceModalOpen(false);
      loadStats();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      showNotification(err.response?.data?.error || 'Failed to create invoice', 'error');
    }
  };

  // Save Budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
      if (!budgetFormData.name || !budgetFormData.allocatedAmount) {
        showNotification('Please fill in required budget fields (*)', 'error');
        return;
      }

      await financeService.createBudget(budgetFormData);
      showNotification(`Budget "${budgetFormData.name}" allocated successfully!`);
      setIsBudgetModalOpen(false);
      loadStats();
    } catch (err) {
      console.error('Failed to allocate budget:', err);
      showNotification(err.response?.data?.error || 'Failed to allocate budget', 'error');
    }
  };

  // Export Data to CSV / JSON
  const handleExportData = (format) => {
    if (format === 'csv') {
      const headers = ['Reference', 'Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Status'];
      const rows = transactions.map((t) => [
        `"${t.reference || ''}"`,
        `"${formatDate(t.date)}"`,
        `"${t.description || ''}"`,
        `"${t.category || ''}"`,
        `"${t.account || ''}"`,
        `"${t.type || ''}"`,
        `"${t.amount || 0}"`,
        `"${t.status || ''}"`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `UFMS_Finance_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Exported CSV financial statement successfully!');
    } else if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `UFMS_Finance_Export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Exported JSON financial data successfully!');
    }
    setIsExportModalOpen(false);
  };

  return (
    <div className="finance-page-layout">
      {/* ===== NOTIFICATION TOAST ===== */}
      {notificationMsg && (
        <div className={`finance-toast toast-${notificationMsg.type}`}>
          <span>{notificationMsg.text}</span>
          <button onClick={() => setNotificationMsg(null)}>✕</button>
        </div>
      )}

      {/* ===== LEFT SIDEBAR (DARK FOREST GREEN) ===== */}
      <aside className={`finance-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
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

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link">
            <span className="sidebar-icon">📊</span>
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link to="/farms" className="sidebar-link">
            <span className="sidebar-icon">🌾</span>
            {sidebarOpen && <span>Farm Overview</span>}
          </Link>
          <Link to="/crops" className="sidebar-link">
            <span className="sidebar-icon">🌱</span>
            {sidebarOpen && <span>Crop Overview</span>}
          </Link>
          <Link to="/animals" className="sidebar-link">
            <span className="sidebar-icon">🐄</span>
            {sidebarOpen && <span>Livestock Overview</span>}
          </Link>

          {/* RESOURCES SECTION */}
          {sidebarOpen && <div className="nav-section-title">RESOURCES</div>}
          <Link to="/inventory" className="sidebar-link">
            <span className="sidebar-icon">📦</span>
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link to="/equipment" className="sidebar-link">
            <span className="sidebar-icon">🔧</span>
            {sidebarOpen && <span>Assets & Equipment</span>}
          </Link>

          <Link to="/finance" className="sidebar-link active">
            <span className="sidebar-icon">💰</span>
            {sidebarOpen && <span>Finance Overview</span>}
          </Link>
          <button className="sidebar-link btn-link" onClick={() => setIsInvoiceModalOpen(true)}>
            <span className="sidebar-icon">📄</span>
            {sidebarOpen && <span>Invoices</span>}
          </button>
          <button className="sidebar-link btn-link" onClick={() => handleOpenTxModal('EXPENSE')}>
            <span className="sidebar-icon">💳</span>
            {sidebarOpen && <span>Payments</span>}
          </button>
          <button className="sidebar-link btn-link" onClick={() => setIsBudgetModalOpen(true)}>
            <span className="sidebar-icon">📊</span>
            {sidebarOpen && <span>Budgets</span>}
          </button>
          <button className="sidebar-link btn-link" onClick={() => handleOpenTxModal('EXPENSE')}>
            <span className="sidebar-icon">👥</span>
            {sidebarOpen && <span>Payroll</span>}
          </button>

          <button className="sidebar-link btn-link" onClick={() => setIsExportModalOpen(true)}>
            <span className="sidebar-icon">📈</span>
            {sidebarOpen && <span>Financial Reports</span>}
          </button>

          <Link to="/users" className="sidebar-link">
            <span className="sidebar-icon">👥</span>
            {sidebarOpen && <span>Users & Roles</span>}
          </Link>
          <Link to="/settings" className="sidebar-link">
            <span className="sidebar-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* User Profile in Sidebar Bottom */}
        {sidebarOpen && (
          <div className="sidebar-bottom-user">
            <img
              src={
                authUser?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  `${authUser?.firstName || 'Admin'} ${authUser?.lastName || 'User'}`
                )}&background=10b981&color=fff&bold=true`
              }
              alt="Admin"
              className="sb-user-avatar"
            />
            <div className="sb-user-info">
              <span className="sb-user-name">{authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Admin User'}</span>
              <span className="sb-user-role">{authUser?.role || 'System Administrator'}</span>
              <span className="sb-user-status">
                <span className="status-indicator"></span> Online
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="finance-main-container">
        {/* ===== TOPBAR ===== */}
        <header className="finance-topbar">
          <div className="topbar-left">
            <button className="topbar-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="topbar-title">Finance Management</h1>
          </div>

          <div className="topbar-search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="topbar-search-input"
              placeholder="Search transactions, invoices, accounts..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="badge-counter">6</span>
            </button>

            <button className="topbar-icon-btn" title="Messages">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span className="badge-counter green">3</span>
            </button>

            <div className="topbar-user-profile">
              <img
                src={
                  authUser?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${authUser?.firstName || 'Admin'} ${authUser?.lastName || 'User'}`
                  )}&background=10b981&color=fff&bold=true`
                }
                alt="User Avatar"
                className="user-avatar"
              />
              <div className="user-details">
                <span className="user-name">{authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Admin User'}</span>
                <span className="user-role">{authUser?.role || 'System Administrator'}</span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* ===== DASHBOARD BODY ===== */}
        <div className="finance-content-body">
          {/* Header Action Row */}
          <div className="content-header-row">
            <div className="header-titles">
              <h2 className="section-title">Finance Overview</h2>
              <p className="section-subtitle">Overview of your farm's financial performance and activities.</p>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => setIsExportModalOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export Report
              </button>
              <button className="btn-primary" onClick={() => handleOpenTxModal('INCOME')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                + New Transaction
              </button>
            </div>
          </div>

          {/* ===== 6 TOP FINANCIAL KPI CARDS ===== */}
          <div className="kpi-cards-grid">
            {/* 1. Total Revenue */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Total Revenue</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.totalRevenue)}</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.revenue || 'No comparison data'}
                </span>
              </div>
            </div>

            {/* 2. Total Expenses */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Total Expenses</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.totalExpenses)}</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.expenses || 'No comparison data'}
                </span>
              </div>
            </div>

            {/* 3. Net Profit */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"></path>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Net Profit</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.netProfit)}</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.netProfit || 'No comparison data'}
                </span>
              </div>
            </div>

            {/* 4. Accounts Receivable */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Accounts Receivable</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.accountsReceivable)}</span>
                <span className="kpi-trend negative">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.receivable || 'No comparison data'}
                </span>
              </div>
            </div>

            {/* 5. Accounts Payable */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-cyan">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Accounts Payable</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.accountsPayable)}</span>
                <span className="kpi-trend negative">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.payable || 'No comparison data'}
                </span>
              </div>
            </div>

            {/* 6. Cash Balance */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-green-wallet">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="M7 15h0M2 10h20"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-label">Cash Balance</span>
                <span className="kpi-value">{formatCurrency(stats?.summary?.cashBalance)}</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.cashBalance || 'No comparison data'}
                </span>
              </div>
            </div>
          </div>

          {/* ===== 2-COLUMN MAIN DASHBOARD SECTION ===== */}
          <div className="finance-grid-layout">
            {/* ===== LEFT COLUMN: RECENT TRANSACTIONS ===== */}
            <div className="finance-left-column">
              <div className="table-card">
                {/* TOOLBAR */}
                <div className="table-header-toolbar">
                  <h3 className="widget-title">Recent Transactions</h3>
                  <div className="toolbar-filters-row">
                    <div className="filter-select-group">
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                      >
                        <option value="All Types">All Types</option>
                        <option value="INCOME">Income</option>
                        <option value="EXPENSE">Expense</option>
                      </select>
                    </div>

                    <div className="filter-select-group">
                      <select
                        value={filters.account}
                        onChange={(e) => handleFilterChange('account', e.target.value)}
                      >
                        <option value="All Accounts">All Accounts</option>
                        <option value="Sales Account">Sales Account</option>
                        <option value="Operating Account">Operating Account</option>
                        <option value="Payroll Account">Payroll Account</option>
                        <option value="Receivable Account">Receivable Account</option>
                        <option value="Petty Cash">Petty Cash</option>
                      </select>
                    </div>

                    <div className="filter-date-badge">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>May 1 - May 31, 2025</span>
                    </div>

                    <button className="btn-filter-icon" title="Detailed filters">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                      </svg>
                      Filters
                    </button>
                  </div>
                </div>

                {/* TRANSACTIONS TABLE */}
                <div className="table-responsive">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="table-empty-cell">
                            <div className="table-spinner"></div>
                            <p>Loading transactions...</p>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="table-empty-cell">
                            <p>No transactions match the selected filters.</p>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="table-row-clickable"
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <td className="col-date-with-icon">
                              <div className="date-icon-wrap">
                                <div className={`tx-type-icon ${tx.type === 'INCOME' ? 'icon-income' : 'icon-expense'}`}>
                                  {tx.type === 'INCOME' ? '📥' : '📤'}
                                </div>
                                <span>{formatDate(tx.date)}</span>
                              </div>
                            </td>
                            <td className="col-ref">
                              <span className="ref-code-pill">{tx.reference}</span>
                            </td>
                            <td className="col-desc">
                              <span className="tx-desc-text">{tx.description}</span>
                            </td>
                            <td className="col-cat">
                              <span className={`cat-pill ${getCategoryBadgeClass(tx.category)}`}>
                                {tx.category}
                              </span>
                            </td>
                            <td className="col-acc">{tx.account}</td>
                            <td className="col-type">
                              <span className={`type-badge ${tx.type === 'INCOME' ? 'type-income' : 'type-expense'}`}>
                                {tx.type === 'INCOME' ? 'Income' : 'Expense'}
                              </span>
                            </td>
                            <td className={`col-amount ${tx.type === 'INCOME' ? 'amt-income' : 'amt-expense'}`}>
                              {tx.type === 'INCOME' ? '+' : '-'}
                              {formatCurrency(Math.abs(tx.amount))}
                            </td>
                            <td className="col-status">
                              <span className="status-badge-completed">{tx.status || 'Completed'}</span>
                            </td>
                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                              <div className="action-buttons-group">
                                <button
                                  className="action-icon-btn"
                                  title="View Details"
                                  onClick={() => {
                                    setSelectedTx(tx);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </button>
                                <button className="action-icon-btn" title="Options">
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                <div className="table-pagination-footer">
                  <div className="pagination-info">
                    Showing {(pagination.page - 1) * pagination.limit + (transactions.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total || transactions.length)} of{' '}
                    {pagination.total || transactions.length} transactions
                  </div>

                  <div className="pagination-controls">
                    <button
                      className="page-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && p - arr[idx - 1] > 1 && <span className="page-ellipsis">...</span>}
                          <button
                            className={`page-btn ${pagination.page === p ? 'active' : ''}`}
                            onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      className="page-btn"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="pagination-per-page">
                    <select
                      value={pagination.limit}
                      onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                    >
                      <option value="5">5 / page</option>
                      <option value="8">8 / page</option>
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN: CHARTS & ACTIONS ===== */}
            <div className="finance-right-column">
              {/* 1. INCOME VS EXPENSES */}
              <div className="widget-card">
                <div className="widget-header-flex">
                  <h3 className="widget-title">Income vs Expenses</h3>
                  <select className="widget-time-select" defaultValue="This Year">
                    <option value="This Year">This Year</option>
                    <option value="Last Year">Last Year</option>
                  </select>
                </div>
                <div className="chart-legend-top">
                  <div className="legend-item">
                    <span className="legend-dot green"></span>
                    <span>Income</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot red"></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <IncomeExpensesChart data={stats?.incomeVsExpenses || []} height={160} />
              </div>

              {/* 2. EXPENSE BY CATEGORY */}
              <div className="widget-card">
                <div className="widget-header-flex">
                  <h3 className="widget-title">Expense by Category</h3>
                  <select className="widget-time-select" defaultValue="This Year">
                    <option value="This Year">This Year</option>
                    <option value="Last Year">Last Year</option>
                  </select>
                </div>
                <div className="donut-chart-row">
                  <DonutChart data={stats?.expenseByCategory || []} size={130} />
                  <div className="chart-legend-list">
                    {stats?.expenseByCategory?.map((cat) => (
                      <div key={cat.name} className="legend-row">
                        <div className="legend-label-col">
                          <span className="legend-dot" style={{ backgroundColor: cat.color }}></span>
                          <span className="legend-name">{cat.name}</span>
                        </div>
                        <span className="legend-count">
                          {formatCurrency(cat.amount).replace('.00', '')} ({cat.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cat-total-footer">
                  <span className="cat-total-label">Total</span>
                  <span className="cat-total-val">{formatCurrency(stats?.summary?.totalExpenses ?? 98450)}</span>
                </div>
              </div>

              {/* 3. QUICK ACTIONS */}
              <div className="widget-card">
                <h3 className="widget-title">Quick Actions</h3>
                <div className="quick-actions-6-grid">
                  <button className="quick-action-item" onClick={() => handleOpenTxModal('INCOME')}>
                    <div className="qa-icon-wrap green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <span>Add Income</span>
                  </button>

                  <button className="quick-action-item" onClick={() => handleOpenTxModal('EXPENSE')}>
                    <div className="qa-icon-wrap red">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                      </svg>
                    </div>
                    <span>Add Expense</span>
                  </button>

                  <button className="quick-action-item" onClick={() => setIsInvoiceModalOpen(true)}>
                    <div className="qa-icon-wrap blue">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <span>Create Invoice</span>
                  </button>

                  <button className="quick-action-item" onClick={() => handleOpenTxModal('EXPENSE')}>
                    <div className="qa-icon-wrap cyan">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                    </div>
                    <span>Record Payment</span>
                  </button>

                  <button className="quick-action-item" onClick={() => setIsBudgetModalOpen(true)}>
                    <div className="qa-icon-wrap purple">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 14 14"></polyline>
                      </svg>
                    </div>
                    <span>Create Budget</span>
                  </button>

                  <button className="quick-action-item" onClick={() => setIsExportModalOpen(true)}>
                    <div className="qa-icon-wrap orange">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 20V10"></path>
                        <path d="M12 20V4"></path>
                        <path d="M6 20v-6"></path>
                      </svg>
                    </div>
                    <span>Financial Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 2-COLUMN BOTTOM ROW: CASH FLOW & INVOICES ===== */}
          <div className="finance-bottom-grid">
            {/* 1. CASH FLOW SUMMARY */}
            <div className="bottom-widget-card cash-flow-widget">
              <div className="bottom-widget-header">
                <h3 className="widget-title">Cash Flow Summary</h3>
                <div className="cash-flow-header-right">
                  <div className="cf-legends">
                    <div className="legend-item">
                      <span className="legend-bar green"></span>
                      <span>Cash Inflows</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-bar red"></span>
                      <span>Cash Outflows</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot blue"></span>
                      <span>Net Cash Flow</span>
                    </div>
                  </div>
                  <select className="bottom-time-select" defaultValue="This Year">
                    <option value="This Year">This Year</option>
                    <option value="Last Year">Last Year</option>
                  </select>
                </div>
              </div>

              <CashFlowChart data={stats?.cashFlowSummary || []} height={190} />

              <div className="cash-flow-summary-metrics">
                <div className="cf-metric-item">
                  <div className="cf-icon-wrap green">📄</div>
                  <div className="cf-metric-data">
                    <span className="cf-label">Net Cash Flow</span>
                    <span className="cf-val">{formatCurrency(stats?.summary?.netCashFlow ?? 86520)}</span>
                    <span className="cf-sub green">↑ 9.8% from last month</span>
                  </div>
                </div>

                <div className="cf-metric-item">
                  <div className="cf-icon-wrap green-money">💲</div>
                  <div className="cf-metric-data">
                    <span className="cf-label">Total Cash Inflows</span>
                    <span className="cf-val">{formatCurrency(stats?.summary?.totalCashInflows ?? 332450)}</span>
                    <span className="cf-sub green">↑ 11.3% from last month</span>
                  </div>
                </div>

                <div className="cf-metric-item">
                  <div className="cf-icon-wrap red">🔻</div>
                  <div className="cf-metric-data">
                    <span className="cf-label">Total Cash Outflows</span>
                    <span className="cf-val">{formatCurrency(stats?.summary?.totalCashOutflows ?? 245930)}</span>
                    <span className="cf-sub green">↑ 7.2% from last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. RECENT INVOICES */}
            <div className="bottom-widget-card invoices-widget">
              <div className="bottom-widget-header">
                <h3 className="widget-title">Recent Invoices</h3>
                <button className="widget-action-link" onClick={() => setIsInvoiceModalOpen(true)}>
                  View all
                </button>
              </div>

              <div className="recent-invoices-list">
                {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                  stats.recentInvoices.map((inv) => (
                    <div key={inv.id} className="invoice-row-item">
                      <div className="inv-icon-wrap">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div className="inv-info-col">
                        <span className="inv-code-text">{inv.invoiceNumber}</span>
                        <span className="inv-title-text">{inv.title}</span>
                        <span className="inv-date-text">{formatDate(inv.issueDate)}</span>
                      </div>
                      <div className="inv-amount-col">
                        <span className="inv-amount-val">{formatCurrency(inv.amount)}</span>
                        <span className={`inv-status-pill ${getInvoiceBadgeClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="widget-empty-text">No invoices found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL 1: NEW TRANSACTION (INCOME / EXPENSE) ===== */}
      {isTxModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTxModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Financial Transaction</h2>
              <button className="modal-close-btn" onClick={() => setIsTxModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveTransaction} className="modal-form">
              <div className="tx-type-toggle-group">
                <button
                  type="button"
                  className={`tx-type-toggle-btn ${txFormData.type === 'INCOME' ? 'active-income' : ''}`}
                  onClick={() => setTxFormData({ ...txFormData, type: 'INCOME', category: 'Sales Revenue', account: 'Sales Account' })}
                >
                  📥 Income
                </button>
                <button
                  type="button"
                  className={`tx-type-toggle-btn ${txFormData.type === 'EXPENSE' ? 'active-expense' : ''}`}
                  onClick={() => setTxFormData({ ...txFormData, type: 'EXPENSE', category: 'Farm Inputs', account: 'Operating Account' })}
                >
                  📤 Expense
                </button>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Description / Particulars *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Fertilizer Purchase - DAP"
                    value={txFormData.description}
                    onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4850.00"
                    value={txFormData.amount}
                    onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={txFormData.category}
                    onChange={(e) => setTxFormData({ ...txFormData, category: e.target.value })}
                  >
                    {txFormData.type === 'INCOME' ? (
                      <>
                        <option value="Sales Revenue">Sales Revenue</option>
                        <option value="Accounts Receivable">Accounts Receivable</option>
                        <option value="Grant & Subsidy">Grant & Subsidy</option>
                        <option value="Other Income">Other Income</option>
                      </>
                    ) : (
                      <>
                        <option value="Farm Inputs">Farm Inputs</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Fuel & Transport">Fuel & Transport</option>
                        <option value="Animal Health">Animal Health</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Other Expenses">Other Expenses</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account *</label>
                  <select
                    value={txFormData.account}
                    onChange={(e) => setTxFormData({ ...txFormData, account: e.target.value })}
                  >
                    <option value="Operating Account">Operating Account</option>
                    <option value="Sales Account">Sales Account</option>
                    <option value="Payroll Account">Payroll Account</option>
                    <option value="Receivable Account">Receivable Account</option>
                    <option value="Petty Cash">Petty Cash</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={txFormData.date}
                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Farm Location</label>
                  <select
                    value={txFormData.farmId}
                    onChange={(e) => setTxFormData({ ...txFormData, farmId: e.target.value })}
                  >
                    <option value="">HQ / Central Account</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes & Invoice Reference (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Reference invoice or receipt numbers, supplier notes, approval codes..."
                  value={txFormData.notes}
                  onChange={(e) => setTxFormData({ ...txFormData, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsTxModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: CREATE INVOICE ===== */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Farm Invoice</h2>
              <button className="modal-close-btn" onClick={() => setIsInvoiceModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveInvoice} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Invoice Title / Goods *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Maize Sales - Green Valley Farm"
                    value={invoiceFormData.title}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Customer / Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., National Food Reserve Agency"
                    value={invoiceFormData.customer}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Customer Email</label>
                  <input
                    type="email"
                    placeholder="accounts@buyer.com"
                    value={invoiceFormData.customerEmail}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerEmail: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Total Invoice Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="12500.00"
                    value={invoiceFormData.amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceFormData.dueDate}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Farm Origin</label>
                  <select
                    value={invoiceFormData.farmId}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, farmId: e.target.value })}
                  >
                    <option value="">Select origin farm</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Terms & Delivery Notes</label>
                <textarea
                  rows="2"
                  placeholder="Enter payment terms, bank account details for wire transfer, consignment notes..."
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 3: CREATE BUDGET ===== */}
      {isBudgetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Allocate Departmental Budget</h2>
              <button className="modal-close-btn" onClick={() => setIsBudgetModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveBudget} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Budget Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Farm Inputs Budget 2025"
                    value={budgetFormData.name}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Expense Category *</label>
                  <select
                    value={budgetFormData.category}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                  >
                    <option value="Farm Inputs">Farm Inputs</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Fuel & Transport">Fuel & Transport</option>
                    <option value="Animal Health">Animal Health</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other Expenses">Other Expenses</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Allocated Cap Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="45000.00"
                    value={budgetFormData.allocatedAmount}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, allocatedAmount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Budget Period</label>
                  <input
                    type="text"
                    placeholder="e.g., 2025 Season A"
                    value={budgetFormData.period}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, period: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsBudgetModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 4: TRANSACTION DETAILS ===== */}
      {isDetailModalOpen && selectedTx && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h2>Transaction Details</h2>
                <span className="ref-code-pill">{selectedTx.reference}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>✕</button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Description</span>
                  <span className="spec-val">{selectedTx.description}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Amount</span>
                  <span className={`spec-val ${selectedTx.type === 'INCOME' ? 'amt-income' : 'amt-expense'}`}>
                    {selectedTx.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(Math.abs(selectedTx.amount))}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className={`cat-pill ${getCategoryBadgeClass(selectedTx.category)}`}>
                    {selectedTx.category}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Account</span>
                  <span className="spec-val">{selectedTx.account}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Date</span>
                  <span className="spec-val">{formatDate(selectedTx.date)}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Status</span>
                  <span className="status-badge-completed">{selectedTx.status || 'Completed'}</span>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="detail-notes-section">
                  <h4>Notes & References</h4>
                  <p>{selectedTx.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn-primary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 5: EXPORT REPORT ===== */}
      {isExportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
          <div className="modal-content-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export Financial Statement</h2>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}>✕</button>
            </div>
            <div className="export-modal-body">
              <p>Download the live ledger transactions and financial report dataset.</p>
              <div className="export-options-grid">
                <button className="export-option-card" onClick={() => handleExportData('csv')}>
                  <span className="export-icon">📊</span>
                  <span className="export-title">CSV Spreadsheet</span>
                  <span className="export-desc">Compatible with Excel, QuickBooks, and accounting tools</span>
                </button>

                <button className="export-option-card" onClick={() => handleExportData('json')}>
                  <span className="export-icon">📄</span>
                  <span className="export-title">JSON Data</span>
                  <span className="export-desc">Raw structured ledger database export</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceOverview;
