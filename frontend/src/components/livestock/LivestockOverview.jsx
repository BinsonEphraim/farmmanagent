import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import './LivestockOverview.css';

const formatStatus = (status) => {
  if (!status) return 'Healthy';
  const value = String(status).toUpperCase();
  if (value.includes('TREAT')) return 'Under Treatment';
  if (value.includes('QUAR')) return 'Quarantined';
  if (value.includes('SICK')) return 'Sick';
  if (value.includes('HEALTH')) return 'Healthy';
  return status;
};

const getStatusClass = (status) => {
  const value = String(status || 'HEALTHY').toUpperCase();
  if (value.includes('TREAT')) return 'status-under-treatment';
  if (value.includes('SICK')) return 'status-sick';
  if (value.includes('QUAR')) return 'status-quarantined';
  return 'status-healthy';
};

// 🆕 Add Animal Modal Component
const AddAnimalModal = ({ isOpen, onClose, onAdd, farms }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    farmId: '',
    age: '',
    weight: '',
    healthStatus: 'HEALTHY',
    tagId: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAdd(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        type: '',
        breed: '',
        farmId: '',
        age: '',
        weight: '',
        healthStatus: 'HEALTHY',
        tagId: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to add animal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="lv-modal-overlay" onClick={onClose}>
      <div className="lv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lv-modal-header">
          <h2>Add New Animal</h2>
          <button className="lv-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="lv-modal-form">
          <div className="lv-form-grid">
            <div className="lv-form-group">
              <label>Animal Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Daisy"
                required
              />
            </div>

            <div className="lv-form-group">
              <label>Species *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select Species</option>
                <option value="CATTLE">Cattle</option>
                <option value="GOAT">Goat</option>
                <option value="SHEEP">Sheep</option>
                <option value="PIG">Pig</option>
                <option value="POULTRY">Poultry</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="lv-form-group">
              <label>Breed</label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                placeholder="e.g., Holstein"
              />
            </div>

            <div className="lv-form-group">
              <label>Farm *</label>
              <select
                name="farmId"
                value={formData.farmId}
                onChange={handleChange}
                required
              >
                <option value="">Select Farm</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lv-form-group">
              <label>Age (years)</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g., 3"
                min="0"
                step="0.5"
              />
            </div>

            <div className="lv-form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 450"
                min="0"
                step="0.1"
              />
            </div>

            <div className="lv-form-group">
              <label>Tag ID</label>
              <input
                type="text"
                name="tagId"
                value={formData.tagId}
                onChange={handleChange}
                placeholder="e.g., TAG-2024-001"
              />
            </div>

            <div className="lv-form-group">
              <label>Health Status</label>
              <select
                name="healthStatus"
                value={formData.healthStatus}
                onChange={handleChange}
              >
                <option value="HEALTHY">Healthy</option>
                <option value="SICK">Sick</option>
                <option value="UNDER_TREATMENT">Under Treatment</option>
                <option value="QUARANTINED">Quarantined</option>
              </select>
            </div>

            <div className="lv-form-group full-width">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional information about the animal..."
                rows="3"
              />
            </div>
          </div>

          <div className="lv-modal-footer">
            <button type="button" className="lv-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="lv-btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LivestockOverview = () => {
  const location = useLocation();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchLivestock = async () => {
    try {
      setLoading(true);
      const data = await farmService.getAllFarms();
      if (Array.isArray(data)) {
        setFarms(data);
      }
    } catch (err) {
      console.error('Failed to load livestock data:', err);
      setError('Unable to load livestock records from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivestock();
  }, []);

  const animals = useMemo(() => {
    return farms.flatMap((farm) =>
      (farm.animals || []).map((animal) => ({
        ...animal,
        farmName: farm.name,
        farmId: farm.id,
      }))
    );
  }, [farms]);

  const filteredAnimals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return animals;

    return animals.filter((animal) => {
      const haystack = [
        animal.name,
        animal.breed,
        animal.type,
        animal.farmName,
        animal.healthStatus,
        animal.tagId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [animals, searchTerm]);

  const stats = useMemo(() => {
    const totalAnimals = animals.length;
    const healthy = animals.filter((animal) => String(animal.healthStatus || 'HEALTHY').toUpperCase() === 'HEALTHY').length;
    const sick = animals.filter((animal) => String(animal.healthStatus || '').toUpperCase().includes('SICK')).length;
    const underTreatment = animals.filter((animal) => String(animal.healthStatus || '').toUpperCase().includes('TREAT')).length;
    const quarantined = animals.filter((animal) => String(animal.healthStatus || '').toUpperCase().includes('QUAR')).length;
    const totalWeight = animals.reduce((sum, animal) => sum + (Number(animal.weight) || 0), 0);

    return {
      totalAnimals,
      healthy,
      sick,
      underTreatment,
      quarantined,
      totalWeight,
    };
  }, [animals]);

  // Handle adding a new animal through the real backend API
  const handleAddAnimal = async (animalData) => {
    try {
      setIsAdding(true);
      setError('');

      const farmId = Number(animalData.farmId);
      if (!farmId) {
        throw new Error('Please select a farm before saving the animal.');
      }

      const payload = {
        name: animalData.name?.trim(),
        type: String(animalData.type || 'CATTLE').toUpperCase(),
        breed: animalData.breed?.trim() || null,
        age: animalData.age !== '' && animalData.age !== null && animalData.age !== undefined
          ? Number(animalData.age)
          : null,
        healthStatus: String(animalData.healthStatus || 'HEALTHY').toUpperCase(),
        farmId,
      };

      if (!payload.name) {
        throw new Error('Animal name is required.');
      }

      await farmService.createAnimal(payload);
      await fetchLivestock();
    } catch (error) {
      console.error('Failed to add animal:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to add animal. Please try again.';
      setError(message);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const handleExportCSV = () => {
    const rowsToExport = filteredAnimals.length > 0 ? filteredAnimals : animals;

    if (rowsToExport.length === 0) {
      alert('No livestock data to export');
      return;
    }

    const headers = ['Animal ID', 'Species', 'Breed', 'Farm', 'Age', 'Health Status', 'Weight (kg)', 'Tag ID'];
    const rows = rowsToExport.map((animal) => [
      `"${animal.name || `AN-${animal.id}`}"`,
      `"${animal.type || 'N/A'}"`,
      `"${animal.breed || 'N/A'}"`,
      `"${animal.farmName || 'Unassigned'}"`,
      animal.age ? `${animal.age} yrs` : 'N/A',
      `"${formatStatus(animal.healthStatus)}"`,
      animal.weight ? `${animal.weight} kg` : 'N/A',
      `"${animal.tagId || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUrl = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUrl);
    link.setAttribute('download', `ufms_livestock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Livestock Management', path: '/animals', icon: '🐄' },
  ];

  return (
    <div className="lv-page">
      <aside className="lv-sidebar">
        <div className="lv-brand">
          <div className="lv-brand-mark">UFMS</div>
          <div className="lv-brand-text">
            <span>Unified Farm</span>
            <small>Management System</small>
          </div>
        </div>

        <nav className="lv-nav">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`lv-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="lv-user-card">
          <div className="lv-user-avatar">AU</div>
          <div className="lv-user-info">
            <strong>Admin User</strong>
            <small>System Administrator</small>
          </div>
        </div>
      </aside>

      <main className="lv-main">
        <header className="lv-topbar">
          <div className="lv-header-left">
            <button className="lv-menu-btn" aria-label="Toggle menu">☰</button>
            <h1>Livestock Management</h1>
          </div>

          <div className="lv-header-right">
            <Link to="/dashboard" className="lv-back-link">← Back</Link>
            <div className="lv-searchbox">
              <span>⌕</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search livestock, tag ID, breed, farm..."
              />
            </div>
            {/* 🔄 Removed the button from here */}
          </div>
        </header>

        <section className="lv-overview-header">
          <h2>Livestock Management</h2>
          <p>Manage and monitor all livestock across your farms.</p>
        </section>

        {error && <div className="lv-error-box">{error}</div>}

        <section className="lv-stats-grid">
          <div className="lv-stat-card">
            <div className="lv-stat-icon green">🐄</div>
            <div className="lv-stat-copy">
              <strong>{loading ? '...' : stats.totalAnimals}</strong>
              <span>Total Livestock</span>
              <small>{stats.totalAnimals > 0 ? `${stats.healthy} healthy` : 'No records yet'}</small>
            </div>
          </div>

          <div className="lv-stat-card">
            <div className="lv-stat-icon blue">♂</div>
            <div className="lv-stat-copy">
              <strong>{loading ? '...' : stats.healthy}</strong>
              <span>Healthy</span>
              <small>{stats.healthy > 0 ? 'Active and monitored' : 'Awaiting health records'}</small>
            </div>
          </div>

          <div className="lv-stat-card">
            <div className="lv-stat-icon orange">♀</div>
            <div className="lv-stat-copy">
              <strong>{loading ? '...' : stats.sick}</strong>
              <span>Sick</span>
              <small>{stats.sick > 0 ? 'Needs attention' : 'No sick animals'}</small>
            </div>
          </div>

          <div className="lv-stat-card">
            <div className="lv-stat-icon purple">⚖</div>
            <div className="lv-stat-copy">
              <strong>{loading ? '...' : stats.totalWeight}</strong>
              <span>Total Weight</span>
              <small>{stats.totalWeight > 0 ? 'kg across all animals' : 'No weight data yet'}</small>
            </div>
          </div>
        </section>

        <section className="lv-main-grid">
          <div className="lv-table-panel">
            <div className="lv-toolbar">
              <div className="lv-filter-row">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Search animals..." 
                />
                <select defaultValue="All Farms">
                  <option>All Farms</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
                <select defaultValue="All Species">
                  <option>All Species</option>
                  {[...new Set(animals.map(a => a.type).filter(Boolean))].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select defaultValue="All Status">
                  <option>All Status</option>
                  <option>Healthy</option>
                  <option>Sick</option>
                  <option>Under Treatment</option>
                  <option>Quarantined</option>
                </select>
              </div>
              <button className="lv-soft-btn" onClick={handleExportCSV}>Export</button>
            </div>

            <div className="lv-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Animal ID</th>
                    <th>Species</th>
                    <th>Breed</th>
                    <th>Farm</th>
                    <th>Age</th>
                    <th>Status</th>
                    <th>Weight</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="lv-empty-cell">Loading livestock records...</td>
                    </tr>
                  ) : filteredAnimals.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="lv-empty-cell">
                        No livestock records yet. Add an animal from a farm to populate this overview.
                      </td>
                    </tr>
                  ) : (
                    filteredAnimals.map((animal) => (
                      <tr key={animal.id}>
                        <td>{animal.name || `AN-${animal.id}`}</td>
                        <td>{animal.type || 'N/A'}</td>
                        <td>{animal.breed || 'N/A'}</td>
                        <td>{animal.farmName || 'Unassigned'}</td>
                        <td>{animal.age ? `${animal.age} yrs` : 'N/A'}</td>
                        <td>
                          <span className={`lv-status-pill ${getStatusClass(animal.healthStatus)}`}>
                            {formatStatus(animal.healthStatus)}
                          </span>
                        </td>
                        <td>{animal.weight ? `${animal.weight} kg` : 'N/A'}</td>
                        <td className="lv-actions">
                          <button className="lv-action-icon">✎</button>
                          <button className="lv-action-icon">🗑</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 🆕 Add Animal Button moved here - below the table */}
            <div className="lv-table-footer">
              <div className="lv-table-info">
                Showing {filteredAnimals.length} of {animals.length} animals
              </div>
              <button 
                className="lv-add-animal-btn" 
                onClick={() => setIsModalOpen(true)}
                disabled={farms.length === 0}
                title={farms.length === 0 ? "Please create a farm first" : ""}
              >
                <span>➕</span> Add New Animal
              </button>
            </div>
          </div>

          <aside className="lv-side-panel">
            <div className="lv-side-card">
              <h3>Livestock by Species</h3>
              <div className="lv-donut-wrap">
                <div className="lv-donut" aria-label="Livestock distribution placeholder">
                  <div className="lv-donut-inner">
                    {animals.length || 0}
                  </div>
                </div>
              </div>
              <ul className="lv-legend">
                {['Cattle', 'Goat', 'Sheep', 'Pig', 'Chicken'].map((label) => {
                  const count = animals.filter((animal) => 
                    String(animal.type || '').toLowerCase() === label.toLowerCase()
                  ).length;
                  return count > 0 ? (
                    <li key={label}>
                      <span className="legend-dot" style={{ 
                        background: ['#2ecc71', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'][
                          ['Cattle', 'Goat', 'Sheep', 'Pig', 'Chicken'].indexOf(label)
                        ] 
                      }} />
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </li>
                  ) : null;
                })}
                <li>
                  <span className="legend-dot" style={{ background: '#9ca3af' }} />
                  <span>Others</span>
                  <strong>
                    {animals.filter(a => 
                      !['cattle', 'goat', 'sheep', 'pig', 'chicken']
                        .includes(String(a.type || '').toLowerCase())
                    ).length}
                  </strong>
                </li>
              </ul>
            </div>

            <div className="lv-side-card">
              <h3>Livestock by Status</h3>
              <ul className="lv-status-list">
                {[
                  ['Healthy', stats.healthy],
                  ['Sick', stats.sick],
                  ['Under Treatment', stats.underTreatment],
                  ['Quarantined', stats.quarantined],
                ].map(([label, value]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lv-side-card">
              <h3>Recent Activities</h3>
              {animals.length === 0 ? (
                <p className="lv-empty-activity">No livestock activity yet. Activity will appear here when records are entered.</p>
              ) : (
                <ul className="lv-activity-list">
                  {animals.slice(-3).reverse().map((animal) => (
                    <li key={animal.id}>
                      <span className="activity-icon">✓</span>
                      <div>
                        <strong>{animal.name || 'Animal Record'}</strong>
                        <small>{animal.farmName || 'Farm'} • {formatStatus(animal.healthStatus)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* 🆕 Add Animal Modal */}
      <AddAnimalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddAnimal}
        farms={farms}
      />
    </div>
  );
};

export default LivestockOverview;