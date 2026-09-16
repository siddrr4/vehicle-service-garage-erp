import JobCard from '../models/JobCard.js';
import Appointment from '../models/Appointment.js';
import Employee from '../models/Employee.js';
import SparePart from '../models/SparePart.js';
import Attendance from '../models/Attendance.js';
import Vehicle from '../models/Vehicle.js';
import Invoice from '../models/Invoice.js';
import ServiceHistory from '../models/ServiceHistory.js';
import { autoGenerateInvoice } from './billingController.js';
import { getIndiaDateStr } from '../utils/dateUtils.js';
import {
  notifyCustomer,
  notifyMechanic,
  notifyAdminsAndAdvisors,
  checkLowStockCondition,
} from '../services/notificationService.js';
import { calculateSlotCapacity } from './appointmentController.js';

// Helper to deduct parts from inventory
const deductInventory = async (partsUsed, jobCard, performedBy) => {
  for (const item of partsUsed) {
    const sparePart = await SparePart.findById(item.part);
    if (sparePart) {
      sparePart.quantityAvailable = Math.max(0, sparePart.quantityAvailable - item.quantity);
      sparePart.stockHistory.push({
        action: 'Stock Used',
        quantity: item.quantity,
        mechanicName: jobCard.assignedMechanic ? 'Assigned Mechanic' : 'N/A', // Cannot cleanly resolve mechanic name here without populated object, but it's optional now
        jobCardNumber: jobCard.jobNumber || jobCard._id.toString(),
        performedBy: performedBy || 'System',
        remarks: 'Job Card Parts Deduction'
      });
      await sparePart.save();
      await checkLowStockCondition(sparePart._id);
    }
  }
};

// Helper to restore parts to inventory
const restoreInventory = async (partsUsed, jobCard, performedBy) => {
  for (const item of partsUsed) {
    const sparePart = await SparePart.findById(item.part);
    if (sparePart) {
      sparePart.quantityAvailable += item.quantity;
      sparePart.stockHistory.push({
        action: 'Returned',
        quantity: item.quantity,
        mechanicName: jobCard.assignedMechanic ? 'Assigned Mechanic' : 'N/A',
        jobCardNumber: jobCard.jobNumber || jobCard._id.toString(),
        performedBy: performedBy || 'System',
        remarks: 'Job Card Parts Restored'
      });
      await sparePart.save();
    }
  }
};

// Reusable function to generate Job Card when appointment becomes Approved
export const createJobCardForAppointment = async (appointment) => {
  const appointmentId = appointment._id || appointment;
  
  // Prevent duplicate Job Cards
  const existingJobCard = await JobCard.findOne({ serviceRequest: appointmentId });
  if (existingJobCard) {
    return existingJobCard;
  }

  let apt = appointment;
  if (!apt.customer || !apt.vehicle || !apt.problemDescription) {
    apt = await Appointment.findById(appointmentId);
  }

  if (!apt) {
    throw new Error('Appointment not found for Job Card creation');
  }

  const customerId = apt.customer?._id || apt.customer;
  const vehicleId = apt.vehicle?._id || apt.vehicle;
  const complaint = apt.problemDescription || apt.serviceType || 'General Service';
  const serviceType = apt.serviceType || 'General Service';

  const jobCard = new JobCard({
    customer: customerId,
    vehicle: vehicleId,
    serviceRequest: apt._id,
    serviceType: serviceType,
    complaint: complaint,
    priority: 'Medium',
    status: 'Pending',
    assignedMechanic: null,
  });

  return await jobCard.save();
};

// @desc    Get all job cards with search, filter, and pagination
// @route   GET /api/job-cards
// @access  Private (Admin/Advisor)
export const getJobCards = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Search query
    const keyword = req.query.keyword
      ? {
          $or: [{ jobNumber: { $regex: req.query.keyword, $options: 'i' } }],
        }
      : {};

    const filterQuery = {};
    if (req.query.status) {
      // Allow multiple statuses, e.g., ?status=Open,In Progress
      filterQuery.status = { $in: req.query.status.split(',') };
    }

    const combinedQuery = { ...keyword, ...filterQuery };

    const count = await JobCard.countDocuments(combinedQuery);

    const jobCards = await JobCard.find(combinedQuery)
      .populate('customer', 'fullName mobileNumber')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('serviceRequest', 'appointmentDate serviceType')
      .populate('assignedMechanic', 'fullName employeeId email phone specialization availability')
      .populate('partsUsed.part')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      jobCards,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user's job cards (Customer)
// @route   GET /api/job-cards/my-job-cards
// @access  Private (Customer)
export const getMyJobCards = async (req, res) => {
  try {
    if (!req.user || !req.user.customerRef) {
      return res.status(404).json({ message: 'No customer profile linked to this account.' });
    }

    const jobCards = await JobCard.find({ customer: req.user.customerRef })
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('serviceRequest', 'appointmentDate serviceType')
      .populate('assignedMechanic', 'fullName employeeId phone')
      .populate('partsUsed.part')
      .sort({ createdAt: -1 });

    const jobCardsWithInvoices = await Promise.all(
      jobCards.map(async (jc) => {
        const invoice = await Invoice.findOne({ jobCard: jc._id });
        const jcObj = jc.toObject();
        if (invoice) {
          jcObj.invoice = {
            _id: invoice._id,
            status: invoice.status,
            balanceDue: invoice.balanceDue,
            grandTotal: invoice.grandTotal,
            amountPaid: invoice.amountPaid
          };
        } else {
          jcObj.invoice = null;
        }
        return jcObj;
      })
    );

    res.json(jobCardsWithInvoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get job cards assigned to the logged-in mechanic
// @route   GET /api/job-cards/mechanic-jobs
// @access  Private (Mechanic/Admin)
export const getMechanicJobCards = async (req, res) => {
  try {
    let employee = null;

    if (req.user) {
      employee = await Employee.findOne({
        $or: [{ userRef: req.user._id }, { email: req.user.email.toLowerCase() }],
      });
    }

    if (!employee) {
      // If no employee profile exists, return all assigned jobs if admin, else empty list
      if (req.user.role === 'admin' || req.user.role === 'advisor') {
        const allAssigned = await JobCard.find({ assignedMechanic: { $ne: null } })
          .populate('customer', 'fullName mobileNumber')
          .populate('vehicle', 'vehicleNumber brand model')
          .populate('serviceRequest', 'appointmentDate serviceType')
          .populate('assignedMechanic', 'fullName employeeId specialization')
          .populate('partsUsed.part')
          .sort({ createdAt: -1 });
        return res.json(allAssigned);
      }
      return res.json([]);
    }

    const jobCards = await JobCard.find({ assignedMechanic: employee._id })
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model year color')
      .populate('serviceRequest', 'appointmentDate preferredTime problemDescription serviceType')
      .populate('assignedMechanic', 'fullName employeeId specialization availability')
      .populate('partsUsed.part')
      .sort({ createdAt: -1 });

    res.json(jobCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get job card by ID
// @route   GET /api/job-cards/:id
// @access  Private
export const getJobCardById = async (req, res) => {
  try {
    const jobCard = await JobCard.findById(req.params.id)
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode')
      .populate('vehicle', 'vehicleNumber brand model year color purchaseType freeServicesEntitled freeServicesUsed')
      .populate('serviceRequest', 'appointmentDate preferredTime problemDescription serviceType status')
      .populate('assignedMechanic', 'fullName employeeId email phone specialization availability')
      .populate('partsUsed.part');

    if (jobCard) {
      // If user is a customer, ensure it's their job card
      if (req.user.role === 'customer' && jobCard.customer._id.toString() !== req.user.customerRef.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this job card' });
      }
      res.json(jobCard);
    } else {
      res.status(404).json({ message: 'Job card not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new job card
// @route   POST /api/job-cards
// @access  Private (Admin/Advisor)
export const createJobCard = async (req, res) => {
  try {
    const {
      serviceRequest,
      assignedMechanic,
      complaint,
      workDescription,
      estimatedCost,
      estimatedDeliveryDate,
      priority,
      notes,
      partsUsed,
    } = req.body;

    // Validate if service request exists and is approved
    const appointment = await Appointment.findById(serviceRequest);
    if (!appointment) {
      return res.status(404).json({ message: 'Service Request not found' });
    }

    if (appointment.status !== 'Approved') {
      return res.status(400).json({ message: 'Job Card can only be created for an Approved Service Request' });
    }

    if (assignedMechanic) {
      const todayStr = getIndiaDateStr();

      const attendance = await Attendance.findOne({ employeeId: assignedMechanic, date: todayStr });
      if (!attendance || !attendance.checkIn || attendance.checkOut) {
        return res.status(400).json({ message: 'Selected mechanic is currently unavailable or has not checked in.' });
      }
    }

    // Validate and snapshot parts
    let mappedParts = [];
    if (partsUsed && partsUsed.length > 0) {
      for (const item of partsUsed) {
        const sparePart = await SparePart.findById(item.part);
        if (!sparePart) {
          return res.status(404).json({ message: `Spare part not found: ${item.part}` });
        }
        if (sparePart.quantityAvailable < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for part: ${sparePart.partName}. Available: ${sparePart.quantityAvailable}` });
        }
        mappedParts.push({
          part: item.part,
          quantity: item.quantity,
          unitPrice: sparePart.unitPrice,
          sellingPrice: sparePart.sellingPrice,
          gstPercent: sparePart.gstPercent
        });
      }
    }

    const jobCard = new JobCard({
      customer: appointment.customer,
      vehicle: appointment.vehicle,
      serviceRequest,
      assignedMechanic: assignedMechanic || null,
      complaint,
      workDescription,
      estimatedCost,
      estimatedDeliveryDate,
      priority,
      notes,
      partsUsed: mappedParts,
      status: assignedMechanic ? 'Assigned' : 'Pending',
    });

    if (jobCard.partsUsed.length > 0) {
      await deductInventory(jobCard.partsUsed, jobCard, req.user ? req.user.email : 'Admin');
      jobCard.partsDeducted = true;
    }

    const createdJobCard = await jobCard.save();

    // If a mechanic was assigned, set availability to Busy
    if (assignedMechanic) {
      await Employee.findByIdAndUpdate(assignedMechanic, { availability: 'Busy' });
      await notifyMechanic(assignedMechanic, {
        type: 'JOB_CARD_CREATED',
        title: 'New Job Card assigned',
        message: `Job Card ${createdJobCard.jobNumber} has been assigned to you.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: createdJobCard._id,
      });
    }

    res.status(201).json(createdJobCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a job card (Admin/Advisor)
// @route   PUT /api/job-cards/:id
// @access  Private (Admin/Advisor)
export const updateJobCard = async (req, res) => {
  try {
    const jobCard = await JobCard.findById(req.params.id);

    if (jobCard) {
      const prevMechanic = jobCard.assignedMechanic;
      const prevStatus = jobCard.status;
      const prevPartsDeducted = jobCard.partsDeducted;

      // Delta logic for parts inventory
      if (req.body.assignedMechanic && req.body.assignedMechanic !== String(jobCard.assignedMechanic)) {
        const todayStr = getIndiaDateStr();

        const attendance = await Attendance.findOne({ employeeId: req.body.assignedMechanic, date: todayStr });
        if (!attendance || !attendance.checkIn || attendance.checkOut) {
          return res.status(400).json({ message: 'Selected mechanic is currently unavailable or has not checked in.' });
        }
      }

      if (req.body.partsUsed !== undefined) {
        let mappedParts = [];
        const oldPartsMap = {};
        jobCard.partsUsed.forEach(p => {
          oldPartsMap[p.part.toString()] = p.quantity;
        });

        const newPartsMap = {};
        req.body.partsUsed.forEach(p => {
          newPartsMap[p.part.toString()] = p.quantity;
        });

        // Validate stock for any increases
        for (const item of req.body.partsUsed) {
          const oldQty = oldPartsMap[item.part.toString()] || 0;
          const newQty = item.quantity;
          const increase = newQty - oldQty;
          
          const sparePart = await SparePart.findById(item.part);
          if (!sparePart) {
            return res.status(404).json({ message: `Spare part not found: ${item.part}` });
          }
          
          if (increase > 0 && sparePart.quantityAvailable < increase) {
            return res.status(400).json({ message: `Insufficient stock for part: ${sparePart.partName}. Available: ${sparePart.quantityAvailable}` });
          }

          mappedParts.push({
            part: item.part,
            quantity: item.quantity,
            unitPrice: sparePart.unitPrice,
            sellingPrice: sparePart.sellingPrice,
            gstPercent: sparePart.gstPercent
          });
        }

        // Apply decreases / restores
        for (const partId in oldPartsMap) {
          const oldQty = oldPartsMap[partId];
          const newQty = newPartsMap[partId] || 0;
          if (oldQty > newQty) {
            await restoreInventory([{ part: partId, quantity: oldQty - newQty }], jobCard, req.user ? req.user.email : 'Admin');
          }
        }

        // Apply increases / deductions
        for (const partId in newPartsMap) {
          const oldQty = oldPartsMap[partId] || 0;
          const newQty = newPartsMap[partId];
          if (newQty > oldQty) {
            await deductInventory([{ part: partId, quantity: newQty - oldQty }], jobCard, req.user ? req.user.email : 'Admin');
          }
        }

        jobCard.partsUsed = mappedParts;
      }

      if (req.body.servicesPerformed !== undefined) {
        jobCard.servicesPerformed = req.body.servicesPerformed;
        
        // Enforce zero charges if this job card is already recorded as a free service
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        if (vehicle) {
          const isRecordedFreeService = vehicle.freeServiceHistory.some(h => h.jobCardId.toString() === jobCard._id.toString());
          if (isRecordedFreeService) {
            jobCard.servicesPerformed = jobCard.servicesPerformed.map(srv => ({
              ...srv,
              labourCharge: 0,
              washingCharge: 0,
              isFreeService: true
            }));
          }
        }
      }

      if (req.body.odometerAtService !== undefined) {
        // Validate odometer
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        if (vehicle && req.body.odometerAtService < vehicle.currentOdometerReading) {
          return res.status(400).json({ message: `Odometer reading cannot be lower than the previous reading (${vehicle.currentOdometerReading} km).` });
        }
        jobCard.odometerAtService = req.body.odometerAtService;
        
        if (vehicle && req.body.odometerAtService > vehicle.currentOdometerReading) {
          vehicle.currentOdometerReading = req.body.odometerAtService;
          await vehicle.save();
        }
      }

      jobCard.assignedMechanic = req.body.assignedMechanic !== undefined ? req.body.assignedMechanic : jobCard.assignedMechanic;
      jobCard.complaint = req.body.complaint || jobCard.complaint;
      jobCard.workDescription = req.body.workDescription !== undefined ? req.body.workDescription : jobCard.workDescription;
      jobCard.estimatedCost = req.body.estimatedCost !== undefined ? req.body.estimatedCost : jobCard.estimatedCost;
      jobCard.estimatedDeliveryDate = req.body.estimatedDeliveryDate || jobCard.estimatedDeliveryDate;
      jobCard.priority = req.body.priority || jobCard.priority;
      jobCard.notes = req.body.notes !== undefined ? req.body.notes : jobCard.notes;

      const validTransitions = {
        'Pending': ['Assigned', 'Cancelled'],
        'Assigned': ['In Progress', 'Pending', 'Cancelled'],
        'In Progress': ['Completed', 'Waiting for Parts', 'Cancelled'],
        'Waiting for Parts': ['In Progress', 'Cancelled'],
        'Completed': ['Delivered'],
        'Delivered': [],
        'Cancelled': []
      };

      let newStatus = req.body.status || prevStatus;
      
      // Auto-transition based on mechanic assignment
      if (prevStatus === 'Pending' && req.body.assignedMechanic) {
        newStatus = 'Assigned';
      } else if (prevStatus === 'Assigned' && !req.body.assignedMechanic && req.body.assignedMechanic !== undefined) {
        newStatus = 'Pending';
      }

      if (newStatus !== prevStatus && (!validTransitions[prevStatus] || !validTransitions[prevStatus].includes(newStatus))) {
        return res.status(400).json({ message: `Invalid status transition from ${prevStatus} to ${newStatus}` });
      }

      // 1. Delivery Rule: Block if Invoice exists but is not paid
      if (newStatus === 'Delivered' && prevStatus !== 'Delivered') {
        const invoice = await Invoice.findOne({ jobCard: jobCard._id });
        if (invoice && invoice.status !== 'Paid') {
          return res.status(400).json({ message: `Cannot deliver vehicle. Invoice ${invoice.invoiceNumber} is ${invoice.status}.` });
        }
      }

      // 2. Free Service Logic when transitioning to Completed
      if (newStatus === 'Completed' && prevStatus !== 'Completed') {
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        if (vehicle && vehicle.freeServicesEntitled > vehicle.freeServicesUsed) {
          const alreadyUsed = vehicle.freeServiceHistory.find(h => h.jobCardId.toString() === jobCard._id.toString());
          if (!alreadyUsed) {
            // It's a free service
            jobCard.servicesPerformed = jobCard.servicesPerformed.map(srv => ({
              ...srv,
              labourCharge: 0,
              washingCharge: 0,
              isFreeService: true
            }));
            
            vehicle.freeServicesUsed += 1;
            vehicle.freeServiceHistory.push({
              jobCardId: jobCard._id,
              date: new Date(),
              odometer: jobCard.odometerAtService || vehicle.currentOdometerReading,
              notes: `Free Service #${vehicle.freeServicesUsed} of ${vehicle.freeServicesEntitled}`
            });
            await vehicle.save();
          }
        }
      }

      jobCard.status = newStatus;

      // Handle timestamps
      if (newStatus === 'In Progress' && prevStatus !== 'In Progress') {
        jobCard.startTime = new Date();
      } else if (newStatus === 'Completed' && prevStatus !== 'Completed') {
        jobCard.completionTime = new Date();

        // Upsert ServiceHistory
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        const isFreeService = jobCard.servicesPerformed.some(srv => srv.isFreeService);
        const freeServiceNumber = isFreeService && vehicle ? vehicle.freeServicesUsed : null;
        
        await ServiceHistory.findOneAndUpdate(
          { jobCard: jobCard._id },
          {
            customer: jobCard.customer,
            vehicle: jobCard.vehicle,
            serviceDate: new Date(),
            odometerReading: jobCard.odometerAtService || (vehicle ? vehicle.currentOdometerReading : 0),
            isFreeService: isFreeService,
            freeServiceNumber: freeServiceNumber
          },
          { upsert: true, new: true }
        );
      } else if (newStatus === 'Delivered' && prevStatus !== 'Delivered') {
        jobCard.deliveryTime = new Date();
      }

      // If cancelled, restore all parts
      if (newStatus === 'Cancelled' && prevStatus !== 'Cancelled') {
        if (jobCard.partsUsed.length > 0) {
          await restoreInventory(jobCard.partsUsed, jobCard, req.user ? req.user.email : 'Admin');
          jobCard.partsUsed = []; // Clear parts since job is cancelled
        }
      }

      const updatedJobCard = await jobCard.save();

      // Auto generate invoice if Completed
      if (updatedJobCard.status === 'Completed') {
        await autoGenerateInvoice(updatedJobCard);

        if (prevStatus !== 'Completed') {
          await notifyCustomer(updatedJobCard.customer, {
            type: 'JOB_COMPLETED',
            title: 'Your vehicle service is completed',
            message: `Service for your vehicle has been completed under Job Card ${updatedJobCard.jobNumber}.`,
            relatedEntityType: 'JobCard',
            relatedEntityId: updatedJobCard._id,
          });

          await notifyAdminsAndAdvisors({
            type: 'JOB_COMPLETED',
            title: `Job Card ${updatedJobCard.jobNumber} completed`,
            message: `Job Card ${updatedJobCard.jobNumber} has been completed. Ready for billing and delivery.`,
            relatedEntityType: 'JobCard',
            relatedEntityId: updatedJobCard._id,
          });
        }
      }

      // If assigned mechanic changed, update mechanics' availability & notify
      if (req.body.assignedMechanic && req.body.assignedMechanic !== String(prevMechanic)) {
        await Employee.findByIdAndUpdate(req.body.assignedMechanic, { availability: 'Busy' });
        await notifyMechanic(req.body.assignedMechanic, {
          type: 'MECHANIC_ASSIGNED',
          title: 'Job Card assigned to you',
          message: `Job Card ${updatedJobCard.jobNumber} has been assigned to you.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: updatedJobCard._id,
        });
      }

      // Sync status back to linked Appointment
      if (updatedJobCard.serviceRequest) {
        if (updatedJobCard.status === 'Completed') {
          await Appointment.findByIdAndUpdate(updatedJobCard.serviceRequest, { status: 'Completed' });
        } else if (updatedJobCard.status === 'Cancelled') {
          await Appointment.findByIdAndUpdate(updatedJobCard.serviceRequest, { status: 'Cancelled' });
        }
      }

      // Free mechanic if job completed, delivered, or cancelled
      if ((updatedJobCard.status === 'Completed' || updatedJobCard.status === 'Delivered' || updatedJobCard.status === 'Cancelled') && updatedJobCard.assignedMechanic) {
        const activeJobsCount = await JobCard.countDocuments({
          assignedMechanic: updatedJobCard.assignedMechanic,
          status: { $in: ['Assigned', 'In Progress'] },
        });
        if (activeJobsCount === 0) {
          await Employee.findByIdAndUpdate(updatedJobCard.assignedMechanic, { availability: 'Available' });
        }
      }

      res.json(updatedJobCard);
    } else {
      res.status(404).json({ message: 'Job card not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update job card status & add work notes by Mechanic
// @route   PUT /api/job-cards/:id/mechanic-update
// @access  Private (Mechanic/Admin/Advisor)
export const updateMechanicJobCard = async (req, res) => {
  try {
    const { status, workDescription, notes, partsUsed, servicesPerformed, odometerAtService } = req.body;
    const jobCard = await JobCard.findById(req.params.id);

    if (!jobCard) {
      return res.status(404).json({ message: 'Job card not found' });
    }

    const prevStatus = jobCard.status;
    const prevPartsDeducted = jobCard.partsDeducted;

    // If previously completed, restore the parts first
    if (prevStatus === 'Completed' && prevPartsDeducted) {
      await restoreInventory(jobCard.partsUsed, jobCard, req.user ? req.user.email : 'Mechanic');
      jobCard.partsDeducted = false;
    }

    // Update parts used if provided
    if (partsUsed !== undefined) {
      let mappedParts = [];
      for (const item of partsUsed) {
        const sparePart = await SparePart.findById(item.part);
        if (!sparePart) {
          return res.status(404).json({ message: `Spare part not found: ${item.part}` });
        }
        if (sparePart.quantityAvailable < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for part: ${sparePart.partName}` });
        }
        mappedParts.push({
          part: item.part,
          quantity: item.quantity,
          unitPrice: sparePart.unitPrice,
          sellingPrice: sparePart.sellingPrice,
          gstPercent: sparePart.gstPercent
        });
      }
      jobCard.partsUsed = mappedParts;
    }

    if (status && status !== prevStatus) {
      const validTransitions = {
        'Pending': ['Assigned', 'Cancelled'],
        'Assigned': ['In Progress', 'Pending', 'Cancelled'],
        'In Progress': ['Completed', 'Waiting for Parts', 'Cancelled'],
        'Waiting for Parts': ['In Progress', 'Cancelled'],
        'Completed': ['Delivered'],
        'Delivered': [],
        'Cancelled': []
      };

      if (!validTransitions[prevStatus] || !validTransitions[prevStatus].includes(status)) {
        return res.status(400).json({ message: `Invalid status transition from ${prevStatus} to ${status}` });
      }

      // Delivery Rule
      if (status === 'Delivered' && prevStatus !== 'Delivered') {
        const invoice = await Invoice.findOne({ jobCard: jobCard._id });
        if (invoice && invoice.status !== 'Paid') {
          return res.status(400).json({ message: `Cannot deliver vehicle. Invoice ${invoice.invoiceNumber} is ${invoice.status}.` });
        }
      }

      // Free Service Logic when transitioning to Completed
      if (status === 'Completed' && prevStatus !== 'Completed') {
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        if (vehicle && vehicle.freeServicesEntitled > vehicle.freeServicesUsed) {
          const alreadyUsed = vehicle.freeServiceHistory.find(h => h.jobCardId.toString() === jobCard._id.toString());
          if (!alreadyUsed) {
            jobCard.servicesPerformed = jobCard.servicesPerformed.map(srv => ({
              ...srv,
              labourCharge: 0,
              washingCharge: 0,
              isFreeService: true
            }));
            
            vehicle.freeServicesUsed += 1;
            vehicle.freeServiceHistory.push({
              jobCardId: jobCard._id,
              date: new Date(),
              odometer: jobCard.odometerAtService || vehicle.currentOdometerReading,
              notes: `Free Service #${vehicle.freeServicesUsed} of ${vehicle.freeServicesEntitled}`
            });
            await vehicle.save();
          }
        }
      }

      jobCard.status = status;

      // Handle timestamps
      if (status === 'In Progress') {
        jobCard.startTime = new Date();
      } else if (status === 'Completed') {
        jobCard.completionTime = new Date();

        // Upsert ServiceHistory
        const vehicle = await Vehicle.findById(jobCard.vehicle);
        const isFreeService = jobCard.servicesPerformed.some(srv => srv.isFreeService);
        const freeServiceNumber = isFreeService && vehicle ? vehicle.freeServicesUsed : null;
        
        await ServiceHistory.findOneAndUpdate(
          { jobCard: jobCard._id },
          {
            customer: jobCard.customer,
            vehicle: jobCard.vehicle,
            serviceDate: new Date(),
            odometerReading: jobCard.odometerAtService || (vehicle ? vehicle.currentOdometerReading : 0),
            isFreeService: isFreeService,
            freeServiceNumber: freeServiceNumber
          },
          { upsert: true, new: true }
        );
      } else if (status === 'Delivered') {
        jobCard.deliveryTime = new Date();
      }
    }

    if (workDescription !== undefined) {
      jobCard.workDescription = workDescription;
    }
    if (notes !== undefined) {
      jobCard.notes = notes;
    }
    if (servicesPerformed !== undefined) {
      jobCard.servicesPerformed = servicesPerformed;

      // Enforce zero charges if this job card is already recorded as a free service
      const vehicle = await Vehicle.findById(jobCard.vehicle);
      if (vehicle) {
        const isRecordedFreeService = vehicle.freeServiceHistory.some(h => h.jobCardId.toString() === jobCard._id.toString());
        if (isRecordedFreeService) {
          jobCard.servicesPerformed = jobCard.servicesPerformed.map(srv => ({
            ...srv,
            labourCharge: 0,
            washingCharge: 0,
            isFreeService: true
          }));
        }
      }
    }
    if (odometerAtService !== undefined) {
      const vehicle = await Vehicle.findById(jobCard.vehicle);
      if (vehicle && odometerAtService < vehicle.currentOdometerReading) {
        return res.status(400).json({ message: `Odometer reading cannot be lower than the previous reading (${vehicle.currentOdometerReading} km).` });
      }
      jobCard.odometerAtService = odometerAtService;
      
      if (vehicle && odometerAtService > vehicle.currentOdometerReading) {
        vehicle.currentOdometerReading = odometerAtService;
        await vehicle.save();
      }
    }

    // If status is set to Completed, deduct parts from inventory
    if (jobCard.status === 'Completed' && prevStatus !== 'Completed') {
      for (const item of jobCard.partsUsed) {
        const sparePart = await SparePart.findById(item.part);
        if (!sparePart || sparePart.quantityAvailable < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for part: ${sparePart?.partName || 'Unknown'}` });
        }
      }
      await deductInventory(jobCard.partsUsed, jobCard, req.user ? req.user.email : 'Mechanic');
      jobCard.partsDeducted = true;
    }

    const updatedJobCard = await jobCard.save();

    // Auto generate invoice if Completed
    if (updatedJobCard.status === 'Completed') {
      await autoGenerateInvoice(updatedJobCard);

      if (prevStatus !== 'Completed') {
        await notifyCustomer(updatedJobCard.customer, {
          type: 'JOB_COMPLETED',
          title: 'Your vehicle service is completed',
          message: `Service for your vehicle has been completed under Job Card ${updatedJobCard.jobNumber}.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: updatedJobCard._id,
        });

        await notifyAdminsAndAdvisors({
          type: 'JOB_COMPLETED',
          title: `Job Card ${updatedJobCard.jobNumber} completed`,
          message: `Job Card ${updatedJobCard.jobNumber} has been completed by mechanic. Ready for billing & delivery.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: updatedJobCard._id,
        });
      }
    }

    // Sync status back to linked Appointment
    if (updatedJobCard.serviceRequest) {
      if (updatedJobCard.status === 'Completed') {
        await Appointment.findByIdAndUpdate(updatedJobCard.serviceRequest, { status: 'Completed' });
      } else if (updatedJobCard.status === 'Cancelled') {
        await Appointment.findByIdAndUpdate(updatedJobCard.serviceRequest, { status: 'Cancelled' });
      }
    }

    // If job status is set to Completed, Delivered, or Cancelled, check if mechanic has other open/in progress jobs
    if ((updatedJobCard.status === 'Completed' || updatedJobCard.status === 'Delivered' || updatedJobCard.status === 'Cancelled') && updatedJobCard.assignedMechanic) {
      const activeJobsCount = await JobCard.countDocuments({
        assignedMechanic: updatedJobCard.assignedMechanic,
        status: { $in: ['Assigned', 'In Progress'] },
      });
      if (activeJobsCount === 0) {
        await Employee.findByIdAndUpdate(updatedJobCard.assignedMechanic, { availability: 'Available' });
      }
    }

    res.json(updatedJobCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a job card
// @route   DELETE /api/job-cards/:id
// @access  Private (Admin/Advisor)
export const deleteJobCard = async (req, res) => {
  try {
    const jobCard = await JobCard.findById(req.params.id);

    if (jobCard) {
      await JobCard.deleteOne({ _id: jobCard._id });
      res.json({ message: 'Job card removed' });
    } else {
      res.status(404).json({ message: 'Job card not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stats for Job Cards
// @route   GET /api/job-cards/stats
// @access  Private (Admin/Advisor)
export const getJobCardStats = async (req, res) => {
  try {
    const stats = await JobCard.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {
      Pending: 0,
      Assigned: 0,
      'In Progress': 0,
      Completed: 0,
      Delivered: 0,
      Cancelled: 0
    };

    stats.forEach(stat => {
      if (statsMap[stat._id] !== undefined) {
        statsMap[stat._id] = stat.count;
      }
    });

    res.json(statsMap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Walk-in Job Card directly with capacity check and appointment linking
// @route   POST /api/job-cards/walk-in
// @access  Private (Advisor/Admin)
export const createWalkInJobCard = async (req, res) => {
  try {
    const {
      customerId,
      vehicleId,
      services,
      complaint,
      inspectionDetails,
      preferredTime,
      assignedMechanic,
      priority = 'Medium',
      notes = ''
    } = req.body;

    if (!customerId || !vehicleId) {
      return res.status(400).json({ message: 'Customer and Vehicle are required' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const todayStr = getIndiaDateStr();

    // Verify today's real capacity if a preferredTime slot is provided
    if (preferredTime) {
      const capacityData = await calculateSlotCapacity(todayStr);
      const matchedSlot = capacityData.slots.find(
        (s) => s.time === preferredTime || s.time.startsWith(preferredTime)
      );

      if (matchedSlot && matchedSlot.available <= 0) {
        return res.status(409).json({
          noCapacity: true,
          message: `No capacity available for slot ${preferredTime}. Mechanics are currently occupied.`
        });
      }
    }

    // Verify mechanic availability if assigned
    if (assignedMechanic) {
      const attendance = await Attendance.findOne({
        employeeId: assignedMechanic,
        date: todayStr
      });

      if (!attendance || !attendance.checkIn || attendance.checkOut || attendance.status === 'Leave' || attendance.status === 'Absent') {
        return res.status(400).json({
          message: 'Selected mechanic is currently unavailable or not checked in today.'
        });
      }
    }

    // Determine primary service name and calculate initial estimated cost
    const serviceList = Array.isArray(services) && services.length > 0
      ? services
      : [{ serviceName: 'General Service', labourCharge: 500, washingCharge: 300, isFreeService: false }];

    const primaryService = serviceList[0]?.serviceName || 'General Service';

    let estimatedCost = 0;
    serviceList.forEach((srv) => {
      if (!srv.isFreeService) {
        estimatedCost += (Number(srv.labourCharge) || 0) + (Number(srv.washingCharge) || 0);
      }
    });

    const fullComplaint = complaint || primaryService;

    // Create linked Appointment document for record & tracking
    const appointment = new Appointment({
      customer: customerId,
      vehicle: vehicleId,
      serviceType: primaryService,
      appointmentDate: new Date(),
      preferredTime: preferredTime || '09:00 AM - 10:00 AM',
      problemDescription: fullComplaint,
      serviceAdvisor: req.user._id,
      bookingType: 'Walk-in',
      status: 'Approved'
    });
    const savedAppointment = await appointment.save();

    // Create Job Card
    const jobCard = new JobCard({
      customer: customerId,
      vehicle: vehicleId,
      serviceRequest: savedAppointment._id,
      serviceType: primaryService,
      servicesPerformed: serviceList,
      complaint: fullComplaint,
      inspectionDetails: inspectionDetails || {},
      odometerAtService: inspectionDetails?.odometerReading || vehicle.currentOdometerReading,
      priority: priority || 'Medium',
      status: assignedMechanic ? 'Assigned' : 'Open',
      assignedMechanic: assignedMechanic || null,
      estimatedCost,
      notes
    });

    const savedJobCard = await jobCard.save();

    // Update vehicle's odometer reading if inspection reading is higher
    if (inspectionDetails?.odometerReading && inspectionDetails.odometerReading > vehicle.currentOdometerReading) {
      vehicle.currentOdometerReading = inspectionDetails.odometerReading;
      await vehicle.save();
    }

    // Populate for response
    await savedJobCard.populate('customer', 'fullName mobileNumber emailAddress');
    await savedJobCard.populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading');
    if (assignedMechanic) {
      await savedJobCard.populate('assignedMechanic', 'fullName employeeId specialization availability');
    }

    // Notifications
    await notifyCustomer(customerId, {
      type: 'JOB_CARD_CREATED',
      title: 'Walk-in Service Checked-in',
      message: `Your vehicle ${vehicle.vehicleNumber} has been checked in under Job Card ${savedJobCard.jobNumber}.`,
      relatedEntityType: 'JobCard',
      relatedEntityId: savedJobCard._id,
      metadata: { jobNumber: savedJobCard.jobNumber }
    });

    await notifyAdminsAndAdvisors({
      type: 'JOB_CARD_CREATED',
      title: 'New Walk-in Job Card Created',
      message: `Job Card ${savedJobCard.jobNumber} created for vehicle ${vehicle.vehicleNumber}.`,
      relatedEntityType: 'JobCard',
      relatedEntityId: savedJobCard._id,
      metadata: { jobNumber: savedJobCard.jobNumber }
    });

    if (assignedMechanic) {
      await notifyMechanic(assignedMechanic, {
        type: 'MECHANIC_ASSIGNED',
        title: 'New Job Card Assigned',
        message: `You have been assigned to Job Card ${savedJobCard.jobNumber} for vehicle ${vehicle.vehicleNumber}.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: savedJobCard._id,
        metadata: { jobNumber: savedJobCard.jobNumber }
      });
    }

    res.status(201).json(savedJobCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add additional service recommendation during service
// @route   POST /api/job-cards/:id/recommendations
// @access  Private (Advisor/Mechanic/Admin)
export const addAdditionalRecommendation = async (req, res) => {
  try {
    const { serviceName, reason, estimatedLabour = 0, estimatedParts = 0, estimatedTotal } = req.body;

    if (!serviceName || !reason) {
      return res.status(400).json({ message: 'Service name and reason are required' });
    }

    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    if (['Completed', 'Delivered', 'Cancelled'].includes(jobCard.status)) {
      return res.status(400).json({ message: `Cannot add recommendations to a ${jobCard.status} job card` });
    }

    const total = estimatedTotal !== undefined ? Number(estimatedTotal) : (Number(estimatedLabour) + Number(estimatedParts));

    const newRecommendation = {
      serviceName,
      reason,
      estimatedLabour: Number(estimatedLabour) || 0,
      estimatedParts: Number(estimatedParts) || 0,
      estimatedTotal: total,
      status: 'Pending Customer Approval',
      recommendedBy: req.user._id,
      createdAt: new Date()
    };

    jobCard.additionalRecommendations.push(newRecommendation);
    await jobCard.save();

    // Notify customer
    await notifyCustomer(jobCard.customer, {
      type: 'RECOMMENDATION_ADDED',
      title: 'Additional Service Recommendation',
      message: `Additional service "${serviceName}" has been recommended for your vehicle. Please review and approve in your portal.`,
      relatedEntityType: 'JobCard',
      relatedEntityId: jobCard._id,
      metadata: { jobNumber: jobCard.jobNumber, serviceName, estimatedTotal: total }
    });

    res.status(201).json(jobCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer approval or rejection of additional service recommendation
// @route   PUT /api/job-cards/:id/recommendations/:recId/approval
// @access  Private (Customer or Advisor on behalf)
export const respondToRecommendation = async (req, res) => {
  try {
    const { action } = req.body; // 'Approve' or 'Reject'

    if (!['Approve', 'Reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "Approve" or "Reject"' });
    }

    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const rec = jobCard.additionalRecommendations.id(req.params.recId);
    if (!rec) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    if (rec.status !== 'Pending Customer Approval') {
      return res.status(400).json({ message: `Recommendation has already been ${rec.status}` });
    }

    rec.status = action === 'Approve' ? 'Approved' : 'Rejected';
    rec.customerActionAt = new Date();

    if (action === 'Approve') {
      // Automatically add to servicesPerformed with estimated charges
      jobCard.servicesPerformed.push({
        serviceName: rec.serviceName,
        labourCharge: rec.estimatedLabour || 0,
        washingCharge: 0,
        isFreeService: false
      });

      jobCard.estimatedCost = (jobCard.estimatedCost || 0) + (rec.estimatedTotal || 0);

      // Notify advisor and assigned mechanic
      await notifyAdminsAndAdvisors({
        type: 'RECOMMENDATION_APPROVED',
        title: 'Customer Approved Additional Service',
        message: `Customer approved "${rec.serviceName}" (₹${rec.estimatedTotal}) for Job Card ${jobCard.jobNumber}.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: jobCard._id,
        metadata: { jobNumber: jobCard.jobNumber, serviceName: rec.serviceName }
      });

      if (jobCard.assignedMechanic) {
        await notifyMechanic(jobCard.assignedMechanic, {
          type: 'RECOMMENDATION_APPROVED',
          title: 'Additional Service Approved',
          message: `Customer approved "${rec.serviceName}" for Job Card ${jobCard.jobNumber}. You may proceed with the work.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: jobCard._id,
          metadata: { jobNumber: jobCard.jobNumber, serviceName: rec.serviceName }
        });
      }
    } else {
      // Notify advisor and assigned mechanic of rejection
      await notifyAdminsAndAdvisors({
        type: 'RECOMMENDATION_REJECTED',
        title: 'Customer Declined Additional Service',
        message: `Customer declined "${rec.serviceName}" for Job Card ${jobCard.jobNumber}. Zero additional charges applied.`,
        relatedEntityType: 'JobCard',
        relatedEntityId: jobCard._id,
        metadata: { jobNumber: jobCard.jobNumber, serviceName: rec.serviceName }
      });
    }

    await jobCard.save();
    res.json(jobCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

