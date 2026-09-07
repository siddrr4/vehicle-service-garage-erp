import WaitingQueue from '../models/WaitingQueue.js';
import Appointment from '../models/Appointment.js';
import { createJobCardForAppointment } from './jobCardController.js';

const getFormattedDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Add a customer to the waiting queue
// @route   POST /api/waitlist
// @access  Private (Admin/Advisor)
export const addToWaitlist = async (req, res) => {
  try {
    const { customer, vehicle, serviceType, problemDescription, priority } = req.body;

    if (!customer || !vehicle || !serviceType) {
      return res.status(400).json({ message: 'Customer, vehicle, and service type are required' });
    }

    const waitlistEntry = new WaitingQueue({
      customer,
      vehicle,
      serviceType,
      problemDescription: problemDescription || 'Added to Waiting Queue',
      priority: priority || 'Medium',
      status: 'Waiting'
    });

    const created = await waitlistEntry.save();
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
    const todayStr = getFormattedDateStr();
    const [year, month, day] = todayStr.split('-').map(Number);
    
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const waitlist = await WaitingQueue.find({
      arrivalTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['Cancelled'] }
    })
    .populate('customer', 'fullName mobileNumber emailAddress')
    .populate('vehicle', 'vehicleNumber brand model')
    .sort({ arrivalTime: 1 }); // FIFO

    res.json(waitlist);
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
      problemDescription: entry.problemDescription,
      serviceAdvisor: req.user._id,
      bookingType: 'Walk-in',
      status: 'Checked-In'
    });

    const savedAppointment = await appointment.save();

    // 2. Create Job Card
    // Using mock req/res for the controller function
    const mockReq = { body: savedAppointment, user: req.user };
    let jobCardCreated = null;
    
    try {
      jobCardCreated = await createJobCardForAppointment(mockReq);
      
      // If a mechanic is pre-selected, assign it
      if (assignedMechanic && jobCardCreated) {
        const JobCard = (await import('../models/JobCard.js')).default;
        const Employee = (await import('../models/Employee.js')).default;
        
        await JobCard.findByIdAndUpdate(jobCardCreated._id, { 
          assignedMechanic,
          status: 'Assigned' 
        });
        
        await Employee.findByIdAndUpdate(assignedMechanic, { availability: 'Busy' });
      }
    } catch (jcError) {
      console.error('Job Card creation error:', jcError);
      // Even if Job Card fails, we proceed with the assignment status
    }

    // 3. Update Waitlist Entry
    entry.status = 'Assigned';
    entry.assignedSlot = assignedSlot;
    entry.assignedMechanic = assignedMechanic;
    entry.appointmentRef = savedAppointment._id;
    await entry.save();

    res.json({ waitlist: entry, appointment: savedAppointment, jobCard: jobCardCreated });
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
