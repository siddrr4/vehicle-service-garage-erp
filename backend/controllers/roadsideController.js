import RoadsideAssistance from '../models/RoadsideAssistance.js';
import Appointment from '../models/Appointment.js';
import JobCard from '../models/JobCard.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import Employee from '../models/Employee.js';
import { getGarageConfig } from '../config/garageConfig.js';
import { calculateDistanceKm, isValidCoordinate } from '../utils/geoUtils.js';
import { notifyCustomer, notifyAdminsAndAdvisors, notifyMechanic } from '../services/notificationService.js';
import { formatDateIST } from '../utils/dateUtils.js';

// @desc    Get roadside assistance garage configuration (location & 20 km radius)
// @route   GET /api/roadside-assistance/config
// @access  Public / Private
export const getRoadsideConfig = async (req, res) => {
  try {
    const config = getGarageConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new roadside assistance request with strict 20 km backend validation
// @route   POST /api/roadside-assistance
// @access  Private (Customer or Admin)
export const createRoadsideRequest = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      vehicleId,
      breakdownType,
      problemDescription,
      contactPhone,
      address,
      landmark
    } = req.body;

    // 1. Validate required fields
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle selection is required.' });
    }
    if (!problemDescription || problemDescription.trim() === '') {
      return res.status(400).json({ message: 'Problem description is required.' });
    }
    if (!contactPhone || contactPhone.trim() === '') {
      return res.status(400).json({ message: 'Contact phone number is required.' });
    }

    // 2. Validate coordinates
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (!isValidCoordinate(lat, lon)) {
      return res.status(400).json({
        message: 'Valid breakdown location coordinates (latitude and longitude) are required.'
      });
    }

    // 3. Haversine distance calculation from Udupi garage
    const config = getGarageConfig();
    const distanceKm = calculateDistanceKm(config.latitude, config.longitude, lat, lon);

    // 4. Strict Backend 20 km Service Radius Validation
    if (distanceKm > config.serviceRadiusKm) {
      return res.status(400).json({
        message: `Breakdown location is ${distanceKm.toFixed(2)} km from our Udupi workshop. Roadside assistance is strictly limited to our ${config.serviceRadiusKm} km service radius.`,
        distanceKm,
        maxRadiusKm: config.serviceRadiusKm,
        exceededByKm: Math.round((distanceKm - config.serviceRadiusKm) * 100) / 100
      });
    }

    // 5. Resolve Customer Profile
    let customerId = req.user.customerRef;
    if (!customerId) {
      const customerDoc = await Customer.findOne({ userId: req.user._id });
      if (customerDoc) {
        customerId = customerDoc._id;
      }
    }

    // Admin or advisor creating on behalf of a customer
    if (!customerId && (req.user.role === 'admin' || req.user.role === 'advisor') && req.body.customerId) {
      customerId = req.body.customerId;
    }

    if (!customerId) {
      return res.status(400).json({
        message: 'No registered customer profile found for this account. Please register your profile first.'
      });
    }

    // 6. Validate Vehicle ownership & existence
    let vehicle = null;
    if (req.user.role === 'customer') {
      vehicle = await Vehicle.findOne({ _id: vehicleId, customer: customerId });
    } else {
      vehicle = await Vehicle.findById(vehicleId);
    }

    if (!vehicle) {
      return res.status(404).json({
        message: 'Vehicle not found or does not belong to your account.'
      });
    }

    // 7. Create linked Appointment (Service Request) in ERP workflow
    const formattedDesc = `[Roadside Breakdown - ${distanceKm.toFixed(1)} km from Udupi Garage] ${breakdownType || 'Breakdown'}: ${problemDescription} | Location: ${address || `${lat}, ${lon}`}${landmark ? ` (Landmark: ${landmark})` : ''}`;

    const appointment = new Appointment({
      customer: customerId,
      vehicle: vehicle._id,
      serviceType: 'Roadside Assistance',
      appointmentDate: new Date(),
      preferredTime: 'Immediate / ASAP',
      problemDescription: formattedDesc,
      bookingType: 'Roadside',
      status: 'Pending',
      breakdownLocation: {
        latitude: lat,
        longitude: lon,
        address: address || '',
        landmark: landmark || '',
        distanceKm,
        contactPhone
      }
    });

    const savedAppointment = await appointment.save();

    // 8. Create Roadside Assistance record
    const roadside = new RoadsideAssistance({
      customer: customerId,
      vehicle: vehicle._id,
      serviceRequest: savedAppointment._id,
      breakdownType: breakdownType || 'Engine Failure',
      problemDescription,
      contactPhone,
      location: {
        latitude: lat,
        longitude: lon,
        address: address || '',
        landmark: landmark || '',
        distanceKm
      },
      status: 'Pending'
    });

    const savedRoadside = await roadside.save();

    // 9. Dispatch Emergency ERP Notifications
    await notifyCustomer(customerId, {
      type: 'ROADSIDE_REQUESTED',
      title: 'Roadside Assistance Request Received',
      message: `Your roadside assistance request for ${vehicle.vehicleNumber} (${distanceKm.toFixed(1)} km from Udupi garage) has been logged. Our emergency team has been notified.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: savedRoadside._id,
      metadata: {
        requestNumber: savedRoadside.requestNumber,
        distanceKm,
        vehicleNumber: vehicle.vehicleNumber
      }
    });

    await notifyAdminsAndAdvisors({
      type: 'ROADSIDE_REQUESTED',
      title: `🚨 Roadside Assistance: ${vehicle.vehicleNumber}`,
      message: `Emergency roadside request received for ${vehicle.vehicleNumber} at ${address || `${lat}, ${lon}`} (${distanceKm.toFixed(1)} km from garage). Contact: ${contactPhone}.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: savedRoadside._id,
      metadata: {
        requestNumber: savedRoadside.requestNumber,
        distanceKm,
        vehicleNumber: vehicle.vehicleNumber,
        contactPhone
      }
    });

    const populated = await RoadsideAssistance.findById(savedRoadside._id)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('serviceRequest');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating roadside request:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get customer's roadside assistance requests
// @route   GET /api/roadside-assistance/my-requests
// @access  Private (Customer)
export const getMyRoadsideRequests = async (req, res) => {
  try {
    let customerId = req.user.customerRef;
    if (!customerId) {
      const customerDoc = await Customer.findOne({ userId: req.user._id });
      if (customerDoc) customerId = customerDoc._id;
    }

    if (!customerId) {
      return res.json([]);
    }

    const requests = await RoadsideAssistance.find({ customer: customerId })
      .populate('vehicle', 'vehicleNumber brand model fuelType')
      .populate('assignedMechanic', 'fullName employeeId mobileNumber')
      .populate('jobCard', 'jobNumber status priority')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all roadside assistance requests (Admin & Advisor)
// @route   GET /api/roadside-assistance
// @access  Private (Admin / Advisor)
export const getAllRoadsideRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.keyword) {
      const kw = req.query.keyword.trim();
      const customers = await Customer.find({
        $or: [
          { fullName: { $regex: kw, $options: 'i' } },
          { mobileNumber: { $regex: kw, $options: 'i' } }
        ]
      }).select('_id');

      const vehicles = await Vehicle.find({
        vehicleNumber: { $regex: kw, $options: 'i' }
      }).select('_id');

      filter.$or = [
        { customer: { $in: customers.map(c => c._id) } },
        { vehicle: { $in: vehicles.map(v => v._id) } },
        { requestNumber: { $regex: kw, $options: 'i' } },
        { problemDescription: { $regex: kw, $options: 'i' } },
        { 'location.address': { $regex: kw, $options: 'i' } }
      ];
    }

    const count = await RoadsideAssistance.countDocuments(filter);
    const requests = await RoadsideAssistance.find(filter)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('jobCard', 'jobNumber status priority')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      requests,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single roadside assistance request by ID
// @route   GET /api/roadside-assistance/:id
// @access  Private
export const getRoadsideRequestById = async (req, res) => {
  try {
    const request = await RoadsideAssistance.findById(req.params.id)
      .populate('customer', 'fullName mobileNumber emailAddress address city')
      .populate('vehicle', 'vehicleNumber brand model fuelType')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('serviceRequest')
      .populate('jobCard');

    if (!request) {
      return res.status(404).json({ message: 'Roadside assistance request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record on-site repair diagnosis, work, parts/labour charges & customer confirmation
// @route   PUT /api/roadside-assistance/:id/on-site-repair
// @access  Private (Admin / Advisor / Mechanic)
export const recordOnSiteRepair = async (req, res) => {
  try {
    const {
      diagnosisText,
      workPerformed,
      partsUsed = [],
      labourCost = 0,
      customerConfirmation = {}
    } = req.body;

    const roadside = await RoadsideAssistance.findById(req.params.id)
      .populate('customer')
      .populate('vehicle');

    if (!roadside) {
      return res.status(404).json({ message: 'Roadside assistance request not found' });
    }

    if (!workPerformed || workPerformed.trim() === '') {
      return res.status(400).json({ message: 'Work performed description is required.' });
    }

    // Calculate parts cost and total
    const sanitizedParts = (partsUsed || []).map(p => ({
      partName: p.partName || 'Part',
      quantity: Math.max(1, Number(p.quantity) || 1),
      cost: Math.max(0, Number(p.cost) || 0)
    }));

    const partsCost = sanitizedParts.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    const parsedLabour = Math.max(0, Number(labourCost) || 0);
    const totalCost = partsCost + parsedLabour;

    // Record diagnosis outcome and on-site repair details
    roadside.diagnosisOutcome = 'On-Site Repair';
    roadside.diagnosisDetails = {
      diagnosisText: diagnosisText || roadside.problemDescription,
      diagnosedAt: new Date(),
      diagnosedBy: req.user._id
    };

    roadside.onSiteRepairDetails = {
      workPerformed: workPerformed.trim(),
      partsUsed: sanitizedParts,
      labourCost: parsedLabour,
      partsCost,
      totalCost,
      customerConfirmation: {
        confirmed: customerConfirmation.confirmed !== false,
        customerName: customerConfirmation.customerName || roadside.customer?.fullName || 'Customer',
        confirmedAt: new Date(),
        feedback: customerConfirmation.feedback || 'Repaired and verified on location.'
      },
      completedAt: new Date()
    };

    roadside.status = 'Resolved - On-Site Repair';
    roadside.completedAt = new Date();

    // Sync linked Appointment to Completed
    if (roadside.serviceRequest) {
      const appt = await Appointment.findById(roadside.serviceRequest);
      if (appt) {
        appt.status = 'Completed';
        await appt.save();
      }
    }

    // Free up assigned mechanic if no other active jobs
    if (roadside.assignedMechanic) {
      const remainingActive = await JobCard.countDocuments({
        assignedMechanic: roadside.assignedMechanic,
        status: { $in: ['Assigned', 'In Progress', 'Waiting for Parts'] }
      });
      if (remainingActive === 0) {
        await Employee.findByIdAndUpdate(roadside.assignedMechanic, { availability: 'Available' });
      }
    }

    await roadside.save();

    // Dispatch Notifications
    await notifyCustomer(roadside.customer._id, {
      type: 'ROADSIDE_RESOLVED',
      title: 'Roadside Repair Resolved On-Site',
      message: `Your roadside assistance for ${roadside.vehicle?.vehicleNumber} was successfully diagnosed and resolved on-site. Work performed: ${workPerformed}. Total charge: ₹${totalCost}.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: roadside._id,
      metadata: {
        totalCost,
        partsCost,
        labourCost: parsedLabour,
        workPerformed
      }
    });

    await notifyAdminsAndAdvisors({
      type: 'ROADSIDE_RESOLVED',
      title: `On-Site Repair Resolved: ${roadside.vehicle?.vehicleNumber}`,
      message: `Request ${roadside.requestNumber} for ${roadside.vehicle?.vehicleNumber} resolved on-site. Total: ₹${totalCost}.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: roadside._id
    });

    const updated = await RoadsideAssistance.findById(roadside._id)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('jobCard', 'jobNumber status priority');

    res.json({
      message: 'Roadside request marked as Resolved – On-Site Repair successfully.',
      roadside: updated
    });
  } catch (error) {
    console.error('Error recording on-site repair:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Dispatch vehicle pickup / towing to showroom
// @route   PUT /api/roadside-assistance/:id/pickup-dispatch
// @access  Private (Admin / Advisor)
export const dispatchVehiclePickup = async (req, res) => {
  try {
    const {
      diagnosisText,
      pickupVehicleNumber,
      driverName,
      driverPhone,
      conditionNotes
    } = req.body;

    const roadside = await RoadsideAssistance.findById(req.params.id)
      .populate('customer')
      .populate('vehicle');

    if (!roadside) {
      return res.status(404).json({ message: 'Roadside assistance request not found' });
    }

    roadside.diagnosisOutcome = 'Showroom Pickup';
    roadside.diagnosisDetails = {
      diagnosisText: diagnosisText || 'Vehicle cannot be repaired on location. Towing to showroom required.',
      diagnosedAt: new Date(),
      diagnosedBy: req.user._id
    };

    roadside.pickupDetails = {
      pickupVehicleNumber: pickupVehicleNumber || 'Towing Recovery Van',
      driverName: driverName || 'Recovery Driver',
      driverPhone: driverPhone || '',
      pickupLocation: {
        address: roadside.location.address || '',
        latitude: roadside.location.latitude,
        longitude: roadside.location.longitude
      },
      conditionNotes: conditionNotes || '',
      dispatchedAt: new Date()
    };

    roadside.status = 'Pickup Dispatched';

    await roadside.save();

    // Send Notifications
    await notifyCustomer(roadside.customer._id, {
      type: 'ROADSIDE_PICKUP_DISPATCHED',
      title: 'Vehicle Pickup Dispatched',
      message: `Towing pickup (${roadside.pickupDetails.pickupVehicleNumber}) driven by ${roadside.pickupDetails.driverName} has been dispatched to tow your vehicle ${roadside.vehicle?.vehicleNumber} to our Udupi showroom.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: roadside._id,
      metadata: {
        driverName: roadside.pickupDetails.driverName,
        driverPhone: roadside.pickupDetails.driverPhone,
        pickupVehicleNumber: roadside.pickupDetails.pickupVehicleNumber
      }
    });

    await notifyAdminsAndAdvisors({
      type: 'ROADSIDE_PICKUP_DISPATCHED',
      title: `Pickup Dispatched: ${roadside.vehicle?.vehicleNumber}`,
      message: `Vehicle pickup dispatched for ${roadside.vehicle?.vehicleNumber} to Udupi showroom. Driver: ${roadside.pickupDetails.driverName}.`,
      relatedEntityType: 'RoadsideAssistance',
      relatedEntityId: roadside._id
    });

    const updated = await RoadsideAssistance.findById(roadside._id)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('jobCard', 'jobNumber status priority');

    res.json({
      message: 'Vehicle pickup dispatched successfully.',
      roadside: updated
    });
  } catch (error) {
    console.error('Error dispatching pickup:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update pickup status (Vehicle Picked Up -> Arrived at Showroom -> Automatic Job Card connection)
// @route   PUT /api/roadside-assistance/:id/pickup-status
// @access  Private (Admin / Advisor)
export const updatePickupStatus = async (req, res) => {
  try {
    const { stage, conditionNotes, mechanicId, notes } = req.body;

    if (!['Vehicle Picked Up', 'Arrived at Showroom'].includes(stage)) {
      return res.status(400).json({
        message: 'Invalid pickup stage. Must be "Vehicle Picked Up" or "Arrived at Showroom".'
      });
    }

    const roadside = await RoadsideAssistance.findById(req.params.id)
      .populate('customer')
      .populate('vehicle');

    if (!roadside) {
      return res.status(404).json({ message: 'Roadside assistance request not found' });
    }

    if (!roadside.pickupDetails) {
      roadside.pickupDetails = {};
    }

    if (conditionNotes) {
      roadside.pickupDetails.conditionNotes = conditionNotes;
    }
    if (notes) {
      roadside.notes = notes;
    }

    let createdJobCard = null;

    if (stage === 'Vehicle Picked Up') {
      roadside.status = 'Vehicle Picked Up';
      roadside.pickupDetails.pickedUpAt = new Date();

      await roadside.save();

      await notifyCustomer(roadside.customer._id, {
        type: 'ROADSIDE_VEHICLE_PICKED_UP',
        title: 'Vehicle Picked Up',
        message: `Your vehicle ${roadside.vehicle?.vehicleNumber} has been safely loaded onto the recovery vehicle and is in transit to our Udupi showroom.`,
        relatedEntityType: 'RoadsideAssistance',
        relatedEntityId: roadside._id
      });
    } else if (stage === 'Arrived at Showroom') {
      roadside.status = 'Arrived at Showroom';
      roadside.pickupDetails.arrivedAtShowroomAt = new Date();
      roadside.pickupDetails.receivedBy = req.user._id;

      let assignedMech = mechanicId || roadside.assignedMechanic || null;
      if (mechanicId) {
        roadside.assignedMechanic = mechanicId;
      }

      // Automatically connect the roadside request to existing Job Card workflow
      let jobCard = null;
      if (roadside.jobCard) {
        jobCard = await JobCard.findById(roadside.jobCard);
      }

      if (!jobCard) {
        jobCard = new JobCard({
          customer: roadside.customer._id,
          vehicle: roadside.vehicle._id,
          serviceRequest: roadside.serviceRequest,
          serviceType: 'Roadside Breakdown - Showroom Repair',
          complaint: `[Roadside Pickup ${roadside.requestNumber}] ${roadside.breakdownType}: ${roadside.problemDescription} | Diagnosis: ${roadside.diagnosisDetails?.diagnosisText || 'Towed from breakdown location to showroom for workshop repair'}`,
          priority: 'Urgent',
          status: assignedMech ? 'Assigned' : 'Open',
          assignedMechanic: assignedMech || null,
          startTime: new Date(),
          inspectionDetails: {
            remarks: conditionNotes || roadside.pickupDetails?.conditionNotes || 'Received at showroom via roadside pickup'
          }
        });

        await jobCard.save();
        roadside.jobCard = jobCard._id;
        createdJobCard = jobCard;
      } else {
        if (assignedMech) {
          jobCard.assignedMechanic = assignedMech;
          if (jobCard.status === 'Pending') jobCard.status = 'Assigned';
        }
        await jobCard.save();
        createdJobCard = jobCard;
      }

      // Sync linked Appointment status to Checked-In
      if (roadside.serviceRequest) {
        const appt = await Appointment.findById(roadside.serviceRequest);
        if (appt) {
          appt.status = 'Checked-In';
          appt.serviceAdvisor = req.user._id;
          if (assignedMech) appt.assignedMechanic = assignedMech;
          await appt.save();
        }
      }

      if (assignedMech) {
        await Employee.findByIdAndUpdate(assignedMech, { availability: 'Busy' });
        await notifyMechanic(assignedMech, {
          type: 'MECHANIC_ASSIGNED',
          title: 'Roadside Vehicle Arrived at Showroom',
          message: `Vehicle ${roadside.vehicle?.vehicleNumber} towed from breakdown location has arrived at showroom. Job Card #${createdJobCard.jobNumber} is assigned to you.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: createdJobCard._id
        });
      }

      await roadside.save();

      // Notifications
      await notifyCustomer(roadside.customer._id, {
        type: 'ROADSIDE_ARRIVED_SHOWROOM',
        title: 'Vehicle Arrived at Udupi Showroom',
        message: `Your vehicle ${roadside.vehicle?.vehicleNumber} has safely arrived at our Udupi showroom workshop. Job Card #${createdJobCard.jobNumber} has been created for workshop service.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: createdJobCard._id,
        metadata: {
          jobNumber: createdJobCard.jobNumber,
          jobCardId: createdJobCard._id
        }
      });

      await notifyAdminsAndAdvisors({
        type: 'ROADSIDE_ARRIVED_SHOWROOM',
        title: `Vehicle Arrived: ${roadside.vehicle?.vehicleNumber}`,
        message: `Vehicle arrived at showroom from breakdown site. Job Card #${createdJobCard.jobNumber} has been initiated.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: createdJobCard._id,
        metadata: {
          jobNumber: createdJobCard.jobNumber,
          jobCardId: createdJobCard._id
        }
      });
    }

    const updated = await RoadsideAssistance.findById(roadside._id)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('jobCard', 'jobNumber status priority');

    res.json({
      message: `Pickup status updated to "${stage}" successfully.${createdJobCard ? ` Job Card #${createdJobCard.jobNumber} connected.` : ''}`,
      roadside: updated,
      jobCard: createdJobCard
    });
  } catch (error) {
    console.error('Error updating pickup status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update roadside request status & assign mechanic (General Status Transition)
// @route   PUT /api/roadside-assistance/:id/status
// @access  Private (Admin / Advisor)
export const updateRoadsideStatus = async (req, res) => {
  try {
    const { status, mechanicId, notes, conditionNotes } = req.body;
    const roadside = await RoadsideAssistance.findById(req.params.id)
      .populate('customer')
      .populate('vehicle');

    if (!roadside) {
      return res.status(404).json({ message: 'Roadside assistance request not found' });
    }

    const prevStatus = roadside.status;
    if (status) roadside.status = status;
    if (notes !== undefined) roadside.notes = notes;

    let mechanic = null;
    if (mechanicId !== undefined) {
      if (mechanicId) {
        mechanic = await Employee.findById(mechanicId);
        if (!mechanic) {
          return res.status(400).json({ message: 'Selected mechanic not found.' });
        }
        roadside.assignedMechanic = mechanicId;
      } else {
        roadside.assignedMechanic = null;
      }
    }

    if (status === 'Dispatched' && !roadside.dispatchedAt) {
      roadside.dispatchedAt = new Date();
    }
    if ((status === 'Completed' || status === 'Resolved - On-Site Repair') && !roadside.completedAt) {
      roadside.completedAt = new Date();
    }

    // If status is Arrived at Showroom, ensure automatic Job Card creation
    let jobCard = null;
    if (roadside.jobCard) {
      jobCard = await JobCard.findById(roadside.jobCard);
    }

    if (status === 'Arrived at Showroom') {
      if (!roadside.pickupDetails) roadside.pickupDetails = {};
      if (!roadside.pickupDetails.arrivedAtShowroomAt) roadside.pickupDetails.arrivedAtShowroomAt = new Date();

      if (!jobCard) {
        jobCard = new JobCard({
          customer: roadside.customer._id,
          vehicle: roadside.vehicle._id,
          serviceRequest: roadside.serviceRequest,
          serviceType: 'Roadside Breakdown - Showroom Repair',
          complaint: `[Roadside Pickup ${roadside.requestNumber}] ${roadside.breakdownType}: ${roadside.problemDescription} | Diagnosis: ${roadside.diagnosisDetails?.diagnosisText || 'Towed from breakdown location to showroom'}`,
          priority: 'Urgent',
          status: roadside.assignedMechanic ? 'Assigned' : 'Open',
          assignedMechanic: roadside.assignedMechanic || null,
          startTime: new Date(),
          inspectionDetails: {
            remarks: conditionNotes || roadside.pickupDetails?.conditionNotes || 'Received at showroom via roadside pickup'
          }
        });
        await jobCard.save();
        roadside.jobCard = jobCard._id;
      }
    } else if (jobCard) {
      if (mechanicId !== undefined) {
        jobCard.assignedMechanic = roadside.assignedMechanic;
        if (roadside.assignedMechanic && jobCard.status === 'Pending') {
          jobCard.status = 'Assigned';
        }
      }
      if (status === 'Completed' || status === 'Resolved - On-Site Repair') {
        jobCard.status = 'Completed';
        jobCard.completionTime = new Date();
      } else if (status === 'Cancelled') {
        jobCard.status = 'Cancelled';
      }
      await jobCard.save();
    }

    // Sync status to linked Appointment
    if (roadside.serviceRequest) {
      const appt = await Appointment.findById(roadside.serviceRequest);
      if (appt) {
        if (status === 'Completed' || status === 'Resolved - On-Site Repair') {
          appt.status = 'Completed';
        } else if (status === 'Cancelled') {
          appt.status = 'Cancelled';
        } else if (status === 'Arrived at Showroom') {
          appt.status = 'Checked-In';
        } else if (['Dispatched', 'Assigned', 'In Progress'].includes(status)) {
          appt.status = 'In Progress';
        }
        if (roadside.assignedMechanic) {
          appt.assignedMechanic = roadside.assignedMechanic;
        }
        await appt.save();
      }
    }

    await roadside.save();

    // Notify Mechanic if assigned
    if (mechanicId && mechanic) {
      await Employee.findByIdAndUpdate(mechanicId, { availability: 'Busy' });
      await notifyMechanic(mechanicId, {
        type: 'MECHANIC_ASSIGNED',
        title: 'Emergency Roadside Job Assigned',
        message: `You have been assigned to roadside assistance on vehicle ${roadside.vehicle?.vehicleNumber || ''} (${roadside.location.distanceKm} km from garage). Location: ${roadside.location.address || 'Check request details'}.`,
        relatedEntityType: 'RoadsideAssistance',
        relatedEntityId: roadside._id
      });
    }

    // Notify Customer on status progression
    if (status && status !== prevStatus) {
      const statusMessages = {
        Dispatched: `Our roadside emergency response team has been dispatched to your breakdown location (${roadside.location.distanceKm} km away).`,
        Assigned: `Mechanic ${mechanic ? mechanic.fullName : 'technician'} has been assigned to your roadside breakdown.`,
        'In Progress': 'Our roadside technician is currently on-site diagnosing your vehicle.',
        'Resolved - On-Site Repair': 'Your vehicle has been successfully repaired on-site.',
        'Pickup Dispatched': 'A recovery pickup vehicle has been dispatched to tow your vehicle to our Udupi showroom.',
        'Vehicle Picked Up': 'Your vehicle has been safely picked up and is in transit to our Udupi showroom.',
        'Arrived at Showroom': `Your vehicle has arrived at our Udupi showroom workshop.${jobCard ? ` Job Card #${jobCard.jobNumber} has been generated.` : ''}`,
        Completed: 'Your roadside assistance request has been completed.',
        Cancelled: 'Your roadside assistance request has been cancelled.'
      };

      if (statusMessages[status]) {
        await notifyCustomer(roadside.customer._id, {
          type: status === 'Dispatched' ? 'ROADSIDE_DISPATCHED' : (status === 'Resolved - On-Site Repair' ? 'ROADSIDE_RESOLVED' : 'APPOINTMENT_CONFIRMED'),
          title: `Roadside Status: ${status}`,
          message: statusMessages[status],
          relatedEntityType: jobCard ? 'JobCard' : 'RoadsideAssistance',
          relatedEntityId: jobCard ? jobCard._id : roadside._id
        });
      }
    }

    const updated = await RoadsideAssistance.findById(roadside._id)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization mobileNumber')
      .populate('jobCard', 'jobNumber status priority');

    res.json({
      message: 'Roadside assistance request updated successfully',
      roadside: updated,
      jobCard: jobCard || null
    });
  } catch (error) {
    console.error('Error updating roadside status:', error);
    res.status(500).json({ message: error.message });
  }
};
