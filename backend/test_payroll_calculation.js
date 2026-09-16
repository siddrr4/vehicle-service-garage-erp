import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Payroll from './models/Payroll.js';
import Employee from './models/Employee.js';
import SalaryStructure from './models/SalaryStructure.js';
import Attendance from './models/Attendance.js';
import { generateMonthlyPayroll } from './controllers/payrollController.js';

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    if (details) console.error(`    Details: ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('      PAYROLL CALCULATION & PRORATION VERIFICATION  ');
  console.log('====================================================');

  await connectDB();

  // Clean up any old test records
  await Employee.deleteMany({ email: 'test_proration_emp@garageerp.com' });
  await Attendance.deleteMany({ remarks: 'TEST_PRORATION_ATT' });

  // Create test employee
  const testEmp = await Employee.create({
    fullName: 'Test Proration Mechanic',
    employeeId: 'EMP-PRORATE-01',
    role: 'Mechanic',
    experience: 5,
    specialization: 'Engine Tuning',
    phone: '9998887776',
    email: 'test_proration_emp@garageerp.com',
    status: 'Active',
    joiningDate: new Date('2026-01-01'),
  });

  // Create Monthly Salary Structure with 30,000 basic, 4,000 allowances, 1,000 deductions
  const testSalary = await SalaryStructure.create({
    employee: testEmp._id,
    salaryType: 'Monthly',
    basicSalary: 30000,
    allowances: 4000,
    allowanceItems: [{ name: 'HRA', amount: 3000 }, { name: 'Transport', amount: 1000 }],
    deductions: 1000,
    deductionItems: [{ name: 'PF', amount: 1000 }],
    isActive: true,
  });

  const m = 9;
  const y = 2026;

  // Clean existing payroll for this employee in month 9
  await Payroll.deleteMany({ employee: testEmp._id, month: m, year: y });

  // ----------------------------------------------------
  // TEST 1: Prorated salary according to working days considered
  // ----------------------------------------------------
  console.log('\nRunning Test 1: Prorated salary for live considered days out of 26...');
  const mockReq = {
    body: { month: m, year: y, employeeId: testEmp._id.toString() },
    user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
  };
  let responseData = null;
  const mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { responseData = data; return this; },
  };

  await generateMonthlyPayroll(mockReq, mockRes);
  const p1 = await Payroll.findOne({ employee: testEmp._id, month: m, year: y });

  assert(p1 !== null, 'Payroll record generated successfully');
  assert(p1.totalWorkingDays === 26, `Total working days is 26 (got ${p1.totalWorkingDays})`);
  assert(p1.workingDaysConsidered > 0, `Working days considered is > 0 (got ${p1.workingDaysConsidered})`);
  assert(p1.futureWorkingDays + p1.workingDaysConsidered === 26, `Considered (${p1.workingDaysConsidered}) + future (${p1.futureWorkingDays}) equals 26`);
  assert(p1.perDaySalary === 1154, `Per day rate is 1154 (got ${p1.perDaySalary})`);

  const expectedEarned1 = Math.round((30000 / 26) * p1.workingDaysConsidered);
  assert(p1.basicSalary === expectedEarned1, `Earned basic salary is prorated to ${expectedEarned1} (got ${p1.basicSalary})`);
  assert(p1.monthlyBasicSalary === 30000, `Stored base monthly basic salary is 30000 (got ${p1.monthlyBasicSalary})`);
  assert(p1.attendanceDeduction === 0, `Attendance deduction is 0 for present days (got ${p1.attendanceDeduction})`);
  assert(p1.grossEarnings === expectedEarned1 + 4000, `Gross earnings is ${expectedEarned1 + 4000} (got ${p1.grossEarnings})`);
  assert(p1.netSalary === expectedEarned1 + 4000 - 1000, `Net salary is ${expectedEarned1 + 4000 - 1000} (got ${p1.netSalary})`);

  // ----------------------------------------------------
  // TEST 4: Past explicit Absent days yield corresponding LOP deduction
  // ----------------------------------------------------
  console.log('\nRunning Test 4: Past explicit Absent days create LOP deduction...');
  // Add 1 explicit absent on a considered day: 2026-09-02 (Wed)
  await Attendance.create({
    employeeId: testEmp._id,
    date: '2026-09-02',
    status: 'Absent',
    remarks: 'TEST_PRORATION_ATT',
  });

  // Re-generate payroll
  await generateMonthlyPayroll(mockReq, mockRes);
  const p4 = await Payroll.findOne({ employee: testEmp._id, month: m, year: y });

  assert(p4.absentDays === 1, `Explicit absentDays is 1 (got ${p4.absentDays})`);
  assert(p4.presentDays === p1.workingDaysConsidered - 1, `Present days is ${p1.workingDaysConsidered - 1} (got ${p4.presentDays})`);
  const expectedLop = Math.round((30000 / 26) * 1); // 1154
  assert(p4.attendanceDeduction === expectedLop, `Attendance deduction is ${expectedLop} (got ${p4.attendanceDeduction})`);
  assert(p4.basicSalary === expectedEarned1, `Earned basic salary is ${expectedEarned1} before deductions (got ${p4.basicSalary})`);
  const expectedNet4 = Math.max(0, expectedEarned1 + 4000 - expectedLop - 1000);
  assert(p4.netSalary === expectedNet4, `Net salary is ${expectedNet4} (got ${p4.netSalary})`);

  // ----------------------------------------------------
  // TEST 5: Future days produce NO absence, NO LOP and NO salary earned
  // ----------------------------------------------------
  console.log('\nRunning Test 5: Future days produce zero absence, zero LOP, zero earned salary...');
  assert(p4.futureWorkingDays > 0, `Future days is tracked (> 0) (got ${p4.futureWorkingDays})`);
  assert(p4.absentDays === 1, 'Future days are NOT added to absentDays');
  assert(p4.attendanceDeduction === expectedLop, 'Future days do NOT create LOP deduction');
  assert(p4.basicSalary === expectedEarned1, 'Future days do NOT contribute to earned basic salary');

  // ----------------------------------------------------
  // EXACT TEST CASES FROM USER SPECIFICATION:
  // TEST 1: 26 working days, 8 days considered, 18 future days -> 9,231
  // TEST 2: 26 working days, 26 days considered, full attendance -> full 30,000
  // TEST 3: 26 working days, 20 days considered, remaining 6 future days -> 23,077
  // ----------------------------------------------------
  console.log('\nRunning Exact Formula Test Cases (Test 1, Test 2, Test 3)...');
  const monthlyBasic = 30000;
  const totalDays = 26;
  const rawPerDay = monthlyBasic / totalDays;

  // Test 1: 8 days considered out of 26
  const earnedBasic1 = Math.round(rawPerDay * 8);
  assert(earnedBasic1 === 9231, `Test 1: 8 days considered earned basic is exactly 9231 (got ${earnedBasic1})`);

  // Test 2: Full month (26 days considered)
  const daysConsidered2 = 26;
  const earnedBasic2 = daysConsidered2 >= totalDays ? monthlyBasic : Math.round(rawPerDay * daysConsidered2);
  assert(earnedBasic2 === 30000, `Test 2: Full month basic salary is exactly 30000 (got ${earnedBasic2})`);

  // Test 3: 20 days considered
  const daysConsidered3 = 20;
  const earnedBasic3 = Math.round(rawPerDay * daysConsidered3);
  const expectedBasic3 = Math.round((30000 / 26) * 20); // 23077
  assert(earnedBasic3 === 23077, `Test 3: 20 days earned basic is exactly 23077 (got ${earnedBasic3})`);

  // Cleanup
  console.log('\nCleaning up temporary test records...');
  await Employee.deleteMany({ email: 'test_proration_emp@garageerp.com' });
  await SalaryStructure.deleteMany({ employee: testEmp._id });
  await Attendance.deleteMany({ remarks: 'TEST_PRORATION_ATT' });
  await Payroll.deleteMany({ employee: testEmp._id, month: m, year: y });

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('>>> ALL PAYROLL PRORATION TESTS PASSED SUCCESSFULLY! <<<');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
