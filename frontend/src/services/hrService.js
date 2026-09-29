import api from './api';

export const hrService = {
  getDashboard: async () => {
    const response = await api.get('/hr/dashboard');
    return response.data;
  },

  updateLeaveStatus: async (id, status) => {
    const response = await api.put(`/hr/leave/${id}/status`, { status });
    return response.data;
  },
};
