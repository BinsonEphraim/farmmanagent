import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User account is inactive or does not exist' });
        }
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role.name,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        // Administrator has global bypass, or userRole must be in allowedRoles
        if (!userRole || (!allowedRoles.includes(userRole) && userRole !== 'Administrator')) {
            return res.status(403).json({
                error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is '${userRole || 'Unknown'}'`,
            });
        }
        next();
    };
};
