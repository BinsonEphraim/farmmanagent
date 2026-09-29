import api from './api';

export const financeService = {
  // Statistics & Dashboard Overview
  getFinanceStats: async () => {
    const response = await api.get('/finance/stats');
    return response.data;
  },

  // Transactions CRUD
  getAllTransactions: async (params = {}) => {
    const response = await api.get('/finance/transactions', { params });
    return response.data;
  },

  getTransactionById: async (id) => {
    const response = await api.get(`/finance/transactions/${id}`);
    return response.data;
  },

  createTransaction: async (data) => {
    const response = await api.post('/finance/transactions', data);
    return response.data;
  },

  updateTransaction: async (id, data) => {
    const response = await api.put(`/finance/transactions/${id}`, data);
    return response.data;
  },

  deleteTransaction: async (id) => {
    const response = await api.delete(`/finance/transactions/${id}`);
    return response.data;
  },

  // Invoices
  getAllInvoices: async (params = {}) => {
    const response = await api.get('/finance/invoices', { params });
    return response.data;
  },

  createInvoice: async (data) => {
    const response = await api.post('/finance/invoices', data);
    return response.data;
  },

  // Accounts & Budgets
  getAllAccounts: async () => {
    const response = await api.get('/finance/accounts');
    return response.data;
  },

  getAllBudgets: async () => {
    const response = await api.get('/finance/budgets');
    return response.data;
  },

  createBudget: async (data) => {
    const response = await api.post('/finance/budgets', data);
    return response.data;
  },
};
