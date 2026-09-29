import api from './api';

export const employeeService = {
  getDashboard: async () => {
    const response = await api.get('/employee/dashboard');
    return response.data;
  },

  submitLeaveRequest: async (data) => {
    const response = await api.post('/employee/leave-request', data);
    return response.data;
  },
};
