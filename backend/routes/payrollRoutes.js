import express from 'express';
import {
  getPayrolls,
  generateMonthlyPayroll,
  getPayrollById,
  updatePaymentStatus,
  getMyPayslips,
} from '../controllers/payrollController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/my-payslips')
  .get(protect, getMyPayslips);

router.route('/generate')
  .post(protect, admin, generateMonthlyPayroll);

router.route('/')
  .get(protect, admin, getPayrolls);

router.route('/:id')
  .get(protect, getPayrollById);

router.route('/:id/payment')
  .put(protect, admin, updatePaymentStatus);

export default router;
