import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const api = 'http://localhost:5001/api';
let organizationId;
let planId;
let settingKey;

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

try {
  const ownerLogin = await request('/auth/login', { method: 'POST', body: { email: 'systemadmin@ufms.com', password: 'password123' } });
  if (!ownerLogin.response.ok || ownerLogin.payload.user.role !== 'Platform Owner') throw new Error('Platform Owner login failed');
  const ownerToken = ownerLogin.payload.token;

  const planResult = await request('/platform/plans', { token: ownerToken, method: 'POST', body: {
    name: 'Smoke Test Plan', code: `SMOKE-${Date.now()}`, monthlyPrice: 1, maxFarms: 1, maxUsers: 1,
  } });
  if (!planResult.response.ok) throw new Error(`Plan create failed: ${planResult.response.status}`);
  planId = planResult.payload.plan.id;

  const created = await request('/platform/customers', { token: ownerToken, method: 'POST', body: {
    name: 'Smoke Test Customer', adminEmail: `smoke-${Date.now()}@example.test`, adminPassword: 'SmokePass123!',
    firstName: 'Smoke', lastName: 'Admin', planId, firstFarmName: 'First Farm', firstFarmLocation: 'Test Area',
  } });
  if (!created.response.ok) throw new Error(`Customer create failed: ${created.response.status} ${JSON.stringify(created.payload)}`);
  organizationId = created.payload.customer.id;
  const adminEmail = created.payload.customer.admin.email;
  const adminTokenResult = await request('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'SmokePass123!' } });
  if (!adminTokenResult.response.ok || adminTokenResult.payload.user.role !== 'Farm Administrator') throw new Error('Provisioned Farm Administrator login failed');
  const farmAdminToken = adminTokenResult.payload.token;

  const secondFarm = await request(`/platform/customers/${organizationId}/farms`, { token: ownerToken, method: 'POST', body: { name: 'Over Limit Farm', location: 'Test Area' } });
  if (secondFarm.response.status !== 403) throw new Error(`Farm quota was not enforced (${secondFarm.response.status})`);
  const secondUser = await request('/users', { token: farmAdminToken, method: 'POST', body: { email: `extra-${Date.now()}@example.test`, password: 'ExtraPass123!', firstName: 'Extra', lastName: 'User', roleName: 'Employee' } });
  if (secondUser.response.status !== 403) throw new Error(`User quota was not enforced (${secondUser.response.status})`);

  const ticket = await request('/platform/support', { token: ownerToken, method: 'POST', body: { organizationId, subject: 'Smoke ticket', description: 'Test support workflow', priority: 'HIGH' } });
  if (!ticket.response.ok) throw new Error('Support ticket create failed');
  const ticketUpdate = await request(`/platform/support/${ticket.payload.ticket.id}`, { token: ownerToken, method: 'PATCH', body: { status: 'RESOLVED' } });
  if (!ticketUpdate.response.ok || ticketUpdate.payload.ticket.status !== 'RESOLVED') throw new Error('Support ticket update failed');

  settingKey = `smoke-${Date.now()}`;
  const setting = await request('/platform/settings', { token: ownerToken, method: 'PUT', body: { settings: { [settingKey]: 'saved' } } });
  if (!setting.response.ok || !setting.payload.settings.some((item) => item.key === settingKey)) throw new Error('Platform setting persistence failed');

  await request(`/platform/customers/${organizationId}`, { token: ownerToken, method: 'PATCH', body: { status: 'SUSPENDED' } });
  const suspendedLogin = await request('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'SmokePass123!' } });
  if (suspendedLogin.response.status !== 403) throw new Error(`Suspended customer login should fail (got ${suspendedLogin.response.status})`);
  await request(`/platform/customers/${organizationId}`, { token: ownerToken, method: 'PATCH', body: { status: 'ACTIVE' } });

  console.log('PASS: Platform Owner login, plan/customer provisioning, Farm Administrator login, user/farm quotas, support, settings, and suspension.');
} finally {
  if (settingKey) await prisma.platformSetting.deleteMany({ where: { key: settingKey } });
  if (organizationId) await prisma.organization.deleteMany({ where: { id: organizationId } });
  if (planId) await prisma.plan.deleteMany({ where: { id: planId } });
  await prisma.$disconnect();
}
