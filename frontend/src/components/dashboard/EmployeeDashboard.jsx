import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { employeeService } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import './EmployeeDashboard.css';
import LogoutButton from '../common/LogoutButton';

const EmployeeDashboard = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  // Leave Request Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    days: 1,
    reason: '',
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await employeeService.getDashboard();
        setData(res);
        setTasks(res.tasks || []);
      } catch (err) {
        console.error('Error loading employee portal:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    showToast('Task status updated!');
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!leaveForm.startDate || !leaveForm.endDate) {
        showToast('Please specify leave dates', 'error');
        return;
      }
      await employeeService.submitLeaveRequest(leaveForm);
      showToast('Leave request submitted to Farm Manager & HR for approval!');
      setIsLeaveModalOpen(false);
      setLeaveForm({ type: 'Annual Leave', startDate: '', endDate: '', days: 1, reason: '' });
    } catch (err) {
      showToast('Failed to submit leave request', 'error');
    }
  };

  return (
    <div className="emp-page-layout">
      {/* ===== NOTIFICATION TOAST ===== */}
      {toastMsg && (
        <div className={`emp-toast toast-${toastMsg.type}`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      {/* ===== EMPLOYEE SIDEBAR ===== */}
      <aside className={`emp-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="emp-sidebar-brand">
          <div className="emp-brand-icon">🌱</div>
          {sidebarOpen && (
            <div className="emp-brand-text">
              <span className="emp-brand-title">UFMS</span>
              <span className="emp-brand-sub">Employee Portal</span>
            </div>
          )}
        </div>

        <nav className="emp-sidebar-nav">
          <div className="emp-nav-section">MY WORKSPACE</div>
          <Link to="/dashboard" className="emp-nav-link active">
            <span className="emp-nav-icon">📋</span>
            {sidebarOpen && <span>My Daily Tasks</span>}
          </Link>
          <button className="emp-nav-link btn-link" onClick={() => showToast('Attendance records')}>
            <span className="emp-nav-icon">⏱️</span>
            {sidebarOpen && <span>Shift & Attendance</span>}
          </button>
          <button className="emp-nav-link btn-link" onClick={() => showToast('Assigned equipment inventory')}>
            <span className="emp-nav-icon">🔧</span>
            {sidebarOpen && <span>Assigned Tools</span>}
          </button>
          <button className="emp-nav-link btn-link" onClick={() => setIsLeaveModalOpen(true)}>
            <span className="emp-nav-icon">🏖️</span>
            {sidebarOpen && <span>Leave Requests</span>}
          </button>

          <div className="emp-nav-section">ACCOUNT</div>
          <Link to="/settings" className="emp-nav-link">
            <span className="emp-nav-icon">⚙️</span>
            {sidebarOpen && <span>Profile & Settings</span>}
          </Link>
        </nav>

        {/* Bottom Profile */}
        {sidebarOpen && (
          <div className="emp-bottom-profile">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${authUser?.firstName || 'Field'} ${authUser?.lastName || 'Worker'}`
              )}&background=10b981&color=fff&bold=true`}
              alt="Worker"
              className="emp-avatar"
            />
            <div className="emp-profile-meta">
              <span className="emp-name">{authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Field Employee'}</span>
              <span className="emp-role">Operations Staff</span>
              <span className="emp-status-pill">
                <span className="emp-status-dot"></span> Online
              </span>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTAINER ===== */}
      <div className="emp-main-container">
        {/* TOPBAR */}
        <header className="emp-topbar">
          <div className="emp-topbar-left">
            <button className="emp-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="emp-topbar-titles">
              <h1 className="emp-heading">Employee Portal & Daily Tasks</h1>
              <p className="emp-subheading">Welcome back, {authUser?.firstName || 'Worker'}! Review your field tasks for today.</p>
            </div>
          </div>

          <div className="emp-topbar-right">
            <button className="btn-request-leave" onClick={() => setIsLeaveModalOpen(true)}>
              + Request Leave
            </button>
            <button className="emp-icon-btn" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="emp-badge">2</span>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="emp-content-body">
          {/* 4 TOP KPI CARDS */}
          <div className="emp-kpi-grid">
            <div className="emp-kpi-card">
              <div className="emp-kpi-icon green">📋</div>
              <div className="emp-kpi-data">
                <span className="emp-kpi-label">Assigned Tasks</span>
                <span className="emp-kpi-val">{tasks.filter((t) => !t.completed).length} Pending</span>
                <span className="emp-kpi-sub">{tasks.filter((t) => t.completed).length} Completed today</span>
              </div>
            </div>

            <div className="emp-kpi-card">
              <div className="emp-kpi-icon blue">⏱️</div>
              <div className="emp-kpi-data">
                <span className="emp-kpi-label">Today's Shift</span>
                <span className="emp-kpi-val">{data?.todayShift?.hoursLoggedToday || 6.5} hrs logged</span>
                <span className="emp-kpi-sub">Shift: 06:00 AM – 02:30 PM</span>
              </div>
            </div>

            <div className="emp-kpi-card">
              <div className="emp-kpi-icon amber">🏖️</div>
              <div className="emp-kpi-data">
                <span className="emp-kpi-label">Annual Leave Balance</span>
                <span className="emp-kpi-val">{data?.leaveBalance?.remainingDays || 11} Days Left</span>
                <span className="emp-kpi-sub">{data?.leaveBalance?.usedDays || 3} Days Taken</span>
              </div>
            </div>

            <div className="emp-kpi-card">
              <div className="emp-kpi-icon purple">📍</div>
              <div className="emp-kpi-data">
                <span className="emp-kpi-label">Assigned Station</span>
                <span className="emp-kpi-val">{data?.employee?.assignedFarm?.name || 'Green Valley Farm'}</span>
                <span className="emp-kpi-sub">{data?.employee?.assignedFarm?.location || 'Lilongwe Central Sector'}</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN MAIN GRID */}
          <div className="emp-2col-layout">
            {/* LEFT: MY TASKS */}
            <div className="emp-tasks-card">
              <div className="emp-card-header">
                <h3 className="emp-card-title">My Assigned Daily Tasks</h3>
                <span className="emp-task-counter">{tasks.filter((t) => t.completed).length} / {tasks.length} Done</span>
              </div>

              <div className="emp-task-list">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`emp-task-row ${task.completed ? 'task-done' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="emp-checkbox"
                    />
                    <div className="emp-task-text-col">
                      <span className="emp-task-title">{task.title}</span>
                      <div className="emp-task-meta-row">
                        <span className="emp-task-loc">📍 {task.location}</span>
                        <span className="emp-task-due">⏰ {task.dueDate}</span>
                      </div>
                    </div>
                    <span className={`emp-prio-pill prio-${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: SHIFT TRACKER & ANNOUNCEMENTS */}
            <div className="emp-right-stack">
              {/* SHIFT & TIME CARD */}
              <div className="emp-widget-card">
                <h3 className="emp-card-title">Active Shift Status</h3>
                <div className="shift-timer-box">
                  <div className="shift-status-header">
                    <span className="shift-badge-active">🟢 Clocked In</span>
                    <span className="shift-time-in">06:02 AM</span>
                  </div>
                  <div className="shift-progress-wrap">
                    <div className="shift-label-row">
                      <span>Shift Progress</span>
                      <span>{Math.round((6.5 / 8) * 100)}%</span>
                    </div>
                    <div className="shift-track-bar">
                      <div className="shift-fill-bar" style={{ width: `${(6.5 / 8) * 100}%` }}></div>
                    </div>
                  </div>
                  <button className="btn-clock-action" onClick={() => showToast('Clock out recorded for today!')}>
                    Clock Out Shift
                  </button>
                </div>
              </div>

              {/* ANNOUNCEMENTS */}
              <div className="emp-widget-card">
                <h3 className="emp-card-title">Farm Safety & Announcements</h3>
                <div className="emp-announcements-list">
                  {data?.announcements?.map((a) => (
                    <div key={a.id} className="emp-announcement-item">
                      <span className="ann-title">⚠️ {a.title}</span>
                      <p className="ann-msg">{a.message}</p>
                      <span className="ann-date">{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LEAVE REQUEST MODAL ===== */}
      {isLeaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>Submit Leave Request</h2>
              <button className="emp-close-btn" onClick={() => setIsLeaveModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="emp-modal-form">
              <div className="form-group">
                <label>Leave Category</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency / Compassionate Leave</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason / Handover Notes</label>
                <textarea
                  rows="2"
                  placeholder="State reason and field handover notes..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                ></textarea>
              </div>

              <div className="emp-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsLeaveModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-green">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
