import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import JobCard from './models/JobCard.js';
import Appointment from './models/Appointment.js';
import { calculateSlotCapacity } from './controllers/appointmentController.js';

dotenv.config();

const testWorkflow = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB Atlas successfully.');

    const totalMechanics = await Employee.countDocuments({ role: 'Mechanic', status: 'Active' });
    console.log(`Active Mechanics in Database: ${totalMechanics}`);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = await Attendance.countDocuments({ date: todayStr });
    console.log(`Today's Attendance Records: ${todayAttendance}`);

    // Calculate slot capacity for today
    const todayCapacity = await calculateSlotCapacity(todayStr);
    console.log(`\nToday (${todayStr}) Capacity Per Slot: ${todayCapacity.capacityPerSlot}`);
    console.log('Today Slots Sample:', todayCapacity.slots.slice(0, 3));

    // Calculate slot capacity for tomorrow
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = tmr.toISOString().split('T')[0];
    const tmrCapacity = await calculateSlotCapacity(tmrStr);
    console.log(`\nTomorrow (${tmrStr}) Capacity Per Slot: ${tmrCapacity.capacityPerSlot}`);
    console.log('Tomorrow Slots Sample:', tmrCapacity.slots.slice(0, 3));

    console.log('\n--- VERIFICATION SUCCESS ---');
    process.exit(0);
  } catch (error) {
    console.error('Workflow Test Error:', error);
    process.exit(1);
  }
};

testWorkflow();
