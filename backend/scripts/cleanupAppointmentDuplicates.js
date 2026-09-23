import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import JobCard from '../models/JobCard.js';
import Notification from '../models/Notification.js';
import { getIndiaDateStr } from '../utils/dateUtils.js';

export const runCleanup = async () => {
  await connectDB();
  console.log('================================================================');
  console.log('       CLEANUP APPOINTMENT DUPLICATES SCRIPT                    ');
  console.log('================================================================\n');

  const appointments = await Appointment.find({})
    .populate('customer', 'fullName mobileNumber emailAddress')
    .populate('vehicle', 'vehicleNumber brand model')
    .sort({ createdAt: 1 });

  console.log(`Total appointments in database before cleanup: ${appointments.length}\n`);

  // Group by: Customer ID + Vehicle ID + Date (IST) + Time Slot + Service Type
  const groups = new Map();

  for (const apt of appointments) {
    const customerId = apt.customer?._id?.toString() || apt.customer?.toString() || 'unknown_cust';
    const vehicleId = apt.vehicle?._id?.toString() || apt.vehicle?.toString() || 'unknown_veh';
    const dateStr = apt.appointmentDate ? getIndiaDateStr(apt.appointmentDate) : 'unknown_date';
    const timeSlot = (apt.preferredTime || '').trim();
    const serviceType = (apt.serviceType || '').trim();

    const groupKey = `${customerId}|${vehicleId}|${dateStr}|${timeSlot}|${serviceType}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        customerName: apt.customer?.fullName || 'Unknown Customer',
        vehicleNumber: apt.vehicle?.vehicleNumber || 'Unknown Vehicle',
        dateStr,
        timeSlot,
        serviceType,
        records: []
      });
    }

    groups.get(groupKey).records.push(apt);
  }

  const duplicateGroups = [];
  for (const [, group] of groups.entries()) {
    if (group.records.length > 1) {
      duplicateGroups.push(group);
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate group(s).\n`);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate appointments found to clean up.');
    await mongoose.disconnect();
    return;
  }

  let deletedCount = 0;

  for (let i = 0; i < duplicateGroups.length; i++) {
    const g = duplicateGroups[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`Group #${i + 1}: ${g.customerName} | ${g.vehicleNumber} | ${g.dateStr} | ${g.timeSlot} | ${g.serviceType}`);
    console.log(`Total Copies: ${g.records.length}`);

    // Determine which record to keep:
    // If a record has a Job Card, prefer keeping it.
    let keepIndex = 0;
    for (let r = 0; r < g.records.length; r++) {
      const hasJobCard = await JobCard.findOne({ serviceRequest: g.records[r]._id });
      if (hasJobCard) {
        keepIndex = r;
        break;
      }
    }

    const keepRecord = g.records[keepIndex];
    const keepJc = await JobCard.findOne({ serviceRequest: keepRecord._id });
    console.log(`  [KEEPING] ID: ${keepRecord._id} | Created: ${keepRecord.createdAt?.toISOString()} | Status: ${keepRecord.status} | JobCard: ${keepJc ? keepJc.jobNumber : 'None'}`);

    for (let r = 0; r < g.records.length; r++) {
      if (r === keepIndex) continue;
      const dup = g.records[r];
      const dupJc = await JobCard.findOne({ serviceRequest: dup._id });
      
      // Safety check: Never delete a record that has an active Job Card
      if (dupJc) {
        console.log(`  [SKIPPED DELETION] ID: ${dup._id} has linked JobCard ${dupJc.jobNumber}`);
        continue;
      }

      // Delete duplicate appointment
      await Appointment.findByIdAndDelete(dup._id);
      // Clean up any associated notification
      if (Notification) {
        await Notification.deleteMany({ relatedEntityId: dup._id });
      }

      console.log(`  [DELETED] ID: ${dup._id} | Created: ${dup.createdAt?.toISOString()} | Status: ${dup.status}`);
      deletedCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`CLEANUP COMPLETED: Deleted ${deletedCount} duplicate appointment record(s).`);
  
  const remainingCount = await Appointment.countDocuments();
  console.log(`Total appointments remaining in database: ${remainingCount}`);
  console.log('================================================================\n');

  await mongoose.disconnect();
};

runCleanup().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
