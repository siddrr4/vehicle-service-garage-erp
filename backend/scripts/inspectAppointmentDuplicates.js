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
import { getIndiaDateStr } from '../utils/dateUtils.js';

export const inspectDuplicates = async () => {
  await connectDB();
  console.log('================================================================');
  console.log('       INSPECT APPOINTMENT DUPLICATES (READ-ONLY AUDIT)         ');
  console.log('================================================================\n');

  const appointments = await Appointment.find({})
    .populate('customer', 'fullName mobileNumber emailAddress')
    .populate('vehicle', 'vehicleNumber brand model')
    .sort({ createdAt: 1 });

  console.log(`Total appointments in database: ${appointments.length}\n`);
  appointments.forEach((a, i) => {
    const dStr = a.appointmentDate ? getIndiaDateStr(a.appointmentDate) : 'no date';
    console.log(`  [${i + 1}] ID: ${a._id} | ${a.customer?.fullName} | ${a.vehicle?.vehicleNumber} | ${dStr} | ${a.preferredTime} | ${a.serviceType} | Status: ${a.status}`);
  });
  console.log('');

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
  for (const [key, group] of groups.entries()) {
    if (group.records.length > 1) {
      duplicateGroups.push(group);
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate group(s).\n`);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate appointments found.');
    await mongoose.disconnect();
    return [];
  }

  let totalDuplicatesToDelete = 0;

  for (let i = 0; i < duplicateGroups.length; i++) {
    const g = duplicateGroups[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`Group #${i + 1}: ${g.customerName} | ${g.vehicleNumber} | ${g.dateStr} | ${g.timeSlot} | ${g.serviceType}`);
    console.log(`Total Copies: ${g.records.length}`);

    // Oldest record (first in sorted array) will be kept
    const keepRecord = g.records[0];
    const deleteRecords = g.records.slice(1);
    totalDuplicatesToDelete += deleteRecords.length;

    // Check if keepRecord has JobCard
    const keepJc = await JobCard.findOne({ serviceRequest: keepRecord._id });
    console.log(`  [KEEP] ID: ${keepRecord._id} | Created: ${keepRecord.createdAt?.toISOString()} | Status: ${keepRecord.status} | JobCard: ${keepJc ? keepJc.jobNumber : 'None'}`);

    for (const d of deleteRecords) {
      const dJc = await JobCard.findOne({ serviceRequest: d._id });
      console.log(`  [DELETE] ID: ${d._id} | Created: ${d.createdAt?.toISOString()} | Status: ${d.status} | JobCard: ${dJc ? dJc.jobNumber : 'None'}`);
    }
    console.log('');
  }

  console.log('================================================================');
  console.log(`AUDIT SUMMARY: ${duplicateGroups.length} duplicate groups, ${totalDuplicatesToDelete} records identified for deletion.`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  return duplicateGroups;
};

inspectDuplicates().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
