import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getServiceAdvisors,
  getAvailableSlots,
  getTodaySchedule,
  addAdvisorRecommendation,
  getNextAvailableSlot
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/advisors', protect, getServiceAdvisors);
router.get('/available-slots', getAvailableSlots);
router.get('/next-available-slot', getNextAvailableSlot);
router.get('/today-schedule', protect, getTodaySchedule);
router.put('/:id/recommendation', protect, addAdvisorRecommendation);

router.route('/')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/:id')
  .get(protect, getAppointmentById)
  .put(protect, updateAppointment)
  .delete(protect, deleteAppointment);

export default router;
