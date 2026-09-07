import express from 'express';
import {
  getSummary,
  getRevenueAnalytics,
  getServiceAnalytics,
  getMechanicAnalytics,
  getInventoryAnalytics,
  getFreeServiceAnalytics,
  getPaymentAnalytics,
  getCustomerVehicleAnalytics
} from '../controllers/reportsController.js';
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);
router.use(adminOrAdvisor);

router.get('/summary', getSummary);
router.get('/revenue', getRevenueAnalytics);
router.get('/services', getServiceAnalytics);
router.get('/mechanics', getMechanicAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/free-services', getFreeServiceAnalytics);
router.get('/payments', getPaymentAnalytics);
router.get('/customers-vehicles', getCustomerVehicleAnalytics);

export default router;
