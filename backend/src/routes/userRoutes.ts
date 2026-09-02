import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
  getUserStats,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// User management routes
router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/roles', getAllRoles);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;