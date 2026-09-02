import { Router } from 'express';
import { createFarm, getAllFarms, getFarmById, updateFarm, deleteFarm, getFarmStats, createCrop, getAllCrops, getCropStats, getCropById, getCropsByFarm, updateCrop, deleteCrop, createInventory, getInventoryByFarm, createAnimal, getAnimalsByFarm, updateAnimal, deleteAnimal, getAllAssets, getAssetStats, getAssetById, createAsset, updateAsset, deleteAsset, createAssetMaintenance, getAllMaintenanceLogs, } from '../controllers/farmController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// All routes require authentication
router.use(authenticate);
// ============================================
// FARM ROUTES
// ============================================
router.post('/', createFarm);
router.get('/', getAllFarms);
router.get('/stats', getFarmStats);
router.get('/:id', getFarmById);
router.put('/:id', updateFarm);
router.delete('/:id', deleteFarm);
// ============================================
// ASSETS & EQUIPMENT ROUTES
// Note: static subpaths like /assets/stats, /assets/all and /assets/maintenance/all must come before /assets/:id
// ============================================
router.get('/assets/stats', getAssetStats);
router.get('/assets/all', getAllAssets);
router.get('/assets/maintenance/all', getAllMaintenanceLogs);
router.get('/assets/:id', getAssetById);
router.post('/assets', createAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);
router.post('/assets/:id/maintenance', createAssetMaintenance);
// ============================================
// CROP ROUTES
// ============================================
router.post('/crops', createCrop);
router.get('/crops/all', getAllCrops);
router.get('/crops/stats', getCropStats);
router.get('/crops/:id', getCropById);
router.get('/:farmId/crops', getCropsByFarm);
router.put('/crops/:id', updateCrop);
router.delete('/crops/:id', deleteCrop);
// ============================================
// INVENTORY ROUTES
// ============================================
router.post('/inventory', createInventory);
router.get('/:farmId/inventory', getInventoryByFarm);
// ============================================
// ANIMAL ROUTES
// ============================================
router.post('/animals', createAnimal);
router.get('/:farmId/animals', getAnimalsByFarm);
router.put('/animals/:id', updateAnimal);
router.delete('/animals/:id', deleteAnimal);
export default router;
