import api from './api';

export const storekeeperService = {
  getDashboard: async () => {
    const response = await api.get('/storekeeper/dashboard');
    return response.data;
  },

  logStockMovement: async (data) => {
    const response = await api.post('/storekeeper/movement', data);
    return response.data;
  },
};
