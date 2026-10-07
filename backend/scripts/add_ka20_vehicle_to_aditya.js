import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch(e){}

import mongoose from 'mongoose';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import InsuranceRenewal from '../models/InsuranceRenewal.js';
import Appointment from '../models/Appointment.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/garage_erp');
  console.log('Connected to MongoDB');

  const adityaUser = await User.findOne({ email: 'aditya.kulkarni@gmail.com' });
  if (!adityaUser) {
    throw new Error('Aditya user not found!');
  }
  console.log(`Found Aditya user: ${adityaUser.email} (_id: ${adityaUser._id})`);

  let adityaCust = await Customer.findOne({ userId: adityaUser._id });
  if (!adityaCust) {
    adityaCust = await Customer.findById(adityaUser.customerRef);
  }
  if (!adityaCust) {
    throw new Error('Aditya customer not found!');
  }
  console.log(`Found Aditya customer: ${adityaCust.fullName} (_id: ${adityaCust._id})`);

  // 1. Find vehicle KA 20 RE 5500
  const vehicle = await Vehicle.findOne({
    $or: [
      { vehicleNumber: 'KA 20 RE 5500' },
      { normalizedVehicleNumber: 'KA20RE5500' },
      { _id: new mongoose.Types.ObjectId('6a72c840a82d50f76bd15f0f') }
    ]
  });

  if (!vehicle) {
    throw new Error('Vehicle KA 20 RE 5500 not found!');
  }

  console.log(`Current vehicle owner: ${vehicle.customer}, updating to: ${adityaCust._id}`);
  vehicle.customer = adityaCust._id;
  await vehicle.save();
  console.log('Vehicle updated successfully. Belongs to Aditya!');

  // 2. Ensure InsuranceRenewal record exists for 6aba3aa9dd366a68cd80c162
  const renewalId = new mongoose.Types.ObjectId('6aba3aa9dd366a68cd80c162');
  let renewal = await InsuranceRenewal.findById(renewalId);
  if (!renewal) {
    console.log('Creating completed InsuranceRenewal for renewalId 6aba3aa9dd366a68cd80c162...');
    renewal = new InsuranceRenewal({
      _id: renewalId,
      renewalNumber: 'INS-000009',
      vehicle: vehicle._id,
      customer: adityaCust._id,
      previousInsurance: {
        provider: 'HDFC ERGO General Insurance',
        policyNumber: 'POL-SUCCESS-2026-01',
        expiryDate: new Date('2026-09-28T00:00:00.000Z')
      },
      newInsurance: {
        provider: 'TATA AIG General Insurance',
        policyNumber: 'POL-TEST-1790589609456',
        startDate: new Date('2026-09-28T10:00:09.456Z'),
        expiryDate: new Date('2027-09-28T10:00:09.456Z')
      },
      amount: 1499,
      paidAmount: 1499,
      premiumAmount: 1270.34,
      gstAmount: 228.66,
      gstRate: 18,
      paymentStatus: 'Completed',
      razorpayOrderId: 'order_test_1790589609456',
      razorpayPaymentId: 'pay_test_1790589609456',
      paymentMethod: 'Razorpay',
      paymentDate: new Date('2026-09-28T10:00:09.456Z'),
      paymentDateIST: '28 Sep 2026, 03:30 PM',
      processedBy: adityaUser._id
    });
    await renewal.save();
    console.log('InsuranceRenewal record created successfully!');
  } else {
    renewal.customer = adityaCust._id;
    renewal.vehicle = vehicle._id;
    renewal.paymentStatus = 'Completed';
    await renewal.save();
    console.log('InsuranceRenewal record updated!');
  }

  // 3. Update any appointments that belonged to this vehicle to also belong to Aditya
  const updatedAppts = await Appointment.updateMany(
    { vehicle: vehicle._id },
    { $set: { customer: adityaCust._id } }
  );
  console.log(`Updated ${updatedAppts.modifiedCount} appointments to Aditya.`);

  // 4. Update the service due notification to match the new KA 20 RE 5500 registration number
  const serviceDueNotif = await Notification.findOne({
    recipient: adityaUser._id,
    type: 'SERVICE_DUE',
    relatedEntityId: vehicle._id
  });
  if (serviceDueNotif) {
    serviceDueNotif.title = 'Vehicle Service Due: KA 20 RE 5500';
    serviceDueNotif.message = 'Your vehicle KA 20 RE 5500 (Renault Triber) is due for regular maintenance (2279 days / 41200 km since previous service). Book an appointment today.';
    if (serviceDueNotif.metadata) {
      serviceDueNotif.metadata.vehicleNumber = 'KA 20 RE 5500';
    }
    await serviceDueNotif.save();
    console.log('Updated service due notification title & message to KA 20 RE 5500.');
  }

  console.log('\n--- VERIFICATION ---');
  const myVehicles = await Vehicle.find({ customer: adityaCust._id });
  console.log(`Aditya now has ${myVehicles.length} vehicles:`);
  myVehicles.forEach(v => {
    console.log(`- ${v.vehicleNumber} (${v.brand} ${v.model}), Insurance: ${v.insuranceNumber} (${v.insuranceProvider})`);
  });

  const checkRenewal = await InsuranceRenewal.findById(renewalId).populate('vehicle customer');
  console.log('Renewal verified:', {
    id: checkRenewal._id,
    renewalNumber: checkRenewal.renewalNumber,
    vehicleNumber: checkRenewal.vehicle?.vehicleNumber,
    customerName: checkRenewal.customer?.fullName,
    status: checkRenewal.paymentStatus,
    policyNumber: checkRenewal.newInsurance?.policyNumber
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
