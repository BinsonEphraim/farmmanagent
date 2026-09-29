import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login with remember me
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      const data = await authService.login({ email, password, rememberMe });
      
      // Save token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Verify email
  const verifyEmail = async (token) => {
    try {
      setError(null);
      const data = await authService.verifyEmail(token);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Verification failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const data = await authService.forgotPassword(email);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset link';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      const data = await authService.resetPassword(token, newPassword);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Password reset failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const data = await authService.updateProfile(profileData);
      
      // Update stored user data
      if (data.user) {
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Profile update failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      setError(null);
      const data = await authService.resendVerification(email);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to resend verification';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Logout
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    updateProfile,
    resendVerification,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
