import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';

// GET ALL USERS (Admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role, status, farmId, page = 1, limit = 10 } = req.query;
    const requestUser = (req as any).user;

    // Build filter conditions
    const where: any = requestUser?.role === 'Platform Owner'
      ? {}
      : { organizationId: requestUser?.organizationId };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = { name: role as string };
    }

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    if (farmId && farmId !== 'all') {
      if (farmId === 'unassigned') {
        where.farmId = null;
      } else {
        where.farmId = Number(farmId);
      }
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true,
          farm: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Remove passwords from response
    const safeUsers = users.map(({ password, ...user }) => user);

    res.json({
      users: safeUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// GET SINGLE USER (Admin only)
// ============================================
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestUser = (req as any).user;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
        ...(requestUser?.role === 'Platform Owner' ? {} : { organizationId: requestUser?.organizationId }),
      },
      include: {
        role: true,
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...safeUser } = user;

    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// CREATE USER (Admin only)
// ============================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, roleName, farmId } = req.body;
    const requestUser = (req as any).user;

    if (requestUser?.role !== 'Platform Owner' && !requestUser?.organizationId) {
      return res.status(403).json({ error: 'A customer organization is required to create users' });
    }
    if (['Platform Owner', 'System Administrator', 'Administrator'].includes(roleName) && requestUser?.role !== 'Platform Owner') {
      return res.status(403).json({ error: 'Only a Platform Owner can assign a platform administration role' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Find the role
    const role = await prisma.role.findUnique({
      where: { name: roleName || 'Employee' },
    });

    if (!role) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    if (requestUser?.role !== 'Platform Owner') {
      const subscription = await prisma.subscription.findFirst({
        where: { organizationId: requestUser.organizationId, status: { in: ['TRIALING', 'ACTIVE'] } },
        include: { plan: { select: { maxUsers: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!subscription || (subscription.trialEndsAt && subscription.trialEndsAt < new Date())) {
        return res.status(403).json({ error: 'Your organization does not have an active subscription' });
      }
      if (subscription.plan.maxUsers !== null) {
        const userCount = await prisma.user.count({ where: { organizationId: requestUser.organizationId } });
        if (userCount >= subscription.plan.maxUsers) {
          return res.status(403).json({ error: 'Your plan user limit has been reached' });
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with optional farm assignment
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId: role.id,
        organizationId: requestUser.organizationId,
        farmId: farmId ? Number(farmId) : null,
        isVerified: true,
      },
      include: {
        role: true,
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    // Remove password from response
    const { password: _, ...safeUser } = user;

    res.status(201).json({
      message: 'User created successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// UPDATE USER (Admin only)
// ============================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, roleName, farmId, isActive } = req.body;
    const requestUser = (req as any).user;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: Number(id),
        ...(requestUser?.role === 'Platform Owner' ? {} : { organizationId: requestUser?.organizationId }),
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (farmId !== undefined) {
      if (farmId && requestUser?.role !== 'Platform Owner') {
        const farm = await prisma.farm.findFirst({
          where: { id: Number(farmId), organizationId: requestUser?.organizationId },
          select: { id: true },
        });
        if (!farm) return res.status(400).json({ error: 'Farm does not belong to your organization' });
      }

      updateData.farmId = farmId ? Number(farmId) : null;
    }

    // Update role if provided
    if (roleName) {
      if (['Platform Owner', 'System Administrator', 'Administrator'].includes(roleName) && requestUser?.role !== 'Platform Owner') {
        return res.status(403).json({ error: 'Only a Platform Owner can assign a platform administration role' });
      }
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (!role) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }

      updateData.roleId = role.id;
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        role: true,
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    // Remove password from response
    const { password, ...safeUser } = user;

    res.json({
      message: 'User updated successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// DELETE USER (Admin only)
// ============================================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestUser = (req as any).user;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: Number(id),
        ...(requestUser?.role === 'Platform Owner' ? {} : { organizationId: requestUser?.organizationId }),
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting self
    const currentUserId = (req as any).user?.userId;
    if (Number(id) === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// GET ALL ROLES (for dropdown)
// ============================================
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const requestUser = (req as any).user;
    const roles = await prisma.role.findMany({
      where: requestUser?.role === 'Platform Owner'
        ? {}
        : { name: { notIn: ['Platform Owner', 'System Administrator', 'Administrator'] } },
      orderBy: { name: 'asc' },
    });

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// GET USER STATS (Admin only)
// ============================================
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const requestUser = (req as any).user;
    const userWhere: any = requestUser?.role === 'Platform Owner'
      ? {}
      : { organizationId: requestUser?.organizationId };
    const [totalUsers, activeUsers, inactiveUsers, roles, recentUsers] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.user.count({ where: { ...userWhere, isActive: true } }),
      prisma.user.count({ where: { ...userWhere, isActive: false } }),
      prisma.role.findMany({
        include: {
          _count: {
            select: { users: { where: userWhere } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: userWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
          farm: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    // New users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await prisma.user.count({
      where: { ...userWhere, createdAt: { gte: thirtyDaysAgo } },
    });

    const totalRoles = roles.length;

    // Palette of vibrant, coordinated colors for role distribution
    const colors = [
      '#10b981', '#3b82f6', '#a855f7', '#22c55e',
      '#06b6d4', '#f97316', '#14b8a6', '#eab308', '#ec4899', '#6366f1'
    ];

    const roleDistribution = roles.map((role, idx) => {
      const count = role._count.users;
      const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
      return {
        id: role.id,
        name: role.name,
        count,
        percent: `${percentage.toFixed(1)}%`,
        percentageNumber: percentage,
        color: colors[idx % colors.length],
      };
    });

    const recentActivities = recentUsers.map((u) => {
      const formattedTime = new Date(u.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const farmText = u.farm?.name ? ` • Assigned to ${u.farm.name}` : '';
      return {
        id: u.id,
        text: `User ${u.firstName} ${u.lastName} registered as ${u.role?.name || 'User'}${farmText}`,
        time: formattedTime,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.firstName + ' ' + u.lastName)}&background=10b981&color=fff&bold=true`,
      };
    });

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsers,
      totalRoles,
      roleDistribution,
      recentActivities,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};