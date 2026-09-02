import api from './api';

export const farmService = {
  // Farms
  getAllFarms: async (params = {}) => {
    const response = await api.get('/farms', { params });
    return response.data;
  },

  getFarmById: async (id) => {
    const response = await api.get(`/farms/${id}`);
    return response.data;
  },

  createFarm: async (data) => {
    const response = await api.post('/farms', data);
    return response.data;
  },

  updateFarm: async (id, data) => {
    const response = await api.put(`/farms/${id}`, data);
    return response.data;
  },

  deleteFarm: async (id) => {
    const response = await api.delete(`/farms/${id}`);
    return response.data;
  },

  getFarmStats: async () => {
    const response = await api.get('/farms/stats');
    return response.data;
  },

  // Crops
  getAllCrops: async (params = {}) => {
    const response = await api.get('/farms/crops/all', { params });
    return response.data;
  },

  getCropStats: async (params = {}) => {
    const response = await api.get('/farms/crops/stats', { params });
    return response.data;
  },

  getCropById: async (id) => {
    const response = await api.get(`/farms/crops/${id}`);
    return response.data;
  },

  createCrop: async (data) => {
    const response = await api.post('/farms/crops', data);
    return response.data;
  },

  getCropsByFarm: async (farmId) => {
    const response = await api.get(`/farms/${farmId}/crops`);
    return response.data;
  },

  updateCrop: async (id, data) => {
    const response = await api.put(`/farms/crops/${id}`, data);
    return response.data;
  },

  deleteCrop: async (id) => {
    const response = await api.delete(`/farms/crops/${id}`);
    return response.data;
  },

  // Animals
  createInventory: async (data) => {
    const response = await api.post('/farms/inventory', data);
    return response.data;
  },

  getInventoryByFarm: async (farmId) => {
    const response = await api.get(`/farms/${farmId}/inventory`);
    return response.data;
  },

  createAnimal: async (data) => {
    const response = await api.post('/farms/animals', data);
    return response.data;
  },

  getAnimalsByFarm: async (farmId) => {
    const response = await api.get(`/farms/${farmId}/animals`);
    return response.data;
  },

  updateAnimal: async (id, data) => {
    const response = await api.put(`/farms/animals/${id}`, data);
    return response.data;
  },

  deleteAnimal: async (id) => {
    const response = await api.delete(`/farms/animals/${id}`);
    return response.data;
  },

  // Assets & Equipment
  getAllAssets: async (params = {}) => {
    const response = await api.get('/farms/assets/all', { params });
    return response.data;
  },

  getAssetStats: async () => {
    const response = await api.get('/farms/assets/stats');
    return response.data;
  },

  getAssetById: async (id) => {
    const response = await api.get(`/farms/assets/${id}`);
    return response.data;
  },

  createAsset: async (data) => {
    const response = await api.post('/farms/assets', data);
    return response.data;
  },

  updateAsset: async (id, data) => {
    const response = await api.put(`/farms/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id) => {
    const response = await api.delete(`/farms/assets/${id}`);
    return response.data;
  },

  createAssetMaintenance: async (id, data) => {
    const response = await api.post(`/farms/assets/${id}/maintenance`, data);
    return response.data;
  },

  getAllMaintenanceLogs: async () => {
    const response = await api.get('/farms/assets/maintenance/all');
    return response.data;
  },
};