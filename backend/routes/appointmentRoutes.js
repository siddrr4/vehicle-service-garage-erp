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
  getNextAvailableSlot,
  getNextWalkInSlot,
  assignMechanicToAppointment,
} from '../controllers/appointmentController.js';
import { protect, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/advisors', protect, getServiceAdvisors);
router.get('/available-slots', getAvailableSlots);
router.get('/next-available-slot', getNextAvailableSlot);
router.get('/next-walkin-slot', getNextWalkInSlot);
router.get('/today-schedule', protect, getTodaySchedule);
router.put('/:id/recommendation', protect, addAdvisorRecommendation);
router.put('/:id/assign-mechanic', protect, adminOrAdvisor, assignMechanicToAppointment);

router.route('/')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/:id')
  .get(protect, getAppointmentById)
  .put(protect, updateAppointment)
  .delete(protect, deleteAppointment);

export default router;
