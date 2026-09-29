import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { generateVerificationToken } from '../utils/jwt.js';
import { sendVerificationEmail } from '../utils/email.js';
// GET ALL USERS (Admin only)
export const getAllUsers = async (req, res) => {
    try {
        const { search, role, status, farmId, page = 1, limit = 10 } = req.query;
        // Build filter conditions
        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role) {
            where.role = { name: role };
        }
        if (status && status !== 'all') {
            where.isActive = status === 'active';
        }
        if (farmId && farmId !== 'all') {
            if (farmId === 'unassigned') {
                where.farmId = null;
            }
            else {
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
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// GET SINGLE USER (Admin only)
// ============================================
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
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
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// CREATE USER (Admin only)
// ============================================
export const createUser = async (req, res) => {
    try {
        const { email, password, firstName, lastName, roleName, farmId, sendVerification = true } = req.body;
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
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate verification token
        const { token: verificationToken, expires: verificationTokenExpires } = generateVerificationToken();
        // Create user with optional farm assignment
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                roleId: role.id,
                farmId: farmId ? Number(farmId) : null,
                isVerified: false,
                verificationToken,
                verificationTokenExpires,
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
        // Send verification email if requested
        if (sendVerification) {
            await sendVerificationEmail(email, verificationToken);
        }
        // Remove password from response
        const { password: _, ...safeUser } = user;
        res.status(201).json({
            message: 'User created successfully',
            user: safeUser,
            verificationToken: sendVerification ? verificationToken : undefined,
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// UPDATE USER (Admin only)
// ============================================
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, roleName, farmId, isActive } = req.body;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prepare update data
        const updateData = {};
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        if (typeof isActive === 'boolean')
            updateData.isActive = isActive;
        if (farmId !== undefined) {
            updateData.farmId = farmId ? Number(farmId) : null;
        }
        // Update role if provided
        if (roleName) {
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
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// DELETE USER (Admin only)
// ============================================
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: Number(id) },
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent deleting self
        const currentUserId = req.user?.userId;
        if (Number(id) === currentUserId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await prisma.user.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// GET ALL ROLES (for dropdown)
// ============================================
export const getAllRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(roles);
    }
    catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ============================================
// GET USER STATS (Admin only)
// ============================================
export const getUserStats = async (req, res) => {
    try {
        const [totalUsers, activeUsers, inactiveUsers, roles, recentUsers] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { isActive: false } }),
            prisma.role.findMany({
                include: {
                    _count: {
                        select: { users: true },
                    },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.user.findMany({
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
            where: { createdAt: { gte: thirtyDaysAgo } },
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
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
