import prisma from '../utils/prisma.js';
const db = prisma;
// 1. Get Employee Dashboard Overview
export const getEmployeeDashboard = async (req, res) => {
    try {
        const user = req.user;
        const userId = user?.userId;
        const userRecord = await db.user.findUnique({
            where: { id: userId },
            include: {
                farm: {
                    select: { id: true, name: true, location: true },
                },
            },
        });
        let assignedFarm = userRecord?.farm;
        if (!assignedFarm) {
            const fallbackFarms = await db.farm.findMany({ take: 1, select: { id: true, name: true, location: true } });
            assignedFarm = fallbackFarms[0] || { name: 'Green Valley Farm', location: 'Lilongwe, Malawi' };
        }
        const assets = await db.asset.findMany({
            where: assignedFarm?.id ? { farmId: assignedFarm.id } : {},
            take: 4,
            select: { id: true, assetCode: true, name: true, status: true },
        });
        const tasks = [
            {
                id: 1,
                title: 'Irrigation Center Pivot Alpha Inspection',
                location: 'Field Sector 2',
                priority: 'HIGH',
                dueDate: 'Today, 14:00',
                completed: false,
                category: 'Irrigation',
            },
            {
                id: 2,
                title: 'Tractor AST-0001 Pre-Operation Check & Grease',
                location: 'Main Depot',
                priority: 'MEDIUM',
                dueDate: 'Today, 16:30',
                completed: true,
                category: 'Machinery',
            },
            {
                id: 3,
                title: 'Maize Field 4 Soil Moisture & Tensiometer Log',
                location: 'Field Sector 4',
                priority: 'NORMAL',
                dueDate: 'Tomorrow, 09:00',
                completed: false,
                category: 'Agronomy',
            },
            {
                id: 4,
                title: 'Livestock Water Trough & Fencing Check',
                location: 'Pasture Pen 3',
                priority: 'HIGH',
                dueDate: 'Tomorrow, 11:00',
                completed: false,
                category: 'Livestock',
            },
        ];
        const todayShift = {
            shiftName: 'Morning Operations Shift',
            hours: '06:00 AM – 02:30 PM',
            clockedInAt: '06:02 AM',
            status: 'Active',
            hoursLoggedToday: 6.5,
            weeklyHours: 36.5,
        };
        const leaveBalance = {
            annualDays: 14,
            usedDays: 3,
            remainingDays: 11,
            sickDaysRemaining: 7,
        };
        const announcements = [
            {
                id: 1,
                title: 'Harvest Safety Briefing Tomorrow',
                message: 'All field operatives must wear high-visibility PPE in active combine harvester zones.',
                date: 'Today',
            },
            {
                id: 2,
                title: 'Machinery Maintenance Depot Upgrades',
                message: 'Depot Bay 2 will undergo maintenance line upgrades this Friday.',
                date: 'Yesterday',
            },
        ];
        res.json({
            employee: {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
                assignedFarm,
            },
            todayShift,
            tasks,
            assignedAssets: assets,
            leaveBalance,
            announcements,
        });
    }
    catch (error) {
        console.error('Get employee dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 2. Submit Leave Request
export const submitLeaveRequest = async (req, res) => {
    try {
        const { type = 'Annual Leave', startDate, endDate, days = 1, reason } = req.body;
        const user = req.user;
        // Create decision approval for MD/HR
        await db.approvalRequest.create({
            data: {
                title: `Leave Request (${type}) – ${user.firstName} ${user.lastName}`,
                category: 'HR',
                requestedBy: `${user.firstName} ${user.lastName}`,
                meta: `${days} day(s) (${startDate} to ${endDate})`,
                status: 'PENDING',
            },
        });
        res.status(201).json({
            message: 'Leave request submitted to HR & Management for approval',
        });
    }
    catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({ error: 'Internal server error submitting leave request' });
    }
};
