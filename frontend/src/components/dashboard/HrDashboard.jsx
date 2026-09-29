import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import { useAuth } from '../../context/AuthContext';
import './HrDashboard.css';
import LogoutButton from '../common/LogoutButton';

const HrDashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get('hr') || 'dashboard';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await hrService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error loading HR dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeaveAction = async (id, status) => {
    try {
      await hrService.updateLeaveStatus(id, status);
      showToast(`Leave request ${status.toLowerCase()} successfully!`);
      loadData();
    } catch (err) {
      showToast('Failed to update leave request status', 'error');
    }
  };

  const viewLink = (view) => `/dashboard?hr=${view}`;

  const renderPortalView = () => {
    if (activeView === 'dashboard') return null;

    const titles = {
      staff: ['Staff Directory', 'Active and inactive user accounts from the database.'],
      attendance: ['Attendance Logs', 'Recorded attendance for every staff member.'],
      leave: ['Leave Management', 'Review and action persisted HR leave requests.'],
      training: ['Training Programs', 'Programs and enrollments recorded in the database.'],
    };
    const [title, subtitle] = titles[activeView] || titles.staff;

    return (
      <div className="hr-widget-card hr-detail-view">
        <div className="hr-card-header">
          <div>
            <h2 className="hr-card-title">{title}</h2>
            <p className="hr-subheading">{subtitle}</p>
          </div>
          <Link to="/dashboard" className="btn-hr-action">Back to dashboard</Link>
        </div>
        {activeView === 'staff' && (
          <div className="hr-staff-table-wrap"><table className="hr-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>
            {(data?.staffDirectory || []).map((staff) => <tr key={staff.id}><td>{staff.name}</td><td>{staff.email}</td><td>{staff.role}</td><td>{staff.status}</td><td>{new Date(staff.joinedDate).toLocaleDateString()}</td></tr>)}
          </tbody></table></div>
        )}
        {activeView === 'attendance' && (
          <div className="hr-staff-table-wrap"><table className="hr-table"><thead><tr><th>Date</th><th>Staff</th><th>Check in</th><th>Check out</th><th>Status</th></tr></thead><tbody>
            {(data?.attendanceLogs || []).map((log) => <tr key={log.id}><td>{new Date(log.date).toLocaleDateString()}</td><td>{log.user?.firstName} {log.user?.lastName}</td><td>{log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td>{log.status}</td></tr>)}
          </tbody></table></div>
        )}
        {activeView === 'leave' && (
          <div className="hr-leave-queue-stack">{(data?.leaveRequests || []).map((request) => <div key={request.id} className="hr-leave-item"><div className="hr-leave-info"><span className="leave-title">{request.title}</span><span className="leave-meta">{request.requestedBy || 'Staff'} · {request.meta || 'Dates recorded in request'}</span></div><div className="hr-leave-actions">{request.status === 'PENDING' ? <><button className="btn-approve" onClick={() => handleLeaveAction(request.id, 'APPROVED')}>Approve</button><button className="btn-reject" onClick={() => handleLeaveAction(request.id, 'REJECTED')}>Reject</button></> : <span className={`status-badge ${request.status.toLowerCase()}`}>{request.status}</span>}</div></div>)}</div>
        )}
        {activeView === 'training' && (
          <div className="hr-staff-table-wrap"><table className="hr-table"><thead><tr><th>Program</th><th>Instructor</th><th>Date</th><th>Participants</th><th>Status</th></tr></thead><tbody>
            {(data?.trainingPrograms || []).map((program) => <tr key={program.id}><td>{program.title}</td><td>{program.instructor || '—'}</td><td>{new Date(program.date).toLocaleDateString()}</td><td>{program.participants}</td><td>{program.status}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    );
  };

  return (
    <div className="hr-page-layout">
      {/* TOAST */}
      {toastMsg && (
        <div className={`hr-toast toast-${toastMsg.type}`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`hr-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="hr-sidebar-brand">
          <div className="hr-brand-icon">👥</div>
          {sidebarOpen && (
            <div className="hr-brand-text">
              <span className="hr-brand-title">UFMS</span>
              <span className="hr-brand-sub">Human Resources</span>
            </div>
          )}
        </div>

        <nav className="hr-sidebar-nav">
          <div className="hr-nav-section">HUMAN RESOURCES</div>
          <Link to="/dashboard" className="hr-nav-link active">
            <span className="hr-nav-icon">📊</span>
            {sidebarOpen && <span>HR Dashboard</span>}
          </Link>
          <Link to={viewLink('staff')} className={`hr-nav-link ${activeView === 'staff' ? 'active' : ''}`}>
            <span className="hr-nav-icon">👤</span>
            {sidebarOpen && <span>Staff Directory</span>}
          </Link>
          <Link to={viewLink('attendance')} className={`hr-nav-link ${activeView === 'attendance' ? 'active' : ''}`}>
            <span className="hr-nav-icon">⏱️</span>
            {sidebarOpen && <span>Attendance Logs</span>}
          </Link>
          <Link to={viewLink('leave')} className={`hr-nav-link ${activeView === 'leave' ? 'active' : ''}`}>
            <span className="hr-nav-icon">🏖️</span>
            {sidebarOpen && <span>Leave Management</span>}
          </Link>
          <Link to={viewLink('training')} className={`hr-nav-link ${activeView === 'training' ? 'active' : ''}`}>
            <span className="hr-nav-icon">🎓</span>
            {sidebarOpen && <span>Training Programs</span>}
          </Link>

          <div className="hr-nav-section">FINANCE & SYSTEM</div>
          <Link to="/payroll" className="hr-nav-link">
            <span className="hr-nav-icon">💵</span>
            {sidebarOpen && <span>Payroll & Salaries</span>}
          </Link>
          <Link to="/settings" className="hr-nav-link">
            <span className="hr-nav-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* User Profile */}
        {sidebarOpen && (
          <div className="hr-bottom-profile">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(`${authUser?.firstName || ''} ${authUser?.lastName || ''}`)}&background=10b981&color=fff&bold=true`}
              alt={`${authUser?.firstName || 'HR'} ${authUser?.lastName || 'Manager'}`}
              className="hr-avatar"
            />
            <div className="hr-profile-meta">
              <span className="hr-name">{authUser?.firstName} {authUser?.lastName}</span>
              <span className="hr-role">{authUser?.role || 'Human Resources'}</span>
              <span className="hr-status-pill">
                <span className="hr-status-dot"></span> Active
              </span>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER */}
      <div className="hr-main-container">
        {/* TOPBAR */}
        <header className="hr-topbar">
          <div className="hr-topbar-left">
            <button className="hr-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="hr-topbar-titles">
              <h1 className="hr-heading">Human Resources Management</h1>
              <p className="hr-subheading">Staff directory, attendance tracking, leave requests, and training programs.</p>
            </div>
          </div>

          <div className="hr-topbar-right">
            <Link to="/payroll" className="btn-hr-action">
              💵 View Payroll Outlay
            </Link>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="hr-content-body">
          {renderPortalView()}
          {activeView !== 'dashboard' ? null : <>
          {/* 4 TOP KPI CARDS */}
          <div className="hr-kpi-grid">
            <div className="hr-kpi-card">
              <div className="hr-kpi-icon green">👥</div>
              <div className="hr-kpi-data">
                <span className="hr-kpi-label">Total Staff Headcount</span>
                <span className="hr-kpi-val">{data?.summary?.totalStaff ?? 0} Employees</span>
                <span className="hr-kpi-sub">Active staff accounts in the database</span>
              </div>
            </div>

            <div className="hr-kpi-card">
              <div className="hr-kpi-icon blue">⏱️</div>
              <div className="hr-kpi-data">
                <span className="hr-kpi-label">Attendance Rate</span>
                <span className="hr-kpi-val">{data?.attendanceStats?.presentRate ?? '0%'}</span>
                <span className="hr-kpi-sub">{data?.attendanceStats?.todayPresent ?? 0} Present Today</span>
              </div>
            </div>

            <div className="hr-kpi-card">
              <div className="hr-kpi-icon amber">🏖️</div>
              <div className="hr-kpi-data">
                <span className="hr-kpi-label">Leave Approvals</span>
                <span className="hr-kpi-val">{data?.leaveRequests?.filter((request) => request.status === 'PENDING').length ?? 0} Pending</span>
                <span className="hr-kpi-sub">Requires Manager Authorization</span>
              </div>
            </div>

            <div className="hr-kpi-card">
              <div className="hr-kpi-icon purple">💵</div>
              <div className="hr-kpi-data">
                <span className="hr-kpi-label">Monthly Payroll</span>
                <span className="hr-kpi-val">${(data?.summary?.monthlyPayrollTotal ?? 0).toLocaleString()}</span>
                <span className="hr-kpi-sub">Current payroll period total</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN SECTION: LEAVE QUEUE & STAFF DIRECTORY */}
          <div className="hr-2col-layout">
            {/* LEAVE REQUESTS APPROVAL QUEUE */}
            <div className="hr-widget-card">
              <div className="hr-card-header">
                <h3 className="hr-card-title">Leave Approvals Queue</h3>
                <span className="hr-pill-badge">{data?.leaveRequests?.length ?? 0} Requests</span>
              </div>

              <div className="hr-leave-queue-stack">
                {data?.leaveRequests?.length > 0 ? (
                  data.leaveRequests.map((req) => (
                    <div key={req.id} className="hr-leave-item">
                      <div className="hr-leave-info">
                        <span className="leave-title">{req.title}</span>
                        <div className="leave-meta">
                          <span>👤 {req.requestedBy}</span>
                          <span>📅 {req.meta || '3 Days'}</span>
                        </div>
                      </div>
                      <div className="hr-leave-actions">
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => handleLeaveAction(req.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleLeaveAction(req.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`status-badge ${req.status.toLowerCase()}`}>
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="hr-empty-text">No pending leave requests.</div>
                )}
              </div>
            </div>

            {/* TRAINING PROGRAMS */}
            <div className="hr-widget-card">
              <div className="hr-card-header">
                <h3 className="hr-card-title">Staff Training & Certifications</h3>
                <span className="hr-pill-badge">{data?.trainingPrograms?.length ?? 0} Programs</span>
              </div>
              <div className="hr-training-stack">
                {data?.trainingPrograms?.map((t) => (
                  <div key={t.id} className="hr-training-item">
                    <div className="training-text">
                      <span className="train-title">🎓 {t.title}</span>
                      <span className="train-sub">Instructor: {t.instructor} • {t.participants} Participants</span>
                    </div>
                    <span className={`train-status-pill ${t.status.toLowerCase()}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STAFF DIRECTORY TABLE */}
          <div className="hr-widget-card">
            <div className="hr-card-header">
              <h3 className="hr-card-title">Company Staff Directory</h3>
              <span className="hr-badge-count">{data?.staffDirectory?.length ?? 0} Accounts</span>
            </div>
            <div className="hr-staff-table-wrap">
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.staffDirectory?.map((staff) => (
                    <tr key={staff.id}>
                      <td className="staff-name-col">
                        <img src={staff.avatar} alt={staff.name} className="staff-avatar-mini" />
                        <span>{staff.name}</span>
                      </td>
                      <td>{staff.email}</td>
                      <td>
                        <span className="staff-role-pill">{staff.role}</span>
                      </td>
                      <td>
                        <span className="staff-status-active">● Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>}
        </div>
      </div>
    </div>
  );
};

export default HrDashboard;
