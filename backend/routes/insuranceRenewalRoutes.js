import express from 'express';
import {
  getVehicleInsuranceDetails,
  createRenewalOrder,
  verifyRenewalPayment,
  recordRenewalFailure,
  getVehicleRenewalHistory,
  getRenewalReceiptById,
} from '../controllers/insuranceRenewalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All insurance renewal endpoints are protected
router.use(protect);

router.get('/vehicle/:vehicleId', getVehicleInsuranceDetails);
router.get('/vehicle/:vehicleId/history', getVehicleRenewalHistory);
router.get('/receipt/:id', getRenewalReceiptById);
router.post('/create-order', createRenewalOrder);
router.post('/verify-payment', verifyRenewalPayment);
router.post('/record-failure', recordRenewalFailure);

export default router;
