import express from 'express';
import {
  getRoadsideConfig,
  createRoadsideRequest,
  getMyRoadsideRequests,
  getAllRoadsideRequests,
  getRoadsideRequestById,
  updateRoadsideStatus,
  recordOnSiteRepair,
  dispatchVehiclePickup,
  updatePickupStatus
} from '../controllers/roadsideController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuration (Udupi location & 20 km radius)
router.get('/config', getRoadsideConfig);

// Customer endpoints
router.post('/', protect, createRoadsideRequest);
router.get('/my-requests', protect, getMyRoadsideRequests);

// Admin endpoints (Roadside handled strictly by Admin, not Service Advisor)
router.get('/', protect, admin, getAllRoadsideRequests);
router.get('/:id', protect, getRoadsideRequestById);
router.put('/:id/status', protect, admin, updateRoadsideStatus);
router.put('/:id/on-site-repair', protect, admin, recordOnSiteRepair);
router.put('/:id/pickup-dispatch', protect, admin, dispatchVehiclePickup);
router.put('/:id/pickup-status', protect, admin, updatePickupStatus);

export default router;
