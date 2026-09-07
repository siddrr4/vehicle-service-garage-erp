import express from 'express';
import {
  getEmployees,
  getActiveMechanics,
  getEmployeeStats,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getEmployees)
  .post(protect, admin, createEmployee);

router.route('/active-mechanics')
  .get(protect, getActiveMechanics);

router.route('/stats')
  .get(protect, getEmployeeStats);

router.route('/:id')
  .get(protect, getEmployeeById)
  .put(protect, admin, updateEmployee)
  .delete(protect, admin, deleteEmployee);

export default router;
