import express from 'express';
import {
  getServiceHistory,
  getServiceHistoryById,
  getVehicleServiceHistory,
  getMyServiceHistory
} from '../controllers/serviceHistoryController.js';
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOrAdvisor, getServiceHistory);

router.route('/my-history')
  .get(protect, getMyServiceHistory);

router.route('/vehicle/:vehicleId')
  .get(protect, getVehicleServiceHistory);

router.route('/:id')
  .get(protect, getServiceHistoryById);

export default router;
