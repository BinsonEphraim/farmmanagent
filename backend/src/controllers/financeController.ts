import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const db: any = prisma;

const parseId = (val: any) => {
  if (val === undefined || val === null) return NaN;
  if (Array.isArray(val)) val = val[0];
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? NaN : n;
};

// Auto-generate Transaction Reference Code
const generateNextTxReference = async (type: 'INCOME' | 'EXPENSE'): Promise<string> => {
  const prefix = type === 'INCOME' ? 'INV' : 'EXP';
  const year = new Date().getFullYear();
  const count = await db.transaction.count();
  const nextNum = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${nextNum}`;
};

// 1. Get Financial Overview Dashboard Statistics
export const getFinanceStats = async (req: Request, res: Response) => {
  try {
    const [transactions, invoices, accounts, budgets] = await Promise.all([
      db.transaction.findMany({
        orderBy: { date: 'asc' },
        include: { farm: { select: { id: true, name: true } } },
      }),
      db.invoice.findMany({
        orderBy: { issueDate: 'desc' },
        include: { farm: { select: { id: true, name: true } } },
      }),
      db.financialAccount.findMany(),
      db.budget.findMany({
        include: { farm: { select: { id: true, name: true } } },
      }),
    ]);

    let totalRevenue = 0;
    let totalExpenses = 0;
    const categoryExpenses: Record<string, number> = {};

    // 12 Monthly Buckets
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: Record<number, { income: number; expenses: number; inflow: number; outflow: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { income: 0, expenses: 0, inflow: 0, outflow: 0 };
    }

    for (const t of transactions) {
      const amt = Math.abs(Number(t.amount)) || 0;
      const tDate = new Date(t.date);
      const monthIdx = tDate.getMonth();

      if (t.type === 'INCOME' && t.status === 'COMPLETED') {
        totalRevenue += amt;
        if (monthlyData[monthIdx]) {
          monthlyData[monthIdx].income += amt;
          monthlyData[monthIdx].inflow += amt;
        }
      } else if (t.type === 'EXPENSE' && t.status === 'COMPLETED') {
        totalExpenses += amt;
        if (monthlyData[monthIdx]) {
          monthlyData[monthIdx].expenses += amt;
          monthlyData[monthIdx].outflow += amt;
        }

        // Category aggregation
        const cat = t.category || 'Other Expenses';
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
      }
    }

    const netProfit = totalRevenue - totalExpenses;

    // Accounts Receivable from unpaid invoices
    let accountsReceivable = 0;
    let accountsPayable = 0;
    for (const inv of invoices) {
      if (inv.type === 'RECEIVABLE' && (inv.status === 'PENDING' || inv.status === 'SENT' || inv.status === 'OVERDUE')) {
        accountsReceivable += Math.max(0, Number(inv.amount) - Number(inv.paidAmount || 0));
      }
    }
    // Cash balance from accounts
    let cashBalance = 0;
    for (const acc of accounts) {
      cashBalance += Number(acc.balance) || 0;
    }
    // Format Income vs Expenses Chart data
    const incomeVsExpenses = months.map((month, idx) => {
      // Use real data if available, or realistic proportional trend
      const d = monthlyData[idx];
      let inc = d.income;
      let exp = d.expenses;

      return {
        month,
        income: inc,
        expenses: exp,
      };
    });

    // Format Expense by Category Breakdown
    const catColors: Record<string, string> = {
      'Farm Inputs': '#10b981',
      'Payroll': '#f59e0b',
      'Fuel & Transport': '#06b6d4',
      'Animal Health': '#8b5cf6',
      'Utilities': '#3b82f6',
      'Other Expenses': '#64748b',
    };

    const expenseByCategory = Object.keys(categoryExpenses).map((catName) => {
      const amount = categoryExpenses[catName];
      const percentage = totalExpenses > 0 ? parseFloat(((amount / totalExpenses) * 100).toFixed(1)) : 0;
      return {
        name: catName,
        amount,
        percentage,
        color: catColors[catName] || '#64748b',
      };
    }).sort((a, b) => b.amount - a.amount);

    // Format Cash Flow Summary
    const cashFlowSummary = months.map((month, idx) => {
      const d = monthlyData[idx];
      let inflow = d.inflow;
      let outflow = d.outflow;

      return {
        month,
        inflow,
        outflow,
        netFlow: inflow - outflow,
      };
    });

    const totalCashInflows = cashFlowSummary.reduce((sum, item) => sum + item.inflow, 0);
    const totalCashOutflows = cashFlowSummary.reduce((sum, item) => sum + item.outflow, 0);

    res.json({
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        accountsReceivable,
        accountsPayable,
        cashBalance,
        totalCashInflows,
        totalCashOutflows,
        netCashFlow: totalCashInflows - totalCashOutflows,
        growthRates: {
          revenue: null,
          expenses: null,
          netProfit: null,
          receivable: null,
          payable: null,
          cashBalance: null,
          inflows: null,
          outflows: null,
        },
      },
      incomeVsExpenses,
      expenseByCategory,
      cashFlowSummary,
      recentInvoices: invoices.slice(0, 5),
    });
  } catch (error) {
    console.error('Get finance stats error:', error);
    res.status(500).json({ error: 'Internal server error calculating financial metrics' });
  }
};

// 2. Get All Transactions with Filters, Search & Pagination
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const {
      search,
      type,
      account,
      category,
      startDate,
      endDate,
      status,
      page = '1',
      limit = '10',
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Search query
    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { account: { contains: q, mode: 'insensitive' } },
        { farm: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Type filter (Income, Expense)
    if (type && type !== 'All Types' && type !== 'ALL') {
      where.type = String(type).toUpperCase();
    }

    // Account filter
    if (account && account !== 'All Accounts' && account !== 'ALL') {
      where.account = { contains: String(account), mode: 'insensitive' };
    }

    // Category filter
    if (category && category !== 'All Categories' && category !== 'ALL') {
      where.category = { contains: String(category), mode: 'insensitive' };
    }

    // Status filter
    if (status && status !== 'All Statuses' && status !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const [total, transactions] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [String(sortBy)]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        include: {
          farm: { select: { id: true, name: true, location: true } },
          invoice: { select: { id: true, invoiceNumber: true, customer: true } },
        },
      }),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Internal server error fetching transactions' });
  }
};

// 3. Get Single Transaction By ID
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const txId = parseId(id);

    if (Number.isNaN(txId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: txId },
      include: {
        farm: true,
        invoice: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Create New Transaction (Income / Expense)
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      reference,
      date,
      description,
      category,
      account = 'Operating Account',
      type = 'EXPENSE',
      amount,
      status = 'COMPLETED',
      farmId,
      invoiceId,
      paymentMethod = 'Bank Transfer',
      notes,
    } = req.body;

    if (!description || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Description and amount are required' });
    }

    const txType = String(type).toUpperCase() as 'INCOME' | 'EXPENSE';
    const txRef = reference && reference.trim() !== '' ? reference.trim() : await generateNextTxReference(txType);
    const numAmount = Math.abs(parseFloat(amount)) || 0;

    const transaction = await db.transaction.create({
      data: {
        reference: txRef,
        date: date ? new Date(date) : new Date(),
        description,
        category: category || (txType === 'INCOME' ? 'Sales Revenue' : 'Other Expenses'),
        account,
        type: txType,
        amount: numAmount,
        status: String(status).toUpperCase(),
        farmId: farmId ? parseId(farmId) : null,
        invoiceId: invoiceId ? parseId(invoiceId) : null,
        paymentMethod,
        notes: notes || null,
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    // Update account balance if account exists
    if (account) {
      const existingAcc = await db.financialAccount.findUnique({ where: { name: account } });
      if (existingAcc) {
        const delta = txType === 'INCOME' ? numAmount : -numAmount;
        await db.financialAccount.update({
          where: { name: account },
          data: { balance: { increment: delta } },
        });
      }
    }

    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction,
    });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Transaction reference code must be unique' });
    }
    res.status(500).json({ error: 'Internal server error creating transaction' });
  }
};

// 5. Update Transaction
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const txId = parseId(id);

    if (Number.isNaN(txId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const {
      reference,
      date,
      description,
      category,
      account,
      type,
      amount,
      status,
      farmId,
      invoiceId,
      paymentMethod,
      notes,
    } = req.body;

    const existingTx = await db.transaction.findUnique({ where: { id: txId } });
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updatedTx = await db.transaction.update({
      where: { id: txId },
      data: {
        reference: reference !== undefined ? reference : existingTx.reference,
        date: date ? new Date(date) : existingTx.date,
        description: description !== undefined ? description : existingTx.description,
        category: category !== undefined ? category : existingTx.category,
        account: account !== undefined ? account : existingTx.account,
        type: type !== undefined ? String(type).toUpperCase() : existingTx.type,
        amount: amount !== undefined ? Math.abs(parseFloat(amount)) : existingTx.amount,
        status: status !== undefined ? String(status).toUpperCase() : existingTx.status,
        farmId: farmId !== undefined ? (farmId ? parseId(farmId) : null) : existingTx.farmId,
        invoiceId: invoiceId !== undefined ? (invoiceId ? parseId(invoiceId) : null) : existingTx.invoiceId,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existingTx.paymentMethod,
        notes: notes !== undefined ? notes : existingTx.notes,
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTx,
    });
  } catch (error: any) {
    console.error('Update transaction error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Transaction reference code must be unique' });
    }
    res.status(500).json({ error: 'Internal server error updating transaction' });
  }
};

// 6. Delete Transaction
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const txId = parseId(id);

    if (Number.isNaN(txId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const existingTx = await db.transaction.findUnique({ where: { id: txId } });
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db.transaction.delete({ where: { id: txId } });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error deleting transaction' });
  }
};

// 7. Get All Invoices
export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = String(status).toUpperCase();
    if (type && type !== 'ALL') where.type = String(type).toUpperCase();

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        farm: { select: { id: true, name: true, location: true } },
      },
    });

    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error fetching invoices' });
  }
};

// 8. Create New Invoice
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNumber,
      title,
      customer,
      customerEmail,
      issueDate,
      dueDate,
      amount,
      status = 'PENDING',
      type = 'RECEIVABLE',
      farmId,
      notes,
    } = req.body;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({ error: 'Title, amount, and due date are required' });
    }

    let invNum = invoiceNumber;
    if (!invNum || invNum.trim() === '') {
      const count = await db.invoice.count();
      const year = new Date().getFullYear();
      invNum = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: invNum,
        title,
        customer: customer || 'Direct Client',
        customerEmail: customerEmail || null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: new Date(dueDate),
        amount: parseFloat(amount) || 0,
        paidAmount: 0,
        status: String(status).toUpperCase(),
        type: String(type).toUpperCase(),
        farmId: farmId ? parseId(farmId) : null,
        notes: notes || null,
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Invoice number must be unique' });
    }
    res.status(500).json({ error: 'Internal server error creating invoice' });
  }
};

// 9. Get Accounts
export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await db.financialAccount.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error fetching accounts' });
  }
};

// 10. Get Budgets
export const getAllBudgets = async (req: Request, res: Response) => {
  try {
    const budgets = await db.budget.findMany({
      orderBy: { id: 'asc' },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });
    res.json({ budgets });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Internal server error fetching budgets' });
  }
};

// 11. Create Budget
export const createBudget = async (req: Request, res: Response) => {
  try {
    const { name, category, allocatedAmount, period = '2025 Season A', startDate, endDate, farmId } = req.body;

    if (!name || !allocatedAmount) {
      return res.status(400).json({ error: 'Budget name and allocated amount are required' });
    }

    const budget = await db.budget.create({
      data: {
        name,
        category: category || 'Farm Inputs',
        allocatedAmount: parseFloat(allocatedAmount) || 0,
        spentAmount: 0,
        period,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        farmId: farmId ? parseId(farmId) : null,
      },
    });

    res.status(201).json({
      message: 'Budget created successfully',
      budget,
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Internal server error creating budget' });
  }
};
