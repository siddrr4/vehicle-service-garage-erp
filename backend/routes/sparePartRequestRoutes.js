import express from 'express';
import {
  createRequest,
  getRequests,
  issueRequest,
  rejectRequest,
  requestReturn,
  approveReturn,
  rejectReturn
} from '../controllers/sparePartRequestController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getRequests)
  .post(protect, createRequest);

router.route('/:id/issue')
  .put(protect, restrictTo('admin', 'advisor'), issueRequest);

router.route('/:id/reject')
  .put(protect, restrictTo('admin', 'advisor'), rejectRequest);

router.route('/:id/return-request')
  .put(protect, requestReturn);

router.route('/:id/return-approve')
  .put(protect, restrictTo('admin', 'advisor'), approveReturn);

router.route('/:id/return-reject')
  .put(protect, restrictTo('admin', 'advisor'), rejectReturn);

export default router;
