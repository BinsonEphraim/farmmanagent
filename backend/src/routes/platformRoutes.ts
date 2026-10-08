import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import {
  createCustomer,
  createCustomerFarm,
  createPlan,
  createSupportTicket,
  getCustomers,
  getPlans,
  getPlatformOverview,
  getPlatformSettings,
  getSupportTickets,
  updateCustomer,
  updatePlatformSettings,
  updateSubscription,
  updateSupportTicket,
} from '../controllers/platformController.js';

const router = Router();
router.use(authenticate, requireRole('Platform Owner'));

router.get('/overview', getPlatformOverview);
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.patch('/customers/:id', updateCustomer);
router.post('/customers/:id/farms', createCustomerFarm);
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/subscriptions/:id', updateSubscription);
router.get('/support', getSupportTickets);
router.post('/support', createSupportTicket);
router.patch('/support/:id', updateSupportTicket);
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

export default router;
