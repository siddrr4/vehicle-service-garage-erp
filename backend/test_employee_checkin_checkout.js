import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import { getIndiaDateStr } from './utils/dateUtils.js';
import { checkIn, checkOut } from './controllers/attendanceController.js';
import { getEmployees } from './controllers/employeeController.js';

dotenv.config();

const runTests = async () => {
  console.log('=== STARTING EMPLOYEE CHECK-IN & CHECK-OUT TEST SUITE ===');
  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, desc) => {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
    }
  };

  try {
    await connectDB();
    console.log('  Connected to MongoDB');

    // Find or create test employee
    let testEmp = await Employee.findOne({ role: 'Mechanic', status: 'Active' });
    if (!testEmp) {
      testEmp = await Employee.create({
        fullName: 'Test Mechanic User',
        email: 'test.mechanic@garage.com',
        phone: '9876500000',
        role: 'Mechanic',
        specialization: 'General Repairs',
        experience: 3,
        joiningDate: new Date(),
        status: 'Active',
        availability: 'Available'
      });
    }

    const todayStr = getIndiaDateStr();
    // Clean up any existing attendance for this test employee today
    await Attendance.deleteOne({ employeeId: testEmp._id, date: todayStr });

    const mockAdminUser = { _id: new mongoose.Types.ObjectId(), role: 'admin' };

    // 1. TEST GET EMPLOYEES ENRICHMENT BEFORE CHECK-IN
    console.log('\n--- Test 1: getEmployees before check-in ---');
    let resData = null;
    let resStatus = 200;
    const mockRes = {
      status: (code) => { resStatus = code; return mockRes; },
      json: (data) => { resData = data; return mockRes; }
    };

    await getEmployees({ query: { page: 1, limit: 10 } }, mockRes);
    assert(resData && resData.employees && resData.employees.length > 0, 'getEmployees returns list of employees');
    const targetEmpBefore = resData.employees.find(e => e._id.toString() === testEmp._id.toString());
    assert(targetEmpBefore !== undefined, 'Target employee found in getEmployees');
    assert(targetEmpBefore.todayAttendance !== undefined, 'Employee object has todayAttendance property');
    assert(targetEmpBefore.todayAttendance.checkedIn === false, 'Employee todayAttendance.checkedIn is false before check-in');
    assert(targetEmpBefore.todayAttendance.checkedOut === false, 'Employee todayAttendance.checkedOut is false before check-in');

    // 2. TEST CHECK-IN
    console.log('\n--- Test 2: Admin Check-In employee ---');
    let checkInResData = null;
    let checkInResStatus = 200;
    const mockCheckInRes = {
      status: (code) => { checkInResStatus = code; return mockCheckInRes; },
      json: (data) => { checkInResData = data; return mockCheckInRes; }
    };

    await checkIn({
      body: { employeeId: testEmp._id.toString() },
      user: mockAdminUser
    }, mockCheckInRes);

    assert(checkInResStatus === 201, `checkIn succeeded with HTTP 201 (got ${checkInResStatus})`);
    assert(checkInResData && checkInResData.checkIn !== undefined, 'checkIn returned attendance record with checkIn timestamp');

    // Verify in database
    const attRecord = await Attendance.findOne({ employeeId: testEmp._id, date: todayStr });
    assert(attRecord && attRecord.checkIn !== null, 'Attendance record created in DB with checkIn time');
    assert(attRecord.checkOut == null, 'Attendance record has checkOut as null');

    // 3. TEST GET EMPLOYEES ENRICHMENT AFTER CHECK-IN
    console.log('\n--- Test 3: getEmployees after check-in ---');
    await getEmployees({ query: { page: 1, limit: 10 } }, mockRes);
    const targetEmpAfterCheckIn = resData.employees.find(e => e._id.toString() === testEmp._id.toString());
    assert(targetEmpAfterCheckIn.todayAttendance.checkedIn === true, 'Employee todayAttendance.checkedIn is true');
    assert(targetEmpAfterCheckIn.todayAttendance.checkedOut === false, 'Employee todayAttendance.checkedOut is false');
    assert(targetEmpAfterCheckIn.todayAttendance.checkInTime !== null, 'Employee checkInTime is present');

    // 4. TEST CHECK-OUT
    console.log('\n--- Test 4: Admin Check-Out employee ---');
    let checkOutResData = null;
    let checkOutResStatus = 200;
    const mockCheckOutRes = {
      status: (code) => { checkOutResStatus = code; return mockCheckOutRes; },
      json: (data) => { checkOutResData = data; return mockCheckOutRes; }
    };

    await checkOut({
      body: { employeeId: testEmp._id.toString() },
      user: mockAdminUser
    }, mockCheckOutRes);

    assert(checkOutResStatus === 200, `checkOut succeeded with HTTP 200 (got ${checkOutResStatus})`);
    assert(checkOutResData && checkOutResData.checkOut !== undefined, 'checkOut returned attendance record with checkOut timestamp');

    // 5. TEST GET EMPLOYEES ENRICHMENT AFTER CHECK-OUT
    console.log('\n--- Test 5: getEmployees after check-out ---');
    await getEmployees({ query: { page: 1, limit: 10 } }, mockRes);
    const targetEmpAfterCheckOut = resData.employees.find(e => e._id.toString() === testEmp._id.toString());
    assert(targetEmpAfterCheckOut.todayAttendance.checkedIn === true, 'Employee todayAttendance.checkedIn is true');
    assert(targetEmpAfterCheckOut.todayAttendance.checkedOut === true, 'Employee todayAttendance.checkedOut is true');
    assert(targetEmpAfterCheckOut.todayAttendance.checkOutTime !== null, 'Employee checkOutTime is present');

    // 6. TEST RE-CHECK-IN
    console.log('\n--- Test 6: Re-check in when shift was completed ---');
    let reCheckInResData = null;
    let reCheckInResStatus = 200;
    const mockReCheckInRes = {
      status: (code) => { reCheckInResStatus = code; return mockReCheckInRes; },
      json: (data) => { reCheckInResData = data; return mockReCheckInRes; }
    };

    await checkIn({
      body: { employeeId: testEmp._id.toString() },
      user: mockAdminUser
    }, mockReCheckInRes);

    assert(reCheckInResStatus === 201, `Re-checkIn succeeded with HTTP 201 (got ${reCheckInResStatus})`);
    assert(reCheckInResData.checkOut == null, 'Re-checkIn cleared checkOut timestamp');

    // Clean up
    await Attendance.deleteOne({ employeeId: testEmp._id, date: todayStr });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Test error:', err);
  }

  console.log(`\n=== TEST COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
};

runTests();
