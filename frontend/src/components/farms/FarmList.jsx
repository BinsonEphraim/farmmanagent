import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import './FarmList.css';
import LogoutButton from '../common/LogoutButton';

// High-resolution landscape photos tailored for farm visual identification
const FARM_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
];

// Helper to get species icon
const getSpeciesIcon = (type = '') => {
  const lower = type.toLowerCase();
  if (lower.includes('cow') || lower.includes('catt')) return '🐄';
  if (lower.includes('goat')) return '🐐';
  if (lower.includes('sheep')) return '🐑';
  if (lower.includes('pig') || lower.includes('swine')) return '🐖';
  if (lower.includes('poul') || lower.includes('chick') || lower.includes('hen')) return '🐔';
  if (lower.includes('duck')) return '🦆';
  if (lower.includes('fish')) return '🐟';
  if (lower.includes('horse')) return '🐎';
  if (lower.includes('bee')) return '🐝';
  return '🐾';
};

// Species color palette for charts & badges
const SPECIES_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// ============================================
// REACT ERROR BOUNDARY COMPONENT
// ============================================
class FarmErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FarmErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="farms-page-container">
          <div className="farms-error-fallback">
            <div className="error-fallback-card">
              <div className="error-icon-circle">⚠️</div>
              <h2>Farm Management System Error</h2>
              <p>We encountered an unexpected issue while rendering the farm management interface.</p>
              {this.state.error?.message && (
                <div className="error-message-box">
                  <code>{this.state.error.message}</code>
                </div>
              )}
              <div className="error-actions-group">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-error-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Reload Page</span>
                </button>
                <a href="/dashboard" className="btn-error-secondary">
                  <span>Return to Dashboard</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// MAIN FARMLIST VIEW
// ============================================
const FarmListView = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Statistics state
  const [stats, setStats] = useState({
    totalFarms: 0,
    activeFarms: 0,
    inactiveFarms: 0,
    totalLandArea: 0,
    totalRevenue: 0,
    topFarms: [],
    monthlyPerformance: [],
  });

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: 'All Status',
    location: 'All Locations',
    type: 'All Types',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Add / Edit Farm Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    size: '',
    ownerId: '',
    description: '',
  });

  // Add Animal Modal state
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [animalFormData, setAnimalFormData] = useState({
    farmId: '',
    name: '',
    type: 'Cattle',
    breed: '',
    age: '',
    healthStatus: 'HEALTHY',
  });

  // Show transient toast notification
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Determine farm type dynamically based on real crops and animals in DB
  const determineFarmType = (farm) => {
    const hasCrops = farm.crops && farm.crops.length > 0;
    const hasAnimals = farm.animals && farm.animals.length > 0;
    if (hasCrops && hasAnimals) return 'Mixed Farm';
    if (hasAnimals) return 'Livestock Farm';
    if (hasCrops) return 'Crop Farm';
    return 'General Farm';
  };

  // Fetch real farms from backend
  const fetchFarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmService.getAllFarms({ search: filters.search });
      if (Array.isArray(data)) {
        const mappedFarms = data.map((f, idx) => {
          const farmType = determineFarmType(f);
          const hasActivity = (f.crops && f.crops.length > 0) || (f.animals && f.animals.length > 0);
          const farmRevenue = (f.revenues || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const managerName = f.owner ? `${f.owner.firstName} ${f.owner.lastName}`.trim() : 'Unassigned';
          const managerEmail = f.owner?.email || 'N/A';
          const establishedDate = f.createdAt
            ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';
          const cropsList = f.crops && f.crops.length > 0
            ? f.crops.map((c) => c.name).join(', ')
            : 'No crops registered';
          const animalsList = f.animals && f.animals.length > 0
            ? f.animals.map((a) => `${a.name} (${a.type})`).join(', ')
            : 'No livestock registered';

          return {
            id: f.id,
            name: f.name,
            location: f.location || 'Not Specified',
            farmType,
            ownerId: f.ownerId || f.owner?.id,
            manager: managerName,
            managerEmail: managerEmail,
            managerAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(managerName)}&background=047857&color=fff&bold=true`,
            size: f.size ? Number(f.size) : 0,
            status: hasActivity || farmRevenue > 0 ? 'Active' : 'Inactive',
            revenue: farmRevenue,
            established: establishedDate,
            mainCrops: cropsList,
            animalsSummary: animalsList,
            cropsCount: f.crops?.length || f._count?.crops || 0,
            animalsCount: f.animals?.length || f._count?.animals || 0,
            inventoryCount: f.inventory?.length || f._count?.inventory || 0,
            rawAnimals: f.animals || [],
            rawCrops: f.crops || [],
            description: f.description || 'No description provided.',
            image: FARM_HERO_IMAGES[idx % FARM_HERO_IMAGES.length],
          };
        });

        setFarms(mappedFarms);
        if (mappedFarms.length > 0) {
          setSelectedFarm((prev) => (prev ? mappedFarms.find((m) => m.id === prev.id) || mappedFarms[0] : mappedFarms[0]));
        } else {
          setSelectedFarm(null);
        }
      }
    } catch (err) {
      console.error('Error fetching real farms:', err);
      setError(err.response?.data?.error || 'Failed to load farms from database');
    } finally {
      setLoading(false);
    }
  }, [filters.search]);

  // Fetch real farm stats & analytics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await farmService.getFarmStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching farm stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch all managers/users for dropdown assignment
  const fetchManagers = useCallback(async () => {
    try {
      const data = await userService.getAllUsers({ limit: 100 });
      if (data && data.users) {
        setManagers(data.users);
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
    fetchStats();
    fetchManagers();
  }, [fetchFarms, fetchStats, fetchManagers]);

  // ============================================
  // DYNAMIC FILTER OPTIONS
  // ============================================
  const locationOptions = useMemo(() => {
    const locs = Array.from(new Set(farms.map((f) => f.location).filter(Boolean)));
    return ['All Locations', ...locs];
  }, [farms]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(farms.map((f) => f.status).filter(Boolean)));
    return ['All Status', ...statuses];
  }, [farms]);

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(farms.map((f) => f.farmType).filter(Boolean)));
    return ['All Types', ...types];
  }, [farms]);

  // Filtered Farms
  const filteredFarms = useMemo(() => {
    return farms.filter((farm) => {
      if (filters.status !== 'All Status') {
        if (farm.status.toLowerCase() !== filters.status.toLowerCase()) return false;
      }
      if (filters.location !== 'All Locations') {
        if (farm.location !== filters.location) return false;
      }
      if (filters.type !== 'All Types') {
        if (farm.farmType !== filters.type) return false;
      }
      return true;
    });
  }, [farms, filters]);

  // Safe pagination
  const totalPages = Math.max(1, Math.ceil(filteredFarms.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedFarms = useMemo(() => {
    return filteredFarms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFarms, startIndex, itemsPerPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ============================================
  // DYNAMIC SPECIES DISTRIBUTION CALCULATION
  // ============================================
  const speciesDistribution = useMemo(() => {
    const targetAnimals = selectedFarm
      ? (selectedFarm.rawAnimals || [])
      : farms.flatMap((f) => f.rawAnimals || []);

    if (!targetAnimals.length) return [];

    const counts = {};
    targetAnimals.forEach((a) => {
      const type = a.type ? a.type.trim() : 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });

    const total = targetAnimals.length;
    return Object.entries(counts)
      .map(([type, count], index) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100),
        color: SPECIES_COLORS[index % SPECIES_COLORS.length],
        icon: getSpeciesIcon(type),
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedFarm, farms]);

  // Total livestock count
  const totalLivestockCount = useMemo(() => {
    return selectedFarm
      ? (selectedFarm.rawAnimals || []).length
      : farms.reduce((sum, f) => sum + (f.rawAnimals?.length || 0), 0);
  }, [selectedFarm, farms]);

  // ============================================
  // HANDLERS FOR FARMS
  // ============================================
  const handleOpenAddModal = () => {
    setEditingFarm(null);
    setFormData({
      name: '',
      location: '',
      size: '',
      ownerId: authUser?.id || (managers.length > 0 ? managers[0].id : ''),
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (farm, e) => {
    e.stopPropagation();
    setEditingFarm(farm);
    setFormData({
      name: farm.name,
      location: farm.location,
      size: farm.size ? String(farm.size) : '',
      ownerId: farm.ownerId || '',
      description: farm.description || '',
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        location: formData.location,
        size: parseFloat(formData.size) || 0,
        description: formData.description,
        ownerId: formData.ownerId ? parseInt(formData.ownerId, 10) : undefined,
      };

      if (editingFarm) {
        await farmService.updateFarm(editingFarm.id, payload);
        showToast(`Farm "${formData.name}" updated successfully!`);
      } else {
        await farmService.createFarm(payload);
        showToast(`Farm "${formData.name}" created successfully!`);
      }
      setShowModal(false);
      fetchFarms();
      fetchStats();
    } catch (err) {
      console.error('Save farm error:', err);
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDeleteFarm = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this farm? All associated crops, animals, and records will be deleted.')) return;
    try {
      await farmService.deleteFarm(id);
      showToast('Farm deleted successfully.');
      fetchFarms();
      fetchStats();
    } catch (err) {
      console.error('Delete farm error:', err);
      alert(err.response?.data?.error || 'Failed to delete farm');
    }
  };

  // ============================================
  // HANDLERS FOR ANIMALS
  // ============================================
  const handleOpenAddAnimalModal = (defaultFarmId = null) => {
    const targetId = defaultFarmId || (selectedFarm ? selectedFarm.id : (farms.length > 0 ? farms[0].id : ''));
    setAnimalFormData({
      farmId: targetId ? String(targetId) : '',
      name: '',
      type: 'Cattle',
      breed: '',
      age: '',
      healthStatus: 'HEALTHY',
    });
    setShowAnimalModal(true);
  };

  const handleAnimalSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!animalFormData.farmId) {
        alert('Please select a farm to assign this animal to.');
        return;
      }
      const payload = {
        farmId: parseInt(animalFormData.farmId, 10),
        name: animalFormData.name,
        type: animalFormData.type,
        breed: animalFormData.breed,
        age: animalFormData.age ? parseInt(animalFormData.age, 10) : null,
        healthStatus: animalFormData.healthStatus,
      };

      await farmService.createAnimal(payload);
      showToast(`Livestock "${animalFormData.name}" added successfully!`);
      setShowAnimalModal(false);
      fetchFarms();
      fetchStats();
    } catch (err) {
      console.error('Save animal error:', err);
      alert(err.response?.data?.error || 'Failed to add animal');
    }
  };

  // CSV Export from live data
  const handleExportCSV = () => {
    if (farms.length === 0) {
      alert('No farm data to export');
      return;
    }
    const headers = ['ID', 'Farm Name', 'Location', 'Farm Type', 'Manager', 'Manager Email', 'Size (ha)', 'Status', 'Revenue (MTD)'];
    const rows = farms.map((f) => [
      f.id,
      `"${f.name}"`,
      `"${f.location}"`,
      `"${f.farmType}"`,
      `"${f.manager}"`,
      `"${f.managerEmail}"`,
      f.size,
      f.status,
      `"$${f.revenue.toLocaleString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `ufms_farms_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for farm type styling badge
  const getTypeBadgeClass = (type) => {
    if (!type) return 'default';
    const lower = type.toLowerCase();
    if (lower.includes('crop')) return 'crop';
    if (lower.includes('mixed')) return 'mixed';
    if (lower.includes('live')) return 'livestock';
    return 'default';
  };

  // Authenticated user dynamic profile
  const userFullName = authUser
    ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || authUser.email || 'User'
    : 'System Admin';
  const userRole = typeof authUser?.role === 'object' ? authUser.role.name : authUser?.role || 'Administrator';
  const authUserAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=047857&color=fff&bold=true`;

  const hasActiveFilters = filters.status !== 'All Status' || filters.location !== 'All Locations' || filters.type !== 'All Types' || filters.search !== '';

  return (
    <div className="farms-page-container">
      {/* ===== NOTIFICATION TOAST ===== */}
      {notification && (
        <div className={`farms-toast ${notification.type}`}>
          <span className="toast-icon">{notification.type === 'success' ? '✓' : 'ℹ️'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className={`farms-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="farms-sidebar-brand">
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

        <div className="farms-sidebar-nav">
          <div className="nav-group">
            <Link to="/dashboard" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </div>
            </Link>
            <Link to="/users" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">👥</span>
                <span>Users & Roles</span>
              </div>
            </Link>
            <Link to="/farms" className="nav-link active">
              <div className="nav-link-content">
                <span className="nav-icon">🌾</span>
                <span>Farms</span>
              </div>
            </Link>
            <Link to="/crops" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🌱</span>
                <span>Crop Management</span>
              </div>
            </Link>
            <Link to="/animals" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🐄</span>
                <span>Livestock</span>
              </div>
            </Link>
            <Link to="/inventory" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">📦</span>
                <span>Inventory</span>
              </div>
            </Link>
            <Link to="/equipment" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🔧</span>
                <span>Assets & Equipment</span>
              </div>
            </Link>
            <Link to="/finance" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">💰</span>
                <span>Finance</span>
              </div>
            </Link>
            <Link to="/reports" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">📈</span>
                <span>Reports</span>
              </div>
            </Link>
            <Link to="/notifications" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🔔</span>
                <span>Notifications</span>
              </div>
            </Link>
            <Link to="/audit" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">📋</span>
                <span>Audit Logs</span>
              </div>
            </Link>
            <Link to="/settings" className="nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">⚙️</span>
                <span>Settings</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="user-card-info">
            <div className="user-card-avatar">
              <img src={authUserAvatar} alt={userFullName} className="avatar-img" />
              <span className="online-dot"></span>
            </div>
            <div className="user-card-text">
              <span className="user-card-name">{userFullName}</span>
              <span className="user-card-role">{userRole}</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="farms-main-area">
        {/* TOP NAVBAR */}
        <header className="farms-top-navbar">
          <div className="top-nav-left">
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button className="btn-top-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back</span>
            </button>
            <h2 className="top-nav-title">Farm Management</h2>
          </div>

          <div className="top-nav-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Search farms by name, location, manager..."
              className="search-input-field"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            {filters.search && (
              <button className="btn-clear-search" onClick={() => setFilters({ ...filters, search: '' })} title="Clear search">
                ✕
              </button>
            )}
          </div>

          <div className="top-nav-right">
            <div className="top-user-profile">
              <img src={authUserAvatar} alt={userFullName} className="top-avatar" />
              <div className="top-user-text">
                <span className="top-user-name">{userFullName}</span>
                <span className="top-user-role">{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="farms-content-wrapper">
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
                <h1>Farm Management</h1>
              </div>
              <p>Manage all registered farm enterprises, crop plots, livestock, managers and performance records.</p>
            </div>

            <div className="header-actions-group">
              <button onClick={() => handleOpenAddAnimalModal()} className="btn-add-animal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Add Animal</span>
              </button>
              <button onClick={handleOpenAddModal} className="btn-add-farm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Add New Farm</span>
              </button>
            </div>
          </div>

          {/* 5 REAL STAT CARDS ROW */}
          <div className="stats-cards-grid">
            <div className="stat-card-item">
              <div className="stat-icon-wrapper mint">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.totalFarms}</span>
                <span className="stat-label-text">Total Farms</span>
                <span className="stat-trend-badge up">Live in database</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" /><path d="M11 20v-8a4 4 0 0 1 4-4h4" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.activeFarms}</span>
                <span className="stat-label-text">Active Farms</span>
                <span className="stat-trend-badge up">Active operations</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.inactiveFarms}</span>
                <span className="stat-label-text">Inactive Farms</span>
                <span className="stat-trend-badge down">Inactive status</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `${Number(stats.totalLandArea).toLocaleString()} ha`}</span>
                <span className="stat-label-text">Total Land Area</span>
                <span className="stat-trend-badge up">Total size</span>
              </div>
            </div>

            <div className="stat-card-item">
              <div className="stat-icon-wrapper pink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 6v2m0 8v2" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `$${Number(stats.totalRevenue).toLocaleString()}`}</span>
                <span className="stat-label-text">Total Revenue (MTD)</span>
                <span className="stat-trend-badge up">Live revenues</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN MAIN SECTION */}
          <div className="farms-main-grid">
            {/* LEFT COLUMN: TABLE & FILTERS */}
            <div className="table-section-card">
              {/* FILTERS TOOLBAR */}
              <div className="filters-toolbar">
                <div className="filter-left-group">
                  <div className="filter-select-wrapper">
                    <label className="filter-field-label">Status</label>
                    <select
                      className="filter-select"
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-select-wrapper">
                    <label className="filter-field-label">Location</label>
                    <select
                      className="filter-select"
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    >
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-select-wrapper">
                    <label className="filter-field-label">Type</label>
                    <select
                      className="filter-select"
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    >
                      {typeOptions.map((typ) => (
                        <option key={typ} value={typ}>
                          {typ}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      className="btn-reset-filters"
                      onClick={() => setFilters({ search: '', status: 'All Status', location: 'All Locations', type: 'All Types' })}
                      title="Reset all filters"
                    >
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>

                <div className="filter-right-group">
                  <button className="btn-export" onClick={handleExportCSV} title="Export CSV">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="table-responsive">
                <table className="farms-data-table">
                  <thead>
                    <tr>
                      <th>Farm Name</th>
                      <th>Location</th>
                      <th>Farm Type</th>
                      <th>Manager</th>
                      <th>Size (ha)</th>
                      <th>Status</th>
                      <th>Revenue (MTD)</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          <div className="table-loading-spinner">
                            <span className="spinner-dot"></span>
                            <span>Loading farms from database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#ef4444' }}>
                          {error}
                        </td>
                      </tr>
                    ) : paginatedFarms.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                          No farms found matching filter criteria
                        </td>
                      </tr>
                    ) : (
                      paginatedFarms.map((farm) => {
                        const isSelected = selectedFarm?.id === farm.id;
                        return (
                          <tr
                            key={farm.id}
                            className={isSelected ? 'selected' : ''}
                            onClick={() => setSelectedFarm(farm)}
                          >
                            <td>
                              <div className="farm-name-cell">
                                <img src={farm.image} alt={farm.name} className="farm-thumb-img" />
                                <div className="farm-name-wrapper">
                                  <span className="farm-name-text">{farm.name}</span>
                                  <span className="farm-sub-counts">
                                    🌱 {farm.cropsCount} crops • 🐄 {farm.animalsCount} animals
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="farm-location-text">{farm.location}</span>
                            </td>
                            <td>
                              <span className={`farm-type-badge ${getTypeBadgeClass(farm.farmType)}`}>
                                {farm.farmType}
                              </span>
                            </td>
                            <td>
                              <div className="manager-cell">
                                <img
                                  src={farm.managerAvatar}
                                  alt={farm.manager}
                                  className="manager-avatar-sm"
                                />
                                <div className="manager-info-mini">
                                  <span className="manager-name">{farm.manager}</span>
                                  {farm.managerEmail !== 'N/A' && (
                                    <span className="manager-sub-email">{farm.managerEmail}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="farm-size-text">{farm.size.toLocaleString()} ha</span>
                            </td>
                            <td>
                              <span className={`status-pill ${farm.status.toLowerCase()}`}>
                                {farm.status}
                              </span>
                            </td>
                            <td>
                              <span className="revenue-text">
                                ${farm.revenue.toLocaleString()}
                              </span>
                            </td>
                            <td>
                              <div className="actions-cell-group" style={{ justifyContent: 'center' }}>
                                <button
                                  className="btn-row-action"
                                  title="Add animal to this farm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddAnimalModal(farm.id);
                                  }}
                                >
                                  🐄
                                </button>
                                <button
                                  className="btn-row-action"
                                  title="View details"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFarm(farm);
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                <button
                                  className="btn-row-action"
                                  title="Edit farm"
                                  onClick={(e) => handleOpenEditModal(farm, e)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                </button>
                                <button
                                  className="btn-row-action"
                                  title="Delete farm"
                                  onClick={(e) => handleDeleteFarm(farm.id, e)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="table-pagination-footer">
                <span className="pagination-showing-text">
                  Showing {filteredFarms.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredFarms.length)} of {filteredFarms.length} farms
                </span>

                <div className="pagination-controls-group">
                  <button
                    className="btn-page-step"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First page"
                  >
                    «
                  </button>
                  <button
                    className="btn-page-step"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - safeCurrentPage) <= 2 || p === 1 || p === totalPages)
                    .map((pageNum, idx, arr) => (
                      <React.Fragment key={pageNum}>
                        {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span className="pagination-ellipsis">...</span>}
                        <button
                          className={`btn-page-step ${safeCurrentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    className="btn-page-step"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next page"
                  >
                    ›
                  </button>
                  <button
                    className="btn-page-step"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last page"
                  >
                    »
                  </button>

                  <select
                    className="page-limit-select"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: FARM OVERVIEW CARD */}
            {selectedFarm && (
              <div className="farm-overview-card">
                <div className="overview-card-header">
                  <h3 className="overview-card-title">Farm Overview</h3>
                  <span className={`status-pill ${selectedFarm.status.toLowerCase()}`}>
                    {selectedFarm.status}
                  </span>
                </div>

                <img
                  src={selectedFarm.image}
                  alt={selectedFarm.name}
                  className="overview-hero-image"
                />

                <div className="overview-title-block">
                  <h2 className="overview-farm-name">{selectedFarm.name}</h2>
                  <div className="overview-badge-row">
                    <span className={`farm-type-badge ${getTypeBadgeClass(selectedFarm.farmType)}`}>
                      {selectedFarm.farmType}
                    </span>
                    <button
                      className="btn-quick-add-animal"
                      onClick={() => handleOpenAddAnimalModal(selectedFarm.id)}
                      title="Add livestock to this farm"
                    >
                      + Add Animal
                    </button>
                  </div>
                </div>

                <div className="overview-details-list">
                  <div className="overview-detail-row">
                    <span className="detail-row-icon">📍</span>
                    <span className="detail-row-label">Location</span>
                    <span className="detail-row-value">{selectedFarm.location}</span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">👤</span>
                    <span className="detail-row-label">Farm Manager</span>
                    <div className="detail-row-value">
                      <span>{selectedFarm.manager}</span>
                      {selectedFarm.managerEmail !== 'N/A' && (
                        <span className="manager-phone-sub">✉️ {selectedFarm.managerEmail}</span>
                      )}
                    </div>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">📐</span>
                    <span className="detail-row-label">Land Size</span>
                    <span className="detail-row-value">{selectedFarm.size.toLocaleString()} Hectares</span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">📅</span>
                    <span className="detail-row-label">Established</span>
                    <span className="detail-row-value">{selectedFarm.established}</span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">🌱</span>
                    <span className="detail-row-label">Crops ({selectedFarm.cropsCount})</span>
                    <span className="detail-row-value">{selectedFarm.mainCrops}</span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">🐄</span>
                    <span className="detail-row-label">Livestock ({selectedFarm.animalsCount})</span>
                    <span className="detail-row-value">{selectedFarm.animalsSummary}</span>
                  </div>

                  {/* SPECIES DISTRIBUTION SECTION */}
                  <div className="species-distribution-block">
                    <div className="species-dist-header">
                      <span className="species-dist-title">📊 Species Distribution ({totalLivestockCount})</span>
                      <button
                        className="species-add-link"
                        onClick={() => handleOpenAddAnimalModal(selectedFarm.id)}
                      >
                        + Add
                      </button>
                    </div>

                    {speciesDistribution.length > 0 ? (
                      <>
                        {/* Multi-segment distribution progress bar */}
                        <div className="species-bar-container">
                          {speciesDistribution.map((sp) => (
                            <div
                              key={sp.type}
                              className="species-bar-segment"
                              style={{ width: `${sp.percentage}%`, backgroundColor: sp.color }}
                              title={`${sp.type}: ${sp.count} animals (${sp.percentage}%)`}
                            />
                          ))}
                        </div>

                        {/* Species grid items */}
                        <div className="species-tags-grid">
                          {speciesDistribution.map((sp) => (
                            <div key={sp.type} className="species-tag-card">
                              <div className="species-tag-icon-wrap" style={{ backgroundColor: `${sp.color}15`, color: sp.color }}>
                                <span>{sp.icon}</span>
                              </div>
                              <div className="species-tag-info">
                                <span className="species-tag-type">{sp.type}</span>
                                <span className="species-tag-count">{sp.count} head ({sp.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="species-empty-box">
                        <p>No livestock recorded for this farm yet.</p>
                        <button
                          className="btn-species-empty-add"
                          onClick={() => handleOpenAddAnimalModal(selectedFarm.id)}
                        >
                          + Add First Livestock
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">📦</span>
                    <span className="detail-row-label">Inventory</span>
                    <span className="detail-row-value">{selectedFarm.inventoryCount} items</span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">💰</span>
                    <span className="detail-row-label">Total Revenue</span>
                    <span className="detail-row-value" style={{ color: '#059669', fontWeight: '700' }}>
                      ${selectedFarm.revenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="overview-detail-row">
                    <span className="detail-row-icon">📝</span>
                    <span className="detail-row-label">Description</span>
                    <span className="detail-row-value overview-description-text">{selectedFarm.description}</span>
                  </div>
                </div>

                <Link to={`/farms/${selectedFarm.id}`} className="btn-view-full-details">
                  View Full Details & Operations
                </Link>
              </div>
            )}
          </div>

          {/* BOTTOM ROW: PERFORMANCE & TOP FARMS */}
          <div className="farms-bottom-grid">
            {/* PERFORMANCE OVERVIEW CHART CARD */}
            <div className="performance-card">
              <div className="card-title-row">
                <h3>Farm Performance Overview</h3>
                <div className="chart-legend-group">
                  <div className="legend-indicator">
                    <span className="legend-dot green"></span>
                    <span>Revenue (USD)</span>
                  </div>
                  <div className="legend-indicator">
                    <span className="legend-dot blue"></span>
                    <span>Active Production</span>
                  </div>
                </div>
              </div>

              {/* Dual-Axis SVG Chart */}
              <div className="chart-container-box">
                <svg className="performance-svg-chart" viewBox="0 0 650 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="50" y1="20" x2="600" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="60" x2="600" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="170" x2="600" y2="170" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Left Y Axis Labels ($ Revenue) */}
                  <text x="10" y="24" fill="#94a3b8" fontSize="10" fontWeight="600">High</text>
                  <text x="10" y="64" fill="#94a3b8" fontSize="10" fontWeight="600">Med+</text>
                  <text x="10" y="104" fill="#94a3b8" fontSize="10" fontWeight="600">Med</text>
                  <text x="10" y="144" fill="#94a3b8" fontSize="10" fontWeight="600">Low</text>
                  <text x="32" y="174" fill="#94a3b8" fontSize="10" fontWeight="600">$0</text>

                  {/* Monthly Revenue Bars (Green) from Live Data */}
                  {(stats.monthlyPerformance || []).map((m, idx) => {
                    const barX = 74 + idx * 46;
                    return (
                      <rect
                        key={m.month}
                        x={barX}
                        y={170 - (m.barHeight || 0)}
                        width="10"
                        height={m.barHeight || 0}
                        rx="3"
                        fill="#10b981"
                      />
                    );
                  })}

                  {/* Land Area / Operations Line (Blue) */}
                  {stats.monthlyPerformance && stats.monthlyPerformance.length > 0 && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        points={stats.monthlyPerformance.map((m, idx) => `${79 + idx * 46},${m.lineY}`).join(' ')}
                      />
                      {stats.monthlyPerformance.map((m, idx) => (
                        <circle
                          key={m.month}
                          cx={79 + idx * 46}
                          cy={m.lineY}
                          r="4"
                          fill="#0284c7"
                        />
                      ))}
                    </>
                  )}

                  {/* X Axis Months */}
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                    <text
                      key={month}
                      x={70 + idx * 46}
                      y="190"
                      fill="#64748b"
                      fontSize="11"
                    >
                      {month}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* TOP PERFORMING FARMS CARD */}
            <div className="top-farms-card">
              <div className="card-title-row">
                <h3>Top Performing Farms <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>(Live Records)</span></h3>
              </div>

              <div className="top-farms-list">
                {stats.topFarms && stats.topFarms.length > 0 ? (
                  stats.topFarms.map((item) => (
                    <div key={item.rank} className="top-farm-item-row">
                      <div className="top-farm-rank-name">
                        <span className="rank-badge">{item.rank}</span>
                        <span className="top-farm-title">{item.name}</span>
                      </div>
                      <span className="top-farm-revenue">{item.formattedRevenue}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                    No performance data available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== ADD / EDIT FARM MODAL ===== */}
      {showModal && (
        <div className="farm-modal-overlay">
          <div className="farm-modal-content">
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            <h2 className="farm-form-title">
              {editingFarm ? '✏️ Edit Farm Details' : '🌾 Add New Farm'}
            </h2>
            <p className="farm-form-sub">
              {editingFarm ? 'Update farm enterprise records in the database.' : 'Enter new farm details to save directly into the database.'}
            </p>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group-field">
                <label>Farm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Valley Farm"
                  className="form-input-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-grid-row">
                <div className="form-group-field">
                  <label>Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lilongwe, Malawi"
                    className="form-input-control"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-group-field">
                  <label>Size (Hectares) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1250"
                    className="form-input-control"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label>Assigned Manager *</label>
                <select
                  className="form-input-control"
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  required
                >
                  <option value="">Select Manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.email}) - {m.role?.name || 'User'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-field">
                <label>Description</label>
                <textarea
                  rows="3"
                  placeholder="Enter farm description and objectives..."
                  className="form-input-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div className="form-actions-bar">
                <button type="button" className="btn-form-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-form-submit">
                  {editingFarm ? 'Update Farm' : 'Create Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD ANIMAL MODAL ===== */}
      {showAnimalModal && (
        <div className="farm-modal-overlay">
          <div className="farm-modal-content">
            <button className="modal-close-btn" onClick={() => setShowAnimalModal(false)}>✕</button>
            <h2 className="farm-form-title">🐄 Add New Livestock / Animal</h2>
            <p className="farm-form-sub">Register livestock or animal batch directly to a farm.</p>

            <form onSubmit={handleAnimalSubmit}>
              <div className="form-group-field">
                <label>Assign to Farm *</label>
                <select
                  className="form-input-control"
                  value={animalFormData.farmId}
                  onChange={(e) => setAnimalFormData({ ...animalFormData, farmId: e.target.value })}
                  required
                >
                  <option value="">Select Farm</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-row">
                <div className="form-group-field">
                  <label>Animal Name / Tag ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cow #104 or Batch Alpha"
                    className="form-input-control"
                    value={animalFormData.name}
                    onChange={(e) => setAnimalFormData({ ...animalFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group-field">
                  <label>Species / Type *</label>
                  <select
                    className="form-input-control"
                    value={animalFormData.type}
                    onChange={(e) => setAnimalFormData({ ...animalFormData, type: e.target.value })}
                    required
                  >
                    <option value="Cattle">🐄 Cattle / Cow</option>
                    <option value="Dairy Cattle">🥛 Dairy Cattle</option>
                    <option value="Beef Cattle">🥩 Beef Cattle</option>
                    <option value="Goats">🐐 Goats</option>
                    <option value="Sheep">🐑 Sheep</option>
                    <option value="Pigs">🐖 Pigs / Swine</option>
                    <option value="Poultry">🐔 Poultry / Broilers</option>
                    <option value="Layers">🥚 Layer Hens</option>
                    <option value="Ducks">🦆 Ducks</option>
                    <option value="Fish">🐟 Aquaculture / Fish</option>
                    <option value="Horses">🐎 Horses</option>
                    <option value="Other">🐾 Other Species</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-row">
                <div className="form-group-field">
                  <label>Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Holstein Friesian, Boer, Dorper"
                    className="form-input-control"
                    value={animalFormData.breed}
                    onChange={(e) => setAnimalFormData({ ...animalFormData, breed: e.target.value })}
                  />
                </div>

                <div className="form-group-field">
                  <label>Age (Months / Years)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24"
                    className="form-input-control"
                    value={animalFormData.age}
                    onChange={(e) => setAnimalFormData({ ...animalFormData, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label>Health Status *</label>
                <select
                  className="form-input-control"
                  value={animalFormData.healthStatus}
                  onChange={(e) => setAnimalFormData({ ...animalFormData, healthStatus: e.target.value })}
                  required
                >
                  <option value="HEALTHY">🟢 Healthy & Productive</option>
                  <option value="TREATMENT">🟡 Under Treatment</option>
                  <option value="SICK">🔴 Sick / Requires Attention</option>
                  <option value="QUARANTINE">🟣 In Quarantine</option>
                  <option value="RECOVERING">🔵 Recovering</option>
                </select>
              </div>

              <div className="form-actions-bar">
                <button type="button" className="btn-form-cancel" onClick={() => setShowAnimalModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-form-submit">
                  Save Livestock Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with Error Boundary for resilience
const FarmList = () => (
  <FarmErrorBoundary>
    <FarmListView />
  </FarmErrorBoundary>
);

export default FarmList;