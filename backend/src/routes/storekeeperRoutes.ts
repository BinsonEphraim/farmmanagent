import { Router } from 'express';
import { getStorekeeperDashboard, logStockMovement } from '../controllers/storekeeperController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getStorekeeperDashboard);
router.post('/movement', logStockMovement);

export default router;
