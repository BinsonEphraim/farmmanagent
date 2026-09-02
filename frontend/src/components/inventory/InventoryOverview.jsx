import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import './InventoryOverview.css';

const formatStockStatus = (item) => {
  const qty = Number(item.quantity ?? 0);
  const min = Number(item.minStock ?? 0);

  if (qty === 0) return 'Out of Stock';
  if (qty <= min) return 'Low Stock';
  return 'Healthy';
};

const getStockClass = (item) => {
  const qty = Number(item.quantity ?? 0);
  const min = Number(item.minStock ?? 0);

  if (qty === 0) return 'status-out';
  if (qty <= min) return 'status-low';
  return 'status-healthy';
};

const AddInventoryModal = ({ isOpen, onClose, onAdd, farms }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: 'units',
    minStock: '',
    farmId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onAdd(formData);
      onClose();
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: 'units',
        minStock: '',
        farmId: '',
      });
    } catch (error) {
      console.error('Failed to add inventory item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="inventory-modal-overlay" onClick={onClose}>
      <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-modal-header">
          <h2>Add Inventory Item</h2>
          <button className="inventory-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="inventory-modal-form">
          <div className="inventory-form-grid">
            <div className="inventory-form-group">
              <label>Item Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Organic Feed"
                required
              />
            </div>

            <div className="inventory-form-group">
              <label>Category *</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Feed, Fertilizer"
                required
              />
            </div>

            <div className="inventory-form-group">
              <label>Farm *</label>
              <select
                name="farmId"
                value={formData.farmId}
                onChange={handleChange}
                required
              >
                <option value="">Select Farm</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </div>

            <div className="inventory-form-group">
              <label>Unit</label>
              <select name="unit" value={formData.unit} onChange={handleChange}>
                <option value="units">Units</option>
                <option value="kg">kg</option>
                <option value="bags">Bags</option>
                <option value="liters">Liters</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>

            <div className="inventory-form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.1"
                required
              />
            </div>

            <div className="inventory-form-group">
              <label>Minimum Stock</label>
              <input
                type="number"
                name="minStock"
                value={formData.minStock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="inventory-modal-footer">
            <button type="button" className="inventory-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inventory-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InventoryOverview = () => {
  const location = useLocation();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await farmService.getAllFarms();
      setFarms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setError('Unable to load inventory records from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddInventory = async (itemData) => {
    try {
      setError('');
      const farmId = Number(itemData.farmId);
      if (!farmId) {
        throw new Error('Please select a farm before saving the inventory item.');
      }

      const payload = {
        name: itemData.name?.trim(),
        category: itemData.category?.trim() || 'General',
        quantity: Number(itemData.quantity ?? 0),
        unit: itemData.unit || 'units',
        minStock: itemData.minStock !== '' && itemData.minStock !== null && itemData.minStock !== undefined
          ? Number(itemData.minStock)
          : 0,
        farmId,
      };

      if (!payload.name) {
        throw new Error('Inventory item name is required.');
      }

      await farmService.createInventory(payload);
      await fetchInventory();
    } catch (error) {
      console.error('Failed to add inventory item:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to add inventory item. Please try again.';
      setError(message);
      throw error;
    }
  };

  const handleExportCSV = () => {
    const rowsToExport = filteredItems.length > 0 ? filteredItems : inventoryItems;

    if (rowsToExport.length === 0) {
      alert('No inventory data to export');
      return;
    }

    const headers = ['ID', 'Item Name', 'Category', 'Farm', 'Quantity', 'Unit', 'Min Stock', 'Status'];
    const rows = rowsToExport.map((item) => [
      item.id,
      `"${item.name || ''}"`,
      `"${item.category || ''}"`,
      `"${item.farmName || ''}"`,
      Number(item.quantity ?? 0),
      `"${item.unit || 'units'}"`,
      Number(item.minStock ?? 0),
      `"${formatStockStatus(item)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUrl = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUrl);
    link.setAttribute('download', `ufms_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inventoryItems = useMemo(() => {
    return farms.flatMap((farm) =>
      (farm.inventory || []).map((item) => ({
        ...item,
        farmName: farm.name,
        farmId: farm.id,
      }))
    );
  }, [farms]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return inventoryItems;

    return inventoryItems.filter((item) => {
      const haystack = [
        item.name,
        item.category,
        item.unit,
        item.farmName,
        item.quantity,
        item.minStock,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [inventoryItems, searchTerm]);

  const stats = useMemo(() => {
    const totalItems = inventoryItems.length;
    const lowStock = inventoryItems.filter((item) => Number(item.quantity ?? 0) <= Number(item.minStock ?? 0)).length;
    const outOfStock = inventoryItems.filter((item) => Number(item.quantity ?? 0) === 0).length;
    const totalUnits = inventoryItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
    const totalCategories = new Set(inventoryItems.map((item) => item.category).filter(Boolean)).size;

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalUnits,
      totalCategories,
    };
  }, [inventoryItems]);

  const categoryBreakdown = useMemo(() => {
    const map = {};

    inventoryItems.forEach((item) => {
      const label = item.category || 'Other';
      map[label] = (map[label] || 0) + Number(item.quantity || 0);
    });

    return Object.entries(map)
      .map(([name, value], index) => ({
        name,
        value,
        color: ['#1f9d6a', '#6aa84f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6],
      }))
      .sort((a, b) => b.value - a.value);
  }, [inventoryItems]);

  const statusBreakdown = useMemo(() => {
    return [
      { name: 'Healthy', value: inventoryItems.filter((item) => Number(item.quantity ?? 0) > Number(item.minStock ?? 0)).length },
      { name: 'Low Stock', value: inventoryItems.filter((item) => Number(item.quantity ?? 0) <= Number(item.minStock ?? 0) && Number(item.quantity ?? 0) > 0).length },
      { name: 'Out of Stock', value: inventoryItems.filter((item) => Number(item.quantity ?? 0) === 0).length },
    ];
  }, [inventoryItems]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Inventory', path: '/inventory', icon: '📦' },
  ];

  return (
    <div className="inventory-page">
      <aside className="inventory-sidebar">
        <div className="inventory-brand">
          <div className="inventory-brand-mark">UFMS</div>
          <div className="inventory-brand-text">
            <span>Unified Farm</span>
            <small>Management System</small>
          </div>
        </div>

        <nav className="inventory-nav">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`inventory-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="inventory-user-card">
          <div className="inventory-user-avatar">AU</div>
          <div className="inventory-user-info">
            <strong>Admin User</strong>
            <small>System Administrator</small>
          </div>
        </div>
      </aside>

      <main className="inventory-main">
        <header className="inventory-topbar">
          <div className="inventory-header-left">
            <Link to="/dashboard" className="inventory-back-link">← Back</Link>
            <h1>Inventory Management</h1>
          </div>

          <div className="inventory-header-right">
            <div className="inventory-searchbox">
              <span>⌕</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory, category, farm..."
              />
            </div>
          </div>
        </header>

        <section className="inventory-overview-header">
          <h2>Inventory Management</h2>
          <p>Track stock, monitor restocking needs, and manage every farm item in real time.</p>
        </section>

        {error && <div className="inventory-error-box">{error}</div>}

        <section className="inventory-stats-grid">
          <div className="inventory-stat-card">
            <div className="inventory-stat-icon green">📦</div>
            <div className="inventory-stat-copy">
              <strong>{loading ? '...' : stats.totalItems}</strong>
              <span>Total Inventory</span>
              <small>{stats.totalItems > 0 ? `${stats.totalCategories} categories` : 'No records yet'}</small>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon blue">✓</div>
            <div className="inventory-stat-copy">
              <strong>{loading ? '...' : stats.totalUnits}</strong>
              <span>Total Units</span>
              <small>{stats.totalUnits > 0 ? 'Across all farms' : 'No stock data yet'}</small>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon orange">⚠</div>
            <div className="inventory-stat-copy">
              <strong>{loading ? '...' : stats.lowStock}</strong>
              <span>Low Stock</span>
              <small>{stats.lowStock > 0 ? 'Reorder soon' : 'Stock levels healthy'}</small>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-icon red">⛔</div>
            <div className="inventory-stat-copy">
              <strong>{loading ? '...' : stats.outOfStock}</strong>
              <span>Out of Stock</span>
              <small>{stats.outOfStock > 0 ? 'Needs urgent action' : 'No empty items'}</small>
            </div>
          </div>
        </section>

        <section className="inventory-main-grid">
          <div className="inventory-table-panel">
            <div className="inventory-toolbar">
              <div className="inventory-filter-row">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                />
                <select defaultValue="All Farms">
                  <option>All Farms</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
                <select defaultValue="All Categories">
                  <option>All Categories</option>
                  {[...new Set(inventoryItems.map((item) => item.category).filter(Boolean))].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select defaultValue="All Status">
                  <option>All Status</option>
                  <option>Healthy</option>
                  <option>Low Stock</option>
                  <option>Out of Stock</option>
                </select>
              </div>
              <button className="inventory-soft-btn" onClick={handleExportCSV}>Export</button>
            </div>

            <div className="inventory-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Farm</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Min Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="inventory-empty-cell">Loading inventory records...</td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="inventory-empty-cell">
                        No inventory records yet. Add stock entries from a farm to populate this overview.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={`${item.farmId}-${item.id}`}>
                        <td>{item.name || 'Unnamed item'}</td>
                        <td>{item.category || 'General'}</td>
                        <td>{item.farmName || 'Unassigned'}</td>
                        <td>{Number(item.quantity ?? 0)}</td>
                        <td>{item.unit || 'units'}</td>
                        <td>{Number(item.minStock ?? 0)}</td>
                        <td>
                          <span className={`inventory-status-pill ${getStockClass(item)}`}>
                            {formatStockStatus(item)}
                          </span>
                        </td>
                        <td className="inventory-actions">
                          <button className="inventory-action-icon" aria-label="Edit item">✎</button>
                          <button className="inventory-action-icon" aria-label="Delete item">🗑</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="inventory-table-footer">
              <div className="inventory-table-info">
                Showing {filteredItems.length} of {inventoryItems.length} inventory items
              </div>
              <button
                className="inventory-add-btn"
                disabled={farms.length === 0}
                onClick={() => setIsModalOpen(true)}
                title={farms.length === 0 ? 'Please create a farm first' : ''}
              >
                <span>➕</span> Add Inventory Item
              </button>
            </div>
          </div>

          <aside className="inventory-side-panel">
            <div className="inventory-side-card">
              <h3>Inventory by Category</h3>
              <div className="inventory-donut-wrap">
                <div className="inventory-donut" aria-label="Inventory distribution">
                  <div className="inventory-donut-inner">{categoryBreakdown.length || 0}</div>
                </div>
              </div>
              <ul className="inventory-legend">
                {categoryBreakdown.slice(0, 5).map((item) => (
                  <li key={item.name}>
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <strong>{Number(item.value).toLocaleString()}</strong>
                  </li>
                ))}
                {categoryBreakdown.length === 0 && (
                  <li>
                    <span className="legend-dot" style={{ background: '#cbd5e1' }} />
                    <span>No data</span>
                    <strong>0</strong>
                  </li>
                )}
              </ul>
            </div>

            <div className="inventory-side-card">
              <h3>Inventory by Status</h3>
              <ul className="inventory-status-list">
                {statusBreakdown.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="inventory-side-card">
              <h3>Recent Activity</h3>
              {inventoryItems.length === 0 ? (
                <p className="inventory-empty-activity">No inventory activity yet. Stock updates will appear here when items are added.</p>
              ) : (
                <ul className="inventory-activity-list">
                  {inventoryItems.slice(-3).reverse().map((item) => (
                    <li key={`${item.farmId}-${item.id}`}>
                      <span className="activity-icon">✓</span>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.farmName || 'Farm'} • {Number(item.quantity ?? 0)} {item.unit || 'units'}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>

      <AddInventoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddInventory}
        farms={farms}
      />
    </div>
  );
};

export default InventoryOverview;
