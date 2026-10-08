import api from './api';

export const platformService = {
  getOverview: async () => (await api.get('/platform/overview')).data,
  getCustomers: async () => (await api.get('/platform/customers')).data,
  createCustomer: async (data) => (await api.post('/platform/customers', data)).data,
  updateCustomer: async (id, data) => (await api.patch(`/platform/customers/${id}`, data)).data,
  createCustomerFarm: async (id, data) => (await api.post(`/platform/customers/${id}/farms`, data)).data,
  getPlans: async () => (await api.get('/platform/plans')).data,
  createPlan: async (data) => (await api.post('/platform/plans', data)).data,
  updateSubscription: async (id, data) => (await api.patch(`/platform/subscriptions/${id}`, data)).data,
  getSupportTickets: async () => (await api.get('/platform/support')).data,
  createSupportTicket: async (data) => (await api.post('/platform/support', data)).data,
  updateSupportTicket: async (id, data) => (await api.patch(`/platform/support/${id}`, data)).data,
  getSettings: async () => (await api.get('/platform/settings')).data,
  updateSettings: async (settings) => (await api.put('/platform/settings', { settings })).data,
};
