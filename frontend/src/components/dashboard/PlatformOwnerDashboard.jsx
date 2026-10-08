import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { platformService } from '../../services/platformService';
import './PlatformOwnerDashboard.css';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'plans', label: 'Plans & subscriptions' },
  { id: 'support', label: 'Support' },
  { id: 'settings', label: 'Platform configuration' },
];

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'No end date';
const emptyCustomer = { name: '', adminEmail: '', firstName: '', lastName: '', adminPassword: '', planId: '', firstFarmName: '', firstFarmLocation: '' };

const PlatformOwnerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [settings, setSettings] = useState({});
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [planForm, setPlanForm] = useState({ name: '', code: '', description: '', monthlyPrice: '0', maxFarms: '', maxUsers: '' });
  const [ticketForm, setTicketForm] = useState({ organizationId: '', subject: '', description: '', priority: 'NORMAL' });
  const [farmTarget, setFarmTarget] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: '', location: '', size: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, customerData, planData, ticketData, settingsData] = await Promise.all([
        platformService.getOverview(),
        platformService.getCustomers(),
        platformService.getPlans(),
        platformService.getSupportTickets(),
        platformService.getSettings(),
      ]);
      setOverview(overviewData);
      setCustomers(customerData.customers || []);
      setPlans(planData.plans || []);
      setTickets(ticketData.tickets || []);
      setSettings(Object.fromEntries((settingsData.settings || []).map((item) => [item.key, item.value])));
      setTicketForm((prev) => ({ ...prev, organizationId: prev.organizationId || String(customerData.customers?.[0]?.id || '') }));
      setCustomerForm((prev) => ({ ...prev, planId: prev.planId || String(planData.plans?.find((plan) => plan.isActive)?.id || '') }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Platform data could not be loaded. Confirm the Platform Owner session is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const runAction = async (action, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(message);
      await loadData();
      return result;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Action failed. Please check the entered details.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submitCustomer = async (event) => {
    event.preventDefault();
    const result = await runAction(() => platformService.createCustomer({
      ...customerForm,
      planId: Number(customerForm.planId),
    }), 'Customer organization created.');
    if (result) {
      setCustomerForm({ ...emptyCustomer, planId: String(plans.find((plan) => plan.isActive)?.id || '') });
    }
  };

  const submitFarm = async (event) => {
    event.preventDefault();
    const result = await runAction(() => platformService.createCustomerFarm(farmTarget.id, farmForm), 'Farm added to customer organization.');
    if (result) {
      setFarmTarget(null);
      setFarmForm({ name: '', location: '', size: '', description: '' });
    }
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    const result = await runAction(() => platformService.createPlan(planForm), 'Plan created.');
    if (result) setPlanForm({ name: '', code: '', description: '', monthlyPrice: '0', maxFarms: '', maxUsers: '' });
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    const result = await runAction(() => platformService.createSupportTicket({ ...ticketForm, organizationId: Number(ticketForm.organizationId) }), 'Support ticket created.');
    if (result) setTicketForm((prev) => ({ ...prev, subject: '', description: '', priority: 'NORMAL' }));
  };

  const changeSubscription = (subscription, field, value) => runAction(
    () => platformService.updateSubscription(subscription.id, { [field]: field === 'planId' ? Number(value) : value }),
    'Subscription updated.',
  );

  const changeCustomerStatus = (customer) => runAction(
    () => platformService.updateCustomer(customer.id, { status: customer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
    'Customer status updated.',
  );

  const saveSettings = (event) => {
    event.preventDefault();
    return runAction(() => platformService.updateSettings(settings), 'Platform configuration saved.');
  };

  const metrics = overview?.metrics || {};
  const health = overview?.health;

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <a className="platform-brand" href="/dashboard"><span className="platform-brand-mark">U</span><span><strong>UFMS</strong><small>PLATFORM CONTROL</small></span></a>
          <div className="platform-identity"><span className="platform-eyebrow">SIGNED IN AS</span><strong>{user?.firstName} {user?.lastName}</strong><span>{user?.role}</span></div>
        <nav className="platform-nav" aria-label="Platform navigation">
          {sections.map((section) => <button key={section.id} className={activeSection === section.id ? 'selected' : ''} onClick={() => setActiveSection(section.id)}>{section.label}</button>)}
        </nav>
        <button className="platform-signout" onClick={logout}>Sign out</button>
      </aside>

      <main className="platform-main">
        <header className="platform-header">
          <div><span className="platform-eyebrow">SAAS OPERATIONS</span><h1>{sections.find((section) => section.id === activeSection)?.label}</h1></div>
          <button className="platform-refresh" onClick={loadData} disabled={loading}>Refresh data</button>
        </header>
        {error && <div className="platform-alert error" role="alert">{error}</div>}
        {notice && <div className="platform-alert success" role="status">{notice}</div>}
        {loading ? <div className="platform-loading">Loading platform data…</div> : <>
          {activeSection === 'overview' && <section className="platform-section">
            <div className="platform-health-banner"><span className={`health-indicator ${health?.status === 'operational' ? 'good' : 'bad'}`} /><div><strong>{health?.status === 'operational' ? 'All systems operational' : 'Platform health needs attention'}</strong><span>Database: {health?.database || 'unknown'} · Uptime: {Math.floor((health?.uptimeSeconds || 0) / 3600)}h · Checked {health?.checkedAt ? new Date(health.checkedAt).toLocaleTimeString() : 'not yet'}</span></div><span className="health-memory">Heap {(Number(health?.memoryBytes || 0) / 1024 / 1024).toFixed(0)} MB</span></div>
            <div className="platform-metrics">
              <article><span>Customers</span><strong>{metrics.customers ?? 0}</strong><small>{metrics.activeCustomers ?? 0} active</small></article>
              <article><span>Active plans</span><strong>{metrics.plans ?? 0}</strong><small>Available for assignment</small></article>
              <article><span>Subscriptions</span><strong>{metrics.activeSubscriptions ?? 0}</strong><small>Active or trialing</small></article>
              <article><span>Open support</span><strong>{metrics.openTickets ?? 0}</strong><small>Open or in progress</small></article>
            </div>
            <div className="platform-section-heading"><div><span className="platform-eyebrow">CUSTOMER ACCOUNTS</span><h2>Recent customers</h2></div><button className="button-primary" onClick={() => setActiveSection('customers')}>Manage customers</button></div>
            <CustomerTable customers={customers.slice(0, 5)} plans={plans} onFarm={setFarmTarget} onSubscription={changeSubscription} onStatus={changeCustomerStatus} />
          </section>}

          {activeSection === 'customers' && <section className="platform-section platform-two-column">
            <div className="platform-panel"><div className="platform-section-heading"><div><span className="platform-eyebrow">TENANTS</span><h2>Customer organizations</h2></div></div><CustomerTable customers={customers} plans={plans} onFarm={setFarmTarget} onSubscription={changeSubscription} onStatus={changeCustomerStatus} /></div>
            <form className="platform-panel platform-form" onSubmit={submitCustomer}><span className="platform-eyebrow">PROVISION CUSTOMER</span><h2>Create organization</h2>
              <label>Organization name<input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></label>
              <div className="form-pair"><label>Admin first name<input required value={customerForm.firstName} onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })} /></label><label>Admin last name<input required value={customerForm.lastName} onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })} /></label></div>
              <label>Admin email<input required type="email" value={customerForm.adminEmail} onChange={(e) => setCustomerForm({ ...customerForm, adminEmail: e.target.value })} /></label>
              <label>Initial password<input required type="password" minLength="8" value={customerForm.adminPassword} onChange={(e) => setCustomerForm({ ...customerForm, adminPassword: e.target.value })} /></label>
              <label>Plan<select required value={customerForm.planId} onChange={(e) => setCustomerForm({ ...customerForm, planId: e.target.value })}><option value="">Select a plan</option>{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · ${plan.monthlyPrice}/mo</option>)}</select></label>
              <div className="form-pair"><label>First farm (optional)<input value={customerForm.firstFarmName} onChange={(e) => setCustomerForm({ ...customerForm, firstFarmName: e.target.value })} /></label><label>Farm location<input required={Boolean(customerForm.firstFarmName)} value={customerForm.firstFarmLocation} onChange={(e) => setCustomerForm({ ...customerForm, firstFarmLocation: e.target.value })} /></label></div>
              <button className="button-primary" disabled={busy}>Create customer and admin</button>
            </form>
          </section>}

          {activeSection === 'plans' && <section className="platform-section platform-two-column">
            <div className="platform-panel"><div className="platform-section-heading"><div><span className="platform-eyebrow">CATALOG</span><h2>Plans</h2></div></div><div className="plan-list">{plans.map((plan) => <article className="plan-row" key={plan.id}><div><strong>{plan.name}</strong><span>{plan.code} · {plan._count?.subscriptions || 0} subscriptions</span><small>{plan.description || 'No description'}</small></div><b>${Number(plan.monthlyPrice).toLocaleString()}<small>/ month</small></b><span className={`status-tag ${plan.isActive ? 'active' : 'inactive'}`}>{plan.isActive ? 'Active' : 'Inactive'}</span></article>)}</div>
              <div className="platform-section-heading subscription-heading"><div><span className="platform-eyebrow">BILLING</span><h2>Customer subscriptions</h2></div></div><CustomerTable customers={customers} plans={plans} compact onSubscription={changeSubscription} onFarm={setFarmTarget} onStatus={changeCustomerStatus} />
            </div>
            <form className="platform-panel platform-form" onSubmit={submitPlan}><span className="platform-eyebrow">PLAN CATALOG</span><h2>Add a plan</h2>
              <label>Plan name<input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></label><label>Plan code<input required value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })} /></label><label>Description<input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} /></label><label>Monthly price (USD)<input required type="number" min="0" step="0.01" value={planForm.monthlyPrice} onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: e.target.value })} /></label><div className="form-pair"><label>Farm limit<input type="number" min="1" value={planForm.maxFarms} onChange={(e) => setPlanForm({ ...planForm, maxFarms: e.target.value })} placeholder="Unlimited" /></label><label>User limit<input type="number" min="1" value={planForm.maxUsers} onChange={(e) => setPlanForm({ ...planForm, maxUsers: e.target.value })} placeholder="Unlimited" /></label></div><button className="button-primary" disabled={busy}>Create plan</button>
            </form>
          </section>}

          {activeSection === 'support' && <section className="platform-section platform-two-column"><div className="platform-panel"><div className="platform-section-heading"><div><span className="platform-eyebrow">CUSTOMER CARE</span><h2>Support queue</h2></div></div><div className="support-list">{tickets.length ? tickets.map((ticket) => <article className="support-item" key={ticket.id}><div className="support-item-top"><strong>{ticket.subject}</strong><span className={`status-tag ${ticket.status.toLowerCase()}`}>{ticket.status.replace('_', ' ')}</span></div><span>{ticket.organization?.name} · {ticket.priority}</span><p>{ticket.description}</p><label>Update status<select value={ticket.status} onChange={(e) => runAction(() => platformService.updateSupportTicket(ticket.id, { status: e.target.value }), 'Support ticket updated.')}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select></label></article>) : <p className="empty-state">No support tickets yet.</p>}</div></div>
            <form className="platform-panel platform-form" onSubmit={submitTicket}><span className="platform-eyebrow">SUPPORT</span><h2>Log a ticket</h2><label>Customer<select required value={ticketForm.organizationId} onChange={(e) => setTicketForm({ ...ticketForm, organizationId: e.target.value })}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Subject<input required value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} /></label><label>Description<textarea required rows="5" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} /></label><label>Priority<select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label><button className="button-primary" disabled={busy}>Create support ticket</button></form>
          </section>}

          {activeSection === 'settings' && <section className="platform-section platform-two-column"><div className="platform-panel"><span className="platform-eyebrow">RUNTIME</span><h2>System health</h2><dl className="health-details"><div><dt>Application</dt><dd>Operational</dd></div><div><dt>Database</dt><dd>{health?.database || 'Unknown'}</dd></div><div><dt>Uptime</dt><dd>{Math.floor((health?.uptimeSeconds || 0) / 3600)} hours</dd></div><div><dt>Heap usage</dt><dd>{(Number(health?.memoryBytes || 0) / 1024 / 1024).toFixed(1)} MB</dd></div><div><dt>Last check</dt><dd>{formatDate(health?.checkedAt)}</dd></div></dl></div>
            <form className="platform-panel platform-form" onSubmit={saveSettings}><span className="platform-eyebrow">PLATFORM CONFIGURATION</span><h2>Global settings</h2><label>Platform display name<input value={settings.platformName || ''} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })} placeholder="UFMS" /></label><label>Support email<input type="email" value={settings.supportEmail || ''} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} placeholder="support@example.com" /></label><label>Default trial days<input type="number" min="0" max="365" value={settings.defaultTrialDays || '30'} onChange={(e) => setSettings({ ...settings, defaultTrialDays: e.target.value })} /></label><label>Maintenance mode<select value={settings.maintenanceMode || 'false'} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.value })}><option value="false">Off</option><option value="true">On</option></select></label><button className="button-primary" disabled={busy}>Save configuration</button></form>
          </section>}
        </>}
      </main>

      {farmTarget && <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFarmTarget(null); }}><form className="platform-modal platform-form" onSubmit={submitFarm}><div className="platform-section-heading"><div><span className="platform-eyebrow">{farmTarget.name}</span><h2>Add customer farm</h2></div><button type="button" className="close-modal" onClick={() => setFarmTarget(null)} aria-label="Close">×</button></div><label>Farm name<input required value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} /></label><label>Location<input required value={farmForm.location} onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })} /></label><label>Size in hectares<input type="number" min="0" step="0.1" value={farmForm.size} onChange={(e) => setFarmForm({ ...farmForm, size: e.target.value })} /></label><label>Description<textarea rows="3" value={farmForm.description} onChange={(e) => setFarmForm({ ...farmForm, description: e.target.value })} /></label><button className="button-primary" disabled={busy}>Create farm</button></form></div>}
    </div>
  );
};

const CustomerTable = ({ customers, plans, onFarm, onSubscription, onStatus, compact = false }) => (
  <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>Customer</th><th>Users / farms</th><th>Plan & subscription</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {customers.map((customer) => {
      const subscription = customer.subscriptions?.[0];
      return <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.slug}</small><small>Joined {formatDate(customer.createdAt)}</small></td><td>{customer._count?.users || 0} users / {customer._count?.farms || 0} farms</td><td>{subscription ? <><select aria-label={`Plan for ${customer.name}`} value={subscription.planId} onChange={(e) => onSubscription(subscription, 'planId', e.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><select aria-label={`Subscription status for ${customer.name}`} value={subscription.status} onChange={(e) => onSubscription(subscription, 'status', e.target.value)}><option>TRIALING</option><option>ACTIVE</option><option>PAST_DUE</option><option>SUSPENDED</option><option>CANCELED</option></select><small>Trial ends {formatDate(subscription.trialEndsAt)}</small></> : <span className="empty-state">No subscription</span>}</td><td><span className={`status-tag ${customer.status.toLowerCase()}`}>{customer.status}</span></td><td className="table-actions"><button type="button" onClick={() => onFarm(customer)}>Add farm</button><button type="button" onClick={() => onStatus(customer)}>{customer.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td></tr>;
    })}
    {!customers.length && <tr><td colSpan="5" className="empty-state">No customer organizations yet.</td></tr>}
  </tbody></table></div>
);

export default PlatformOwnerDashboard;
