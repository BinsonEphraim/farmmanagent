import { Router } from 'express';
import {
  getMdDashboardStats,
  updateApprovalStatus,
  createApprovalRequest,
  updateStrategicGoal,
} from '../controllers/mdController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Executive Dashboard Stats
router.get('/stats', getMdDashboardStats);

// Key Decisions & Approvals
router.post('/approvals', createApprovalRequest);
router.put('/approvals/:id/status', updateApprovalStatus);

// Strategic Goals
router.put('/goals/:id', updateStrategicGoal);

export default router;
