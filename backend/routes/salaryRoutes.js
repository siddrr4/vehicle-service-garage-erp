import express from 'express';
import {
  getSalaryStructures,
  getSalaryStructureByEmployee,
  createSalaryStructure,
  updateSalaryStructure,
  toggleSalaryStructureStatus,
  deleteSalaryStructure,
} from '../controllers/salaryController.js';
import { protect, admin, adminOrAdvisor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOrAdvisor, getSalaryStructures)
  .post(protect, admin, createSalaryStructure);

router.route('/employee/:employeeId')
  .get(protect, adminOrAdvisor, getSalaryStructureByEmployee);

router.route('/:id')
  .put(protect, admin, updateSalaryStructure)
  .delete(protect, admin, deleteSalaryStructure);

router.route('/:id/toggle-status')
  .patch(protect, admin, toggleSalaryStructureStatus);

export default router;
