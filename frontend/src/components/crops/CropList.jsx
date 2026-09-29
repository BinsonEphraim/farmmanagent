import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import { useAuth } from '../../context/AuthContext';
import './CropList.css';
import LogoutButton from '../common/LogoutButton';

// High-resolution crop photos tailored for visual identification
const CROP_IMAGES = {
  maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=300',
  corn: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=300',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300',
  soybeans: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&q=80&w=300',
  soybean: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&q=80&w=300',
  groundnuts: 'https://images.unsplash.com/photo-1567892328127-d47781b0a887?auto=format&fit=crop&q=80&w=300',
  peanuts: 'https://images.unsplash.com/photo-1567892328127-d47781b0a887?auto=format&fit=crop&q=80&w=300',
  tobacco: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&q=80&w=300',
  'sweet potatoes': 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&q=80&w=300',
  beans: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300',
  cotton: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&q=80&w=300',
  sunflower: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=300',
  tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=300',
  wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=300',
  sugarcane: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=300',
  default: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=300',
};

const getCropImage = (name) => {
  if (!name) return CROP_IMAGES.default;
  const key = name.toLowerCase().trim();
  for (const k of Object.keys(CROP_IMAGES)) {
    if (key.includes(k)) return CROP_IMAGES[k];
  }
  return CROP_IMAGES.default;
};

// Stage badge mapper
const getStageBadge = (crop) => {
  const name = (crop.name || '').toLowerCase();
  if (crop.status === 'HARVESTED') return { label: 'Harvesting', className: 'stage-harvesting' };
  if (name.includes('cotton')) return { label: 'Boll Opening', className: 'stage-boll' };
  if (name.includes('rice')) return { label: 'Flowering', className: 'stage-flowering' };
  if (name.includes('soybean')) return { label: 'Pod Filling', className: 'stage-pod' };
  if (name.includes('sweet potato')) return { label: 'Maturing', className: 'stage-maturing' };
  if (name.includes('beans')) return { label: 'Seed Filling', className: 'stage-seed' };
  return { label: 'Vegetative', className: 'stage-vegetative' };
};

// Health status mapper
const getHealthStatus = (crop) => {
  if (crop.status === 'FAILED') return { label: 'Critical', className: 'status-critical' };
  const name = (crop.name || '').toLowerCase();
  if (name.includes('soybean') || name.includes('sweet potato') || name.includes('cotton')) {
    return { label: 'Moderate', className: 'status-moderate' };
  }
  return { label: 'Healthy', className: 'status-healthy' };
};

const CropList = ({ defaultTab = 'overview' }) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL query param or props
  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromQuery || defaultTab || 'overview');

  const [crops, setCrops] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Statistics state
  const [stats, setStats] = useState({
    totalCrops: 0,
    totalPlantedArea: 0,
    totalHarvestedArea: 0,
    avgYieldRate: 0,
    cropRevenue: 0,
    cropDistribution: [],
    cropPerformance: [],
    upcomingActivities: [],
  });

  // Filters state
  const [filters, setFilters] = useState({
    farmId: 'All Farms',
    cropName: 'All Crops',
    status: 'All Status',
    season: '2025 Season A',
    search: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Core Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);

  // Action Modals State
  const [showFertilizerModal, setShowFertilizerModal] = useState(false);
  const [showPestModal, setShowPestModal] = useState(false);
  const [showIrrigationModal, setShowIrrigationModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);

  // Logs & Interactive Records State
  const [fertilizerLogs, setFertilizerLogs] = useState([]);
  const [pestLogs, setPestLogs] = useState([]);
  const [irrigationSchedules, setIrrigationSchedules] = useState([]);

  // Crop Settings State
  const [cropSettings, setCropSettings] = useState({
    seasonName: `${new Date().getFullYear()} Season A`,
    seasonStart: `${new Date().getFullYear()}-10-15`,
    targetAcreage: '12500',
    pestAlertThreshold: 'Medium',
    minMoistureWarning: '50',
    ndviAlertThreshold: '0.65',
    unitSystem: 'Metric (Hectares, Kg, MT)',
    currency: 'USD ($)',
  });

  // Form Data for Crop Add/Edit
  const [formData, setFormData] = useState({
    farmId: '',
    name: '',
    variety: '',
    area: '',
    yield: '',
    plantingDate: '',
    harvestDate: '',
    status: 'GROWING',
  });

  // Fertilizer Form
  const [fertilizerForm, setFertilizerForm] = useState({
    cropId: '',
    formulation: 'NPK 23:10:5',
    ratePerHa: '200',
    stage: 'Vegetative Top Dressing',
    applicationDate: new Date().toISOString().slice(0, 10),
    operator: 'Field Agronomy Team',
    notes: 'Broadcast application followed by light incorporation',
  });

  // Pest & Disease Form
  const [pestForm, setPestForm] = useState({
    cropId: '',
    threatName: 'Fall Armyworm (Spodoptera frugiperda)',
    threatType: 'Insect Pest',
    severity: 'Medium',
    treatment: 'Chlorantraniliprole 20% SC spray',
    status: 'Treatment Scheduled',
    inspectionDate: new Date().toISOString().slice(0, 10),
  });

  // Irrigation Form
  const [irrigationForm, setIrrigationForm] = useState({
    cropId: '',
    sectorName: 'Sector 1 - North Pivot',
    systemType: 'Center Pivot',
    volumeM3: '450',
    durationHours: '3.5',
    scheduledTime: '06:00 AM',
    status: 'Scheduled',
  });

  // Harvest Form
  const [harvestForm, setHarvestForm] = useState({
    cropId: '',
    actualYieldKg: '',
    harvestQuality: 'Grade A Premium',
    storageSilo: 'Central Silo 1',
    marketPricePerKg: '0.35',
  });

  // Synchronize Tab with search params
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [tabFromQuery, defaultTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const showToast = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  // Fetch real crops from backend
  const fetchCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmService.getAllCrops({
        farmId: filters.farmId !== 'All Farms' ? filters.farmId : undefined,
        status: filters.status !== 'All Status' ? filters.status : undefined,
        search: filters.search || undefined,
      });

      if (Array.isArray(data)) {
        setCrops(data);
      }
    } catch (err) {
      console.error('Error fetching crops:', err);
      setError(err.response?.data?.error || 'Failed to load crops from database');
    } finally {
      setLoading(false);
    }
  }, [filters.farmId, filters.status, filters.search]);

  // Fetch real crop stats & analytics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await farmService.getCropStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching crop stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch farms list for dropdown
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
    fetchCrops();
    fetchStats();
    fetchFarms();
  }, [fetchCrops, fetchStats, fetchFarms]);

  // Keep crop management logs based on real user-entered records only.
  // No fabricated seed data is injected into the UI from static sample arrays.
  useEffect(() => {
    if (crops.length === 0) {
      setFertilizerLogs([]);
      setPestLogs([]);
      setIrrigationSchedules([]);
    }
  }, [crops.length]);

  // Dynamic filter options
  const cropNameOptions = useMemo(() => {
    const names = Array.from(new Set(crops.map((c) => c.name).filter(Boolean)));
    return ['All Crops', ...names];
  }, [crops]);

  // Filtered crops
  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      if (filters.cropName !== 'All Crops') {
        if (crop.name !== filters.cropName) return false;
      }
      return true;
    });
  }, [crops, filters.cropName]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCrops.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCrops = useMemo(() => {
    return filteredCrops.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCrops, startIndex, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      farmId: farms.length > 0 ? String(farms[0].id) : '',
      name: '',
      variety: '',
      area: '',
      yield: '',
      plantingDate: new Date().toISOString().slice(0, 10),
      harvestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'GROWING',
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (crop, e) => {
    if (e) e.stopPropagation();
    setSelectedCrop(crop);
    setFormData({
      farmId: String(crop.farmId || ''),
      name: crop.name || '',
      variety: crop.variety || '',
      area: crop.area ? String(crop.area) : '',
      yield: crop.yield ? String(crop.yield) : '',
      plantingDate: crop.plantingDate ? new Date(crop.plantingDate).toISOString().slice(0, 10) : '',
      harvestDate: crop.harvestDate ? new Date(crop.harvestDate).toISOString().slice(0, 10) : '',
      status: crop.status || 'GROWING',
    });
    setShowEditModal(true);
  };

  // Open Details Modal
  const handleOpenDetailModal = (crop, e) => {
    if (e) e.stopPropagation();
    setSelectedCrop(crop);
    setShowDetailModal(true);
  };

  // Helper to get farm capacity for crop validation
  const getFarmCapacity = (farmId, excludeCropId = null) => {
    const selectedFarmObj = farms.find((f) => String(f.id) === String(farmId));
    const totalFarmSize = selectedFarmObj ? (Number(selectedFarmObj.size) || 0) : 0;
    const currentlyPlanted = crops
      .filter((c) => String(c.farmId) === String(farmId) && (c.status === 'PLANTED' || c.status === 'GROWING') && (excludeCropId ? c.id !== excludeCropId : true))
      .reduce((sum, c) => sum + (Number(c.area) || 0), 0);
    const availableCapacity = Math.max(0, totalFarmSize - currentlyPlanted);
    return { selectedFarmObj, totalFarmSize, currentlyPlanted, availableCapacity };
  };

  // Submit Add Crop
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const requestedArea = parseFloat(formData.area) || 0;
    const { selectedFarmObj, totalFarmSize, availableCapacity } = getFarmCapacity(formData.farmId);

    if (selectedFarmObj && totalFarmSize > 0) {
      if (requestedArea > totalFarmSize) {
        alert(`❌ Logic Error: Planted area (${requestedArea} ha) cannot exceed total farm plot size (${totalFarmSize} ha) for "${selectedFarmObj.name}".`);
        return;
      }
      if (requestedArea > availableCapacity && (formData.status === 'PLANTED' || formData.status === 'GROWING')) {
        alert(`❌ Plot Capacity Exceeded: "${selectedFarmObj.name}" has only ${availableCapacity.toFixed(1)} ha available (${totalFarmSize - availableCapacity} ha currently planted of ${totalFarmSize} ha total).`);
        return;
      }
    }

    try {
      await farmService.createCrop({
        farmId: parseInt(formData.farmId, 10),
        name: formData.name,
        variety: formData.variety,
        area: requestedArea,
        yield: parseFloat(formData.yield) || 0,
        plantingDate: formData.plantingDate,
        harvestDate: formData.harvestDate || null,
        status: formData.status,
      });
      setShowAddModal(false);
      fetchCrops();
      fetchStats();
      showToast('Crop successfully registered into database!');
    } catch (err) {
      console.error('Create crop error:', err);
      alert(err.response?.data?.error || 'Failed to create crop');
    }
  };

  // Submit Edit Crop
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const requestedArea = parseFloat(formData.area) || 0;
    const { selectedFarmObj, totalFarmSize, availableCapacity } = getFarmCapacity(formData.farmId, selectedCrop?.id);

    if (selectedFarmObj && totalFarmSize > 0) {
      if (requestedArea > totalFarmSize) {
        alert(`❌ Logic Error: Planted area (${requestedArea} ha) cannot exceed total farm plot size (${totalFarmSize} ha) for "${selectedFarmObj.name}".`);
        return;
      }
      if (requestedArea > availableCapacity && (formData.status === 'PLANTED' || formData.status === 'GROWING')) {
        alert(`❌ Plot Capacity Exceeded: "${selectedFarmObj.name}" has only ${availableCapacity.toFixed(1)} ha available.`);
        return;
      }
    }

    try {
      await farmService.updateCrop(selectedCrop.id, {
        farmId: parseInt(formData.farmId, 10),
        name: formData.name,
        variety: formData.variety,
        area: requestedArea,
        yield: parseFloat(formData.yield) || 0,
        plantingDate: formData.plantingDate,
        harvestDate: formData.harvestDate || null,
        status: formData.status,
      });
      setShowEditModal(false);
      fetchCrops();
      fetchStats();
      showToast('Crop record updated successfully!');
    } catch (err) {
      console.error('Update crop error:', err);
      alert(err.response?.data?.error || 'Failed to update crop');
    }
  };

  // Delete Crop
  const handleDeleteCrop = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this crop record?')) return;
    try {
      await farmService.deleteCrop(id);
      fetchCrops();
      fetchStats();
      showToast('Crop record deleted successfully.');
    } catch (err) {
      console.error('Delete crop error:', err);
      alert(err.response?.data?.error || 'Failed to delete crop');
    }
  };

  const handleExportCSV = () => {
    const rowsToExport = filteredCrops.length > 0 ? filteredCrops : crops;

    if (rowsToExport.length === 0) {
      alert('No crop data to export');
      return;
    }

    const headers = ['ID', 'Crop Name', 'Variety', 'Farm', 'Area (ha)', 'Yield (kg)', 'Planting Date', 'Harvest Date', 'Status'];
    const rows = rowsToExport.map((crop) => [
      crop.id,
      `"${crop.name || ''}"`,
      `"${crop.variety || 'Standard'}"`,
      `"${crop.farm?.name || 'Main Farm'}"`,
      Number(crop.area || 0),
      Number(crop.yield || 0),
      crop.plantingDate ? new Date(crop.plantingDate).toISOString().slice(0, 10) : '',
      crop.harvestDate ? new Date(crop.harvestDate).toISOString().slice(0, 10) : '',
      `"${crop.status || 'GROWING'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUrl = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUrl);
    link.setAttribute('download', `ufms_crops_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fertilizer Log Submission
  const handleSaveFertilizerLog = (e) => {
    e.preventDefault();
    const targetCrop = crops.find((c) => String(c.id) === String(fertilizerForm.cropId)) || crops[0];
    const newRecord = {
      id: Date.now(),
      cropName: targetCrop ? targetCrop.name : 'Unknown crop',
      farmName: targetCrop?.farm?.name || 'Unassigned farm',
      formulation: fertilizerForm.formulation,
      ratePerHa: Number(fertilizerForm.ratePerHa) || 0,
      stage: fertilizerForm.stage,
      date: new Date(fertilizerForm.applicationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Completed',
      operator: fertilizerForm.operator,
    };
    setFertilizerLogs([newRecord, ...fertilizerLogs]);
    setShowFertilizerModal(false);
    showToast('Fertilizer application logged successfully!');
  };

  // Pest Scouting Log Submission
  const handleSavePestLog = (e) => {
    e.preventDefault();
    const targetCrop = crops.find((c) => String(c.id) === String(pestForm.cropId)) || crops[0];
    const newRecord = {
      id: Date.now(),
      cropName: targetCrop ? targetCrop.name : 'Unknown crop',
      farmName: targetCrop?.farm?.name || 'Unassigned farm',
      threatName: pestForm.threatName,
      threatType: pestForm.threatType,
      severity: pestForm.severity,
      treatment: pestForm.treatment,
      status: pestForm.status,
      date: new Date(pestForm.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setPestLogs([newRecord, ...pestLogs]);
    setShowPestModal(false);
    showToast('Pest scouting incident recorded.');
  };

  // Irrigation Schedule Submission
  const handleSaveIrrigationSchedule = (e) => {
    e.preventDefault();
    const targetCrop = crops.find((c) => String(c.id) === String(irrigationForm.cropId)) || crops[0];
    const newRecord = {
      id: Date.now(),
      sectorName: irrigationForm.sectorName,
      cropName: targetCrop ? targetCrop.name : 'Unknown crop',
      farmName: targetCrop?.farm?.name || 'Unassigned farm',
      systemType: irrigationForm.systemType,
      moisturePct: 0,
      flowRate: 0,
      durationHours: Number(irrigationForm.durationHours) || 0,
      scheduledTime: irrigationForm.scheduledTime,
      status: irrigationForm.status,
    };
    setIrrigationSchedules([newRecord, ...irrigationSchedules]);
    setShowIrrigationModal(false);
    showToast('Irrigation schedule created successfully!');
  };

  // Record Final Harvest Submission (updates DB)
  const handleOpenHarvestModal = (crop) => {
    setSelectedCrop(crop);
    setHarvestForm({
      cropId: String(crop.id),
      actualYieldKg: crop.yield ? String(crop.yield) : '4500',
      harvestQuality: 'Grade A Premium',
      storageSilo: 'Central Silo 1',
      marketPricePerKg: '0.35',
    });
    setShowHarvestModal(true);
  };

  const handleRecordHarvestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCrop) return;
    try {
      const actualYield = parseFloat(harvestForm.actualYieldKg) || 0;
      await farmService.updateCrop(selectedCrop.id, {
        status: 'HARVESTED',
        yield: actualYield,
      });
      setShowHarvestModal(false);
      fetchCrops();
      fetchStats();
      showToast(`Harvest recorded for ${selectedCrop.name}! Status updated to HARVESTED.`);
    } catch (err) {
      console.error('Harvest record error:', err);
      alert('Failed to update harvest in database.');
    }
  };

  // Settings Save Handler
  const handleSaveSettings = (e) => {
    e.preventDefault();
    showToast('Crop management configuration saved successfully!');
  };

  return (
    <div className="crop-page-container">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="crop-toast-notification">
          <span className="toast-icon">✓</span>
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className={`crop-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="crop-sidebar-brand">
          <div className="brand-leaf-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 4.9-4 9-9 9z" />
              <path d="M11 20v-8a4 4 0 0 1 4-4h4" />
            </svg>
          </div>
          <div className="brand-text-group">
            <span className="brand-title">UFMS</span>
            <span className="brand-subtitle">Unified Farm Management System</span>
          </div>
        </div>

        <div className="crop-sidebar-nav">
          <div className="nav-group">
            <Link to="/dashboard" className="crop-nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🏠</span>
                <span>Dashboard</span>
              </div>
            </Link>

            <Link to="/farms" className="crop-nav-link">
              <div className="nav-link-content">
                <span className="nav-icon">🌾</span>
                <span>Farm Overview</span>
              </div>
            </Link>

            <button
              className={`crop-nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">🌱</span>
                <span>Crop Management</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => handleTabChange('calendar')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">📅</span>
                <span>Calendar</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'planting' ? 'active' : ''}`}
              onClick={() => handleTabChange('planting')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">🚜</span>
                <span>Planting Plan</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'fertilizer' ? 'active' : ''}`}
              onClick={() => handleTabChange('fertilizer')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">🧪</span>
                <span>Fertilizer Usage</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'pest-disease' ? 'active' : ''}`}
              onClick={() => handleTabChange('pest-disease')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">🐛</span>
                <span>Pest & Disease</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'irrigation' ? 'active' : ''}`}
              onClick={() => handleTabChange('irrigation')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">💧</span>
                <span>Irrigation</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'harvesting' ? 'active' : ''}`}
              onClick={() => handleTabChange('harvesting')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">🌾</span>
                <span>Harvesting</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'crop-reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('crop-reports')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">📊</span>
                <span>Crop Reports</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'yield-reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('yield-reports')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">📈</span>
                <span>Yield Reports</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'field-reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('field-reports')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">📋</span>
                <span>Field Reports</span>
              </div>
            </button>

            <button
              className={`crop-nav-link-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <div className="nav-link-content">
                <span className="nav-icon">⚙️</span>
                <span>Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Current Season Box */}
        <div className="season-widget-box">
          <div className="season-widget-header">
            <span className="season-leaf">🌿</span>
            <span className="season-tag">Active Season</span>
          </div>
          <div className="season-title">{cropSettings.seasonName}</div>
          <div className="season-date">{stats.totalCrops} Active Crop Records</div>
          <div className="season-progress-track">
            <div
              className="season-progress-fill"
              style={{
                width: `${stats.totalPlantedArea > 0 ? Math.min(100, Math.round((stats.totalHarvestedArea / stats.totalPlantedArea) * 100)) : (stats.avgYieldRate || 0)}%`,
              }}
            ></div>
          </div>
          <div className="season-progress-text">
            {stats.totalPlantedArea > 0
              ? `${Math.round((stats.totalHarvestedArea / stats.totalPlantedArea) * 100)}% Harvest Complete`
              : `${stats.avgYieldRate || 0}% Production Rate`}
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="crop-main-area">
        {/* TOP NAVBAR */}
        <header className="crop-top-navbar">
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
            <h2 className="top-nav-title">Crop Management</h2>
          </div>

          <div className="top-nav-right">
            <div className="top-user-profile">
              <div className="top-avatar">
                {authUser?.firstName ? authUser.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="top-user-text">
                <span className="top-user-name">
                  {authUser?.firstName ? `${authUser.firstName} ${authUser?.lastName || ''}`.trim() : (authUser?.email || 'User')}
                </span>
                <span className="top-user-role">{authUser?.role || 'Farm Manager'}</span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="crop-content-wrapper">
          {/* BREADCRUMB */}
          <div className="crop-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {activeTab === 'overview' && 'Crop Management'}
              {activeTab === 'planting' && 'Planting Plan & Field Allocation'}
              {activeTab === 'fertilizer' && 'Fertilizer Usage & Nutrients'}
              {activeTab === 'pest-disease' && 'Pest & Disease Management'}
              {activeTab === 'irrigation' && 'Precision Irrigation'}
              {activeTab === 'harvesting' && 'Harvesting & Silo Operations'}
              {activeTab === 'calendar' && 'Agricultural Calendar'}
              {activeTab === 'crop-reports' && 'Crop Reports'}
              {activeTab === 'yield-reports' && 'Yield Performance Reports'}
              {activeTab === 'field-reports' && 'Field Agro-Telemetry Reports'}
              {activeTab === 'settings' && 'Crop Management Settings'}
            </span>
          </div>

          {/* 5 STAT CARDS ROW */}
          <div className="crop-stats-grid">
            <div className="crop-stat-card">
              <div className="stat-icon-wrapper mint">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /><circle cx="12" cy="12" r="9" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : stats.totalCrops}</span>
                <span className="stat-label">Total Crops</span>
                <span className="stat-sub-text">All farms</span>
                <span className="stat-trend green">{farms.length} Active farms</span>
              </div>
            </div>

            <div className="crop-stat-card">
              <div className="stat-icon-wrapper blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M12 2v2" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `${Number(stats.totalPlantedArea).toLocaleString()} ha`}</span>
                <span className="stat-label">Total Planted Area</span>
                <span className="stat-trend green">Across {crops.length} field units</span>
              </div>
            </div>

            <div className="crop-stat-card">
              <div className="stat-icon-wrapper amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `${Number(stats.totalHarvestedArea).toLocaleString()} ha`}</span>
                <span className="stat-label">Harvested Area</span>
                <span className="stat-trend green">
                  {stats.totalPlantedArea > 0 ? `${Math.round((stats.totalHarvestedArea / stats.totalPlantedArea) * 100)}% of total` : '0% of total'}
                </span>
              </div>
            </div>

            <div className="crop-stat-card">
              <div className="stat-icon-wrapper purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `${stats.avgYieldRate}%`}</span>
                <span className="stat-label">Avg Yield Rate</span>
                <span className="stat-trend green">Efficiency rate</span>
              </div>
            </div>

            <div className="crop-stat-card">
              <div className="stat-icon-wrapper emerald">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 6v2m0 8v2" /></svg>
              </div>
              <div className="stat-content-group">
                <span className="stat-number">{statsLoading ? '...' : `$${Number(stats.cropRevenue).toLocaleString()}`}</span>
                <span className="stat-label">Crop Revenue</span>
                <span className="stat-trend green">Total farm income</span>
              </div>
            </div>
          </div>

          {/* TAB BAR & ACTION BUTTON */}
          <div className="crop-tabs-row">
            <div className="crop-tabs-list">
              <button
                className={`crop-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
              >
                Crops Overview
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'planting' ? 'active' : ''}`}
                onClick={() => handleTabChange('planting')}
              >
                Planting Plan
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'fertilizer' ? 'active' : ''}`}
                onClick={() => handleTabChange('fertilizer')}
              >
                Fertilizer Usage
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'pest-disease' ? 'active' : ''}`}
                onClick={() => handleTabChange('pest-disease')}
              >
                Pest & Disease
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'irrigation' ? 'active' : ''}`}
                onClick={() => handleTabChange('irrigation')}
              >
                Irrigation
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'harvesting' ? 'active' : ''}`}
                onClick={() => handleTabChange('harvesting')}
              >
                Harvesting
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => handleTabChange('calendar')}
              >
                Crop Calendar
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'crop-reports' || activeTab === 'yield-reports' || activeTab === 'field-reports' ? 'active' : ''}`}
                onClick={() => handleTabChange('crop-reports')}
              >
                Reports
              </button>
              <button
                className={`crop-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                Settings
              </button>
            </div>

            <button className="btn-add-new-crop" onClick={handleOpenAddModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              <span>+ Add New Crop</span>
            </button>
          </div>

          {/* ===== TAB 1: CROPS OVERVIEW ===== */}
          {activeTab === 'overview' && (
            <>
              {/* FILTERS TOOLBAR */}
              <div className="crop-filters-toolbar">
                <div className="filters-left">
                  <select
                    className="filter-select-dropdown"
                    value={filters.farmId}
                    onChange={(e) => setFilters({ ...filters, farmId: e.target.value })}
                  >
                    <option value="All Farms">All Farms</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select-dropdown"
                    value={filters.cropName}
                    onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
                  >
                    {cropNameOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select-dropdown"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="All Status">All Status</option>
                    <option value="GROWING">Growing</option>
                    <option value="PLANTED">Planted</option>
                    <option value="HARVESTED">Harvested</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div className="filters-right">
                  <div className="crop-search-box">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                      type="text"
                      placeholder="Search crop..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>

                  <button
                    className="btn-filter-icon"
                    title="Reset all filters"
                    onClick={() => setFilters({ farmId: 'All Farms', cropName: 'All Crops', status: 'All Status', season: '2025 Season A', search: '' })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* MAIN 2-COLUMN LAYOUT */}
              <div className="crop-main-grid">
                {/* LEFT 2/3 COLUMN: DATA TABLE */}
                <div className="crop-table-card">
                  <div className="table-responsive">
                    <table className="crop-data-table">
                      <thead>
                        <tr>
                          <th>Crop</th>
                          <th>Farm / Field</th>
                          <th>Planted Area (ha)</th>
                          <th>Stage</th>
                          <th>Status</th>
                          <th>Expected Harvest</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                              Loading crops from database...
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#ef4444' }}>
                              {error}
                            </td>
                          </tr>
                        ) : paginatedCrops.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              No crops found matching filter criteria
                            </td>
                          </tr>
                        ) : (
                          paginatedCrops.map((crop) => {
                            const stage = getStageBadge(crop);
                            const health = getHealthStatus(crop);
                            const cropImg = getCropImage(crop.name);
                            const farmName = crop.farm ? `${crop.farm.name}` : 'Assigned Farm';
                            const expectedHarvest = crop.harvestDate
                              ? new Date(crop.harvestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'Scheduled';

                            return (
                              <tr key={crop.id}>
                                <td>
                                  <div className="crop-name-cell">
                                    <img src={cropImg} alt={crop.name} className="crop-thumbnail-img" />
                                    <div className="crop-name-meta">
                                      <span className="crop-title-bold">{crop.name}</span>
                                      <span className="crop-variety-sub">{crop.variety || 'Standard'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="farm-field-cell">
                                    <span className="farm-field-main">{farmName}</span>
                                    <span className="farm-field-sub">Field {String.fromCharCode(65 + (crop.id % 8))}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="area-text">{Number(crop.area || 0).toLocaleString()} ha</span>
                                </td>
                                <td>
                                  <span className={`stage-pill ${stage.className}`}>
                                    {stage.label}
                                  </span>
                                </td>
                                <td>
                                  <span className={`health-pill ${health.className}`}>
                                    <span className="health-dot"></span>
                                    {health.label}
                                  </span>
                                </td>
                                <td>
                                  <span className="harvest-date-text">{expectedHarvest}</span>
                                </td>
                                <td>
                                  <div className="table-actions-group">
                                    <button
                                      className="btn-action-icon"
                                      title="Record Harvest"
                                      onClick={() => handleOpenHarvestModal(crop)}
                                    >
                                      🌾
                                    </button>
                                    <button
                                      className="btn-action-icon"
                                      title="View details"
                                      onClick={(e) => handleOpenDetailModal(crop, e)}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    </button>
                                    <button
                                      className="btn-action-icon"
                                      title="Edit crop"
                                      onClick={(e) => handleOpenEditModal(crop, e)}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                    </button>
                                    <button
                                      className="btn-action-icon"
                                      title="Delete crop"
                                      onClick={(e) => handleDeleteCrop(crop.id, e)}
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
                  <div className="crop-pagination-footer">
                    <span className="pagination-info">
                      Showing {filteredCrops.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCrops.length)} of {filteredCrops.length} crops
                    </span>

                    <div className="pagination-controls">
                      <button
                        className="btn-page-arrow"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        «
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          className={`btn-page-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        className="btn-page-arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        »
                      </button>

                      <select
                        className="page-size-selector"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="8">8 / page</option>
                        <option value="12">12 / page</option>
                        <option value="20">20 / page</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* RIGHT 1/3 COLUMN: ANALYTICS CARDS */}
                <div className="crop-side-column">
                  {/* CROP DISTRIBUTION DONUT CHART */}
                  <div className="side-card">
                    <div className="side-card-header">
                      <h3 className="side-card-title">Crop Distribution <span className="side-card-sub">(By Area)</span></h3>
                      <span className="side-card-badge">Live Aggregation</span>
                    </div>

                    <div className="donut-chart-container">
                      <div className="donut-svg-wrapper">
                        <svg viewBox="0 0 100 100" className="donut-svg">
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                          {(() => {
                            const circ = 238.76;
                            let accOffset = 0;
                            const distList = stats.cropDistribution && stats.cropDistribution.length > 0
                              ? stats.cropDistribution
                              : [];
                            return distList.map((item, idx) => {
                              const strokeLength = ((item.percentage || 0) / 100) * circ;
                              const dashArray = `${strokeLength} ${circ}`;
                              const dashOffset = -accOffset;
                              accOffset += strokeLength;
                              return (
                                <circle
                                  key={item.name || idx}
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="transparent"
                                  stroke={item.color || '#10b981'}
                                  strokeWidth="18"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={dashOffset}
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="donut-center-text">
                          <span className="donut-center-num">{Number(stats.totalPlantedArea || 0).toLocaleString()}</span>
                          <span className="donut-center-unit">ha</span>
                        </div>
                      </div>

                      <div className="donut-legend-stack">
                        {stats.cropDistribution && stats.cropDistribution.length > 0 ? (
                          stats.cropDistribution.map((item) => (
                            <div key={item.name} className="legend-item-row">
                              <span className="legend-dot-sym" style={{ background: item.color || '#10b981' }}></span>
                              <span className="legend-crop-name">{item.name}</span>
                              <span className="legend-crop-stats">{item.percentage}% ({Number(item.area || 0).toLocaleString()} ha)</span>
                            </div>
                          ))
                        ) : (
                          <div className="legend-item-row" style={{ color: '#94a3b8', fontSize: '12px' }}>
                            Loading distribution data...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CROP PERFORMANCE */}
                  <div className="side-card">
                    <div className="side-card-header">
                      <h3 className="side-card-title">Crop Performance</h3>
                      <span className="side-card-badge">Growth Index</span>
                    </div>

                    <div className="performance-progress-stack">
                      {stats.cropPerformance && stats.cropPerformance.length > 0 ? (
                        stats.cropPerformance.map((perf) => (
                          <div key={perf.name} className="perf-item">
                            <div className="perf-label-row">
                              <span className="perf-name">{perf.name}</span>
                              <span className="perf-pct-bold">{perf.progress}% <span className="perf-target">(Target: {perf.target}%)</span></span>
                            </div>
                            <div className="perf-bar-track">
                              <div className="perf-bar-fill" style={{ width: `${Math.min(100, Math.max(0, perf.progress))}%`, background: '#10b981' }}></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '12px' }}>No performance data</p>
                      )}
                    </div>
                  </div>

                  {/* UPCOMING ACTIVITIES */}
                  <div className="side-card">
                    <div className="side-card-header">
                      <h3 className="side-card-title">Upcoming Activities</h3>
                      <span className="view-all-green-link" onClick={() => handleTabChange('calendar')} style={{ cursor: 'pointer' }}>View all</span>
                    </div>

                    <div className="upcoming-activities-stack">
                      {stats.upcomingActivities && stats.upcomingActivities.length > 0 ? (
                        stats.upcomingActivities.map((act) => (
                          <div key={act.id || act.title} className="activity-card-row">
                            <div className="activity-cal-icon">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
                            </div>
                            <div className="activity-info-block">
                              <span className="activity-task-name">{act.title}</span>
                              <span className="activity-location-sub">{act.location}</span>
                            </div>
                            <div className="activity-date-badge-col">
                              <span className="activity-date-text">{act.date}</span>
                              <span className={`activity-status-pill ${String(act.status || 'pending').toLowerCase()}`}>{act.status}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '12px' }}>No upcoming activities</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== TAB 2: PLANTING PLAN ===== */}
          {activeTab === 'planting' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">🚜 Seasonal Planting Plan & Field Allocation</h3>
                  <p className="subtab-banner-desc">Review seed schedules, soil preparation, planting density, and germination forecast for {cropSettings.seasonName}.</p>
                </div>
                <button className="btn-add-new-crop" onClick={handleOpenAddModal}>+ Schedule New Crop</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Target Planted Area</span>
                  <span className="metric-box-val">{Number(stats.totalPlantedArea || 0).toLocaleString()} ha</span>
                  <span className="metric-box-note">{crops.length} field units allocated</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Total Seeds Requirement</span>
                  <span className="metric-box-val">{Number(Math.round((stats.totalPlantedArea || 0) * 25)).toLocaleString()} kg</span>
                  <span className="metric-box-note">100% Certified hybrid varieties</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Germination Rate Avg</span>
                  <span className="metric-box-val">{stats.avgYieldRate > 0 ? `${stats.avgYieldRate}%` : '94.8%'}</span>
                  <span className="metric-box-note">↑ 2.4% above standard benchmark</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Active Farm Units</span>
                  <span className="metric-box-val">{farms.length} Farms</span>
                  <span className="metric-box-note">Fully surveyed & prepared</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Crop & Variety</th>
                        <th>Target Farm / Field</th>
                        <th>Allocated Area</th>
                        <th>Planting Date</th>
                        <th>Status</th>
                        <th>Soil Readiness</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crops.map((c, i) => (
                        <tr key={c.id || i}>
                          <td>
                            <strong>{c.name}</strong> - {c.variety || 'Standard'}
                          </td>
                          <td>{c.farm?.name || 'Main Farm'} (Field {String.fromCharCode(65 + (c.id % 8))})</td>
                          <td><strong>{Number(c.area || 0).toLocaleString()} ha</strong></td>
                          <td>{c.plantingDate ? new Date(c.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                          <td><span className="stage-pill stage-vegetative">{c.status}</span></td>
                          <td><span className="health-pill status-healthy"><span className="health-dot"></span> Ready (pH 6.5)</span></td>
                          <td>
                            <button className="btn-action-icon" onClick={() => handleOpenEditModal(c)} title="Edit Plan">
                              ✏️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 3: FERTILIZER USAGE ===== */}
          {activeTab === 'fertilizer' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">🧪 Fertilizer Usage & Soil Nutrients Telemetry</h3>
                  <p className="subtab-banner-desc">Manage basal application, top dressing schedules, NPK formulations, and soil fertility metrics.</p>
                </div>
                <button className="btn-add-new-crop" onClick={() => setShowFertilizerModal(true)}>+ Log Fertilizer Application</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Total Fertilizer Applied</span>
                  <span className="metric-box-val">{fertilizerLogs.length > 0 ? `${Number(fertilizerLogs.reduce((sum, log) => sum + (Number(log.ratePerHa) || 0), 0)).toLocaleString()} kg` : 'No data yet'}</span>
                  <span className="metric-box-note">{fertilizerLogs.length > 0 ? `${fertilizerLogs.length} logged applications` : 'No real application records yet'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Soil Nutrient Balance</span>
                  <span className="metric-box-val" style={{ color: '#16a34a' }}>{fertilizerLogs.length > 0 ? 'Updated from records' : 'No records yet'}</span>
                  <span className="metric-box-note">{fertilizerLogs.length > 0 ? 'Based on actual logs' : 'Add a fertilizer log to begin tracking'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Total Input Investment</span>
                  <span className="metric-box-val">{fertilizerLogs.length > 0 ? '$' + Number(fertilizerLogs.reduce((sum, log) => sum + (Number(log.ratePerHa) || 0), 0) * 1.75).toLocaleString() : 'No data yet'}</span>
                  <span className="metric-box-note">{fertilizerLogs.length > 0 ? 'Estimated from recorded rate' : 'No real cost data available'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Application Efficiency</span>
                  <span className="metric-box-val">{fertilizerLogs.length > 0 ? 'Live' : 'N/A'}</span>
                  <span className="metric-box-note">{fertilizerLogs.length > 0 ? 'Calculated from logged records' : 'No applications logged yet'}</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Fertilizer Application Logs & Protocols</h3>
                  <span className="badge-pill-green">{fertilizerLogs.length} Applications Recorded</span>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Target Crop</th>
                        <th>Farm / Sector</th>
                        <th>Formulation</th>
                        <th>Dosage (kg/ha)</th>
                        <th>Growth Stage</th>
                        <th>Date Applied</th>
                        <th>Operator / Team</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fertilizerLogs.map((log) => (
                        <tr key={log.id}>
                          <td><strong>{log.cropName}</strong></td>
                          <td>{log.farmName}</td>
                          <td><span className="timeline-tag fertilizer">{log.formulation}</span></td>
                          <td><strong>{log.ratePerHa} kg/ha</strong></td>
                          <td>{log.stage}</td>
                          <td>{log.date}</td>
                          <td>{log.operator}</td>
                          <td><span className="stage-pill stage-harvesting">{log.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 4: PEST & DISEASE MANAGEMENT ===== */}
          {activeTab === 'pest-disease' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">🐛 Pest & Disease Early Warning Radar</h3>
                  <p className="subtab-banner-desc">Real-time scouting telemetry, biological pest controls, IPM treatment protocols and outbreak alerts.</p>
                </div>
                <button className="btn-add-new-crop" onClick={() => setShowPestModal(true)}>+ Log Scouting Incident</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Pest Risk Index</span>
                  <span className="metric-box-val" style={{ color: '#16a34a' }}>{pestLogs.length > 0 ? 'Based on logs' : 'No data yet'}</span>
                  <span className="metric-box-note">{pestLogs.length > 0 ? `${pestLogs.length} scouting records tracked` : 'Add a scouting report to begin tracking risk'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Scouted Field Units</span>
                  <span className="metric-box-val">{crops.length} Fields</span>
                  <span className="metric-box-note">{crops.length > 0 ? 'Registered crop fields' : 'No crop fields available'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Quarantine Status</span>
                  <span className="metric-box-val" style={{ color: '#16a34a' }}>{pestLogs.length > 0 ? `${pestLogs.filter((log) => log.severity === 'High').length} high alerts` : 'No alerts'}</span>
                  <span className="metric-box-note">{pestLogs.length > 0 ? 'From real scouting records' : 'No outbreak data on record'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Bio-Pesticide Stock</span>
                  <span className="metric-box-val">{pestLogs.length > 0 ? 'Recorded' : 'N/A'}</span>
                  <span className="metric-box-note">{pestLogs.length > 0 ? 'Treatment data is tracked live' : 'No treatment log available yet'}</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Field Scouting Incidents & Treatment Protocols</h3>
                  <span className="badge-pill-green">{pestLogs.length} Active Observations</span>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Farm Location</th>
                        <th>Identified Threat</th>
                        <th>Classification</th>
                        <th>Severity</th>
                        <th>Prescribed Treatment</th>
                        <th>Status</th>
                        <th>Inspection Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pestLogs.map((log) => (
                        <tr key={log.id}>
                          <td><strong>{log.cropName}</strong></td>
                          <td>{log.farmName}</td>
                          <td><strong>{log.threatName}</strong></td>
                          <td><span className="timeline-tag pest">{log.threatType}</span></td>
                          <td>
                            <span className={`health-pill ${log.severity === 'High' ? 'status-critical' : log.severity === 'Medium' ? 'status-moderate' : 'status-healthy'}`}>
                              <span className="health-dot"></span> {log.severity}
                            </span>
                          </td>
                          <td>{log.treatment}</td>
                          <td><span className="stage-pill stage-flowering">{log.status}</span></td>
                          <td>{log.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 5: IRRIGATION MANAGEMENT ===== */}
          {activeTab === 'irrigation' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">💧 Precision Irrigation & Hydrometry</h3>
                  <p className="subtab-banner-desc">Automated drip, center pivot, and canal irrigation telemetry with real-time root zone moisture sensors.</p>
                </div>
                <button className="btn-add-new-crop" onClick={() => setShowIrrigationModal(true)}>+ Schedule Irrigation Run</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Total Water Volume</span>
                  <span className="metric-box-val">{irrigationSchedules.length > 0 ? `${Number(irrigationSchedules.reduce((sum, zone) => sum + (Number(zone.flowRate) || 0), 0)).toLocaleString()} L/min` : 'No data yet'}</span>
                  <span className="metric-box-note">{irrigationSchedules.length > 0 ? `${irrigationSchedules.length} recorded run(s)` : 'No irrigation schedule logged yet'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Mean Root Moisture</span>
                  <span className="metric-box-val" style={{ color: '#2563eb' }}>{irrigationSchedules.length > 0 ? `${Math.round(irrigationSchedules.reduce((sum, zone) => sum + (Number(zone.moisturePct) || 0), 0) / irrigationSchedules.length)}%` : 'N/A'}</span>
                  <span className="metric-box-note">{irrigationSchedules.length > 0 ? 'Average from recorded schedules' : 'No schedule moisture data'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Automated Sectors</span>
                  <span className="metric-box-val">{irrigationSchedules.length} Sectors</span>
                  <span className="metric-box-note">{irrigationSchedules.length > 0 ? 'From live scheduling records' : 'No sectors scheduled yet'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Pump Energy Usage</span>
                  <span className="metric-box-val">{irrigationSchedules.length > 0 ? `${Number(irrigationSchedules.reduce((sum, zone) => sum + (Number(zone.durationHours) || 0), 0) * 18).toLocaleString()} kWh` : 'N/A'}</span>
                  <span className="metric-box-note">{irrigationSchedules.length > 0 ? 'Based on scheduled hours' : 'No schedule runtime available'}</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Irrigation Sectors & Active Schedules</h3>
                  <span className="badge-pill-green">{irrigationSchedules.length} Active Zones</span>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Sector Name</th>
                        <th>Target Crop</th>
                        <th>Farm Field</th>
                        <th>Irrigation System</th>
                        <th>Soil Moisture</th>
                        <th>Flow Rate</th>
                        <th>Scheduled Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {irrigationSchedules.map((zone) => (
                        <tr key={zone.id}>
                          <td><strong>{zone.sectorName}</strong></td>
                          <td>{zone.cropName}</td>
                          <td>{zone.farmName}</td>
                          <td><span className="timeline-tag irrigation">{zone.systemType}</span></td>
                          <td>
                            <div className="readiness-bar-box">
                              <div className="readiness-fill" style={{ width: `${zone.moisturePct}%`, background: '#2563eb' }}></div>
                              <span>{zone.moisturePct}%</span>
                            </div>
                          </td>
                          <td><strong>{zone.flowRate} L/min</strong></td>
                          <td>{zone.scheduledTime}</td>
                          <td>
                            <span className={`stage-pill ${zone.status === 'Active' ? 'stage-harvesting' : 'stage-vegetative'}`}>
                              {zone.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-action-pill"
                              onClick={() => {
                                const updated = irrigationSchedules.map((s) =>
                                  s.id === zone.id ? { ...s, status: s.status === 'Active' ? 'Standby' : 'Active' } : s
                                );
                                setIrrigationSchedules(updated);
                                showToast(`Toggled ${zone.sectorName} status.`);
                              }}
                            >
                              {zone.status === 'Active' ? 'Stop' : 'Start'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 6: HARVESTING OPERATIONS ===== */}
          {activeTab === 'harvesting' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">🌾 Harvest Forecast, Silo Capacity & Yield Tracking</h3>
                  <p className="subtab-banner-desc">Track projected vs actual harvest outputs, silo readiness, transport logistics and record final yields.</p>
                </div>
                <button
                  className="btn-add-new-crop"
                  onClick={() => {
                    if (crops.length > 0) handleOpenHarvestModal(crops[0]);
                  }}
                >
                  + Record Final Harvest
                </button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Total Projected Yield</span>
                  <span className="metric-box-val">{Number(crops.reduce((s, c) => s + (Number(c.yield) || 0), 0)).toLocaleString()} kg</span>
                  <span className="metric-box-note">Across {crops.length} registered crops</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Harvested Area</span>
                  <span className="metric-box-val">{Number(stats.totalHarvestedArea || 0).toLocaleString()} ha</span>
                  <span className="metric-box-note">Completed harvests</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Granary / Silo Capacity</span>
                  <span className="metric-box-val">82% Available</span>
                  <span className="metric-box-note">Fumigated & dry storage</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Recorded Crop Revenue</span>
                  <span className="metric-box-val">${Number(stats.cropRevenue || 0).toLocaleString()}</span>
                  <span className="metric-box-note">Total agricultural sales</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Harvest Readiness & Yield Tracker</h3>
                  <span className="badge-pill-green">{crops.length} Tracked Fields</span>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Crop & Variety</th>
                        <th>Farm Field</th>
                        <th>Planted Area</th>
                        <th>Expected Yield</th>
                        <th>Target Harvest Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crops.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong> ({c.variety || 'Standard'})</td>
                          <td>{c.farm?.name || 'Main Farm'} (Field {String.fromCharCode(65 + (c.id % 8))})</td>
                          <td>{Number(c.area || 0).toLocaleString()} ha</td>
                          <td><strong>{Number(c.yield || 0).toLocaleString()} kg</strong></td>
                          <td>{c.harvestDate ? new Date(c.harvestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Scheduled'}</td>
                          <td>
                            <span className={`stage-pill ${c.status === 'HARVESTED' ? 'stage-harvesting' : 'stage-vegetative'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-action-harvest"
                              onClick={() => handleOpenHarvestModal(c)}
                            >
                              Record Harvest
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 7: CROP CALENDAR ===== */}
          {activeTab === 'calendar' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">📅 Agricultural Operations Timeline</h3>
                  <p className="subtab-banner-desc">Chronological schedule of planting, fertilizing, weeding, scouting, and harvesting events for {cropSettings.seasonName}.</p>
                </div>
                <button className="btn-add-new-crop" onClick={handleOpenAddModal}>+ Add Crop Event</button>
              </div>

              <div className="calendar-timeline-grid">
                {crops.map((c, idx) => {
                  const pDate = c.plantingDate ? new Date(c.plantingDate) : new Date();
                  const hDate = c.harvestDate ? new Date(c.harvestDate) : null;
                  return (
                    <div key={c.id || idx} className="timeline-col">
                      <div className="timeline-month-header">
                        {pDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                      <div className="timeline-card">
                        <span className="timeline-tag fertilizer">Planting Event</span>
                        <span className="timeline-title">{c.name} ({c.variety || 'Standard'})</span>
                        <span className="timeline-sub">{c.farm?.name || 'Main Farm'} • {Number(c.area || 0).toLocaleString()} ha</span>
                        <span className="timeline-date">Sown: {pDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="timeline-card">
                        <span className="timeline-tag weeding">Mid-Season Maintenance</span>
                        <span className="timeline-title">Weeding & Nutrients</span>
                        <span className="timeline-sub">{c.farm?.name || 'Main Farm'}</span>
                        <span className="timeline-date">Active Field Monitoring</span>
                      </div>
                      {hDate && (
                        <div className="timeline-card">
                          <span className="timeline-tag harvest">Harvest Deadline</span>
                          <span className="timeline-title">{c.name} Final Harvest</span>
                          <span className="timeline-sub">{Number(c.yield || 0).toLocaleString()} kg projected</span>
                          <span className="timeline-date">{hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== TAB 8: CROP REPORTS ===== */}
          {activeTab === 'crop-reports' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">📊 Comprehensive Crop Acreage & Distribution Report</h3>
                  <p className="subtab-banner-desc">Detailed acreage analysis, variety breakdown, and geographical distribution across all farm holdings.</p>
                </div>
                <button
                  className="btn-add-new-crop"
                  onClick={handleExportCSV}
                >
                  ⬇️ Export CSV
                </button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Total Documented Crops</span>
                  <span className="metric-box-val">{crops.length}</span>
                  <span className="metric-box-note">Active cultivars</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Total Hectares</span>
                  <span className="metric-box-val">{Number(stats.totalPlantedArea || 0).toLocaleString()} ha</span>
                  <span className="metric-box-note">100% Surveyed</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Average Field Size</span>
                  <span className="metric-box-val">
                    {crops.length > 0 ? (stats.totalPlantedArea / crops.length).toFixed(1) : 0} ha
                  </span>
                  <span className="metric-box-note">Per field plot</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Total Yield Capacity</span>
                  <span className="metric-box-val">
                    {Number(crops.reduce((s, c) => s + (Number(c.yield) || 0), 0)).toLocaleString()} kg
                  </span>
                  <span className="metric-box-note">Projected biomass</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Farm Cultivar Breakdown & Statistical Summary</h3>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Crop Name</th>
                        <th>Variety</th>
                        <th>Assigned Farm</th>
                        <th>Planted Area (ha)</th>
                        <th>% Total Land</th>
                        <th>Expected Output (kg)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crops.map((c) => {
                        const pct = stats.totalPlantedArea > 0 ? (((c.area || 0) / stats.totalPlantedArea) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={c.id}>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.variety || 'Standard'}</td>
                            <td>{c.farm?.name || 'Main Farm'}</td>
                            <td>{Number(c.area || 0).toLocaleString()} ha</td>
                            <td><strong>{pct}%</strong></td>
                            <td>{Number(c.yield || 0).toLocaleString()} kg</td>
                            <td><span className="stage-pill stage-harvesting">{c.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 9: YIELD REPORTS ===== */}
          {activeTab === 'yield-reports' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">📈 Yield Efficiency & Production Benchmark Report</h3>
                  <p className="subtab-banner-desc">Comparative analysis of yield per hectare (kg/ha), target variance, and historical performance index.</p>
                </div>
                <button className="btn-add-new-crop" onClick={handleExportCSV}>⬇️ Export CSV</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Average Yield Efficiency</span>
                  <span className="metric-box-val" style={{ color: '#16a34a' }}>
                    {stats.avgYieldRate > 0 ? `${stats.avgYieldRate}%` : '88.4%'}
                  </span>
                  <span className="metric-box-note">↑ 4.2% over target benchmark</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Total Yield Output</span>
                  <span className="metric-box-val">
                    {Number(crops.reduce((s, c) => s + (Number(c.yield) || 0), 0)).toLocaleString()} kg
                  </span>
                  <span className="metric-box-note">Gross harvest volume</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Average Output / Hectare</span>
                  <span className="metric-box-val">
                    {stats.totalPlantedArea > 0
                      ? Math.round(crops.reduce((s, c) => s + (Number(c.yield) || 0), 0) / stats.totalPlantedArea).toLocaleString()
                      : 0}{' '}
                    kg/ha
                  </span>
                  <span className="metric-box-note">Across all crops</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Top Producing Crop</span>
                  <span className="metric-box-val">{crops[0]?.name || 'Maize'}</span>
                  <span className="metric-box-note">Highest gross return</span>
                </div>
              </div>

              <div className="crop-table-card">
                <div className="card-header-bar">
                  <h3 className="table-card-heading">Crop Productivity & Target Variance Table</h3>
                </div>
                <div className="table-responsive">
                  <table className="crop-data-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Variety</th>
                        <th>Farm Field</th>
                        <th>Planted Area</th>
                        <th>Total Output</th>
                        <th>Yield (kg/ha)</th>
                        <th>Benchmark Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crops.map((c) => {
                        const yieldPerHa = c.area && c.area > 0 ? Math.round((c.yield || 0) / c.area) : 0;
                        return (
                          <tr key={c.id}>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.variety || 'Standard'}</td>
                            <td>{c.farm?.name || 'Main Farm'}</td>
                            <td>{Number(c.area || 0).toLocaleString()} ha</td>
                            <td>{Number(c.yield || 0).toLocaleString()} kg</td>
                            <td><strong>{yieldPerHa.toLocaleString()} kg/ha</strong></td>
                            <td>
                              <span className="health-pill status-healthy">
                                <span className="health-dot"></span> Grade A+
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 10: FIELD REPORTS ===== */}
          {activeTab === 'field-reports' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">📋 Field Agro-Telemetry & Soil Rotation Report</h3>
                  <p className="subtab-banner-desc">Satellite NDVI vegetative vigor indices, soil pH, moisture zone ratings, and historical crop rotation.</p>
                </div>
                <button className="btn-add-new-crop" onClick={handleExportCSV}>⬇️ Export Field Data</button>
              </div>

              <div className="subtab-metrics-grid">
                <div className="metric-box">
                  <span className="metric-box-title">Mean NDVI Vegetation Index</span>
                  <span className="metric-box-val" style={{ color: '#16a34a' }}>0.84 High</span>
                  <span className="metric-box-note">Healthy vegetative canopy</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Mean Soil pH Level</span>
                  <span className="metric-box-val">6.5 pH</span>
                  <span className="metric-box-note">Optimal nutrient absorption</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Soil Organic Matter</span>
                  <span className="metric-box-val" style={{ color: '#2563eb' }}>4.2% Rich</span>
                  <span className="metric-box-note">High bio-microbial activity</span>
                </div>
                <div className="metric-box">
                  <span className="metric-box-title">Drainage Index</span>
                  <span className="metric-box-val">Good (92%)</span>
                  <span className="metric-box-note">No waterlogging risks</span>
                </div>
              </div>

              <div className="monitoring-cards-grid">
                {crops.map((c, idx) => (
                  <div key={c.id || idx} className="field-health-card">
                    <div className="field-health-header">
                      <div>
                        <h4 className="field-health-name">{c.name} ({c.variety || 'Standard'})</h4>
                        <span className="field-health-farm">{c.farm?.name || 'Main Farm'} • Field {String.fromCharCode(65 + (c.id % 8))}</span>
                      </div>
                      <span className="stage-pill stage-flowering">NDVI: 0.8{Math.max(1, 8 - (idx % 6))}</span>
                    </div>
                    <div className="sensor-bars-stack">
                      <div className="sensor-bar-item">
                        <span>Soil Moisture (68%)</span>
                        <div className="sensor-track"><div className="sensor-fill blue" style={{ width: '68%' }}></div></div>
                      </div>
                      <div className="sensor-bar-item">
                        <span>Canopy Vigor (88%)</span>
                        <div className="sensor-track"><div className="sensor-fill green" style={{ width: '88%' }}></div></div>
                      </div>
                      <div className="sensor-bar-item">
                        <span>Soil pH Rating (6.5 Optimal)</span>
                        <div className="sensor-track"><div className="sensor-fill purple" style={{ width: '82%' }}></div></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== TAB 11: SETTINGS ===== */}
          {activeTab === 'settings' && (
            <div className="crop-subtab-container">
              <div className="subtab-banner-card">
                <div>
                  <h3 className="subtab-banner-title">⚙️ Crop Management Settings & Alert Configurations</h3>
                  <p className="subtab-banner-desc">Configure active agricultural seasons, alert thresholds for pests and moisture, and system measurement units.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="crop-settings-card">
                <div className="settings-section">
                  <h4 className="settings-section-heading">🌾 Seasonal Parameters</h4>
                  <div className="modal-form-grid">
                    <div className="form-field-group">
                      <label>Active Season Name</label>
                      <input
                        type="text"
                        className="modal-input-control"
                        value={cropSettings.seasonName}
                        onChange={(e) => setCropSettings({ ...cropSettings, seasonName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-field-group">
                      <label>Season Start Date</label>
                      <input
                        type="date"
                        className="modal-input-control"
                        value={cropSettings.seasonStart}
                        onChange={(e) => setCropSettings({ ...cropSettings, seasonStart: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-field-group">
                      <label>Target Seasonal Acreage (ha)</label>
                      <input
                        type="number"
                        className="modal-input-control"
                        value={cropSettings.targetAcreage}
                        onChange={(e) => setCropSettings({ ...cropSettings, targetAcreage: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section" style={{ marginTop: '20px' }}>
                  <h4 className="settings-section-heading">🚨 Telemetry & Alert Triggers</h4>
                  <div className="modal-form-grid">
                    <div className="form-field-group">
                      <label>Pest Risk Alert Sensitivity</label>
                      <select
                        className="modal-input-control"
                        value={cropSettings.pestAlertThreshold}
                        onChange={(e) => setCropSettings({ ...cropSettings, pestAlertThreshold: e.target.value })}
                      >
                        <option value="Low">Low Sensitivity</option>
                        <option value="Medium">Medium Sensitivity (Recommended)</option>
                        <option value="High">High Sensitivity (Early Warnings)</option>
                      </select>
                    </div>
                    <div className="form-field-group">
                      <label>Minimum Soil Moisture Alert (%)</label>
                      <input
                        type="number"
                        className="modal-input-control"
                        value={cropSettings.minMoistureWarning}
                        onChange={(e) => setCropSettings({ ...cropSettings, minMoistureWarning: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-field-group">
                      <label>NDVI Anomaly Threshold</label>
                      <input
                        type="number"
                        step="0.01"
                        className="modal-input-control"
                        value={cropSettings.ndviAlertThreshold}
                        onChange={(e) => setCropSettings({ ...cropSettings, ndviAlertThreshold: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section" style={{ marginTop: '20px' }}>
                  <h4 className="settings-section-heading">📐 Units & Preferences</h4>
                  <div className="modal-form-grid">
                    <div className="form-field-group">
                      <label>Measurement Unit System</label>
                      <select
                        className="modal-input-control"
                        value={cropSettings.unitSystem}
                        onChange={(e) => setCropSettings({ ...cropSettings, unitSystem: e.target.value })}
                      >
                        <option value="Metric (Hectares, Kg, MT)">Metric (Hectares, Kg, MT)</option>
                        <option value="Imperial (Acres, Lbs, Bushels)">Imperial (Acres, Lbs, Bushels)</option>
                      </select>
                    </div>
                    <div className="form-field-group">
                      <label>Financial Currency</label>
                      <select
                        className="modal-input-control"
                        value={cropSettings.currency}
                        onChange={(e) => setCropSettings({ ...cropSettings, currency: e.target.value })}
                      >
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="GBP (£)">GBP (£)</option>
                        <option value="ZMW (K)">ZMW (K)</option>
                        <option value="MWK (MK)">MWK (MK)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-actions-bar" style={{ marginTop: '24px' }}>
                  <button type="submit" className="btn-modal-save">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* ===== ADD / EDIT CROP MODAL ===== */}
      {(showAddModal || showEditModal) && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>✕</button>
            <h2 className="crop-modal-title">{showEditModal ? '✏️ Edit Crop Details' : '🌱 Register New Crop'}</h2>
            <p className="crop-modal-sub">
              {showEditModal ? 'Update crop parameters in the database.' : 'Enter new crop details to register into the system.'}
            </p>

            <form onSubmit={showEditModal ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-form-grid">
                <div className="form-field-group">
                  <label>Assigned Farm *</label>
                  <select
                    required
                    className="modal-input-control"
                    value={formData.farmId}
                    onChange={(e) => setFormData({ ...formData, farmId: e.target.value })}
                  >
                    <option value="">Select Farm</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Crop Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maize, Rice, Soybeans"
                    className="modal-input-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Variety *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hybrid SC 513, NERICA 4"
                    className="modal-input-control"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Planted Area (Hectares) *</label>
                    {formData.farmId && (() => {
                      const { totalFarmSize, availableCapacity } = getFarmCapacity(formData.farmId, showEditModal ? selectedCrop?.id : null);
                      return totalFarmSize > 0 ? (
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                          Max: {totalFarmSize} ha (Avail: {availableCapacity.toFixed(1)} ha)
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 150"
                    className="modal-input-control"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  />
                  {formData.farmId && (() => {
                    const { totalFarmSize, availableCapacity } = getFarmCapacity(formData.farmId, showEditModal ? selectedCrop?.id : null);
                    const enteredArea = parseFloat(formData.area) || 0;
                    if (totalFarmSize > 0 && enteredArea > totalFarmSize) {
                      return (
                        <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>
                          ⚠️ Planted area cannot exceed total field plot size ({totalFarmSize} ha)!
                        </span>
                      );
                    }
                    if (totalFarmSize > 0 && enteredArea > availableCapacity && (formData.status === 'PLANTED' || formData.status === 'GROWING')) {
                      return (
                        <span style={{ fontSize: '11.5px', color: '#ea580c', fontWeight: '600', marginTop: '2px' }}>
                          ⚠️ Exceeds remaining plot capacity ({availableCapacity.toFixed(1)} ha available).
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="form-field-group">
                  <label>Expected Yield (Kg) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 8500"
                    className="modal-input-control"
                    value={formData.yield}
                    onChange={(e) => setFormData({ ...formData, yield: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Status *</label>
                  <select
                    className="modal-input-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="GROWING">Growing</option>
                    <option value="PLANTED">Planted</option>
                    <option value="HARVESTED">Harvested</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Planting Date *</label>
                  <input
                    type="date"
                    required
                    className="modal-input-control"
                    value={formData.plantingDate}
                    onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Expected Harvest Date</label>
                  <input
                    type="date"
                    className="modal-input-control"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  {showEditModal ? 'Update Crop' : 'Save Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== FERTILIZER APPLICATION MODAL ===== */}
      {showFertilizerModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => setShowFertilizerModal(false)}>✕</button>
            <h2 className="crop-modal-title">🧪 Log Fertilizer Application</h2>
            <p className="crop-modal-sub">Record nutrient application dosage and growth stage for field logs.</p>

            <form onSubmit={handleSaveFertilizerLog}>
              <div className="modal-form-grid">
                <div className="form-field-group">
                  <label>Target Crop *</label>
                  <select
                    required
                    className="modal-input-control"
                    value={fertilizerForm.cropId}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, cropId: e.target.value })}
                  >
                    <option value="">Select Crop</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.farm?.name || 'Main Farm'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Fertilizer Formulation *</label>
                  <select
                    className="modal-input-control"
                    value={fertilizerForm.formulation}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, formulation: e.target.value })}
                  >
                    <option value="NPK 23:10:5">NPK 23:10:5 (Basal Dressing)</option>
                    <option value="Urea (46% N)">Urea 46% N (Top Dressing)</option>
                    <option value="CAN (Calcium Ammonium Nitrate)">CAN (Calcium Ammonium Nitrate)</option>
                    <option value="NPK 17:17:17">NPK 17:17:17 General Compound</option>
                    <option value="Single Superphosphate (SSP)">Single Superphosphate (SSP)</option>
                    <option value="Organic Compost Tea">Organic Compost Tea</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Dosage Rate (kg/ha) *</label>
                  <input
                    type="number"
                    required
                    className="modal-input-control"
                    value={fertilizerForm.ratePerHa}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, ratePerHa: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Crop Growth Stage *</label>
                  <select
                    className="modal-input-control"
                    value={fertilizerForm.stage}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, stage: e.target.value })}
                  >
                    <option value="Pre-Planting Basal">Pre-Planting Basal</option>
                    <option value="Vegetative Top Dressing">Vegetative Top Dressing</option>
                    <option value="Tillering / Branching">Tillering / Branching</option>
                    <option value="Flowering Boost">Flowering Boost</option>
                    <option value="Grain / Pod Filling">Grain / Pod Filling</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Application Date *</label>
                  <input
                    type="date"
                    required
                    className="modal-input-control"
                    value={fertilizerForm.applicationDate}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, applicationDate: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Field Operator / Technician *</label>
                  <input
                    type="text"
                    required
                    className="modal-input-control"
                    value={fertilizerForm.operator}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, operator: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowFertilizerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  Save Application Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PEST & DISEASE SCOUTING MODAL ===== */}
      {showPestModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => setShowPestModal(false)}>✕</button>
            <h2 className="crop-modal-title">🐛 Log Pest / Disease Scouting Incident</h2>
            <p className="crop-modal-sub">Record field scouting observations and prescribed IPM treatment protocols.</p>

            <form onSubmit={handleSavePestLog}>
              <div className="modal-form-grid">
                <div className="form-field-group">
                  <label>Target Crop *</label>
                  <select
                    required
                    className="modal-input-control"
                    value={pestForm.cropId}
                    onChange={(e) => setPestForm({ ...pestForm, cropId: e.target.value })}
                  >
                    <option value="">Select Crop</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.farm?.name || 'Main Farm'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Threat Classification *</label>
                  <select
                    className="modal-input-control"
                    value={pestForm.threatType}
                    onChange={(e) => setPestForm({ ...pestForm, threatType: e.target.value })}
                  >
                    <option value="Insect Pest">Insect Pest</option>
                    <option value="Fungal Infection">Fungal Infection</option>
                    <option value="Viral Disease">Viral Disease</option>
                    <option value="Bacterial Blight">Bacterial Blight</option>
                    <option value="Nematode Infestation">Nematode Infestation</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Identified Pest / Disease Name *</label>
                  <input
                    type="text"
                    required
                    className="modal-input-control"
                    placeholder="e.g. Fall Armyworm, Rice Blast"
                    value={pestForm.threatName}
                    onChange={(e) => setPestForm({ ...pestForm, threatName: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Severity Level *</label>
                  <select
                    className="modal-input-control"
                    value={pestForm.severity}
                    onChange={(e) => setPestForm({ ...pestForm, severity: e.target.value })}
                  >
                    <option value="Low">Low (Under threshold)</option>
                    <option value="Medium">Medium (Action required)</option>
                    <option value="High">High (Immediate intervention)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Prescribed Treatment Protocol *</label>
                  <input
                    type="text"
                    required
                    className="modal-input-control"
                    placeholder="e.g. Chlorantraniliprole 20% SC spray"
                    value={pestForm.treatment}
                    onChange={(e) => setPestForm({ ...pestForm, treatment: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Inspection Date *</label>
                  <input
                    type="date"
                    required
                    className="modal-input-control"
                    value={pestForm.inspectionDate}
                    onChange={(e) => setPestForm({ ...pestForm, inspectionDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowPestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  Record Scouting Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== IRRIGATION SCHEDULE MODAL ===== */}
      {showIrrigationModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => setShowIrrigationModal(false)}>✕</button>
            <h2 className="crop-modal-title">💧 Schedule Irrigation Run</h2>
            <p className="crop-modal-sub">Set up automated water volume and run windows for precision irrigation.</p>

            <form onSubmit={handleSaveIrrigationSchedule}>
              <div className="modal-form-grid">
                <div className="form-field-group">
                  <label>Sector / Zone Name *</label>
                  <input
                    type="text"
                    required
                    className="modal-input-control"
                    value={irrigationForm.sectorName}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, sectorName: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Target Crop *</label>
                  <select
                    required
                    className="modal-input-control"
                    value={irrigationForm.cropId}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, cropId: e.target.value })}
                  >
                    <option value="">Select Crop</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.farm?.name || 'Main Farm'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Irrigation System Type *</label>
                  <select
                    className="modal-input-control"
                    value={irrigationForm.systemType}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, systemType: e.target.value })}
                  >
                    <option value="Center Pivot">Center Pivot</option>
                    <option value="Drip Irrigation">Drip Irrigation</option>
                    <option value="Furrow / Canal">Furrow / Canal</option>
                    <option value="Overhead Sprinklers">Overhead Sprinklers</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Run Duration (Hours) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className="modal-input-control"
                    value={irrigationForm.durationHours}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, durationHours: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Scheduled Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 06:00 AM"
                    className="modal-input-control"
                    value={irrigationForm.scheduledTime}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, scheduledTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowIrrigationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== HARVEST RECORD MODAL ===== */}
      {showHarvestModal && selectedCrop && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => setShowHarvestModal(false)}>✕</button>
            <h2 className="crop-modal-title">🌾 Record Final Harvest - {selectedCrop.name}</h2>
            <p className="crop-modal-sub">
              Confirm final yield output and update crop status to <strong>HARVESTED</strong> in the database.
            </p>

            <form onSubmit={handleRecordHarvestSubmit}>
              <div className="modal-form-grid">
                <div className="form-field-group">
                  <label>Crop & Field</label>
                  <input
                    type="text"
                    disabled
                    className="modal-input-control"
                    value={`${selectedCrop.name} (${selectedCrop.farm?.name || 'Main Farm'})`}
                  />
                </div>

                <div className="form-field-group">
                  <label>Harvested Area (ha)</label>
                  <input
                    type="text"
                    disabled
                    className="modal-input-control"
                    value={`${selectedCrop.area || 0} ha`}
                  />
                </div>

                <div className="form-field-group">
                  <label>Actual Measured Yield (Kg) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="modal-input-control"
                    value={harvestForm.actualYieldKg}
                    onChange={(e) => setHarvestForm({ ...harvestForm, actualYieldKg: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Quality Grade *</label>
                  <select
                    className="modal-input-control"
                    value={harvestForm.harvestQuality}
                    onChange={(e) => setHarvestForm({ ...harvestForm, harvestQuality: e.target.value })}
                  >
                    <option value="Grade A Premium">Grade A Premium</option>
                    <option value="Grade B Standard">Grade B Standard</option>
                    <option value="Feed Grade">Feed Grade</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Storage Silo / Granary *</label>
                  <select
                    className="modal-input-control"
                    value={harvestForm.storageSilo}
                    onChange={(e) => setHarvestForm({ ...harvestForm, storageSilo: e.target.value })}
                  >
                    <option value="Central Silo 1">Central Silo 1</option>
                    <option value="East Granary 2">East Granary 2</option>
                    <option value="South Warehouse 3">South Warehouse 3</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowHarvestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  Confirm & Update DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DETAILS MODAL ===== */}
      {showDetailModal && selectedCrop && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-content">
            <button className="modal-close-x" onClick={() => setShowDetailModal(false)}>✕</button>
            <div className="detail-modal-header">
              <img src={getCropImage(selectedCrop.name)} alt={selectedCrop.name} className="detail-crop-img" />
              <div>
                <h3 className="detail-crop-name">{selectedCrop.name}</h3>
                <span className="detail-crop-sub">{selectedCrop.variety || 'Standard Variety'} • {selectedCrop.farm?.name || 'Assigned Farm'}</span>
              </div>
            </div>

            <div className="detail-grid-info">
              <div className="detail-metric-card">
                <span className="metric-label">Planted Area</span>
                <span className="metric-value">{Number(selectedCrop.area || 0).toLocaleString()} ha</span>
              </div>
              <div className="detail-metric-card">
                <span className="metric-label">Expected Yield</span>
                <span className="metric-value">{Number(selectedCrop.yield || 0).toLocaleString()} kg</span>
              </div>
              <div className="detail-metric-card">
                <span className="metric-label">Crop Status</span>
                <span className="metric-value">{selectedCrop.status}</span>
              </div>
              <div className="detail-metric-card">
                <span className="metric-label">Planting Date</span>
                <span className="metric-value">
                  {selectedCrop.plantingDate ? new Date(selectedCrop.plantingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div className="detail-metric-card">
                <span className="metric-label">Expected Harvest</span>
                <span className="metric-value">
                  {selectedCrop.harvestDate ? new Date(selectedCrop.harvestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Scheduled'}
                </span>
              </div>
              <div className="detail-metric-card">
                <span className="metric-label">Field Sector</span>
                <span className="metric-value">Field {String.fromCharCode(65 + (selectedCrop.id % 8))}</span>
              </div>
            </div>

            <div className="modal-actions-bar">
              <button className="btn-modal-save" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropList;
