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
} from '../controllers/jobCardController.js';
import { protect, admin, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getJobCards)
  .post(protect, adminOrAdvisor, createJobCard);

router.route('/stats')
  .get(protect, getJobCardStats);

router.route('/my-job-cards')
  .get(protect, getMyJobCards);

router.route('/mechanic-jobs')
  .get(protect, getMechanicJobCards);

router.route('/:id/mechanic-update')
  .put(protect, updateMechanicJobCard);

router.route('/:id')
  .get(protect, getJobCardById)
  .put(protect, adminOrAdvisor, updateJobCard)
  .delete(protect, admin, deleteJobCard);

export default router;
