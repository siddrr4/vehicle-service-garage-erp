import express from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMechanicAttendanceHistory,
  getAdminAttendanceSummary,
  getTodayMechanicAvailability,
  markAttendance,
} from '../controllers/attendanceController.js';
import { protect, admin, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.post('/mark', protect, adminOrAdvisor, markAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/my-history', protect, getMechanicAttendanceHistory);
router.get('/admin-summary', protect, getAdminAttendanceSummary);
router.get('/mechanic-availability', protect, getTodayMechanicAvailability);

export default router;
