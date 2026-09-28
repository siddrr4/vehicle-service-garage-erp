import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import JobCard from '../models/JobCard.js';
import ServiceHistory from '../models/ServiceHistory.js';

// @desc    Get all vehicles with search, filter, and pagination
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build search query
    const keyword = req.query.keyword
      ? {
          $or: [
            { vehicleNumber: { $regex: req.query.keyword, $options: 'i' } },
            { normalizedVehicleNumber: { $regex: req.query.keyword.replace(/\s+/g, ''), $options: 'i' } },
            { brand: { $regex: req.query.keyword, $options: 'i' } },
            { model: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    // Build filter query
    const filterQuery = {};
    if (req.query.fuelType) filterQuery.fuelType = req.query.fuelType;
    if (req.query.transmission) filterQuery.transmission = req.query.transmission;

    const combinedQuery = { ...keyword, ...filterQuery };

    const count = await Vehicle.countDocuments(combinedQuery);

    const vehicles = await Vehicle.find(combinedQuery)
      .populate('customer', 'fullName mobileNumber customerId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      vehicles,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user's vehicles
// @route   GET /api/vehicles/my-vehicles
// @access  Private (Customer)
export const getMyVehicles = async (req, res) => {
  try {
    if (!req.user || !req.user.customerRef) {
      return res.status(404).json({ message: 'No customer profile linked to this account.' });
    }

    const vehicles = await Vehicle.find({ customer: req.user.customerRef })
      .populate('customer', 'fullName mobileNumber')
      .sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(
      'customer',
      'fullName mobileNumber emailAddress address city state pincode customerId'
    );

    if (vehicle) {
      res.json(vehicle);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Logical pattern for KA 20 registered vehicles: ^KA\s*20\s*[A-Z]{1,3}\s*\d{1,4}$
export const KA20_REGEX = /^KA\s*20\s*[A-Z]{1,3}\s*\d{1,4}$/i;

// Helper to normalize KA 20 registration numbers
export const normalizeKA20VehicleNumber = (val) => {
  if (!val) return { isValid: false, normalized: '', formatted: '' };
  const str = String(val).trim();
  if (!KA20_REGEX.test(str)) {
    return { isValid: false, normalized: '', formatted: '' };
  }
  const clean = str.toUpperCase().replace(/\s+/g, '');
  const match = clean.match(/^KA20([A-Z]{1,3})(\d{1,4})$/);
  const formatted = match ? `KA 20 ${match[1]} ${match[2]}` : clean;
  return { isValid: true, normalized: clean, formatted };
};

// Helper to create flexible-space regex for uniqueness checks
const makeFlexibleRegex = (cleanStr) => {
  const stripped = String(cleanStr).trim().toUpperCase().replace(/\s+/g, '');
  const pattern = stripped
    .split('')
    .map((c) => c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(`^${pattern}$`, 'i');
};

// Helper to normalize identification strings (trim and uppercase, return undefined if empty)
const normalizeIdNumber = (val) => {
  if (val === null || val === undefined) return undefined;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
};

// Map duplicate key errors (code 11000) or controller validations to user-friendly messages
const handleDuplicateError = (error, res) => {
  if (error.code === 11000) {
    const errorStr = JSON.stringify(error.keyPattern || {}) + ' ' + (error.message || '');
    if (errorStr.includes('vehicleNumber') || errorStr.includes('normalizedVehicleNumber')) {
      return res.status(400).json({
        message: 'This vehicle registration number is already registered.',
        field: 'vehicleNumber',
      });
    }
    if (errorStr.includes('chassisNumber')) {
      return res.status(400).json({
        message: 'This chassis/VIN number is already registered to another vehicle.',
        field: 'chassisNumber',
      });
    }
    if (errorStr.includes('engineNumber')) {
      return res.status(400).json({
        message: 'This engine number is already registered to another vehicle.',
        field: 'engineNumber',
      });
    }
    if (errorStr.includes('insuranceNumber')) {
      return res.status(400).json({
        message: 'This insurance policy number is already registered to another vehicle.',
        field: 'insuranceNumber',
      });
    }
    return res.status(400).json({ message: 'Duplicate identification number already exists.' });
  }
  return res.status(400).json({ message: error.message });
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private
export const createVehicle = async (req, res) => {
  try {
    const {
      customerId,
      vehicleNumber,
      brand,
      model,
      manufacturingYear,
      fuelType,
      transmission,
      registrationDate,
      insuranceNumber,
      insuranceExpiryDate,
      warrantyExpiryDate,
      engineNumber,
      chassisNumber,
      currentOdometerReading,
      purchaseType,
    } = req.body;

    // Validate required fields
    if (!customerId) return res.status(400).json({ message: 'Customer is required' });
    if (!vehicleNumber || !String(vehicleNumber).trim()) {
      return res.status(400).json({ message: 'Vehicle number is required', field: 'vehicleNumber' });
    }
    if (!brand) return res.status(400).json({ message: 'Brand is required' });
    if (!model) return res.status(400).json({ message: 'Model is required' });
    if (!manufacturingYear) return res.status(400).json({ message: 'Manufacturing year is required' });
    if (!fuelType) return res.status(400).json({ message: 'Fuel type is required' });
    if (!transmission) return res.status(400).json({ message: 'Transmission type is required' });
    if (!registrationDate) return res.status(400).json({ message: 'Registration date is required' });
    if (currentOdometerReading === undefined || currentOdometerReading === '') {
      return res.status(400).json({ message: 'Odometer reading is required' });
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // 1. Strict KA 20 format validation & normalization
    const vnCheck = normalizeKA20VehicleNumber(vehicleNumber);
    if (!vnCheck.isValid) {
      return res.status(400).json({
        message: 'Only KA 20 registered vehicles are allowed.',
        field: 'vehicleNumber',
      });
    }

    const normChassisNumber = normalizeIdNumber(chassisNumber);
    const normEngineNumber = normalizeIdNumber(engineNumber);
    const normInsuranceNumber = normalizeIdNumber(insuranceNumber);

    if (normChassisNumber && normChassisNumber.length > 17) {
      return res.status(400).json({
        message: 'Chassis number cannot exceed 17 characters',
        field: 'chassisNumber',
      });
    }

    if (normInsuranceNumber && normInsuranceNumber.length > 50) {
      return res.status(400).json({
        message: 'Insurance number cannot exceed 50 characters',
        field: 'insuranceNumber',
      });
    }

    // 2. Check duplicate vehicleNumber (case/whitespace-insensitive)
    const existingVehicleNumber = await Vehicle.findOne({
      $or: [
        { vehicleNumber: vnCheck.normalized },
        { vehicleNumber: vnCheck.formatted },
        { normalizedVehicleNumber: vnCheck.normalized },
        { vehicleNumber: { $regex: makeFlexibleRegex(vnCheck.normalized) } },
      ],
    });
    if (existingVehicleNumber) {
      return res.status(400).json({
        message: 'This vehicle registration number is already registered.',
        field: 'vehicleNumber',
      });
    }

    // 3. Check duplicate chassisNumber (case/whitespace-insensitive, when provided)
    if (normChassisNumber) {
      const existingChassis = await Vehicle.findOne({
        $or: [
          { chassisNumber: normChassisNumber },
          { chassisNumber: { $regex: makeFlexibleRegex(normChassisNumber) } },
        ],
      });
      if (existingChassis) {
        return res.status(400).json({
          message: 'This chassis/VIN number is already registered to another vehicle.',
          field: 'chassisNumber',
        });
      }
    }

    // 4. Check duplicate engineNumber (case/whitespace-insensitive, when provided)
    if (normEngineNumber) {
      const existingEngine = await Vehicle.findOne({
        $or: [
          { engineNumber: normEngineNumber },
          { engineNumber: { $regex: makeFlexibleRegex(normEngineNumber) } },
        ],
      });
      if (existingEngine) {
        return res.status(400).json({
          message: 'This engine number is already registered to another vehicle.',
          field: 'engineNumber',
        });
      }
    }

    // 5. Check duplicate insuranceNumber (case/whitespace-insensitive, when provided)
    if (normInsuranceNumber) {
      const existingInsurance = await Vehicle.findOne({
        $or: [
          { insuranceNumber: normInsuranceNumber },
          { insuranceNumber: { $regex: makeFlexibleRegex(normInsuranceNumber) } },
        ],
      });
      if (existingInsurance) {
        return res.status(400).json({
          message: 'This insurance policy number is already registered to another vehicle.',
          field: 'insuranceNumber',
        });
      }
    }

    const vehicle = new Vehicle({
      customer: customerId,
      vehicleNumber: vnCheck.formatted,
      normalizedVehicleNumber: vnCheck.normalized,
      brand: brand?.trim(),
      model: model?.trim(),
      manufacturingYear,
      fuelType,
      transmission,
      registrationDate,
      insuranceNumber: normInsuranceNumber || undefined,
      insuranceExpiryDate: insuranceExpiryDate || undefined,
      warrantyExpiryDate: warrantyExpiryDate || undefined,
      engineNumber: normEngineNumber || undefined,
      chassisNumber: normChassisNumber || undefined,
      purchaseType: purchaseType || 'Used',
      initialOdometer: purchaseType === 'New' ? 0 : currentOdometerReading,
      currentOdometerReading: purchaseType === 'New' ? 0 : currentOdometerReading,
      freeServicesEntitled: purchaseType === 'New' ? 3 : 0,
      freeServicesUsed: 0,
    });

    const createdVehicle = await vehicle.save();
    // Populate customer before returning
    await createdVehicle.populate('customer', 'fullName mobileNumber customerId');
    res.status(201).json(createdVehicle);
  } catch (error) {
    return handleDuplicateError(error, res);
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // 1. Vehicle Number validation
    if (req.body.vehicleNumber !== undefined) {
      const rawIncoming = String(req.body.vehicleNumber).trim();
      if (!rawIncoming) {
        return res.status(400).json({ message: 'Vehicle number is required', field: 'vehicleNumber' });
      }

      const currentClean = (vehicle.vehicleNumber || '').toUpperCase().replace(/\s+/g, '');
      const incomingClean = rawIncoming.toUpperCase().replace(/\s+/g, '');

      // If registration number is changing, must enforce KA 20 and check uniqueness against others
      if (incomingClean !== currentClean) {
        const vnCheck = normalizeKA20VehicleNumber(rawIncoming);
        if (!vnCheck.isValid) {
          return res.status(400).json({
            message: 'Only KA 20 registered vehicles are allowed.',
            field: 'vehicleNumber',
          });
        }

        const existingVehicle = await Vehicle.findOne({
          _id: { $ne: req.params.id },
          $or: [
            { vehicleNumber: vnCheck.normalized },
            { vehicleNumber: vnCheck.formatted },
            { normalizedVehicleNumber: vnCheck.normalized },
            { vehicleNumber: { $regex: makeFlexibleRegex(vnCheck.normalized) } },
          ],
        });
        if (existingVehicle) {
          return res.status(400).json({
            message: 'This vehicle registration number is already registered.',
            field: 'vehicleNumber',
          });
        }
        vehicle.vehicleNumber = vnCheck.formatted;
        vehicle.normalizedVehicleNumber = vnCheck.normalized;
      } else {
        // Keeping own vehicle number: update normalizedVehicleNumber if not set
        if (!vehicle.normalizedVehicleNumber) {
          vehicle.normalizedVehicleNumber = currentClean;
        }
      }
    }

    // 2. Chassis Number validation
    if (req.body.chassisNumber !== undefined) {
      const normChassisNumber = normalizeIdNumber(req.body.chassisNumber);
      if (normChassisNumber) {
        if (normChassisNumber.length > 17) {
          return res.status(400).json({
            message: 'Chassis number cannot exceed 17 characters',
            field: 'chassisNumber',
          });
        }
        const existingChassis = await Vehicle.findOne({
          _id: { $ne: req.params.id },
          $or: [
            { chassisNumber: normChassisNumber },
            { chassisNumber: { $regex: makeFlexibleRegex(normChassisNumber) } },
          ],
        });
        if (existingChassis) {
          return res.status(400).json({
            message: 'This chassis/VIN number is already registered to another vehicle.',
            field: 'chassisNumber',
          });
        }
        vehicle.chassisNumber = normChassisNumber;
      } else {
        vehicle.chassisNumber = undefined;
      }
    }

    // 3. Engine Number validation
    if (req.body.engineNumber !== undefined) {
      const normEngineNumber = normalizeIdNumber(req.body.engineNumber);
      if (normEngineNumber) {
        const existingEngine = await Vehicle.findOne({
          _id: { $ne: req.params.id },
          $or: [
            { engineNumber: normEngineNumber },
            { engineNumber: { $regex: makeFlexibleRegex(normEngineNumber) } },
          ],
        });
        if (existingEngine) {
          return res.status(400).json({
            message: 'This engine number is already registered to another vehicle.',
            field: 'engineNumber',
          });
        }
        vehicle.engineNumber = normEngineNumber;
      } else {
        vehicle.engineNumber = undefined;
      }
    }

    // 4. Insurance Policy Number validation
    if (req.body.insuranceNumber !== undefined) {
      const normInsuranceNumber = normalizeIdNumber(req.body.insuranceNumber);
      if (normInsuranceNumber) {
        if (normInsuranceNumber.length > 50) {
          return res.status(400).json({
            message: 'Insurance number cannot exceed 50 characters',
            field: 'insuranceNumber',
          });
        }
        const existingInsurance = await Vehicle.findOne({
          _id: { $ne: req.params.id },
          $or: [
            { insuranceNumber: normInsuranceNumber },
            { insuranceNumber: { $regex: makeFlexibleRegex(normInsuranceNumber) } },
          ],
        });
        if (existingInsurance) {
          return res.status(400).json({
            message: 'This insurance policy number is already registered to another vehicle.',
            field: 'insuranceNumber',
          });
        }
        vehicle.insuranceNumber = normInsuranceNumber;
      } else {
        vehicle.insuranceNumber = undefined;
      }
    }

    if (req.body.currentOdometerReading !== undefined) {
      if (req.body.currentOdometerReading < vehicle.currentOdometerReading) {
        return res.status(400).json({
          message: `Odometer reading cannot be lower than the previous reading (${vehicle.currentOdometerReading} km).`,
        });
      }
      vehicle.currentOdometerReading = req.body.currentOdometerReading;
    }

    // Update remaining updatable fields
    const otherUpdatableFields = [
      'brand',
      'model',
      'manufacturingYear',
      'fuelType',
      'transmission',
      'registrationDate',
      'insuranceExpiryDate',
      'warrantyExpiryDate',
      'purchaseType',
    ];

    otherUpdatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    const updatedVehicle = await vehicle.save();
    await updatedVehicle.populate('customer', 'fullName mobileNumber customerId');
    res.json(updatedVehicle);
  } catch (error) {
    return handleDuplicateError(error, res);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
      await vehicle.deleteOne();
      res.json({ message: 'Vehicle removed successfully' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lookup vehicle by registration number for Walk-in Service
// @route   GET /api/vehicles/lookup/:regNumber
// @access  Private (Advisor/Admin)
export const lookupVehicleByRegNumber = async (req, res) => {
  try {
    const rawReg = req.params.regNumber || '';
    const cleanReg = rawReg.trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanReg) {
      return res.status(400).json({ message: 'Vehicle registration number is required' });
    }

    // Flexible regex allowing optional whitespace between characters (e.g. KA20EH0623 matches "KA 20 EH 0623")
    const flexibleRegex = new RegExp(`^${cleanReg.split('').join('\\s*')}$`, 'i');

    const vehicle = await Vehicle.findOne({
      $or: [
        { vehicleNumber: cleanReg },
        { normalizedVehicleNumber: cleanReg },
        { vehicleNumber: rawReg.trim().toUpperCase() },
        { vehicleNumber: { $regex: flexibleRegex } }
      ]
    }).populate('customer', 'fullName mobileNumber emailAddress address city state pincode customerId');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Retrieve last service information from JobCard and ServiceHistory
    const lastJobCard = await JobCard.findOne({
      vehicle: vehicle._id
    }).sort({ createdAt: -1 }).select('jobNumber status createdAt servicesPerformed');

    const lastServiceHistory = await ServiceHistory.findOne({
      vehicle: vehicle._id
    }).sort({ serviceDate: -1 }).select('serviceDate odometerReading isFreeService freeServiceNumber');

    // Count completed non-cancelled services per vehicle
    const completedServicesCount = await JobCard.countDocuments({
      vehicle: vehicle._id,
      status: { $in: ['Completed', 'Delivered'] }
    });

    const freeServicesEntitled = vehicle.freeServicesEntitled !== undefined ? vehicle.freeServicesEntitled : 3;
    const freeServiceEligible = completedServicesCount < freeServicesEntitled;
    const freeServiceNumber = freeServiceEligible ? completedServicesCount + 1 : null;

    res.json({
      vehicle,
      customer: vehicle.customer,
      serviceInfo: {
        lastServiceDate: lastServiceHistory?.serviceDate || lastJobCard?.createdAt || null,
        lastJobCardId: lastJobCard?._id || null,
        lastJobCardNumber: lastJobCard?.jobNumber || null,
        lastJobCardStatus: lastJobCard?.status || null,
        insuranceExpiryDate: vehicle.insuranceExpiryDate || null,
        warrantyExpiryDate: vehicle.warrantyExpiryDate || null,
        completedServicesCount,
        freeServicesEntitled,
        freeServicesUsed: vehicle.freeServicesUsed || completedServicesCount,
        freeServiceEligible,
        freeServiceNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check field uniqueness dynamically for real-time frontend validation
// @route   GET /api/vehicles/check-unique
// @access  Private
export const checkVehicleUniqueness = async (req, res) => {
  try {
    const { field, value, excludeId } = req.query;
    if (!field || !value) {
      return res.json({ available: true });
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
      return res.json({ available: true });
    }

    const excludeFilter = excludeId ? { _id: { $ne: excludeId } } : {};

    if (field === 'vehicleNumber') {
      const vnCheck = normalizeKA20VehicleNumber(trimmed);
      if (!vnCheck.isValid) {
        return res.json({
          available: false,
          formatError: true,
          message: 'Only KA 20 registered vehicles are allowed.'
        });
      }

      const existing = await Vehicle.findOne({
        ...excludeFilter,
        $or: [
          { vehicleNumber: vnCheck.normalized },
          { vehicleNumber: vnCheck.formatted },
          { normalizedVehicleNumber: vnCheck.normalized },
          { vehicleNumber: { $regex: makeFlexibleRegex(vnCheck.normalized) } }
        ]
      });

      if (existing) {
        return res.json({
          available: false,
          message: 'This vehicle registration number is already registered.'
        });
      }
      return res.json({ available: true, normalized: vnCheck.normalized, formatted: vnCheck.formatted });
    }

    if (field === 'chassisNumber') {
      const clean = trimmed.toUpperCase();
      const existing = await Vehicle.findOne({
        ...excludeFilter,
        $or: [
          { chassisNumber: clean },
          { chassisNumber: { $regex: makeFlexibleRegex(clean) } }
        ]
      });
      if (existing) {
        return res.json({
          available: false,
          message: 'This chassis/VIN number is already registered to another vehicle.'
        });
      }
      return res.json({ available: true });
    }

    if (field === 'engineNumber') {
      const clean = trimmed.toUpperCase();
      const existing = await Vehicle.findOne({
        ...excludeFilter,
        $or: [
          { engineNumber: clean },
          { engineNumber: { $regex: makeFlexibleRegex(clean) } }
        ]
      });
      if (existing) {
        return res.json({
          available: false,
          message: 'This engine number is already registered to another vehicle.'
        });
      }
      return res.json({ available: true });
    }

    if (field === 'insuranceNumber') {
      const clean = trimmed.toUpperCase();
      const existing = await Vehicle.findOne({
        ...excludeFilter,
        $or: [
          { insuranceNumber: clean },
          { insuranceNumber: { $regex: makeFlexibleRegex(clean) } }
        ]
      });
      if (existing) {
        return res.json({
          available: false,
          message: 'This insurance policy number is already registered to another vehicle.'
        });
      }
      return res.json({ available: true });
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

