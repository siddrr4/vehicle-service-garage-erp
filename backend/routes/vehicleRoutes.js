import express from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getMyVehicles,
  lookupVehicleByRegNumber,
} from '../controllers/vehicleController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// List & Create
router.route('/')
  .get(protect, getVehicles)
  .post(protect, createVehicle);

// Lookup vehicle by registration number (for Walk-in Service)
router.route('/lookup/:regNumber')
  .get(protect, lookupVehicleByRegNumber);

// Customer's own vehicles
router.route('/my-vehicles')
  .get(protect, getMyVehicles);

// Single vehicle — Get, Update, Delete
router.route('/:id')
  .get(protect, getVehicleById)
  .put(protect, updateVehicle)
  .delete(protect, admin, deleteVehicle);

export default router;
