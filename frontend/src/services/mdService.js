import api from './api';

export const mdService = {
  // MD Dashboard Statistics
  getMdStats: async () => {
    const response = await api.get('/md/stats');
    return response.data;
  },

  // Key Decisions & Approvals
  createApproval: async (data) => {
    const response = await api.post('/md/approvals', data);
    return response.data;
  },

  updateApprovalStatus: async (id, status) => {
    const response = await api.put(`/md/approvals/${id}/status`, { status });
    return response.data;
  },

  // Strategic Goals
  updateGoal: async (id, data) => {
    const response = await api.put(`/md/goals/${id}`, data);
    return response.data;
  },
};
