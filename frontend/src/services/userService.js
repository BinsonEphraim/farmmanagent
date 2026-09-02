import api from './api';

export const userService = {
  // Get all users with pagination and filters
  getAllUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Get single user by ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Get all roles
  getAllRoles: async () => {
    const response = await api.get('/users/roles');
    return response.data;
  },

  // Get user stats & role metrics
  getUserStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },
};