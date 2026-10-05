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
import { protect, admin, blockAdvisorFromAppointments } from '../middleware/authMiddleware.js';

const router = express.Router();

// Workshop Bay Capacity checks (allowed for capacity calculation)
router.get('/available-slots', getAvailableSlots);
router.get('/next-available-slot', getNextAvailableSlot);
router.get('/next-walkin-slot', getNextWalkInSlot);

// Appointment endpoints - Service Advisor is strictly forbidden
router.get('/advisors', protect, blockAdvisorFromAppointments, getServiceAdvisors);
router.get('/today-schedule', protect, admin, getTodaySchedule);
router.put('/:id/recommendation', protect, admin, addAdvisorRecommendation);
router.put('/:id/assign-mechanic', protect, admin, assignMechanicToAppointment);

router.route('/')
  .get(protect, blockAdvisorFromAppointments, getAppointments)
  .post(protect, blockAdvisorFromAppointments, createAppointment);

router.route('/:id')
  .get(protect, blockAdvisorFromAppointments, getAppointmentById)
  .put(protect, blockAdvisorFromAppointments, updateAppointment)
  .delete(protect, admin, deleteAppointment);

export default router;
