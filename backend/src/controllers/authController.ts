import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { generateToken, generateVerificationToken, generateResetToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const authUserSelect = {
  id: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  roleId: true,
  farmId: true,
  isVerified: true,
  verificationToken: true,
  verificationTokenExpires: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
  lastLogin: true,
  rememberToken: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true
    }
  },
  farm: {
    select: {
      id: true,
      name: true,
      location: true
    }
  }
} as const;

const profileUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  farmId: true,
  isVerified: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true
    }
  },
  farm: {
    select: {
      id: true,
      name: true,
      location: true
    }
  },
  createdAt: true,
  updatedAt: true
} as const;

// ============================================
// REGISTER - Updated with email verification
// ============================================

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, roleName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Find the role
    const role = await prisma.role.findUnique({
      where: { name: roleName || 'Employee' }
    });

    if (!role) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const { token: verificationToken, expires: verificationTokenExpires } = generateVerificationToken();

    // Create user with verification fields
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId: role.id,
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      },
      select: authUserSelect
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    console.log('User created:', user.id);

    // Don't auto-login - require email verification
    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      verificationLink: emailResult.verificationUrl,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        farmId: user.farmId,
        farm: user.farm,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// LOGIN - Updated with verification check and remember me
// ============================================

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user with role
    const user = await prisma.user.findUnique({
      where: { email },
      select: authUserSelect
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in. Check your inbox.' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token with remember me
    const token = generateToken(user.id, user.email, user.roleId, rememberMe || false);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        farmId: user.farmId,
        farm: user.farm,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// GET PROFILE - Updated with isVerified field
// ============================================

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileUserSelect
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// NEW FUNCTIONS - Add these
// ============================================

// Verify Email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await prisma.user.findUnique({
      where: {
        verificationToken: token as string
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified. You can now login.' });
    }

    if (!user.verificationTokenExpires || user.verificationTokenExpires <= new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true
      }
    });

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    }

    const { token: resetToken, expires: resetTokenExpires } = generateResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires
      }
    });

    const resetEmailResult = await sendPasswordResetEmail(email, resetToken);

    res.json({ 
      message: 'If an account exists with this email, you will receive a password reset link.',
      resetLink: resetEmailResult.resetUrl
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date()
        }
      } as Prisma.UserWhereInput
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update Profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: authUserSelect
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role.name,
        farmId: updatedUser.farmId,
        farm: updatedUser.farm,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend Verification Email
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const { token: verificationToken, expires: verificationTokenExpires } = generateVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires
      }
    });

    const emailResult = await sendVerificationEmail(email, verificationToken);

    res.json({
      message: 'Verification email resent. Please check your inbox.',
      verificationLink: emailResult.verificationUrl
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
