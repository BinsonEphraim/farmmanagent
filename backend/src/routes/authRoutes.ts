import { Router } from 'express';
import { 
  login, 
  getProfile,
  verifyEmail,
  updateProfile,
  forgotPassword,
  resetPassword,
  resendVerification
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Login user
router.post('/login', login);

// Verify email
router.get('/verify-email', verifyEmail);

// Request password reset
router.post('/forgot-password', forgotPassword);

// Reset password with token
router.post('/reset-password', resetPassword);

// Resend verification email
router.post('/resend-verification', resendVerification);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Get user profile
router.get('/profile', authenticate, getProfile);

// Update user profile
router.put('/profile', authenticate, updateProfile);

export default router;