import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import JobCard from '../models/JobCard.js';
import Employee from '../models/Employee.js';
import WaitingQueue from '../models/WaitingQueue.js';
import { createJobCardForAppointment } from './jobCardController.js';

// @desc    Get service advisors
// @route   GET /api/appointments/advisors
// @access  Private
export const getServiceAdvisors = async (req, res) => {
  try {
    const advisors = await User.find({ role: { $in: ['advisor', 'admin'] } }).select('firstName lastName _id');
    res.json(advisors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    if (req.user.role === 'customer') {
      filter.customer = req.user.customerRef;
    }
    
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    if (req.query.keyword) {
      // Find matching customers first
      const customers = await Customer.find({
        $or: [
          { fullName: { $regex: req.query.keyword, $options: 'i' } },
          { mobileNumber: { $regex: req.query.keyword, $options: 'i' } }
        ]
      }).select('_id');
      const customerIds = customers.map(c => c._id);

      // Find matching vehicles
      const vehicles = await Vehicle.find({
        vehicleNumber: { $regex: req.query.keyword, $options: 'i' }
      }).select('_id');
      const vehicleIds = vehicles.map(v => v._id);

      filter.$or = [
        { customer: { $in: customerIds } },
        { vehicle: { $in: vehicleIds } },
        { serviceType: { $regex: req.query.keyword, $options: 'i' } }
      ];
    }

    const count = await Appointment.countDocuments(filter);
    
    const appointments = await Appointment.find(filter)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('serviceAdvisor', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      appointments,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer')
      .populate('vehicle')
      .populate('serviceAdvisor', 'firstName lastName');
      
    if (appointment) {
      res.json(appointment);
    } else {
      res.status(404).json({ message: 'Appointment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Configured standard 1-hour time slots
const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

const getFormattedDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to calculate slot capacity for a date & time
export const calculateSlotCapacity = async (dateStr) => {
  const todayStr = getFormattedDateStr();
  const activeMechanics = await Employee.find({ role: 'Mechanic', status: 'Active' });
  const totalActiveMechanics = activeMechanics.length;

  let capacityPerSlot = totalActiveMechanics > 0 ? totalActiveMechanics : 5; // Default workshop capacity

  if (dateStr === todayStr) {
    // Real-time capacity based on today's actual attendance and busy status
    const Attendance = (await import('../models/Attendance.js')).default;
    const mechanicIds = activeMechanics.map(m => m._id);

    const todayAttendance = await Attendance.find({
      date: todayStr,
      employeeId: { $in: mechanicIds }
    });

    const checkedInMechanicIds = todayAttendance
      .filter(a => a.checkIn && !a.checkOut)
      .map(a => a.employeeId.toString());

    // Find active job cards assigned to checked-in mechanics
    const activeJobCards = await JobCard.find({
      status: { $in: ['Pending', 'Assigned', 'In Progress'] },
      assignedMechanic: { $in: checkedInMechanicIds }
    });

    const busyMechanicIds = new Set(activeJobCards.map(jc => jc.assignedMechanic.toString()));
    const availableMechanics = checkedInMechanicIds.filter(id => !busyMechanicIds.has(id));

    // Current available mechanics = today's slot capacity
    capacityPerSlot = availableMechanics.length;
  }

  // Parse start and end of requested date
  const [year, month, day] = dateStr.split('-').map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const existingAppointments = await Appointment.find({
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['Cancelled', 'Rejected'] }
  });

  const slots = TIME_SLOTS.map(slot => {
    // Match exact slot string or prefix like "09:00 AM"
    const slotPrefix = slot.split(' - ')[0];
    const booked = existingAppointments.filter(apt => 
      apt.preferredTime === slot || apt.preferredTime === slotPrefix
    ).length;

    const available = Math.max(0, capacityPerSlot - booked);
    const status = available > 0 ? 'Available' : 'FULL';

    return {
      time: slot,
      capacity: capacityPerSlot,
      booked,
      available,
      status
    };
  });

  return { date: dateStr, capacityPerSlot, slots };
};

// @desc    Get available time slots with dynamic capacity
// @route   GET /api/appointments/available-slots
// @access  Public / Private
export const getAvailableSlots = async (req, res) => {
  try {
    const dateStr = req.query.date || getFormattedDateStr();
    const slotData = await calculateSlotCapacity(dateStr);
    res.json(slotData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Next Available Date and Slot
// @route   GET /api/appointments/next-available-slot
// @access  Public / Private
export const getNextAvailableSlot = async (req, res) => {
  try {
    const today = new Date();
    // Scan up to 30 days ahead to prevent infinite loops
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateStr = getFormattedDateStr(checkDate);
      
      const slotData = await calculateSlotCapacity(dateStr);
      
      // Find first slot that is available
      const nextSlot = slotData.slots.find(s => s.available > 0);
      if (nextSlot) {
        return res.json({ date: dateStr, time: nextSlot.time, capacity: nextSlot.available });
      }
    }
    
    res.status(404).json({ message: 'No available slots found within the next 30 days.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Today's Service Schedule for Advisor/Admin
// @route   GET /api/appointments/today-schedule
// @access  Private (Admin/Advisor)
export const getTodaySchedule = async (req, res) => {
  try {
    const todayStr = getFormattedDateStr();
    const [year, month, day] = todayStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('serviceAdvisor', 'firstName lastName')
      .sort({ preferredTime: 1 });

    // Fetch linked Job Cards to show assigned mechanics
    const appointmentIds = appointments.map(a => a._id);
    const jobCards = await JobCard.find({ serviceRequest: { $in: appointmentIds } })
      .populate('assignedMechanic', 'fullName employeeId specialization availability');

    const jobCardMap = new Map();
    jobCards.forEach(jc => {
      jobCardMap.set(jc.serviceRequest.toString(), jc);
    });

    const schedule = appointments.map(apt => {
      const jc = jobCardMap.get(apt._id.toString());
      return {
        ...apt.toObject(),
        jobCard: jc || null,
        assignedMechanic: jc ? jc.assignedMechanic : null
      };
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add advisor recommendation to appointment/jobcard
// @route   PUT /api/appointments/:id/recommendation
// @access  Private (Admin/Advisor)
export const addAdvisorRecommendation = async (req, res) => {
  try {
    const { recommendationText } = req.body;
    if (!recommendationText) {
      return res.status(400).json({ message: 'Recommendation text is required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.advisorRecommendation = {
      recommendationText,
      recommendedBy: req.user._id,
      recommendedAt: new Date()
    };

    await appointment.save();

    // Also sync to linked Job Card if it exists
    const jobCard = await JobCard.findOne({ serviceRequest: appointment._id });
    if (jobCard) {
      jobCard.advisorRecommendation = {
        recommendationText,
        recommendedBy: req.user._id,
        recommendedAt: new Date()
      };
      await jobCard.save();
    }

    res.json({ message: 'Recommendation saved successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  try {
    const { customer, vehicle, serviceType, appointmentDate, preferredTime, problemDescription, serviceAdvisor, status, bookingType } = req.body;

    let customerId = customer;
    if (req.user.role === 'customer') {
      customerId = req.user.customerRef;
    }

    // Backend validation for capacity availability
    const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
    const slotInfo = await calculateSlotCapacity(dateStr);
    const targetSlot = slotInfo.slots.find(s => s.time === preferredTime || s.time.startsWith(preferredTime));

    if (targetSlot && targetSlot.available <= 0) {
      return res.status(400).json({ message: 'This slot is no longer available. Please select another slot.' });
    }

    const appointment = new Appointment({
      customer: customerId,
      vehicle,
      serviceType,
      appointmentDate,
      preferredTime,
      problemDescription,
      serviceAdvisor: serviceAdvisor || undefined,
      status: status || 'Pending',
      bookingType: bookingType || 'Online'
    });

    const createdAppointment = await appointment.save();

    if (createdAppointment.status === 'Approved' || createdAppointment.status === 'Checked-In') {
      await createJobCardForAppointment(createdAppointment);
    }

    res.status(201).json(createdAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
export const updateAppointment = async (req, res) => {
  try {
    const { customer, vehicle, serviceType, appointmentDate, preferredTime, problemDescription, serviceAdvisor, status } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if appointment already generated a job card or is non-pending
    const existingJobCard = await JobCard.findOne({ serviceRequest: appointment._id });
    if ((appointment.status !== 'Pending' || existingJobCard) && status === undefined) {
      return res.status(400).json({ message: 'Approved or non-pending appointments only allow status updates.' });
    }

    // Update fields if allowed or provided
    if (appointment.status === 'Pending' && !existingJobCard) {
      appointment.customer = customer || appointment.customer;
      appointment.vehicle = vehicle || appointment.vehicle;
      appointment.serviceType = serviceType || appointment.serviceType;
      appointment.appointmentDate = appointmentDate || appointment.appointmentDate;
      appointment.preferredTime = preferredTime || appointment.preferredTime;
      appointment.problemDescription = problemDescription || appointment.problemDescription;
    }

    if (serviceAdvisor !== undefined) {
      appointment.serviceAdvisor = serviceAdvisor === '' ? undefined : serviceAdvisor;
    }

    const newStatus = status || appointment.status;
    appointment.status = newStatus;

    const updatedAppointment = await appointment.save();

    // ERP Workflow Actions Based on New Status
    if (newStatus === 'Approved') {
      await createJobCardForAppointment(updatedAppointment);
    } else if (newStatus === 'Cancelled') {
      const jobCard = await JobCard.findOne({ serviceRequest: updatedAppointment._id });
      if (jobCard) {
        jobCard.status = 'Cancelled';
        await jobCard.save();

        if (jobCard.assignedMechanic) {
          const activeJobsCount = await JobCard.countDocuments({
            assignedMechanic: jobCard.assignedMechanic,
            status: { $in: ['Open', 'In Progress', 'Waiting for Parts'] },
          });
          if (activeJobsCount === 0) {
            await Employee.findByIdAndUpdate(jobCard.assignedMechanic, { availability: 'Available' });
          }
        }
      }
      
      // Check for waiting queue members for today
      const todayStr = getFormattedDateStr();
      const [year, month, day] = todayStr.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const waitingCount = await WaitingQueue.countDocuments({
        arrivalTime: { $gte: startOfDay, $lte: endOfDay },
        status: 'Waiting'
      });
      
      if (waitingCount > 0) {
        return res.json({ 
          message: 'Appointment cancelled. There are customers in the waiting queue!', 
          appointment: updatedAppointment,
          slotFreedUp: true 
        });
      }
    } else if (newStatus === 'Completed') {
      const jobCard = await JobCard.findOne({ serviceRequest: updatedAppointment._id });
      if (jobCard) {
        jobCard.status = 'Completed';
        await jobCard.save();

        if (jobCard.assignedMechanic) {
          const activeJobsCount = await JobCard.countDocuments({
            assignedMechanic: jobCard.assignedMechanic,
            status: { $in: ['Open', 'In Progress', 'Waiting for Parts'] },
          });
          if (activeJobsCount === 0) {
            await Employee.findByIdAndUpdate(jobCard.assignedMechanic, { availability: 'Available' });
          }
        }
      }
    }

    res.json(updatedAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Protection rule: If appointment is not Pending or has generated a Job Card, block hard deletion
    const existingJobCard = await JobCard.findOne({ serviceRequest: appointment._id });
    if (appointment.status !== 'Pending' || existingJobCard) {
      return res.status(400).json({ message: 'This appointment has already generated a Job Card and cannot be deleted.' });
    }

    await appointment.deleteOne();
    res.json({ message: 'Appointment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

