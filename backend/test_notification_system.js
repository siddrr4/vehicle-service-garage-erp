import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Vehicle from './models/Vehicle.js';
import Employee from './models/Employee.js';
import Appointment from './models/Appointment.js';
import JobCard from './models/JobCard.js';
import Invoice from './models/Invoice.js';
import SparePart from './models/SparePart.js';
import Notification from './models/Notification.js';
import ServiceHistory from './models/ServiceHistory.js';
import {
  createNotification,
  createNotifications,
  notifyCustomer,
  notifyMechanic,
  notifyAdminsAndAdvisors,
  markAsRead,
  markAllAsRead,
  checkInsuranceExpiryReminders,
  checkServiceDueReminders,
  checkLowStockCondition,
} from './services/notificationService.js';
import {
  getIndiaDateStr,
  getIndiaStartOfDay,
  formatDateIST,
} from './utils/dateUtils.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('      NOTIFICATION SYSTEM MODULE VERIFICATION       ');
  console.log('====================================================\n');

  await connectDB();

  const cleanupIds = {
    users: [],
    customers: [],
    vehicles: [],
    employees: [],
    appointments: [],
    jobCards: [],
    invoices: [],
    spareParts: [],
    serviceHistories: [],
    notifications: [],
  };

  try {
    // 1. SETUP TEMPORARY TEST USERS FOR ROLE-BASED TESTING
    console.log('1. Setting up temporary test accounts...');

    const timestamp = Date.now();
    const testAdmin = await User.create({
      firstName: 'TestAdmin',
      lastName: 'User',
      email: `testadmin_${timestamp}@example.com`,
      password: 'password123',
      role: 'admin',
      phone: '9876543210',
    });
    cleanupIds.users.push(testAdmin._id);

    const testAdvisor = await User.create({
      firstName: 'TestAdvisor',
      lastName: 'User',
      email: `testadvisor_${timestamp}@example.com`,
      password: 'password123',
      role: 'advisor',
      phone: '9876543211',
    });
    cleanupIds.users.push(testAdvisor._id);

    const testMechanicUser = await User.create({
      firstName: 'TestMech',
      lastName: 'User',
      email: `testmech_${timestamp}@example.com`,
      password: 'password123',
      role: 'mechanic',
      phone: '9876543212',
    });
    cleanupIds.users.push(testMechanicUser._id);

    const testMechanicEmp = await Employee.create({
      fullName: 'Test Mechanic Emp',
      email: `testmech_${timestamp}@example.com`,
      phone: '9876543212',
      role: 'Mechanic',
      specialization: 'Brakes',
      experience: 5,
      availability: 'Available',
      userRef: testMechanicUser._id,
    });
    cleanupIds.employees.push(testMechanicEmp._id);

    const testCustomerUser = await User.create({
      firstName: 'TestCust',
      lastName: 'User',
      email: `testcust_${timestamp}@example.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876543213',
    });
    cleanupIds.users.push(testCustomerUser._id);

    const testCustomer = await Customer.create({
      fullName: 'Test Customer Full',
      mobileNumber: '9876543213',
      emailAddress: `testcust_${timestamp}@example.com`,
      address: '123 Test St',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
      userId: testCustomerUser._id,
    });
    cleanupIds.customers.push(testCustomer._id);

    testCustomerUser.customerRef = testCustomer._id;
    await testCustomerUser.save();

    console.log('  Accounts initialized successfully.\n');

    // 2. TEST NOTIFICATION MODEL & SERVICE BASICS
    console.log('2. Testing Notification Model and Creation...');
    const singleNotif = await createNotification({
      recipient: testCustomerUser._id,
      recipientRole: 'customer',
      type: 'APPOINTMENT_BOOKED',
      title: 'Test Appointment Title',
      message: 'Test Appointment Message',
    });
    cleanupIds.notifications.push(singleNotif._id);

    assert(singleNotif !== null, 'Single notification successfully created');
    assert(singleNotif.recipient.toString() === testCustomerUser._id.toString(), 'Recipient ID matches customer user');
    assert(singleNotif.isRead === false, 'Default isRead is false');

    // 3. TEST ROLE ISOLATION & PERMISSIONS
    console.log('\n3. Testing Role-Based Notification Visibility & Scoping...');
    // Create admin-only and mechanic-only notifications
    const adminNotif = await createNotification({
      recipient: testAdmin._id,
      recipientRole: 'admin',
      type: 'LOW_STOCK',
      title: 'Admin Low Stock Notice',
      message: 'Part is low',
    });
    cleanupIds.notifications.push(adminNotif._id);

    const mechNotif = await createNotification({
      recipient: testMechanicUser._id,
      recipientRole: 'mechanic',
      type: 'JOB_CARD_CREATED',
      title: 'Job Assigned to Mechanic',
      message: 'Job Card JC-100',
    });
    cleanupIds.notifications.push(mechNotif._id);

    const customerInbox = await Notification.find({ recipient: testCustomerUser._id });
    const adminInbox = await Notification.find({ recipient: testAdmin._id });
    const mechInbox = await Notification.find({ recipient: testMechanicUser._id });

    assert(customerInbox.every((n) => n.recipientRole === 'customer'), 'Customer inbox only contains customer-directed alerts');
    assert(!customerInbox.some((n) => n._id.toString() === adminNotif._id.toString()), 'Customer cannot view admin notifications');
    assert(!customerInbox.some((n) => n._id.toString() === mechNotif._id.toString()), 'Customer cannot view mechanic notifications');
    assert(adminInbox.some((n) => n._id.toString() === adminNotif._id.toString()), 'Admin sees admin notifications');
    assert(mechInbox.some((n) => n._id.toString() === mechNotif._id.toString()), 'Mechanic sees mechanic notifications');

    // 4. TEST UNREAD COUNT & MARK AS READ
    console.log('\n4. Testing Unread Count & Mark as Read...');
    const unreadBefore = await Notification.countDocuments({ recipient: testCustomerUser._id, isRead: false });
    assert(unreadBefore >= 1, `Unread count before read action is ${unreadBefore}`);

    await markAsRead(singleNotif._id, testCustomerUser._id);
    const updatedNotif = await Notification.findById(singleNotif._id);
    assert(updatedNotif.isRead === true && updatedNotif.readAt !== null, 'markAsRead updates isRead to true and sets readAt');

    const unreadAfterSingle = await Notification.countDocuments({ recipient: testCustomerUser._id, isRead: false });
    assert(unreadAfterSingle === unreadBefore - 1, 'Unread count decrements after marking single notification as read');

    // Create 2 new unread notifications and mark all read
    const n1 = await createNotification({
      recipient: testCustomerUser._id,
      recipientRole: 'customer',
      type: 'INVOICE_GENERATED',
      title: 'Inv 1',
      message: 'Inv msg',
    });
    const n2 = await createNotification({
      recipient: testCustomerUser._id,
      recipientRole: 'customer',
      type: 'INVOICE_GENERATED',
      title: 'Inv 2',
      message: 'Inv msg',
    });
    cleanupIds.notifications.push(n1._id, n2._id);

    await markAllAsRead(testCustomerUser._id);
    const unreadAfterAll = await Notification.countDocuments({ recipient: testCustomerUser._id, isRead: false });
    assert(unreadAfterAll === 0, 'markAllAsRead sets all user unread notifications to read');

    // 5. TEST APPOINTMENT NOTIFICATIONS
    console.log('\n5. Testing Appointment Event Notifications...');
    // Create vehicle for appointment test
    const testVehicle = await Vehicle.create({
      customer: testCustomer._id,
      vehicleNumber: `MH01AB${Math.floor(1000 + Math.random() * 9000)}`,
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2022,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: new Date('2022-01-15'),
      currentOdometerReading: 15000,
      insuranceExpiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days ahead (30_DAYS stage)
    });
    cleanupIds.vehicles.push(testVehicle._id);

    // Trigger Appointment Booked
    await notifyCustomer(testCustomer._id, {
      type: 'APPOINTMENT_BOOKED',
      title: 'Appointment booked successfully',
      message: 'Your appointment is booked for General Service',
    });
    const aptCustNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'APPOINTMENT_BOOKED',
    });
    if (aptCustNotif) cleanupIds.notifications.push(aptCustNotif._id);
    assert(aptCustNotif !== null, 'Customer receives APPOINTMENT_BOOKED notification');

    // Trigger Appointment Confirmed
    await notifyCustomer(testCustomer._id, {
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Your appointment has been confirmed',
      message: 'Appointment confirmed for tomorrow',
    });
    const aptConfNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'APPOINTMENT_CONFIRMED',
    });
    if (aptConfNotif) cleanupIds.notifications.push(aptConfNotif._id);
    assert(aptConfNotif !== null, 'Customer receives APPOINTMENT_CONFIRMED notification');

    // Trigger Appointment Cancelled
    await notifyCustomer(testCustomer._id, {
      type: 'APPOINTMENT_CANCELLED',
      title: 'Your appointment has been cancelled',
      message: 'Appointment was cancelled',
    });
    const aptCancNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'APPOINTMENT_CANCELLED',
    });
    if (aptCancNotif) cleanupIds.notifications.push(aptCancNotif._id);
    assert(aptCancNotif !== null, 'Customer receives APPOINTMENT_CANCELLED notification');

    // 6. TEST JOB CARD NOTIFICATIONS
    console.log('\n6. Testing Job Card Event Notifications...');
    // Notify Mechanic
    await notifyMechanic(testMechanicEmp._id, {
      type: 'JOB_CARD_CREATED',
      title: 'New Job Card assigned',
      message: 'Job Card JC-9999 assigned to you',
    });
    const mechAssignedNotif = await Notification.findOne({
      recipient: testMechanicUser._id,
      type: 'JOB_CARD_CREATED',
    });
    if (mechAssignedNotif) cleanupIds.notifications.push(mechAssignedNotif._id);
    assert(mechAssignedNotif !== null, 'Mechanic receives JOB_CARD_CREATED notification');

    // Notify Customer on Job Completion
    await notifyCustomer(testCustomer._id, {
      type: 'JOB_COMPLETED',
      title: 'Your vehicle service is completed',
      message: 'Job Card JC-9999 is completed',
    });
    const jobCompNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'JOB_COMPLETED',
    });
    if (jobCompNotif) cleanupIds.notifications.push(jobCompNotif._id);
    assert(jobCompNotif !== null, 'Customer receives JOB_COMPLETED notification');

    // 7. TEST BILLING & PAYMENT NOTIFICATIONS
    console.log('\n7. Testing Billing & Payment Notifications...');
    await notifyCustomer(testCustomer._id, {
      type: 'INVOICE_GENERATED',
      title: 'Your service invoice is ready',
      message: 'Invoice INV-0001 ready',
    });
    const invNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'INVOICE_GENERATED',
    });
    if (invNotif) cleanupIds.notifications.push(invNotif._id);
    assert(invNotif !== null, 'Customer receives INVOICE_GENERATED notification');

    await notifyCustomer(testCustomer._id, {
      type: 'PAYMENT_SUCCESS',
      title: 'Payment successful',
      message: 'Payment of Rs 1500 received',
    });
    const payCustNotif = await Notification.findOne({
      recipient: testCustomerUser._id,
      type: 'PAYMENT_SUCCESS',
    });
    if (payCustNotif) cleanupIds.notifications.push(payCustNotif._id);
    assert(payCustNotif !== null, 'Customer receives PAYMENT_SUCCESS notification');

    // 8. TEST INVENTORY LOW-STOCK & DUPLICATE PREVENTION
    console.log('\n8. Testing Low Stock Alert & Duplicate Prevention...');
    const testPart = await SparePart.create({
      partName: `Test Brake Pad ${timestamp}`,
      category: 'Brake System',
      compatibleVehicleBrands: ['Honda'],
      manufacturer: 'Brembo',
      unitPrice: 500,
      sellingPrice: 800,
      quantityAvailable: 2,
      minimumStockLevel: 5,
      rackLocation: 'RACK-A1',
      supplier: 'Test Supplier',
      warranty: '6 Months',
    });
    cleanupIds.spareParts.push(testPart._id);

    // Trigger low stock check
    await checkLowStockCondition(testPart._id);
    const lowStockNotifsFirst = await Notification.find({
      relatedEntityType: 'SparePart',
      relatedEntityId: testPart._id,
      type: 'LOW_STOCK',
    });
    lowStockNotifsFirst.forEach((n) => cleanupIds.notifications.push(n._id));
    assert(lowStockNotifsFirst.length > 0, 'Admins receive LOW_STOCK notification when quantity <= minimum');

    // Re-check low stock without replenishing -> verify duplicate prevention
    await checkLowStockCondition(testPart._id);
    const lowStockNotifsSecond = await Notification.find({
      relatedEntityType: 'SparePart',
      relatedEntityId: testPart._id,
      type: 'LOW_STOCK',
    });
    assert(lowStockNotifsSecond.length === lowStockNotifsFirst.length, 'Duplicate low stock notification was NOT created on repeated check');

    // 9. TEST INSURANCE RENEWAL & DUPLICATE PREVENTION (HOD Requirement)
    console.log('\n9. Testing Insurance Renewal Reminders & Duplicate Prevention (HOD)...');
    // testVehicle created earlier has expiry 25 days ahead (30_DAYS stage)
    await checkInsuranceExpiryReminders();
    const insNotifsFirst = await Notification.find({
      relatedEntityType: 'Vehicle',
      relatedEntityId: testVehicle._id,
      type: 'INSURANCE_EXPIRY',
    });
    insNotifsFirst.forEach((n) => cleanupIds.notifications.push(n._id));
    assert(insNotifsFirst.length > 0, 'Insurance reminder created for 30_DAYS stage');

    // Verify stage in metadata
    const firstIns = insNotifsFirst[0];
    assert(firstIns.metadata?.stage === '30_DAYS', 'Insurance reminder metadata contains stage "30_DAYS"');

    // Re-run insurance check -> verify NO duplicate created for same stage
    await checkInsuranceExpiryReminders();
    const insNotifsSecond = await Notification.find({
      relatedEntityType: 'Vehicle',
      relatedEntityId: testVehicle._id,
      type: 'INSURANCE_EXPIRY',
    });
    assert(insNotifsSecond.length === insNotifsFirst.length, 'Duplicate insurance notification was NOT created on repeated check');

    // 10. TEST SERVICE DUE NOTIFICATION & DUPLICATE PREVENTION
    console.log('\n10. Testing Service Due Reminder & Duplicate Prevention...');
    // Create vehicle with service last performed 200 days ago
    const dueVehicle = await Vehicle.create({
      customer: testCustomer._id,
      vehicleNumber: `MH02CD${Math.floor(1000 + Math.random() * 9000)}`,
      brand: 'Hyundai',
      model: 'Creta',
      manufacturingYear: 2021,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      registrationDate: new Date('2021-05-10'),
      currentOdometerReading: 35000,
    });
    cleanupIds.vehicles.push(dueVehicle._id);

    // Add old service history record (200 days ago)
    const oldServiceDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    // Dummy job card id for history
    const dummyJobCardId = new mongoose.Types.ObjectId();
    const oldHistory = await ServiceHistory.create({
      customer: testCustomer._id,
      vehicle: dueVehicle._id,
      jobCard: dummyJobCardId,
      serviceDate: oldServiceDate,
      odometerReading: 22000,
    });
    cleanupIds.serviceHistories.push(oldHistory._id);

    await checkServiceDueReminders();
    const serviceDueNotifsFirst = await Notification.find({
      relatedEntityType: 'Vehicle',
      relatedEntityId: dueVehicle._id,
      type: 'SERVICE_DUE',
    });
    serviceDueNotifsFirst.forEach((n) => cleanupIds.notifications.push(n._id));
    assert(serviceDueNotifsFirst.length > 0, 'Customer receives SERVICE_DUE notification for vehicle past interval');

    // Re-run service due check -> verify duplicate prevention
    await checkServiceDueReminders();
    const serviceDueNotifsSecond = await Notification.find({
      relatedEntityType: 'Vehicle',
      relatedEntityId: dueVehicle._id,
      type: 'SERVICE_DUE',
    });
    assert(serviceDueNotifsSecond.length === serviceDueNotifsFirst.length, 'Duplicate service due notification was NOT created on repeated check');

    // 11. TEST PAYROLL NOTIFICATION
    console.log('\n11. Testing Payroll Generated Notification...');
    await notifyMechanic(testMechanicEmp._id, {
      type: 'PAYROLL_GENERATED',
      title: 'Payroll has been generated',
      message: 'Your payroll for September 2026 has been generated. Net Salary: Rs 35000.',
    });
    const payrollNotif = await Notification.findOne({
      recipient: testMechanicUser._id,
      type: 'PAYROLL_GENERATED',
    });
    if (payrollNotif) cleanupIds.notifications.push(payrollNotif._id);
    assert(payrollNotif !== null, 'Employee/Mechanic receives PAYROLL_GENERATED notification');

    // 12. TEST IST DATE HANDLING
    console.log('\n12. Testing IST Date Utilities Integrity...');
    const istDateStr = getIndiaDateStr(new Date());
    assert(/^\d{4}-\d{2}-\d{2}$/.test(istDateStr), `getIndiaDateStr returns valid YYYY-MM-DD: ${istDateStr}`);
    const istFormatted = formatDateIST(new Date());
    assert(typeof istFormatted === 'string' && istFormatted.length > 0, `formatDateIST returns formatted string: ${istFormatted}`);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // CLEANUP ALL TEMPORARY TEST DATA
    console.log('\n====================================================');
    console.log('Cleaning up temporary test records...');
    await Notification.deleteMany({ _id: { $in: cleanupIds.notifications } });
    await ServiceHistory.deleteMany({ _id: { $in: cleanupIds.serviceHistories } });
    await SparePart.deleteMany({ _id: { $in: cleanupIds.spareParts } });
    await Vehicle.deleteMany({ _id: { $in: cleanupIds.vehicles } });
    await Employee.deleteMany({ _id: { $in: cleanupIds.employees } });
    await Customer.deleteMany({ _id: { $in: cleanupIds.customers } });
    await User.deleteMany({ _id: { $in: cleanupIds.users } });
    console.log('Cleanup completed. No test data remains in the database.');
    console.log('====================================================');

    console.log(`\nTEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    if (failed === 0) {
      console.log('>>> ALL NOTIFICATION SYSTEM TESTS PASSED SUCCESSFULLY! <<<\n');
    }

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
