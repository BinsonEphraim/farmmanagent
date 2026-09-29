import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storekeeperService } from '../../services/storekeeperService';
import { useAuth } from '../../context/AuthContext';
import './StorekeeperDashboard.css';
import LogoutButton from '../common/LogoutButton';

const StorekeeperDashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  // Stock Movement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    name: '',
    category: 'Fertilizer',
    quantity: '',
    unit: 'Bags (50kg)',
    type: 'STOCK_IN',
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await storekeeperService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error loading storekeeper dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!movementForm.name || !movementForm.quantity) {
        showToast('Please enter item name and quantity', 'error');
        return;
      }
      await storekeeperService.logStockMovement(movementForm);
      showToast(`Stock movement recorded successfully!`);
      setIsModalOpen(false);
      setMovementForm({ name: '', category: 'Fertilizer', quantity: '', unit: 'Bags (50kg)', type: 'STOCK_IN' });
      loadData();
    } catch (err) {
      showToast('Failed to record stock movement', 'error');
    }
  };

  return (
    <div className="sk-page-layout">
      {/* TOAST */}
      {toastMsg && (
        <div className={`sk-toast toast-${toastMsg.type}`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`sk-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sk-sidebar-brand">
          <div className="sk-brand-icon">📦</div>
          {sidebarOpen && (
            <div className="sk-brand-text">
              <span className="sk-brand-title">UFMS</span>
              <span className="sk-brand-sub">Store & Inventory</span>
            </div>
          )}
        </div>

        <nav className="sk-sidebar-nav">
          <div className="sk-nav-section">INVENTORY CONTROL</div>
          <Link to="/dashboard" className="sk-nav-link active">
            <span className="sk-nav-icon">📊</span>
            {sidebarOpen && <span>Store Dashboard</span>}
          </Link>
          <Link to="/inventory" className="sk-nav-link">
            <span className="sk-nav-icon">📦</span>
            {sidebarOpen && <span>Full Stock Catalog</span>}
          </Link>
          <button className="sk-nav-link btn-link" onClick={() => setIsModalOpen(true)}>
            <span className="sk-nav-icon">🔄</span>
            {sidebarOpen && <span>Log Stock In / Out</span>}
          </button>
          <Link to="/equipment" className="sk-nav-link">
            <span className="sk-nav-icon">🔧</span>
            {sidebarOpen && <span>Tools & Machinery Parts</span>}
          </Link>

          <div className="sk-nav-section">SYSTEM</div>
          <Link to="/settings" className="sk-nav-link">
            <span className="sk-nav-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* User Profile */}
        {sidebarOpen && (
          <div className="sk-bottom-profile">
            <img
              src={`https://ui-avatars.com/api/?name=Central+Storekeeper&background=10b981&color=fff&bold=true`}
              alt="Storekeeper"
              className="sk-avatar"
            />
            <div className="sk-profile-meta">
              <span className="sk-name">Central Storekeeper</span>
              <span className="sk-role">Inventory Officer</span>
              <span className="sk-status-pill">
                <span className="sk-status-dot"></span> Active
              </span>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER */}
      <div className="sk-main-container">
        {/* TOPBAR */}
        <header className="sk-topbar">
          <div className="sk-topbar-left">
            <button className="sk-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="sk-topbar-titles">
              <h1 className="sk-heading">Storekeeper & Inventory Management</h1>
              <p className="sk-subheading">Stock levels, fertilizers, certified seeds, agrochemicals, and stock movements.</p>
            </div>
          </div>

          <div className="sk-topbar-right">
            <button className="btn-sk-action" onClick={() => setIsModalOpen(true)}>
              + Log Stock In / Out
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="sk-content-body">
          {/* 4 TOP KPI CARDS */}
          <div className="sk-kpi-grid">
            <div className="sk-kpi-card">
              <div className="sk-kpi-icon green">📦</div>
              <div className="sk-kpi-data">
                <span className="sk-kpi-label">Active Stock Items</span>
                <span className="sk-kpi-val">{data?.summary?.totalSKUs || 8} SKUs</span>
                <span className="sk-kpi-sub">Fertilizers, Seeds, Chemicals</span>
              </div>
            </div>

            <div className="sk-kpi-card">
              <div className="sk-kpi-icon amber">⚠️</div>
              <div className="sk-kpi-data">
                <span className="sk-kpi-label">Low Stock Alerts</span>
                <span className="sk-kpi-val">{data?.summary?.lowStockCount || 2} Items Low</span>
                <span className="sk-kpi-sub">Reorder threshold reached</span>
              </div>
            </div>

            <div className="sk-kpi-card">
              <div className="sk-kpi-icon blue">💰</div>
              <div className="sk-kpi-data">
                <span className="sk-kpi-label">Total Inventory Value</span>
                <span className="sk-kpi-val">${(data?.summary?.totalValuation || 48650).toLocaleString()}</span>
                <span className="sk-kpi-sub">Audited Depot Stock</span>
              </div>
            </div>

            <div className="sk-kpi-card">
              <div className="sk-kpi-icon purple">📍</div>
              <div className="sk-kpi-data">
                <span className="sk-kpi-label">Active Storage Depots</span>
                <span className="sk-kpi-val">{data?.summary?.activeDepots || 5} Depots</span>
                <span className="sk-kpi-sub">Central Store & Farm Barns</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN SECTION: STOCK TABLE & RECENT MOVEMENTS */}
          <div className="sk-2col-layout">
            {/* STOCK INVENTORY TABLE */}
            <div className="sk-widget-card">
              <div className="sk-card-header">
                <h3 className="sk-card-title">Stock Levels by Category</h3>
                <Link to="/inventory" className="sk-link">View Full Catalog →</Link>
              </div>
              <div className="sk-table-wrap">
                <table className="sk-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th>Category</th>
                      <th>Current Quantity</th>
                      <th>Depot Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.stockItems?.map((item) => {
                      const isLow = item.quantity <= (item.minStock || 30);
                      return (
                        <tr key={item.id}>
                          <td className="item-name-cell">{item.name}</td>
                          <td>
                            <span className="category-pill">{item.category}</span>
                          </td>
                          <td className="qty-cell">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td>{item.farm?.name || 'Main Store'}</td>
                          <td>
                            <span className={`stock-status-pill ${isLow ? 'low' : 'optimal'}`}>
                              {isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECENT MOVEMENTS */}
            <div className="sk-widget-card">
              <div className="sk-card-header">
                <h3 className="sk-card-title">Recent Stock Movements</h3>
                <span className="sk-badge-count">Audit Log</span>
              </div>
              <div className="sk-movements-stack">
                {data?.recentMovements?.map((m) => (
                  <div key={m.id} className="sk-movement-item">
                    <div className="mov-left">
                      <span className={`mov-badge ${m.type.toLowerCase()}`}>
                        {m.type === 'STOCK_IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                      <div className="mov-text">
                        <span className="mov-title">{m.item}</span>
                        <span className="mov-dest">To/From: {m.destination}</span>
                      </div>
                    </div>
                    <div className="mov-right">
                      <span className={`mov-qty ${m.type === 'STOCK_IN' ? 'green' : 'orange'}`}>
                        {m.quantity}
                      </span>
                      <span className="mov-date">{m.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STOCK MOVEMENT MODAL ===== */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="sk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sk-modal-header">
              <h2>Record Stock Movement</h2>
              <button className="sk-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleMovementSubmit} className="sk-modal-form">
              <div className="form-group">
                <label>Movement Type *</label>
                <select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                >
                  <option value="STOCK_IN">Stock IN (Supplier Delivery / Replenishment)</option>
                  <option value="STOCK_OUT">Stock OUT (Field Issuance / Farm Usage)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DAP Compound Fertilizer"
                  value={movementForm.name}
                  onChange={(e) => setMovementForm({ ...movementForm, name: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Bags (50kg), Litres"
                    value={movementForm.unit}
                    onChange={(e) => setMovementForm({ ...movementForm, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={movementForm.category}
                  onChange={(e) => setMovementForm({ ...movementForm, category: e.target.value })}
                >
                  <option value="Fertilizer">Fertilizers & Soil Nutrients</option>
                  <option value="Seeds">Certified Seeds & Seedlings</option>
                  <option value="Chemicals">Agro-Chemicals & Herbicides</option>
                  <option value="Tools">Tools, Parts & Spare Equipment</option>
                </select>
              </div>

              <div className="sk-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sk-action">
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorekeeperDashboard;
