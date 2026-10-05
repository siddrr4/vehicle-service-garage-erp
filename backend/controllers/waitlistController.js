import WaitingQueue from '../models/WaitingQueue.js';
import Appointment from '../models/Appointment.js';
import JobCard from '../models/JobCard.js';
import Employee from '../models/Employee.js';
import Invoice from '../models/Invoice.js';
import { createJobCardForAppointment } from './jobCardController.js';
import {
  getIndiaDateStr,
  getIndiaStartOfDay,
  getIndiaEndOfDay,
} from '../utils/dateUtils.js';
import {
  notifyCustomer,
  notifyMechanic,
  notifyAdminsAndAdvisors,
} from '../services/notificationService.js';

// @desc    Add a customer to the waiting queue
// @route   POST /api/waitlist
// @access  Private (Admin/Advisor)
export const addToWaitlist = async (req, res) => {
  try {
    const { customer, vehicle, serviceType, problemDescription, priority, assignedMechanic } = req.body;

    if (!customer || !vehicle || !serviceType) {
      return res.status(400).json({ message: 'Customer, vehicle, and service type are required' });
    }

    // Duplicate prevention: check if this vehicle is already in the queue waiting
    const alreadyWaiting = await WaitingQueue.findOne({
      vehicle,
      status: 'Waiting'
    });
    if (alreadyWaiting) {
      return res.status(400).json({
        message: `Vehicle is already active in the waiting queue with Ticket #${alreadyWaiting.queueNumber}.`
      });
    }

    const waitlistEntry = new WaitingQueue({
      customer,
      vehicle,
      serviceType,
      problemDescription: problemDescription || 'Added to Waiting Queue',
      priority: priority || 'Medium',
      assignedMechanic: assignedMechanic || null,
      status: 'Waiting'
    });

    const created = await waitlistEntry.save();

    await notifyAdminsAndAdvisors({
      type: 'WAITING_QUEUE',
      title: 'New walk-in customer added to waiting queue',
      message: `Walk-in queue ticket ${created.queueNumber} created for ${created.serviceType}.`,
      relatedEntityType: 'WaitingQueue',
      relatedEntityId: created._id,
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all waiting queue entries for today
// @route   GET /api/waitlist/today
// @access  Private
export const getTodayWaitlist = async (req, res) => {
  try {
    const todayStr = getIndiaDateStr();
    const startOfDay = getIndiaStartOfDay(todayStr);
    const endOfDay = getIndiaEndOfDay(todayStr);

    const waitlist = await WaitingQueue.find({
      arrivalTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['Cancelled'] }
    })
    .populate('customer', 'fullName mobileNumber emailAddress')
    .populate('vehicle', 'vehicleNumber registrationNumber brand model fuelType')
    .populate('assignedMechanic', 'fullName employeeId specialization phone availability')
    .populate({
      path: 'appointmentRef',
      select: 'appointmentDate preferredTime status assignedMechanic bookingType problemDescription',
      populate: { path: 'assignedMechanic', select: 'fullName employeeId specialization phone availability' }
    })
    .populate({
      path: 'jobCardRef',
      select: 'jobNumber status assignedMechanic estimatedCost priority complaint servicesPerformed',
      populate: { path: 'assignedMechanic', select: 'fullName employeeId specialization phone availability' }
    })
    .sort({ arrivalTime: 1 }); // FIFO

    // If any entry has appointmentRef but no jobCardRef yet, resolve it dynamically
    const enrichedList = await Promise.all(
      waitlist.map(async (item) => {
        const itemObj = item.toObject();
        if (!itemObj.jobCardRef && itemObj.appointmentRef) {
          const jc = await JobCard.findOne({ serviceRequest: itemObj.appointmentRef._id || itemObj.appointmentRef })
            .select('jobNumber status assignedMechanic estimatedCost priority complaint servicesPerformed')
            .populate('assignedMechanic', 'fullName employeeId specialization phone availability');
          if (jc) {
            itemObj.jobCardRef = jc;
            if (!itemObj.assignedMechanic && jc.assignedMechanic) {
              itemObj.assignedMechanic = jc.assignedMechanic;
            }
          }
        }
        return itemObj;
      })
    );

    res.json(enrichedList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign a waitlisted customer to a slot (Creates Appointment & JobCard)
// @route   PUT /api/waitlist/:id/assign
// @access  Private (Admin/Advisor)
export const assignWaitlist = async (req, res) => {
  try {
    const { assignedSlot, assignedMechanic } = req.body;
    
    if (!assignedSlot) {
      return res.status(400).json({ message: 'Assigned slot is required' });
    }

    const entry = await WaitingQueue.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Waiting queue entry not found' });
    }

    if (entry.status === 'Assigned') {
      return res.status(400).json({ message: 'This entry is already assigned' });
    }

    // 1. Create Confirmed Appointment (Checked-In since they are here)
    const appointment = new Appointment({
      customer: entry.customer,
      vehicle: entry.vehicle,
      serviceType: entry.serviceType,
      appointmentDate: new Date(),
      preferredTime: assignedSlot,
      problemDescription: entry.problemDescription || entry.serviceType || 'Walk-in Service',
      serviceAdvisor: req.user._id,
      assignedMechanic: assignedMechanic || undefined,
      bookingType: 'Walk-in',
      status: 'Checked-In'
    });

    const savedAppointment = await appointment.save();

    // 2. Create Job Card
    let jobCardCreated = null;
    try {
      jobCardCreated = await createJobCardForAppointment(savedAppointment);
      
      // If a mechanic is selected, assign it
      if (assignedMechanic && jobCardCreated) {
        await JobCard.findByIdAndUpdate(jobCardCreated._id, { 
          assignedMechanic,
          status: 'Assigned' 
        });
        
        await Employee.findByIdAndUpdate(assignedMechanic, { availability: 'Busy' });

        await notifyMechanic(assignedMechanic, {
          type: 'JOB_CARD_CREATED',
          title: 'New Job Card Assigned',
          message: `Job Card ${jobCardCreated.jobNumber} has been assigned to you.`,
          relatedEntityType: 'JobCard',
          relatedEntityId: jobCardCreated._id,
        });
      }
    } catch (jcError) {
      console.error('Job Card creation error in assignWaitlist:', jcError);
    }

    // 3. Update Waitlist Entry
    entry.status = 'Assigned';
    entry.assignedSlot = assignedSlot;
    entry.assignedMechanic = assignedMechanic || null;
    entry.appointmentRef = savedAppointment._id;
    if (jobCardCreated) {
      entry.jobCardRef = jobCardCreated._id;
    }
    await entry.save();

    await notifyCustomer(entry.customer, {
      type: 'WAITING_QUEUE',
      title: 'Waiting queue slot assigned',
      message: `Your walk-in service ticket ${entry.queueNumber} has been assigned to slot ${assignedSlot}.`,
      relatedEntityType: 'WaitingQueue',
      relatedEntityId: entry._id,
    });

    await notifyAdminsAndAdvisors({
      type: 'WAITING_QUEUE',
      title: 'Queue slot assigned',
      message: `Queue ticket ${entry.queueNumber} assigned to slot ${assignedSlot}.`,
      relatedEntityType: 'WaitingQueue',
      relatedEntityId: entry._id,
    });

    res.json({ waitlist: entry, appointment: savedAppointment, jobCard: jobCardCreated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign or reassign mechanic to waiting queue entry & linked job card
// @route   PUT /api/waitlist/:id/assign-mechanic
// @access  Private (Admin/Advisor)
export const assignMechanicToWaitlist = async (req, res) => {
  try {
    const { assignedMechanic } = req.body;

    const entry = await WaitingQueue.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Waiting queue entry not found' });
    }

    entry.assignedMechanic = assignedMechanic || null;
    await entry.save();

    // Sync to linked appointment
    if (entry.appointmentRef) {
      await Appointment.findByIdAndUpdate(entry.appointmentRef, {
        assignedMechanic: assignedMechanic || null
      });
    }

    // Sync to linked job card
    let jobCard = null;
    if (entry.jobCardRef) {
      jobCard = await JobCard.findById(entry.jobCardRef);
    } else if (entry.appointmentRef) {
      jobCard = await JobCard.findOne({ serviceRequest: entry.appointmentRef });
    }

    if (jobCard) {
      jobCard.assignedMechanic = assignedMechanic || null;
      if (assignedMechanic && jobCard.status === 'Pending') {
        jobCard.status = 'Assigned';
      }
      await jobCard.save();
    }

    if (assignedMechanic) {
      await Employee.findByIdAndUpdate(assignedMechanic, { availability: 'Busy' });

      await notifyMechanic(assignedMechanic, {
        type: 'JOB_CARD_CREATED',
        title: 'Walk-in Service Assigned to You',
        message: `You have been assigned to walk-in queue ticket ${entry.queueNumber}${jobCard ? ` (Job Card ${jobCard.jobNumber})` : ''}.`,
        relatedEntityType: jobCard ? 'JobCard' : 'WaitingQueue',
        relatedEntityId: jobCard ? jobCard._id : entry._id,
      });
    }

    res.json({
      message: 'Mechanic assigned successfully',
      entry,
      jobCard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a waitlist entry
// @route   PUT /api/waitlist/:id/cancel
// @access  Private
export const cancelWaitlist = async (req, res) => {
  try {
    const entry = await WaitingQueue.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Waiting queue entry not found' });
    }

    entry.status = 'Cancelled';
    await entry.save();
    
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get complete Walk-In overview telemetry (WaitingQueue + Walk-in Appointments & JobCards)
// @route   GET /api/waitlist/overview
// @access  Private (Admin/Advisor)
export const getWalkInOverview = async (req, res) => {
  try {
    // 1. Fetch all WaitingQueue records
    const waitlistEntries = await WaitingQueue.find()
      .populate('customer', 'fullName mobileNumber emailAddress address')
      .populate('vehicle', 'vehicleNumber registrationNumber brand model fuelType currentOdometerReading')
      .populate('assignedMechanic', 'fullName employeeId specialization phone availability')
      .populate({
        path: 'appointmentRef',
        select: 'appointmentDate preferredTime status assignedMechanic bookingType problemDescription',
        populate: { path: 'assignedMechanic', select: 'fullName employeeId specialization phone availability' }
      })
      .populate({
        path: 'jobCardRef',
        select: 'jobNumber status assignedMechanic estimatedCost priority complaint servicesPerformed notes createdAt',
        populate: { path: 'assignedMechanic', select: 'fullName employeeId specialization phone availability' }
      })
      .sort({ arrivalTime: -1 })
      .lean();

    // 2. Fetch all Appointments with bookingType = 'Walk-in'
    const walkinAppointments = await Appointment.find({ bookingType: 'Walk-in' })
      .populate('customer', 'fullName mobileNumber emailAddress address')
      .populate('vehicle', 'vehicleNumber registrationNumber brand model fuelType currentOdometerReading')
      .populate('assignedMechanic', 'fullName employeeId specialization phone availability')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .lean();

    // 3. Track existing appointment IDs already represented by waitlistEntries
    const representedAptIds = new Set();
    waitlistEntries.forEach((w) => {
      if (w.appointmentRef?._id) {
        representedAptIds.add(w.appointmentRef._id.toString());
      } else if (w.appointmentRef) {
        representedAptIds.add(w.appointmentRef.toString());
      }
    });

    // 4. Batch query JobCards and Invoices for all items
    const allAptIds = [
      ...waitlistEntries.map((w) => w.appointmentRef?._id || w.appointmentRef).filter(Boolean),
      ...walkinAppointments.map((a) => a._id)
    ];

    const relatedJobCards = await JobCard.find({ serviceRequest: { $in: allAptIds } })
      .populate('assignedMechanic', 'fullName employeeId specialization phone availability')
      .lean();

    const jobCardMap = new Map();
    const allJobCardIds = [];
    relatedJobCards.forEach((jc) => {
      jobCardMap.set(jc.serviceRequest.toString(), jc);
      allJobCardIds.push(jc._id);
    });

    const relatedInvoices = await Invoice.find({ jobCard: { $in: allJobCardIds } }).lean();
    const invoiceMap = new Map();
    relatedInvoices.forEach((inv) => {
      invoiceMap.set(inv.jobCard.toString(), inv);
    });

    const combinedOverview = [];

    // Process WaitingQueue entries
    for (const entry of waitlistEntries) {
      const aptId = entry.appointmentRef?._id ? entry.appointmentRef._id.toString() : (entry.appointmentRef ? entry.appointmentRef.toString() : null);
      const linkedJc = entry.jobCardRef || (aptId ? jobCardMap.get(aptId) : null);
      const linkedInv = linkedJc ? invoiceMap.get(linkedJc._id.toString()) : null;

      const assignedMech = entry.assignedMechanic || linkedJc?.assignedMechanic || entry.appointmentRef?.assignedMechanic || null;

      combinedOverview.push({
        _id: entry._id,
        source: 'WaitingQueue',
        queueNumber: entry.queueNumber,
        customer: entry.customer,
        vehicle: entry.vehicle,
        walkInDate: entry.arrivalTime || entry.createdAt,
        complaint: entry.problemDescription || linkedJc?.complaint || entry.serviceType,
        serviceType: entry.serviceType || linkedJc?.serviceType || 'General Service',
        priority: entry.priority || linkedJc?.priority || 'Medium',
        queueStatus: entry.status,
        assignedSlot: entry.assignedSlot || entry.appointmentRef?.preferredTime || 'Waiting in Queue',
        assignedMechanic: assignedMech,
        jobCard: linkedJc ? {
          _id: linkedJc._id,
          jobNumber: linkedJc.jobNumber,
          status: linkedJc.status,
          estimatedCost: linkedJc.estimatedCost,
          servicesPerformed: linkedJc.servicesPerformed || [],
          complaint: linkedJc.complaint
        } : null,
        serviceProgress: linkedJc?.status || entry.appointmentRef?.status || entry.status,
        billing: linkedInv ? {
          _id: linkedInv._id,
          invoiceNumber: linkedInv.invoiceNumber,
          totalAmount: linkedInv.totalAmount || linkedInv.netPayable,
          status: linkedInv.status || (linkedInv.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'),
          paidAt: linkedInv.paidAt
        } : null
      });
    }

    // Process walk-in appointments that were not recorded in WaitingQueue
    for (const apt of walkinAppointments) {
      if (representedAptIds.has(apt._id.toString())) {
        continue; // Already processed via waitlistEntries
      }

      const linkedJc = jobCardMap.get(apt._id.toString());
      const linkedInv = linkedJc ? invoiceMap.get(linkedJc._id.toString()) : null;
      const assignedMech = apt.assignedMechanic || linkedJc?.assignedMechanic || null;

      combinedOverview.push({
        _id: apt._id,
        source: 'WalkInAppointment',
        queueNumber: 'Direct Entry',
        customer: apt.customer,
        vehicle: apt.vehicle,
        walkInDate: apt.appointmentDate || apt.createdAt,
        complaint: apt.problemDescription || linkedJc?.complaint || apt.serviceType,
        serviceType: apt.serviceType || 'General Service',
        priority: linkedJc?.priority || 'Medium',
        queueStatus: 'Direct Check-in',
        assignedSlot: apt.preferredTime || 'Direct Slot',
        assignedMechanic: assignedMech,
        jobCard: linkedJc ? {
          _id: linkedJc._id,
          jobNumber: linkedJc.jobNumber,
          status: linkedJc.status,
          estimatedCost: linkedJc.estimatedCost,
          servicesPerformed: linkedJc.servicesPerformed || [],
          complaint: linkedJc.complaint
        } : null,
        serviceProgress: linkedJc?.status || apt.status || 'Checked-In',
        billing: linkedInv ? {
          _id: linkedInv._id,
          invoiceNumber: linkedInv.invoiceNumber,
          totalAmount: linkedInv.totalAmount || linkedInv.netPayable,
          status: linkedInv.status || (linkedInv.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'),
          paidAt: linkedInv.paidAt
        } : null
      });
    }

    // Sort by walkInDate descending
    combinedOverview.sort((a, b) => new Date(b.walkInDate) - new Date(a.walkInDate));

    res.json(combinedOverview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
