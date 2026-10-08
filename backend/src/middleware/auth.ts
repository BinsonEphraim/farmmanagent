import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token) as any;

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        organization: { select: { status: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account is inactive or does not exist' });
    }
    if (user.organization && user.organization.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'This customer organization is suspended' });
    }

    (req as any).user = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is '${userRole || 'Unknown'}'`,
      });
    }
    next();
  };
};