import express from 'express';
import {
  getSpareParts,
  getAllSpareParts,
  getSparePartStats,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart
} from '../controllers/sparePartController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/all')
  .get(protect, getAllSpareParts);

router.route('/stats')
  .get(protect, getSparePartStats);

router.route('/')
  .get(protect, getSpareParts)
  .post(protect, restrictTo('admin'), createSparePart);

router.route('/:id')
  .get(protect, getSparePartById)
  .put(protect, restrictTo('admin'), updateSparePart)
  .delete(protect, restrictTo('admin'), deleteSparePart);

export default router;
