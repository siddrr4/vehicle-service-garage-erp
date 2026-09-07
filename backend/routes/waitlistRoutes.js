import express from 'express';
import { 
  addToWaitlist, 
  getTodayWaitlist, 
  assignWaitlist, 
  cancelWaitlist 
} from '../controllers/waitlistController.js';
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, addToWaitlist);

router.route('/today')
  .get(protect, adminOrAdvisor, getTodayWaitlist);

router.route('/:id/assign')
  .put(protect, adminOrAdvisor, assignWaitlist);

router.route('/:id/cancel')
  .put(protect, adminOrAdvisor, cancelWaitlist);

export default router;
