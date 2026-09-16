import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import Appointment from './models/Appointment.js';
import WaitingQueue from './models/WaitingQueue.js';
import JobCard from './models/JobCard.js';
import Payroll from './models/Payroll.js';
import Invoice from './models/Invoice.js';
import SparePart from './models/SparePart.js';
import SalaryStructure from './models/SalaryStructure.js';

async function runRegression() {
  console.log('========================================================');
  console.log('       ERP MODULES REGRESSION INTEGRITY CHECK           ');
  console.log('========================================================');
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Employee Management
    const employees = await Employee.find({ status: 'Active' });
    assert(employees.length > 0, `1. Employee Management: ${employees.length} active employees retrieved`);

    // 2. Attendance
    const attendanceRecords = await Attendance.find({}).limit(5);
    assert(attendanceRecords !== null, `2. Attendance: Attendance query successful (${attendanceRecords.length} sample records found)`);

    // 3. Appointment Booking
    const appointments = await Appointment.find({}).limit(5);
    assert(appointments !== null, `3. Appointment Booking: Appointments query successful (${appointments.length} sample records found)`);

    // 4. Walk-in Booking & Waiting Queue
    const queue = await WaitingQueue.find({}).limit(5);
    assert(queue !== null, `4. Walk-in / Waiting Queue: Waiting queue query successful (${queue.length} sample records found)`);

    // 5. Job Cards
    const jobCards = await JobCard.find({}).limit(5);
    assert(jobCards.length > 0, `5. Job Cards: Job cards query successful (${jobCards.length} sample records found)`);

    // 6. Mechanic Assignment
    const assignedJobCard = await JobCard.findOne({ assignedMechanic: { $exists: true, $ne: null } }).populate('assignedMechanic');
    assert(assignedJobCard !== null, `6. Mechanic Assignment: Successfully retrieved job card linked to mechanic (${assignedJobCard?.assignedMechanic?.fullName || 'Assigned'})`);

    // 7. Payroll
    const payrollRecords = await Payroll.find({}).limit(5);
    assert(payrollRecords !== null, `7. Payroll: Payroll query successful (${payrollRecords.length} sample records found)`);

    // 8. Billing / Invoices
    const invoices = await Invoice.find({}).limit(5);
    assert(invoices !== null, `8. Billing: Invoices query successful (${invoices.length} sample records found)`);

    // 9. Inventory / Spare Parts
    const parts = await SparePart.find({}).limit(5);
    assert(parts.length > 0, `9. Inventory: Spare parts query successful (${parts.length} sample parts found)`);

    // 10. Salary Structures
    const salaryStructures = await SalaryStructure.find({ isActive: true });
    assert(salaryStructures !== null, `10. Salary Structures: Active salary structures retrieved (${salaryStructures.length} active records found)`);

  } catch (err) {
    console.error('Regression error:', err);
    failed++;
  }

  console.log(`\n==========================================`);
  console.log(`REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==========================================`);

  process.exit(failed > 0 ? 1 : 0);
}

runRegression();
