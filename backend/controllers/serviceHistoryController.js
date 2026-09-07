import ServiceHistory from '../models/ServiceHistory.js';
import Vehicle from '../models/Vehicle.js';
import mongoose from 'mongoose';

// @desc    Get all service history (with filters & pagination)
// @route   GET /api/service-history
// @access  Private (Admin/Advisor)
export const getServiceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filterQuery = {};

    // Customer or Vehicle filter could be added via query params
    if (req.query.customer) filterQuery.customer = req.query.customer;
    if (req.query.vehicle) filterQuery.vehicle = req.query.vehicle;
    if (req.query.startDate && req.query.endDate) {
      filterQuery.serviceDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const history = await ServiceHistory.find(filterQuery)
      .populate('customer', 'fullName mobileNumber')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('jobCard', 'jobNumber serviceType status assignedMechanic')
      .populate({
        path: 'jobCard',
        populate: { path: 'assignedMechanic', select: 'firstName lastName' }
      })
      .populate('invoice', 'invoiceNumber grandTotal status')
      .sort({ serviceDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ServiceHistory.countDocuments(filterQuery);

    res.json({
      history,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single service history by ID
// @route   GET /api/service-history/:id
// @access  Private
export const getServiceHistoryById = async (req, res) => {
  try {
    const history = await ServiceHistory.findById(req.params.id)
      .populate('customer', 'fullName mobileNumber emailAddress address city state')
      .populate('vehicle', 'vehicleNumber brand model yearOfManufacture fuelType vinNumber currentOdometerReading')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'assignedMechanic', select: 'firstName lastName email' },
          { path: 'partsUsed.part', select: 'partName partNumber sellingPrice' }
        ]
      })
      .populate('invoice', 'invoiceNumber grandTotal status totalParts totalLabour totalWashing discount taxAmount createdAt payments');

    if (!history) {
      return res.status(404).json({ message: 'Service history not found' });
    }

    // Role-based authorization
    if (req.user.role === 'customer') {
      if (!req.user.customerRef || history.customer._id.toString() !== req.user.customerRef.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this service history' });
      }
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get service history for a specific vehicle
// @route   GET /api/service-history/vehicle/:vehicleId
// @access  Private
export const getVehicleServiceHistory = async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;

    // First check authorization
    if (req.user.role === 'customer') {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || !req.user.customerRef || vehicle.customer.toString() !== req.user.customerRef.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this vehicle\'s history' });
      }
    }

    const history = await ServiceHistory.find({ vehicle: vehicleId })
      .populate('jobCard', 'jobNumber serviceType status complaint workDescription')
      .populate('invoice', 'invoiceNumber grandTotal status')
      .populate({
        path: 'jobCard',
        populate: { path: 'assignedMechanic', select: 'firstName lastName' }
      })
      .sort({ serviceDate: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in customer's service history
// @route   GET /api/service-history/my-history
// @access  Private (Customer)
export const getMyServiceHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.customerRef) {
      return res.status(404).json({ message: 'Customer profile not linked to this account.' });
    }

    const history = await ServiceHistory.find({ customer: req.user.customerRef })
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('jobCard', 'jobNumber serviceType status')
      .populate('invoice', 'invoiceNumber grandTotal status')
      .populate({
        path: 'jobCard',
        populate: { path: 'assignedMechanic', select: 'firstName lastName' }
      })
      .sort({ serviceDate: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
