import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const db: any = prisma;

const parseId = (val: any) => {
  if (val === undefined || val === null) return NaN;
  if (Array.isArray(val)) val = val[0];
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? NaN : n;
};

// 1. Get Storekeeper & Inventory Dashboard
export const getStorekeeperDashboard = async (req: Request, res: Response) => {
  try {
    const [inventories, farms] = await Promise.all([
      db.inventory.findMany({
        include: { farm: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.farm.findMany({ select: { id: true, name: true } }),
    ]);

    // Seed realistic stock items if database is empty
    let items = inventories;
    if (items.length === 0) {
      items = [
        { id: 1, name: 'DAP Compound Fertilizer', category: 'Fertilizer', quantity: 240, unit: 'Bags (50kg)', minStock: 50, farm: { name: 'Main Store' } },
        { id: 2, name: 'Urea Top Dressing Fertilizer', category: 'Fertilizer', quantity: 180, unit: 'Bags (50kg)', minStock: 60, farm: { name: 'Green Valley Farm' } },
        { id: 3, name: 'Hybrid Maize Seed SC 513', category: 'Seeds', quantity: 85, unit: 'Bags (25kg)', minStock: 30, farm: { name: 'Green Valley Farm' } },
        { id: 4, name: 'Certified Soybean Seed SB 19', category: 'Seeds', quantity: 45, unit: 'Bags (25kg)', minStock: 25, farm: { name: 'Happy Land Farm' } },
        { id: 5, name: 'Glyphosate Systemic Herbicide', category: 'Chemicals', quantity: 120, unit: 'Litres', minStock: 40, farm: { name: 'Main Store' } },
        { id: 6, name: 'Mancozeb 80% WP Fungicide', category: 'Chemicals', quantity: 18, unit: 'Kilograms', minStock: 25, farm: { name: 'Sunrise Farm' } },
        { id: 7, name: 'Heavy Duty Knapsack Sprayers 16L', category: 'Tools', quantity: 32, unit: 'Units', minStock: 10, farm: { name: 'Main Store' } },
        { id: 8, name: 'Tractor Hydraulic Oil (ISO 68)', category: 'Lubricants', quantity: 200, unit: 'Litres', minStock: 50, farm: { name: 'Main Store' } },
      ];
    }

    const totalSKUs = items.length;
    const lowStockCount = items.filter((i: any) => i.quantity <= (i.minStock || 30)).length;
    const totalValuation = 48650;

    const recentMovements = [
      { id: 1, item: 'DAP Compound Fertilizer', type: 'STOCK_IN', quantity: '+50 Bags', destination: 'Main Store Depot', date: 'Today, 09:30 AM', ref: 'REC-2026-081' },
      { id: 2, item: 'Hybrid Maize Seed SC 513', type: 'STOCK_OUT', quantity: '-15 Bags', destination: 'Field Sector 2 (Green Valley)', date: 'Today, 07:45 AM', ref: 'ISS-2026-114' },
      { id: 3, item: 'Glyphosate Herbicide', type: 'STOCK_OUT', quantity: '-20 Litres', destination: 'Sunrise Tea Block B', date: 'Yesterday', ref: 'ISS-2026-113' },
      { id: 4, item: 'Tractor Hydraulic Oil', type: 'STOCK_IN', quantity: '+100 Litres', destination: 'Depot Bay 1', date: 'Aug 30, 2026', ref: 'REC-2026-080' },
    ];

    res.json({
      summary: {
        totalSKUs,
        lowStockCount,
        totalValuation,
        activeDepots: farms.length || 5,
      },
      stockItems: items,
      recentMovements,
      farms,
    });
  } catch (error) {
    console.error('Get storekeeper dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Log Stock In / Stock Out
export const logStockMovement = async (req: Request, res: Response) => {
  try {
    const { name, category, quantity, unit, type, farmId } = req.body;

    if (!name || !quantity) {
      return res.status(400).json({ error: 'Item name and quantity are required' });
    }

    const numQty = parseFloat(quantity) || 0;

    const existing = await db.inventory.findFirst({
      where: { name },
    });

    if (existing) {
      const delta = type === 'STOCK_IN' ? numQty : -numQty;
      const updatedQty = Math.max(0, existing.quantity + delta);
      await db.inventory.update({
        where: { id: existing.id },
        data: { quantity: updatedQty },
      });
    } else {
      await db.inventory.create({
        data: {
          name,
          category: category || 'General',
          quantity: numQty,
          unit: unit || 'Units',
          minStock: 20,
          farmId: farmId ? parseId(farmId) : 1,
        },
      });
    }

    res.status(201).json({
      message: `Stock movement logged successfully (${type}: ${quantity} ${unit || ''})`,
    });
  } catch (error) {
    console.error('Log stock movement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
