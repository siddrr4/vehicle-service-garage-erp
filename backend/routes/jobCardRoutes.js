import express from 'express';
import {
  getJobCards,
  getMyJobCards,
  getMechanicJobCards,
  getJobCardById,
  createJobCard,
  updateJobCard,
  updateMechanicJobCard,
  deleteJobCard,
  getJobCardStats,
  createWalkInJobCard,
  addAdditionalRecommendation,
  respondToRecommendation,
} from '../controllers/jobCardController.js';
import { protect, admin, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getJobCards)
  .post(protect, adminOrAdvisor, createJobCard);

// Walk-in Service Job Card creation
router.route('/walk-in')
  .post(protect, adminOrAdvisor, createWalkInJobCard);

router.route('/stats')
  .get(protect, getJobCardStats);

router.route('/my-job-cards')
  .get(protect, getMyJobCards);

router.route('/mechanic-jobs')
  .get(protect, getMechanicJobCards);

router.route('/:id/mechanic-update')
  .put(protect, updateMechanicJobCard);

// Additional service recommendations
router.route('/:id/recommendations')
  .post(protect, addAdditionalRecommendation);

router.route('/:id/recommendations/:recId/approval')
  .put(protect, respondToRecommendation);

router.route('/:id')
  .get(protect, getJobCardById)
  .put(protect, adminOrAdvisor, updateJobCard)
  .delete(protect, admin, deleteJobCard);

export default router;
