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
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuration (Udupi location & 20 km radius)
router.get('/config', getRoadsideConfig);

// Customer endpoints
router.post('/', protect, createRoadsideRequest);
router.get('/my-requests', protect, getMyRoadsideRequests);

// Admin & Advisor endpoints
router.get('/', protect, adminOrAdvisor, getAllRoadsideRequests);
router.get('/:id', protect, getRoadsideRequestById);
router.put('/:id/status', protect, adminOrAdvisor, updateRoadsideStatus);
router.put('/:id/on-site-repair', protect, adminOrAdvisor, recordOnSiteRepair);
router.put('/:id/pickup-dispatch', protect, adminOrAdvisor, dispatchVehiclePickup);
router.put('/:id/pickup-status', protect, adminOrAdvisor, updatePickupStatus);

export default router;
