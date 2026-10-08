import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';

const db: any = prisma;
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const getPlatformOverview = async (_req: Request, res: Response) => {
  try {
    const [customers, activeCustomers, plans, activeSubscriptions, openTickets] = await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { status: 'ACTIVE' } }),
      db.plan.count({ where: { isActive: true } }),
      db.subscription.count({ where: { status: { in: ['TRIALING', 'ACTIVE'] } } }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    let database = 'healthy';
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      database = 'unavailable';
    }

    res.json({
      metrics: { customers, activeCustomers, plans, activeSubscriptions, openTickets },
      health: {
        status: database === 'healthy' ? 'operational' : 'degraded',
        database,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryBytes: process.memoryUsage().heapUsed,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Platform overview error:', error);
    res.status(500).json({ error: 'Unable to load platform overview' });
  }
};

export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await db.organization.findMany({
      include: {
        _count: { select: { users: true, farms: true } },
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ customers });
  } catch (error) {
    console.error('Platform customers error:', error);
    res.status(500).json({ error: 'Unable to load customers' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, adminEmail, adminPassword, firstName, lastName, planId, firstFarmName, firstFarmLocation } = req.body;
    if (!name?.trim() || !adminEmail?.trim() || !adminPassword || !firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'Organization, administrator, and password fields are required' });
    }
    if (String(adminPassword).length < 8) {
      return res.status(400).json({ error: 'Administrator password must be at least 8 characters' });
    }
    if (await db.user.findUnique({ where: { email: adminEmail.trim().toLowerCase() }, select: { id: true } })) {
      return res.status(409).json({ error: 'Administrator email is already in use' });
    }

    const selectedPlan = await db.plan.findFirst({
      where: { id: Number(planId), isActive: true },
      select: { id: true, maxFarms: true, maxUsers: true },
    });
    if (!selectedPlan) return res.status(400).json({ error: 'Select an active plan' });
    if (selectedPlan.maxUsers !== null && selectedPlan.maxUsers < 1) {
      return res.status(400).json({ error: 'The selected plan cannot accommodate a Farm Administrator' });
    }
    if (firstFarmName?.trim() && selectedPlan.maxFarms !== null && selectedPlan.maxFarms < 1) {
      return res.status(400).json({ error: 'The selected plan does not include any farms' });
    }

    const baseSlug = slugify(name);
    if (!baseSlug) return res.status(400).json({ error: 'Organization name must contain letters or numbers' });
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const farmAdminRole = await db.role.findFirst({ where: { name: 'Farm Administrator' }, select: { id: true } });
    if (!farmAdminRole) return res.status(500).json({ error: 'Farm Administrator role is not configured' });
    const trialSetting = await db.platformSetting.findUnique({ where: { key: 'defaultTrialDays' }, select: { value: true } });
    const trialDays = Math.max(0, Math.min(365, Number(trialSetting?.value ?? 30) || 0));

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const customer = await db.$transaction(async (tx: any) => {
      const organization = await tx.organization.create({ data: { name: name.trim(), slug } });
      const admin = await tx.user.create({
        data: {
          email: adminEmail.trim().toLowerCase(),
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roleId: farmAdminRole.id,
          organizationId: organization.id,
          isVerified: true,
          isActive: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      const subscription = await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: selectedPlan.id,
          status: 'TRIALING',
          trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });
      let farm = null;
      if (firstFarmName?.trim()) {
        if (!firstFarmLocation?.trim()) throw new Error('First farm location is required when creating a farm');
        farm = await tx.farm.create({
          data: {
            name: firstFarmName.trim(),
            location: firstFarmLocation.trim(),
            ownerId: admin.id,
            organizationId: organization.id,
          },
          select: { id: true, name: true, location: true },
        });
      }
      return { ...organization, admin, subscription, farm };
    });

    res.status(201).json({ customer });
  } catch (error: any) {
    console.error('Create customer error:', error);
    if (error.message?.includes('First farm location')) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Unable to create customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, name } = req.body;
    const data: any = {};
    if (typeof status === 'string' && ['ACTIVE', 'SUSPENDED'].includes(status)) data.status = status;
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Provide a valid customer name or status' });
    const customer = await db.organization.update({ where: { id }, data });
    res.json({ customer });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Customer not found' });
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Unable to update customer' });
  }
};

export const createCustomerFarm = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.params.id);
    const { name, location, size, description, ownerId } = req.body;
    if (!name?.trim() || !location?.trim()) return res.status(400).json({ error: 'Farm name and location are required' });

    const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) return res.status(404).json({ error: 'Customer not found' });
    const owner = await db.user.findFirst({
      where: { organizationId, ...(ownerId ? { id: Number(ownerId) } : { role: { name: 'Farm Administrator' } }) },
      select: { id: true },
    });
    if (!owner) return res.status(400).json({ error: 'Choose a farm owner from this customer organization' });

    const subscription = await db.subscription.findFirst({
      where: { organizationId, status: { in: ['TRIALING', 'ACTIVE'] } },
      include: { plan: { select: { maxFarms: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription || (subscription.trialEndsAt && subscription.trialEndsAt < new Date())) {
      return res.status(403).json({ error: 'Customer does not have an active subscription' });
    }
    if (subscription.plan.maxFarms !== null) {
      const farmCount = await db.farm.count({ where: { organizationId } });
      if (farmCount >= subscription.plan.maxFarms) return res.status(403).json({ error: 'Customer farm limit has been reached' });
    }

    const farm = await db.farm.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        size: size === '' || size == null ? null : Number(size),
        description: description?.trim() || null,
        ownerId: owner.id,
        organizationId,
      },
    });
    res.status(201).json({ farm });
  } catch (error) {
    console.error('Create customer farm error:', error);
    res.status(500).json({ error: 'Unable to create farm for customer' });
  }
};

export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = await db.plan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { monthlyPrice: 'asc' },
    });
    res.json({ plans });
  } catch (error) {
    console.error('Plans error:', error);
    res.status(500).json({ error: 'Unable to load plans' });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, code, description, monthlyPrice, maxFarms, maxUsers } = req.body;
    if (!name?.trim() || !code?.trim() || !Number.isFinite(Number(monthlyPrice)) || Number(monthlyPrice) < 0) {
      return res.status(400).json({ error: 'Plan name, code, and a non-negative monthly price are required' });
    }
    const plan = await db.plan.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        monthlyPrice: Number(monthlyPrice),
        maxFarms: maxFarms === '' || maxFarms == null ? null : Number(maxFarms),
        maxUsers: maxUsers === '' || maxUsers == null ? null : Number(maxUsers),
      },
    });
    res.status(201).json({ plan });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Plan code already exists' });
    console.error('Create plan error:', error);
    res.status(500).json({ error: 'Unable to create plan' });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const subscriptionId = Number(req.params.id);
    const { planId, status, currentPeriodEnd } = req.body;
    const data: any = {};
    if (planId !== undefined) {
      const plan = await db.plan.findFirst({ where: { id: Number(planId), isActive: true }, select: { id: true } });
      if (!plan) return res.status(400).json({ error: 'Select an active plan' });
      data.planId = plan.id;
    }
    if (status !== undefined) {
      if (!['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid subscription status' });
      }
      data.status = status;
      data.canceledAt = status === 'CANCELED' ? new Date() : null;
    }
    if (currentPeriodEnd !== undefined) data.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No subscription changes provided' });
    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data,
      include: { plan: true, organization: { select: { id: true, name: true } } },
    });
    res.json({ subscription });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Subscription not found' });
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Unable to update subscription' });
  }
};

export const getSupportTickets = async (_req: Request, res: Response) => {
  try {
    const tickets = await db.supportTicket.findMany({
      include: { organization: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    res.json({ tickets });
  } catch (error) {
    console.error('Support tickets error:', error);
    res.status(500).json({ error: 'Unable to load support tickets' });
  }
};

export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const { organizationId, subject, description, priority } = req.body;
    if (!subject?.trim() || !description?.trim()) return res.status(400).json({ error: 'Subject and description are required' });
    const organization = await db.organization.findUnique({ where: { id: Number(organizationId) }, select: { id: true } });
    if (!organization) return res.status(400).json({ error: 'Customer not found' });
    const ticket = await db.supportTicket.create({
      data: {
        organizationId: organization.id,
        subject: subject.trim(),
        description: description.trim(),
        priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority) ? priority : 'NORMAL',
      },
      include: { organization: { select: { id: true, name: true } } },
    });
    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Unable to create support ticket' });
  }
};

export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const { status, priority } = req.body;
    const data: any = {};
    if (status !== undefined) {
      if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) return res.status(400).json({ error: 'Invalid support status' });
      data.status = status;
    }
    if (priority !== undefined) {
      if (!['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) return res.status(400).json({ error: 'Invalid support priority' });
      data.priority = priority;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No ticket changes provided' });
    const ticket = await db.supportTicket.update({ where: { id: Number(req.params.id) }, data });
    res.json({ ticket });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Support ticket not found' });
    console.error('Update support ticket error:', error);
    res.status(500).json({ error: 'Unable to update support ticket' });
  }
};

export const getPlatformSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await db.platformSetting.findMany({ orderBy: { key: 'asc' } });
    res.json({ settings });
  } catch (error) {
    console.error('Platform settings error:', error);
    res.status(500).json({ error: 'Unable to load platform settings' });
  }
};

export const updatePlatformSettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return res.status(400).json({ error: 'Settings must be an object of key/value pairs' });
    const entries = Object.entries(settings);
    if (entries.some(([key, value]) => !key.trim() || typeof value !== 'string')) return res.status(400).json({ error: 'Setting keys and values must be strings' });
    await db.$transaction(entries.map(([key, value]) => db.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })));
    res.json({ settings: await db.platformSetting.findMany({ orderBy: { key: 'asc' } }) });
  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json({ error: 'Unable to save platform settings' });
  }
};
