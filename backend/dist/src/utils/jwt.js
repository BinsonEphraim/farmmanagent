import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || '30d';
// ============================================
// EXISTING FUNCTIONS - Updated with remember me
// ============================================
export const generateToken = (userId, email, roleId, rememberMe = false) => {
    const payload = { userId, email, roleId };
    const expiresIn = rememberMe ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN;
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
};
export const generateRandomToken = () => {
    return crypto.randomBytes(32).toString('hex');
};
export const generateVerificationToken = () => {
    const token = generateRandomToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { token, expires };
};
export const generateResetToken = () => {
    const token = generateRandomToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return { token, expires };
};
