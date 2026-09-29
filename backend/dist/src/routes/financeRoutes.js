import { Router } from 'express';
import { getFinanceStats, getAllTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, getAllInvoices, createInvoice, getAllAccounts, getAllBudgets, createBudget, } from '../controllers/financeController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// All routes require authentication
router.use(authenticate);
// Finance Overview & Stats
router.get('/stats', getFinanceStats);
// Transactions CRUD
router.get('/transactions', getAllTransactions);
router.get('/transactions/:id', getTransactionById);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);
// Invoices
router.get('/invoices', getAllInvoices);
router.post('/invoices', createInvoice);
// Accounts & Budgets
router.get('/accounts', getAllAccounts);
router.get('/budgets', getAllBudgets);
router.post('/budgets', createBudget);
export default router;
