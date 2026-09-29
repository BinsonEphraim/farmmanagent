import { Router } from 'express';
import { getHrDashboard, updateLeaveStatus } from '../controllers/hrController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getHrDashboard);
router.put('/leave/:id/status', updateLeaveStatus);

export default router;
