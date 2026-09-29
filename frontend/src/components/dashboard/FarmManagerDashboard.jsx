import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { farmService } from '../../services/farmService';
import { useAuth } from '../../context/AuthContext';
import './FarmManagerDashboard.css';
import LogoutButton from '../common/LogoutButton';

const FarmManagerDashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [farmsRes, cropsRes] = await Promise.all([
          farmService.getAllFarms({ limit: 10 }).catch(() => ({ farms: [] })),
          farmService.getAllCrops({ limit: 20 }).catch(() => ({ crops: [] })),
        ]);
        setFarms(farmsRes.farms || []);
        setCrops(cropsRes.crops || []);
      } catch (err) {
        console.error('Error loading manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="fm-page-layout">
      {/* SIDEBAR */}
      <aside className={`fm-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="fm-sidebar-brand">
          <div className="fm-brand-icon">🌾</div>
          {sidebarOpen && (
            <div className="fm-brand-text">
              <span className="fm-brand-title">UFMS</span>
              <span className="fm-brand-sub">Farm Operations</span>
            </div>
          )}
        </div>

        <nav className="fm-sidebar-nav">
          <div className="fm-nav-section">OPERATIONS</div>
          <Link to="/dashboard" className="fm-nav-link active">
            <span className="fm-nav-icon">📊</span>
            {sidebarOpen && <span>Operations Dashboard</span>}
          </Link>
          <Link to="/farms" className="fm-nav-link">
            <span className="fm-nav-icon">🌾</span>
            {sidebarOpen && <span>Farm Management</span>}
          </Link>
          <Link to="/crops" className="fm-nav-link">
            <span className="fm-nav-icon">🌱</span>
            {sidebarOpen && <span>Crop Management</span>}
          </Link>
          <Link to="/animals" className="fm-nav-link">
            <span className="fm-nav-icon">🐄</span>
            {sidebarOpen && <span>Livestock</span>}
          </Link>
          <Link to="/inventory" className="fm-nav-link">
            <span className="fm-nav-icon">📦</span>
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link to="/equipment" className="fm-nav-link">
            <span className="fm-nav-icon">🔧</span>
            {sidebarOpen && <span>Assets & Equipment</span>}
          </Link>

          <div className="fm-nav-section">SYSTEM</div>
          <Link to="/settings" className="fm-nav-link">
            <span className="fm-nav-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* User profile */}
        {sidebarOpen && (
          <div className="fm-bottom-profile">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${authUser?.firstName || 'Farm'} ${authUser?.lastName || 'Manager'}`
              )}&background=10b981&color=fff&bold=true`}
              alt="Manager"
              className="fm-avatar"
            />
            <div className="fm-profile-meta">
              <span className="fm-name">{authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Farm Manager'}</span>
              <span className="fm-role">Operations Lead</span>
              <span className="fm-status-pill">
                <span className="fm-status-dot"></span> Online
              </span>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER */}
      <div className="fm-main-container">
        {/* TOPBAR */}
        <header className="fm-topbar">
          <div className="fm-topbar-left">
            <button className="fm-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="fm-topbar-titles">
              <h1 className="fm-heading">Farm Operations Dashboard</h1>
              <p className="fm-subheading">Active field monitoring, crop harvest yields & livestock health.</p>
            </div>
          </div>

          <div className="fm-topbar-right">
            <Link to="/crops" className="btn-fm-action">
              + Record Harvest
            </Link>
            <Link to="/equipment" className="btn-fm-secondary">
              🔧 Machinery Status
            </Link>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="fm-content-body">
          {/* 6 TOP KPI CARDS */}
          <div className="fm-kpi-grid">
            <div className="fm-kpi-card">
              <div className="fm-kpi-icon green">🌾</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Active Farm Locations</span>
                <span className="fm-kpi-val">{farms.length || 5} Farms</span>
                <span className="fm-kpi-sub">1,250 Total Hectares</span>
              </div>
            </div>

            <div className="fm-kpi-card">
              <div className="fm-kpi-icon blue">🌱</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Crop Production Total</span>
                <span className="fm-kpi-val">482 tons</span>
                <span className="fm-kpi-sub">Maize, Cassava, Soybeans</span>
              </div>
            </div>

            <div className="fm-kpi-card">
              <div className="fm-kpi-icon purple">🐄</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Livestock Population</span>
                <span className="fm-kpi-val">1,248 Head</span>
                <span className="fm-kpi-sub">100% Healthy / Vaccinated</span>
              </div>
            </div>

            <div className="fm-kpi-card">
              <div className="fm-kpi-icon amber">📦</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Inventory Status</span>
                <span className="fm-kpi-val">3 Low Stock</span>
                <span className="fm-kpi-sub">Fertilizer, Seed, Fuel</span>
              </div>
            </div>

            <div className="fm-kpi-card">
              <div className="fm-kpi-icon cyan">🔧</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Machinery Fleet</span>
                <span className="fm-kpi-val">14 / 16 In Use</span>
                <span className="fm-kpi-sub">2 Under Routine Service</span>
              </div>
            </div>

            <div className="fm-kpi-card">
              <div className="fm-kpi-icon red">⏰</div>
              <div className="fm-kpi-data">
                <span className="fm-kpi-label">Maintenance Due</span>
                <span className="fm-kpi-val">2 Vehicles</span>
                <span className="fm-kpi-sub">Service scheduled this week</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN SECTION */}
          <div className="fm-2col-layout">
            {/* FARMS & FIELDS */}
            <div className="fm-widget-card">
              <div className="fm-card-header">
                <h3 className="fm-card-title">Managed Farm Plots & Field Status</h3>
                <Link to="/farms" className="fm-link">Manage All Farms →</Link>
              </div>
              <div className="fm-farms-table-wrap">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Farm Name</th>
                      <th>Location</th>
                      <th>Size (ha)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farms.map((farm) => (
                      <tr key={farm.id}>
                        <td className="fm-farm-name">{farm.name}</td>
                        <td>{farm.location}</td>
                        <td>{farm.size} ha</td>
                        <td>
                          <span className="fm-status-pill green">Operational</span>
                        </td>
                        <td>
                          <Link to={`/farms/${farm.id}`} className="fm-action-btn">
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QUICK OPERATIONS ACTIONS */}
            <div className="fm-right-column">
              <div className="fm-widget-card">
                <h3 className="fm-card-title">Operations Quick Actions</h3>
                <div className="fm-actions-grid">
                  <Link to="/crops" className="fm-qa-card">
                    <span className="qa-icon">🌱</span>
                    <span className="qa-title">Crop Harvest Log</span>
                    <span className="qa-desc">Update yield per hectare</span>
                  </Link>

                  <Link to="/equipment" className="fm-qa-card">
                    <span className="qa-icon">🔧</span>
                    <span className="qa-title">Equipment Check</span>
                    <span className="qa-desc">Log tractor maintenance</span>
                  </Link>

                  <Link to="/animals" className="fm-qa-card">
                    <span className="qa-icon">🐄</span>
                    <span className="qa-title">Livestock Health</span>
                    <span className="qa-desc">Vaccinations and dosing</span>
                  </Link>

                  <Link to="/inventory" className="fm-qa-card">
                    <span className="qa-icon">📦</span>
                    <span className="qa-title">Inventory Restock</span>
                    <span className="qa-desc">Order fertilizer & seeds</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmManagerDashboard;
