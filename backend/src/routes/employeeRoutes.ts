import { Router } from 'express';
import { getEmployeeDashboard, submitLeaveRequest } from '../controllers/employeeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Requires authentication
router.use(authenticate);

router.get('/dashboard', getEmployeeDashboard);
router.post('/leave-request', submitLeaveRequest);

export default router;
