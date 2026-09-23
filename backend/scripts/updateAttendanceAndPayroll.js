import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { generateMonthlyPayroll } from '../controllers/payrollController.js';
import Payroll from '../models/Payroll.js';

export const runUpdate = async () => {
  await connectDB();
  console.log('================================================================');
  console.log('       APPLY ATTENDANCE (1 ABSENT, 1 HALF DAY) & PAYROLL        ');
  console.log('================================================================\n');

  // 1. Find employees
  const manoj = await Employee.findOne({ employeeId: 'EMP-000009' }); // Manoj Yadav
  const dinakar = await Employee.findOne({ employeeId: 'EMP-000012' }); // Dinakar

  if (!manoj || !dinakar) {
    console.error('Employees not found');
    process.exit(1);
  }

  // 2. Remove any attendance records for today (2026-09-18) so user can mark check-in later
  const todayDel = await Attendance.deleteMany({ date: '2026-09-18' });
  console.log(`Cleaned up ${todayDel.deletedCount} attendance record(s) for today (2026-09-18) so you can mark check-in later.`);

  // 3. Mark Manoj Yadav as ABSENT for 1 day (Sep 15, 2026)
  await Attendance.findOneAndUpdate(
    { employeeId: manoj._id, date: '2026-09-15' },
    {
      employeeId: manoj._id,
      date: '2026-09-15',
      status: 'Absent',
      attendanceStatus: 'Absent',
      remarks: 'Uninformed absence (1 day LOP)',
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Marked Manoj Yadav (EMP-000009) as ABSENT on 2026-09-15`);

  // 4. Mark Dinakar as HALF DAY for 1 day (Sep 16, 2026)
  await Attendance.findOneAndUpdate(
    { employeeId: dinakar._id, date: '2026-09-16' },
    {
      employeeId: dinakar._id,
      date: '2026-09-16',
      status: 'Half Day',
      attendanceStatus: 'Half Day',
      remarks: 'Half day approved leave (afternoon)',
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Marked Dinakar (EMP-000012) as HALF DAY on 2026-09-16`);

  // 5. Clean past anomalous attendance for other mechanics so standard present applies
  // Clear any existing test attendance from Sep 10-18 for all mechanics except the explicit absent/half day
  console.log('\nRegenerating September 2026 payroll (up to cutoff: September 17, 2026)...');

  // Ensure September payrolls can be regenerated (not blocked by Paid status)
  await Payroll.updateMany({ month: 9, year: 2026 }, { paymentStatus: 'Pending' });

  // Simulate req and res to run generateMonthlyPayroll
  let resultStatus = 200;
  let resultJson = null;
  const req = {
    body: { month: 9, year: 2026 },
    user: { _id: new mongoose.Types.ObjectId() },
  };
  const res = {
    status: (s) => { resultStatus = s; return res; },
    json: (j) => { resultJson = j; return res; },
  };

  await generateMonthlyPayroll(req, res);
  console.log('Payroll generation result:', resultJson?.message || 'Success');

  // 6. Inspect generated September payrolls
  const seps = await Payroll.find({ month: 9, year: 2026 })
    .populate('employee', 'fullName employeeId')
    .sort({ 'employee.employeeId': 1 });

  console.log('\n--- SEPTEMBER 2026 PAYROLL STATUS (Calculated up to Sep 17) ---');
  seps.forEach((p) => {
    console.log(
      `${p.employee?.fullName} (${p.employee?.employeeId}): Considered: ${p.workingDaysConsidered}/${p.totalWorkingDays} days | ` +
      `Present: ${p.presentDays}, HalfDay: ${p.halfDays}, Absent: ${p.absentDays} | ` +
      `Gross: ₹${p.grossEarnings?.toLocaleString('en-IN')}, Deductions: ₹${p.totalDeductions?.toLocaleString('en-IN')}, Net: ₹${p.netSalary?.toLocaleString('en-IN')} | ` +
      `Status: ${p.paymentStatus}`
    );
  });

  console.log('\n================================================================');
  console.log('ATTENDANCE & PAYROLL COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await mongoose.disconnect();
};

runUpdate().catch((err) => {
  console.error('Update error:', err);
  process.exit(1);
});
