import express from 'express';
import {
  generateInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceByJobCard,
  recordPayment,
  getMyInvoices,
  getBillingConfig,
  createPaymentOrder,
  verifyPayment
} from '../controllers/billingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Billing & invoices handled strictly by Admin, not Service Advisor
router.route('/')
  .get(protect, admin, getInvoices);

router.route('/config')
  .get(protect, getBillingConfig);

router.route('/generate')
  .post(protect, admin, generateInvoice);

router.route('/my-invoices')
  .get(protect, getMyInvoices);

router.route('/jobcard/:jobCardId')
  .get(protect, getInvoiceByJobCard);

router.route('/:id')
  .get(protect, getInvoiceById);

router.route('/:id/pay')
  .post(protect, admin, recordPayment);

router.route('/:id/create-payment-order')
  .post(protect, createPaymentOrder);

router.route('/:id/verify-payment')
  .post(protect, verifyPayment);

export default router;
