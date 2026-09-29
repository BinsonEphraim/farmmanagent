import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import { useAuth } from '../../context/AuthContext';
import './AssetList.css';
import LogoutButton from '../common/LogoutButton';

// Preset High-Resolution Equipment Images
const ASSET_IMAGES = {
  tractors: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=300',
  harvesters: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&q=80&w=300',
  implements: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=300',
  vehicles: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&q=80&w=300',
  irrigation: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=300',
  power_equipment: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
  storage_processing: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
  tools: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
  others: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&q=80&w=300',
  default: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=300',
};

const getAssetImage = (asset) => {
  if (asset?.imageUrl) return asset.imageUrl;
  const catKey = (asset?.category || '').toLowerCase().replace(/[\s-]/g, '_');
  return ASSET_IMAGES[catKey] || ASSET_IMAGES.default;
};

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

const formatCategory = (cat) => {
  if (!cat) return 'Others';
  const map = {
    TRACTORS: 'Tractors',
    HARVESTERS: 'Harvesters',
    IMPLEMENTS: 'Implements',
    VEHICLES: 'Vehicles',
    IRRIGATION: 'Irrigation',
    POWER_EQUIPMENT: 'Power Equipment',
    STORAGE_PROCESSING: 'Storage & Processing',
    TOOLS: 'Tools',
    OTHERS: 'Others',
  };
  return map[cat] || cat;
};

const formatStatus = (status) => {
  if (!status) return 'In Use';
  const map = {
    IN_USE: 'In Use',
    UNDER_MAINTENANCE: 'Under Maintenance',
    INACTIVE: 'Inactive',
    DECOMMISSIONED: 'Decommissioned',
  };
  return map[status] || status;
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'IN_USE':
      return 'badge-status-in-use';
    case 'UNDER_MAINTENANCE':
      return 'badge-status-maintenance';
    case 'INACTIVE':
      return 'badge-status-inactive';
    case 'DECOMMISSIONED':
      return 'badge-status-decommissioned';
    default:
      return 'badge-status-in-use';
  }
};

const formatCondition = (condition) => {
  if (!condition) return 'Good';
  const map = {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    FAIR: 'Fair',
    POOR: 'Poor',
    CRITICAL: 'Critical',
  };
  return map[condition] || condition;
};

const getConditionBadgeClass = (condition) => {
  switch (condition) {
    case 'EXCELLENT':
      return 'badge-condition-excellent';
    case 'GOOD':
      return 'badge-condition-good';
    case 'FAIR':
      return 'badge-condition-fair';
    case 'POOR':
      return 'badge-condition-poor';
    case 'CRITICAL':
      return 'badge-condition-critical';
    default:
      return 'badge-condition-good';
  }
};

// Donut Chart Component (pure SVG)
const DonutChart = ({ data, size = 160, strokeWidth = 26, totalLabel = 'Total' }) => {
  const total = data.reduce((acc, cur) => acc + cur.count, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="donut-chart-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart-svg">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((slice, i) => {
            if (slice.count <= 0) return null;
            const ratio = slice.count / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += ratio * circumference;

            return (
              <circle
                key={slice.key || i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color || '#10b981'}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="donut-segment"
              />
            );
          })}
        </g>
      </svg>
      <div className="donut-center-text">
        <span className="donut-center-value">{total}</span>
        <span className="donut-center-label">{totalLabel}</span>
      </div>
    </div>
  );
};

// Interactive Area / Line Chart for Asset Valuation
const ValueAreaChart = ({ data, height = 180 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 580;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.value), 3000000);
  const minVal = 0;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, ...d };
  });

  // Smooth bezier curve path
  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    const cpY2 = point.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="value-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="value-chart-svg">
        <defs>
          <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = paddingTop + chartHeight * (1 - p);
          const valLabel = `$${((maxVal * p) / 1000000).toFixed(1)}M`.replace('.0M', 'M');
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                {p === 0 ? '$0' : valLabel}
              </text>
            </g>
          );
        })}

        {/* Area fill & Path line */}
        <path d={areaD} fill="url(#valGrad)" />
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2.5"
              className="chart-dot"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            {/* Month label on X axis */}
            <text x={p.x} y={height - 8} textAnchor="middle" fontSize="10" fill={p.isCurrent ? '#042c22' : '#94a3b8'} fontWeight={p.isCurrent ? '700' : '500'}>
              {p.month}
            </text>
          </g>
        ))}
      </svg>

      {hoveredIndex !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100}%`,
          }}
        >
          <strong>{points[hoveredIndex].month}</strong>
          <div>{formatCurrency(points[hoveredIndex].value)}</div>
        </div>
      )}
    </div>
  );
};

const AssetList = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [assets, setAssets] = useState([]);
  const [farms, setFarms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    category: 'All Categories',
    location: 'All Locations',
    status: 'All Statuses',
    condition: 'All Conditions',
  });

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    assetCode: '',
    name: '',
    category: 'TRACTORS',
    farmId: '',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    currentValue: '',
    status: 'IN_USE',
    condition: 'GOOD',
    imageUrl: '',
    serialNumber: '',
    modelNumber: '',
    manufacturer: '',
    year: new Date().getFullYear(),
    nextMaintenanceDate: '',
    notes: '',
  });

  // Maintenance Form State
  const [maintFormData, setMaintFormData] = useState({
    title: '',
    type: 'ROUTINE',
    status: 'SCHEDULED',
    scheduledDate: new Date().toISOString().split('T')[0],
    cost: '',
    technician: '',
    description: '',
  });

  // Show Toast Notification
  const showNotification = (msg, type = 'success') => {
    setNotificationMsg({ text: msg, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Fetch Farms for Dropdowns
  const loadFarms = useCallback(async () => {
    try {
      const data = await farmService.getAllFarms({ limit: 100 });
      setFarms(Array.isArray(data) ? data : data.farms || []);
    } catch (err) {
      console.error('Failed to load farms:', err);
    }
  }, []);

  // Fetch Asset Statistics
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await farmService.getAssetStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch asset stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Assets with active filters and pagination
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All Categories') params.category = filters.category;
      if (filters.location && filters.location !== 'All Locations') params.location = filters.location;
      if (filters.status && filters.status !== 'All Statuses') params.status = filters.status;
      if (filters.condition && filters.condition !== 'All Conditions') params.condition = filters.condition;

      const res = await farmService.getAllAssets(params);
      setAssets(res.assets || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      showNotification('Failed to load assets data from database', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Initial Load
  useEffect(() => {
    loadFarms();
    loadStats();
  }, [loadFarms, loadStats]);

  // Load assets when filters or pagination changes
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All Categories',
      location: 'All Locations',
      status: 'All Statuses',
      condition: 'All Conditions',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle Search & Filter Inputs
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedAsset(null);
    setFormData({
      assetCode: '',
      name: '',
      category: 'TRACTORS',
      farmId: farms[0]?.id || '',
      location: farms[0]?.name || 'Green Valley Farm',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      currentValue: '',
      status: 'IN_USE',
      condition: 'GOOD',
      imageUrl: '',
      serialNumber: '',
      modelNumber: '',
      manufacturer: '',
      year: new Date().getFullYear(),
      nextMaintenanceDate: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asset, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setSelectedAsset(asset);
    setFormData({
      assetCode: asset.assetCode || '',
      name: asset.name || '',
      category: asset.category || 'TRACTORS',
      farmId: asset.farmId || '',
      location: asset.location || asset.farm?.name || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      purchasePrice: asset.purchasePrice || '',
      currentValue: asset.currentValue || '',
      status: asset.status || 'IN_USE',
      condition: asset.condition || 'GOOD',
      imageUrl: asset.imageUrl || '',
      serialNumber: asset.serialNumber || '',
      modelNumber: asset.modelNumber || '',
      manufacturer: asset.manufacturer || '',
      year: asset.year || new Date().getFullYear(),
      nextMaintenanceDate: asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toISOString().split('T')[0] : '',
      notes: asset.notes || '',
    });
    setIsAddModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetailModal = (asset) => {
    setSelectedAsset(asset);
    setIsDetailModalOpen(true);
  };

  // Open Maintenance Modal
  const handleOpenMaintenanceModal = (asset, e) => {
    if (e) e.stopPropagation();
    setSelectedAsset(asset);
    setMaintFormData({
      title: '',
      type: 'ROUTINE',
      status: 'SCHEDULED',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cost: '',
      technician: '',
      description: '',
    });
    setIsMaintenanceModalOpen(true);
  };

  // Save Asset Form (Create or Update)
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.farmId) {
        showNotification('Please fill all required fields (*)', 'error');
        return;
      }

      if (isEditing && selectedAsset) {
        await farmService.updateAsset(selectedAsset.id, formData);
        showNotification(`Asset ${formData.name} updated successfully!`);
      } else {
        await farmService.createAsset(formData);
        showNotification(`New asset ${formData.name} created successfully!`);
      }

      setIsAddModalOpen(false);
      loadAssets();
      loadStats();
    } catch (err) {
      console.error('Failed to save asset:', err);
      showNotification(err.response?.data?.error || 'Failed to save asset', 'error');
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (asset, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${asset.name}" (${asset.assetCode})?`)) {
      try {
        await farmService.deleteAsset(asset.id);
        showNotification(`Asset ${asset.name} deleted successfully!`);
        loadAssets();
        loadStats();
        if (isDetailModalOpen) setIsDetailModalOpen(false);
      } catch (err) {
        console.error('Failed to delete asset:', err);
        showNotification(err.response?.data?.error || 'Failed to delete asset', 'error');
      }
    }
  };

  // Save Maintenance Record
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    try {
      await farmService.createAssetMaintenance(selectedAsset.id, maintFormData);
      showNotification(`Maintenance scheduled for ${selectedAsset.name}!`);
      setIsMaintenanceModalOpen(false);
      loadAssets();
      loadStats();
      if (isDetailModalOpen) {
        const fresh = await farmService.getAssetById(selectedAsset.id);
        setSelectedAsset(fresh.asset);
      }
    } catch (err) {
      console.error('Failed to log maintenance:', err);
      showNotification('Failed to save maintenance record', 'error');
    }
  };

  // Export Data to CSV / JSON
  const handleExportData = (format) => {
    if (format === 'csv') {
      const headers = ['Asset ID', 'Name', 'Category', 'Location', 'Purchase Date', 'Value', 'Status', 'Condition', 'Serial No'];
      const rows = assets.map((a) => [
        `"${a.assetCode || ''}"`,
        `"${a.name || ''}"`,
        `"${formatCategory(a.category)}"`,
        `"${a.location || a.farm?.name || ''}"`,
        `"${formatDate(a.purchaseDate)}"`,
        `"${a.currentValue || 0}"`,
        `"${formatStatus(a.status)}"`,
        `"${formatCondition(a.condition)}"`,
        `"${a.serialNumber || ''}"`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `UFMS_Assets_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Exported CSV report successfully!');
    } else if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(assets, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `UFMS_Assets_Export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Exported JSON report successfully!');
    }
    setIsExportModalOpen(false);
  };

  // Calculate distinct category and status counts for Charts
  const categoryChartData = useMemo(() => {
    if (!stats?.byCategory) return [];
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#64748b', '#ec4899', '#eab308'];
    return stats.byCategory.map((c, i) => ({
      ...c,
      color: colors[i % colors.length],
    }));
  }, [stats]);

  const statusChartData = useMemo(() => {
    if (!stats?.byStatus) return [];
    return stats.byStatus;
  }, [stats]);

  return (
    <div className="assets-page-layout">
      {/* ===== NOTIFICATION TOAST ===== */}
      {notificationMsg && (
        <div className={`assets-toast toast-${notificationMsg.type}`}>
          <span>{notificationMsg.text}</span>
          <button onClick={() => setNotificationMsg(null)}>✕</button>
        </div>
      )}

      {/* ===== LEFT SIDEBAR (SLEEK DARK FOREST GREEN) ===== */}
      <aside className={`assets-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
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
            {sidebarOpen && <span>Farm Management</span>}
          </Link>
          <Link to="/crops" className="sidebar-link">
            <span className="sidebar-icon">🌱</span>
            {sidebarOpen && <span>Crop Management</span>}
          </Link>
          <Link to="/animals" className="sidebar-link">
            <span className="sidebar-icon">🐄</span>
            {sidebarOpen && <span>Livestock Management</span>}
          </Link>
          <Link to="/equipment" className="sidebar-link active">
            <span className="sidebar-icon">🔧</span>
            {sidebarOpen && <span>Assets & Equipment</span>}
          </Link>
          <Link to="/inventory" className="sidebar-link">
            <span className="sidebar-icon">📦</span>
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link to="/users" className="sidebar-link">
            <span className="sidebar-icon">👥</span>
            {sidebarOpen && <span>Users & Roles</span>}
          </Link>
          <Link to="/settings" className="sidebar-link">
            <span className="sidebar-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="assets-main-container">
        {/* ===== TOP NAVBAR ===== */}
        <header className="assets-topbar">
          <div className="topbar-left">
            <button className="topbar-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="topbar-title">Assets & Equipment</h1>
          </div>

          <div className="topbar-search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="topbar-search-input"
              placeholder="Search assets, ID, category, location..."
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
              <span className="badge-counter">5</span>
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
        <div className="assets-content-body">
          {/* Header Action Row */}
          <div className="content-header-row">
            <div className="header-titles">
              <h2 className="section-title">Assets & Equipment</h2>
              <p className="section-subtitle">Manage all farm assets and equipment across all locations.</p>
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
              <div className="btn-group-primary">
                <button className="btn-primary" onClick={handleOpenAddModal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New Asset
                </button>
              </div>
            </div>
          </div>

          {/* ===== 6 TOP KPI CARDS ===== */}
          <div className="kpi-cards-grid">
            {/* 1. Total Assets */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.summary?.totalAssets ?? 126}</span>
                <span className="kpi-label">Total Assets</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.assets || '8.7%'} from last month
                </span>
              </div>
            </div>

            {/* 2. In Use */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.summary?.inUse ?? 98}</span>
                <span className="kpi-label">In Use</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.inUse || '7.1%'} from last month
                </span>
              </div>
            </div>

            {/* 3. Under Maintenance */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.summary?.underMaintenance ?? 12}</span>
                <span className="kpi-label">Under Maintenance</span>
                <span className="kpi-trend negative">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.underMaintenance || '-14.3%'} from last month
                </span>
              </div>
            </div>

            {/* 4. Inactive */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.summary?.inactive ?? 16}</span>
                <span className="kpi-label">Inactive</span>
                <span className="kpi-trend negative">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.inactive || '-5.9%'} from last month
                </span>
              </div>
            </div>

            {/* 5. Due for Maintenance */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.summary?.dueForMaintenance ?? 18}</span>
                <span className="kpi-label">Due for Maintenance</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.dueMaintenance || '12.5%'} from last month
                </span>
              </div>
            </div>

            {/* 6. Total Value */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-green-money">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{formatCurrency(stats?.summary?.totalValue ?? 2458750).replace('.00', '')}</span>
                <span className="kpi-label">Total Value</span>
                <span className="kpi-trend positive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {stats?.summary?.growthRates?.totalValue || '9.3%'} from last month
                </span>
              </div>
            </div>
          </div>

          {/* ===== 2-COLUMN MAIN DASHBOARD SECTION ===== */}
          <div className="assets-grid-layout">
            {/* ===== LEFT COLUMN: FILTERS & TABLE ===== */}
            <div className="assets-left-column">
              {/* FILTERS TOOLBAR */}
              <div className="assets-filter-card">
                <div className="filter-input-group search-filter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>

                <div className="filter-select-group">
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="All Categories">All Categories</option>
                    <option value="TRACTORS">Tractors</option>
                    <option value="HARVESTERS">Harvesters</option>
                    <option value="IMPLEMENTS">Implements</option>
                    <option value="VEHICLES">Vehicles</option>
                    <option value="IRRIGATION">Irrigation</option>
                    <option value="POWER_EQUIPMENT">Power Equipment</option>
                    <option value="STORAGE_PROCESSING">Storage & Processing</option>
                    <option value="TOOLS">Tools</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>

                <div className="filter-select-group">
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  >
                    <option value="All Locations">All Locations</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-group">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="IN_USE">In Use</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DECOMMISSIONED">Decommissioned</option>
                  </select>
                </div>

                <div className="filter-select-group">
                  <select
                    value={filters.condition}
                    onChange={(e) => handleFilterChange('condition', e.target.value)}
                  >
                    <option value="All Conditions">All Conditions</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <button className="btn-filter-icon" title="Toggle detailed filters">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filters
                </button>

                <button className="btn-reset-filter" onClick={handleResetFilters} title="Reset all filters">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  Reset
                </button>
              </div>

              {/* ASSETS DATA TABLE */}
              <div className="table-card">
                <div className="table-responsive">
                  <table className="assets-table">
                    <thead>
                      <tr>
                        <th>Asset ID</th>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Purchase Date</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Condition</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="table-empty-cell">
                            <div className="table-spinner"></div>
                            <p>Loading database assets...</p>
                          </td>
                        </tr>
                      ) : assets.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="table-empty-cell">
                            <p>No assets match the selected filter criteria.</p>
                            <button className="btn-reset-filter mt-2" onClick={handleResetFilters}>
                              Reset Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        assets.map((asset) => (
                          <tr key={asset.id} onClick={() => handleOpenDetailModal(asset)} className="table-row-clickable">
                            <td className="col-asset-id">
                              <span className="asset-id-pill">{asset.assetCode || `AST-${String(asset.id).padStart(4, '0')}`}</span>
                            </td>
                            <td className="col-asset-name">
                              <div className="asset-name-cell">
                                <img
                                  src={getAssetImage(asset)}
                                  alt={asset.name}
                                  className="asset-thumb-img"
                                  onError={(e) => {
                                    e.target.src = ASSET_IMAGES.default;
                                  }}
                                />
                                <span className="asset-full-name">{asset.name}</span>
                              </div>
                            </td>
                            <td className="col-category">{formatCategory(asset.category)}</td>
                            <td className="col-location">{asset.location || asset.farm?.name || 'Main Store'}</td>
                            <td className="col-date">{formatDate(asset.purchaseDate)}</td>
                            <td className="col-value">{formatCurrency(asset.currentValue)}</td>
                            <td className="col-status">
                              <span className={`badge-pill ${getStatusBadgeClass(asset.status)}`}>
                                {formatStatus(asset.status)}
                              </span>
                            </td>
                            <td className="col-condition">
                              <span className={`badge-pill ${getConditionBadgeClass(asset.condition)}`}>
                                {formatCondition(asset.condition)}
                              </span>
                            </td>
                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                              <div className="action-buttons-group">
                                <button
                                  className="action-icon-btn"
                                  title="View Details"
                                  onClick={() => handleOpenDetailModal(asset)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </button>
                                <button
                                  className="action-icon-btn"
                                  title="Edit Asset"
                                  onClick={(e) => handleOpenEditModal(asset, e)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="action-icon-btn delete-btn"
                                  title="Delete Asset"
                                  onClick={(e) => handleDeleteAsset(asset, e)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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

                {/* PAGINATION FOOTER */}
                <div className="table-pagination-footer">
                  <div className="pagination-info">
                    Showing {(pagination.page - 1) * pagination.limit + (assets.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total || assets.length)} of{' '}
                    {pagination.total || assets.length} assets
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
                      <option value="50">50 / page</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN: DONUTS, MAINTENANCE, QUICK ACTIONS ===== */}
            <div className="assets-right-column">
              {/* 1. ASSETS BY CATEGORY */}
              <div className="widget-card">
                <h3 className="widget-title">Assets by Category</h3>
                <div className="donut-chart-row">
                  <DonutChart data={categoryChartData} totalLabel="Assets" />
                  <div className="chart-legend-list">
                    {categoryChartData.map((slice) => (
                      <div key={slice.key} className="legend-row">
                        <div className="legend-label-col">
                          <span className="legend-dot" style={{ backgroundColor: slice.color }}></span>
                          <span className="legend-name">{slice.name}</span>
                        </div>
                        <span className="legend-count">
                          {slice.count} ({slice.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. ASSETS BY STATUS */}
              <div className="widget-card">
                <h3 className="widget-title">Assets by Status</h3>
                <div className="donut-chart-row">
                  <DonutChart data={statusChartData} totalLabel="Status" />
                  <div className="chart-legend-list">
                    {statusChartData.map((slice) => (
                      <div key={slice.key} className="legend-row">
                        <div className="legend-label-col">
                          <span className="legend-dot" style={{ backgroundColor: slice.color }}></span>
                          <span className="legend-name">{slice.name}</span>
                        </div>
                        <span className="legend-count">
                          {slice.count} ({slice.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. UPCOMING MAINTENANCE */}
              <div className="widget-card">
                <div className="widget-header-flex">
                  <h3 className="widget-title">Upcoming Maintenance</h3>
                  <button className="widget-action-link" onClick={() => setIsMaintenanceModalOpen(true)}>
                    View all
                  </button>
                </div>
                <div className="upcoming-maint-list">
                  {stats?.upcomingMaintenance && stats.upcomingMaintenance.length > 0 ? (
                    stats.upcomingMaintenance.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="upcoming-maint-item"
                        onClick={() => {
                          const assetObj = assets.find((a) => a.id === item.assetId);
                          if (assetObj) handleOpenDetailModal(assetObj);
                        }}
                      >
                        <img
                          src={item.imageUrl || ASSET_IMAGES.default}
                          alt={item.name}
                          className="maint-thumb-img"
                        />
                        <div className="maint-info">
                          <span className="maint-asset-name">{item.name}</span>
                          <span className="maint-date">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            {formatDate(item.scheduledDate)}
                          </span>
                        </div>
                        <span className={`maint-countdown-badge badge-due-${item.urgency || 'normal'}`}>
                          {item.statusBadge}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="widget-empty-text">No pending maintenance records found.</p>
                  )}
                </div>
              </div>

              {/* 4. QUICK ACTIONS */}
              <div className="widget-card">
                <h3 className="widget-title">Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={handleOpenAddModal}>
                    <div className="qa-icon-wrap green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </div>
                    <span>Add New Asset</span>
                  </button>

                  <button
                    className="quick-action-btn"
                    onClick={() => {
                      if (assets[0]) handleOpenMaintenanceModal(assets[0]);
                    }}
                  >
                    <div className="qa-icon-wrap blue">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                      </svg>
                    </div>
                    <span>Maintenance Schedule</span>
                  </button>

                  <button
                    className="quick-action-btn"
                    onClick={() => handleFilterChange('category', 'TRACTORS')}
                  >
                    <div className="qa-icon-wrap purple">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                    </div>
                    <span>Asset Categories</span>
                  </button>

                  <button className="quick-action-btn" onClick={() => setIsExportModalOpen(true)}>
                    <div className="qa-icon-wrap amber">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 3-COLUMN BOTTOM ROW ===== */}
          <div className="assets-bottom-grid">
            {/* 1. ASSET VALUE OVERVIEW */}
            <div className="bottom-widget-card">
              <div className="bottom-widget-header">
                <div>
                  <h3 className="widget-title">Asset Value Overview</h3>
                </div>
                <select className="bottom-time-select" defaultValue="This Year">
                  <option value="This Year">This Year</option>
                  <option value="Last Year">Last Year</option>
                  <option value="All Time">All Time</option>
                </select>
              </div>

              <div className="value-overview-metrics">
                <div className="vom-item">
                  <span className="vom-label">Total Value</span>
                  <span className="vom-value">{formatCurrency(stats?.summary?.totalValue ?? 2458750).replace('.00', '')}</span>
                  <span className="vom-sub green">↑ 9.3% from last year</span>
                </div>
                <div className="vom-item">
                  <span className="vom-label">Depreciation</span>
                  <span className="vom-value">{formatCurrency(stats?.summary?.totalDepreciation ?? 245875).replace('.00', '')}</span>
                  <span className="vom-sub amber">↑ 5.2% from last year</span>
                </div>
              </div>

              <ValueAreaChart data={stats?.monthlyValuation || []} height={170} />
            </div>

            {/* 2. ASSETS BY CONDITION */}
            <div className="bottom-widget-card">
              <h3 className="widget-title">Assets by Condition</h3>
              <div className="condition-bars-list">
                {stats?.byCondition ? (
                  stats.byCondition.map((cond) => (
                    <div key={cond.key} className="condition-bar-item">
                      <div className="cond-bar-labels">
                        <span className="cond-name">{cond.name}</span>
                        <span className="cond-stat">
                          {cond.count} ({cond.percentage}%)
                        </span>
                      </div>
                      <div className="cond-progress-track">
                        <div
                          className="cond-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, cond.percentage))}%`,
                            backgroundColor: cond.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="table-spinner"></div>
                )}
                <div className="cond-total-footer">
                  <span className="cond-total-label">Total</span>
                  <span className="cond-total-val">{stats?.summary?.totalAssets || 126}</span>
                </div>
              </div>
            </div>

            {/* 3. ASSET LOCATION SUMMARY */}
            <div className="bottom-widget-card">
              <div className="bottom-widget-header">
                <h3 className="widget-title">Asset Location Summary</h3>
                <button
                  className="widget-action-link"
                  onClick={() => handleFilterChange('location', 'All Locations')}
                >
                  See all
                </button>
              </div>

              <div className="location-summary-table-wrap">
                <table className="location-summary-table">
                  <tbody>
                    {stats?.byLocation && stats.byLocation.length > 0 ? (
                      stats.byLocation.map((loc) => (
                        <tr
                          key={loc.name}
                          className="loc-summary-row"
                          onClick={() => handleFilterChange('location', loc.name)}
                        >
                          <td className="loc-name-cell">{loc.name}</td>
                          <td className="loc-count-cell">{loc.count} assets</td>
                          <td className="loc-val-cell">{formatCurrency(loc.value).replace('.00', '')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No location data available.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="loc-summary-total-row">
                      <td>Total</td>
                      <td>{stats?.summary?.totalAssets || 126} assets</td>
                      <td>{formatCurrency(stats?.summary?.totalValue || 2458750).replace('.00', '')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL 1: ADD / EDIT ASSET ===== */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? `Edit Asset: ${selectedAsset?.name}` : 'Add New Farm Asset & Equipment'}</h2>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveAsset} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., John Deere 5075E Tractor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Asset Code (Auto-generated if blank)</label>
                  <input
                    type="text"
                    placeholder="e.g., AST-0021"
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="TRACTORS">Tractors</option>
                    <option value="HARVESTERS">Harvesters</option>
                    <option value="IMPLEMENTS">Implements</option>
                    <option value="VEHICLES">Vehicles</option>
                    <option value="IRRIGATION">Irrigation</option>
                    <option value="POWER_EQUIPMENT">Power Equipment</option>
                    <option value="STORAGE_PROCESSING">Storage & Processing</option>
                    <option value="TOOLS">Tools</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigned Farm / Location *</label>
                  <select
                    required
                    value={formData.farmId}
                    onChange={(e) => {
                      const fId = e.target.value;
                      const selectedFarm = farms.find((f) => String(f.id) === String(fId));
                      setFormData({
                        ...formData,
                        farmId: fId,
                        location: selectedFarm?.name || formData.location,
                      });
                    }}
                  >
                    <option value="">Select a farm location</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Purchase Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="45000"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Current Valuation ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank to match purchase price"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Next Maintenance Date</label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="IN_USE">In Use</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DECOMMISSIONED">Decommissioned</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Manufacturer / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g., John Deere, Toyota, Perkins"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Model Number</label>
                  <input
                    type="text"
                    placeholder="e.g., 5075E 4WD"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g., JD-9948-2023"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Operational Notes & Description</label>
                <textarea
                  rows="3"
                  placeholder="Enter specifications, operational status, attachments, or service instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: ASSET DETAILS VIEW ===== */}
      {isDetailModalOpen && selectedAsset && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content-card modal-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h2>{selectedAsset.name}</h2>
                <span className="asset-id-pill">{selectedAsset.assetCode}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>✕</button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-top-banner">
                <img
                  src={getAssetImage(selectedAsset)}
                  alt={selectedAsset.name}
                  className="detail-large-img"
                />
                <div className="detail-hero-info">
                  <div className="detail-badges-row">
                    <span className={`badge-pill ${getStatusBadgeClass(selectedAsset.status)}`}>
                      {formatStatus(selectedAsset.status)}
                    </span>
                    <span className={`badge-pill ${getConditionBadgeClass(selectedAsset.condition)}`}>
                      Condition: {formatCondition(selectedAsset.condition)}
                    </span>
                    <span className="badge-pill badge-category">
                      {formatCategory(selectedAsset.category)}
                    </span>
                  </div>

                  <div className="detail-specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Current Value</span>
                      <span className="spec-val-highlight">{formatCurrency(selectedAsset.currentValue)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Purchase Price</span>
                      <span className="spec-val">{formatCurrency(selectedAsset.purchasePrice)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Farm Location</span>
                      <span className="spec-val">{selectedAsset.location || selectedAsset.farm?.name}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Purchase Date</span>
                      <span className="spec-val">{formatDate(selectedAsset.purchaseDate)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Manufacturer</span>
                      <span className="spec-val">{selectedAsset.manufacturer || '—'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Model Number</span>
                      <span className="spec-val">{selectedAsset.modelNumber || '—'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Serial Number</span>
                      <span className="spec-val">{selectedAsset.serialNumber || '—'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Next Service Due</span>
                      <span className="spec-val-date">{formatDate(selectedAsset.nextMaintenanceDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAsset.notes && (
                <div className="detail-notes-section">
                  <h4>Notes & Specifications</h4>
                  <p>{selectedAsset.notes}</p>
                </div>
              )}

              <div className="detail-maintenance-section">
                <div className="detail-section-header">
                  <h4>Maintenance History & Logs</h4>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={(e) => handleOpenMaintenanceModal(selectedAsset, e)}
                  >
                    + Schedule Maintenance
                  </button>
                </div>

                {selectedAsset.maintenanceLogs && selectedAsset.maintenanceLogs.length > 0 ? (
                  <div className="maint-logs-timeline">
                    {selectedAsset.maintenanceLogs.map((log) => (
                      <div key={log.id} className="maint-log-row">
                        <div className="maint-log-date-col">
                          <span className="log-date">{formatDate(log.scheduledDate)}</span>
                          <span className={`log-badge badge-${log.status?.toLowerCase()}`}>{log.status}</span>
                        </div>
                        <div className="maint-log-details-col">
                          <span className="log-title">{log.title}</span>
                          <p className="log-desc">{log.description || 'Routine service maintenance check performed.'}</p>
                          <div className="log-meta">
                            <span>Technician: {log.technician || 'Central Depot Mech'}</span>
                            {log.cost > 0 && <span>Cost: {formatCurrency(log.cost)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="widget-empty-text">No prior maintenance logs recorded for this equipment.</p>
                )}
              </div>
            </div>

            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn-danger-outline"
                onClick={(e) => handleDeleteAsset(selectedAsset, e)}
              >
                Delete Asset
              </button>
              <div className="modal-footer-right">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={(e) => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedAsset, e);
                  }}
                >
                  Edit Asset
                </button>
                <button type="button" className="btn-primary" onClick={() => setIsDetailModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 3: SCHEDULE MAINTENANCE ===== */}
      {isMaintenanceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMaintenanceModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Maintenance: {selectedAsset?.name || 'Equipment'}</h2>
              <button className="modal-close-btn" onClick={() => setIsMaintenanceModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group full-width">
                  <label>Maintenance Title / Service Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 500-Hour Hydraulic Oil & Filter Replacement"
                    value={maintFormData.title}
                    onChange={(e) => setMaintFormData({ ...maintFormData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Maintenance Type</label>
                  <select
                    value={maintFormData.type}
                    onChange={(e) => setMaintFormData({ ...maintFormData, type: e.target.value })}
                  >
                    <option value="ROUTINE">Routine Service</option>
                    <option value="REPAIR">Field Repair</option>
                    <option value="OVERHAUL">Full Engine / System Overhaul</option>
                    <option value="INSPECTION">Pre-Season Inspection</option>
                    <option value="EMERGENCY">Emergency Breakdown</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={maintFormData.status}
                    onChange={(e) => setMaintFormData({ ...maintFormData, status: e.target.value })}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={maintFormData.scheduledDate}
                    onChange={(e) => setMaintFormData({ ...maintFormData, scheduledDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Estimated / Actual Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    value={maintFormData.cost}
                    onChange={(e) => setMaintFormData({ ...maintFormData, cost: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Assigned Lead Technician</label>
                  <input
                    type="text"
                    placeholder="e.g., Patrick Banda (Lead Mech)"
                    value={maintFormData.technician}
                    onChange={(e) => setMaintFormData({ ...maintFormData, technician: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Detailed Work Instructions</label>
                  <textarea
                    rows="3"
                    placeholder="Specific items to replace, fluids to flush, diagnostic procedures..."
                    value={maintFormData.description}
                    onChange={(e) => setMaintFormData({ ...maintFormData, description: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsMaintenanceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 4: EXPORT REPORT ===== */}
      {isExportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
          <div className="modal-content-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export Assets Report</h2>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}>✕</button>
            </div>
            <div className="export-modal-body">
              <p>Choose your preferred format to download the live Assets & Equipment dataset.</p>
              <div className="export-options-grid">
                <button className="export-option-card" onClick={() => handleExportData('csv')}>
                  <span className="export-icon">📊</span>
                  <span className="export-title">CSV Spreadsheet</span>
                  <span className="export-desc">Compatible with Microsoft Excel, Google Sheets, and BI tools</span>
                </button>

                <button className="export-option-card" onClick={() => handleExportData('json')}>
                  <span className="export-icon">📄</span>
                  <span className="export-title">JSON Data</span>
                  <span className="export-desc">Full structured database schema export for developers and APIs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetList;
