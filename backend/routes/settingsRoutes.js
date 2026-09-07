import express from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settingsController.js';
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOrAdvisor, getSettings)
  .put(protect, adminOrAdvisor, updateSettings);

router.route('/public')
  .get(protect, getPublicSettings);

export default router;
