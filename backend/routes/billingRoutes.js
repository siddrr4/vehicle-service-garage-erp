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
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOrAdvisor, getInvoices);

router.route('/config')
  .get(protect, getBillingConfig);

router.route('/generate')
  .post(protect, adminOrAdvisor, generateInvoice);

router.route('/my-invoices')
  .get(protect, getMyInvoices);

router.route('/jobcard/:jobCardId')
  .get(protect, getInvoiceByJobCard);

router.route('/:id')
  .get(protect, getInvoiceById);

router.route('/:id/pay')
  .post(protect, adminOrAdvisor, recordPayment);

router.route('/:id/create-payment-order')
  .post(protect, createPaymentOrder);

router.route('/:id/verify-payment')
  .post(protect, verifyPayment);

export default router;
