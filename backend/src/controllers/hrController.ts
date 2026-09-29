import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const db: any = prisma;

const parseId = (val: any) => {
  if (val === undefined || val === null) return NaN;
  if (Array.isArray(val)) val = val[0];
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? NaN : n;
};

// 1. Get HR Dashboard Overview
export const getHrDashboard = async (req: Request, res: Response) => {
  try {
    const [users, roles, leaveRequests, attendanceLogs, trainingPrograms, payrollRecords] = await Promise.all([
      db.user.findMany({
        include: { role: true },
        orderBy: { id: 'asc' },
      }),
      db.role.findMany(),
      db.approvalRequest.findMany({
        where: { category: 'HR' },
        orderBy: { date: 'desc' },
      }),
      db.attendanceLog.findMany({
        include: { user: { include: { role: true } } },
        orderBy: [{ date: 'desc' }, { userId: 'asc' }],
      }),
      db.trainingProgram.findMany({
        include: { enrollments: true },
        orderBy: { scheduledDate: 'asc' },
      }),
      db.payrollRecord.findMany({
        include: { user: { include: { role: true } } },
        orderBy: [{ period: 'desc' }, { userId: 'asc' }],
      }),
    ]);

    const totalStaff = users.length;
    const latestAttendance = attendanceLogs.filter((log: any) => log.date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10));
    const activeToday = latestAttendance.filter((log: any) => log.status === 'PRESENT' || log.status === 'LATE').length;
    const onLeaveCount = latestAttendance.filter((log: any) => log.status === 'ON_LEAVE').length;
    const currentPayrollPeriod = payrollRecords[0]?.period;
    const monthlyPayrollTotal = payrollRecords
      .filter((record: any) => record.period === currentPayrollPeriod)
      .reduce((sum: number, record: any) => sum + record.netAmount, 0);

    const staffDirectory = users.map((u: any) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role?.name || 'Staff',
      status: u.isActive ? 'Active' : 'Inactive',
      joinedDate: u.createdAt,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${u.firstName} ${u.lastName}`)}&background=10b981&color=fff&bold=true`,
    }));

    const attendanceStats = {
      presentRate: totalStaff ? `${((activeToday / totalStaff) * 100).toFixed(1)}%` : '0%',
      onTimeRate: latestAttendance.length ? `${((latestAttendance.filter((log: any) => log.status === 'PRESENT').length / latestAttendance.length) * 100).toFixed(1)}%` : '0%',
      overtimeHours: 'Recorded per attendance log',
      todayPresent: activeToday,
      todayAbsent: latestAttendance.filter((log: any) => log.status === 'ABSENT').length,
      todayOnLeave: onLeaveCount,
    };

    res.json({
      summary: {
        totalStaff,
        activeToday,
        onLeaveCount,
        trainingEnrolled: trainingPrograms.reduce((sum: number, program: any) => sum + program.enrollments.length, 0),
        monthlyPayrollTotal,
      },
      staffDirectory,
      attendanceStats,
      leaveRequests,
      attendanceLogs,
      trainingPrograms: trainingPrograms.map((program: any) => ({
        ...program,
        participants: program.enrollments.length,
        date: program.scheduledDate,
      })),
      payrollRecords,
    });
  } catch (error) {
    console.error('Get HR dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Approve or Reject Leave Request
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const reqId = parseId(id);

    if (Number.isNaN(reqId)) {
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    const updated = await db.approvalRequest.update({
      where: { id: reqId },
      data: { status: String(status).toUpperCase() },
    });

    res.json({
      message: `Leave request marked as ${status}`,
      request: updated,
    });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ error: 'Internal server error updating leave request' });
  }
};
