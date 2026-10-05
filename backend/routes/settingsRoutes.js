import express from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getSettings)
  .put(protect, admin, updateSettings);

router.route('/public')
  .get(protect, getPublicSettings);

export default router;
