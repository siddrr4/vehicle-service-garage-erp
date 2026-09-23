import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import User from './models/User.js';
import JobCard from './models/JobCard.js';
import { getIndiaDateStr, formatTimeIST, TIMEZONE } from './utils/dateUtils.js';
import { checkIn, checkOut, getTodayMechanicAvailability, getTodayAttendance } from './controllers/attendanceController.js';
import { getEmployees, getActiveMechanics } from './controllers/employeeController.js';
import { calculateSlotCapacity } from './controllers/appointmentController.js';

dotenv.config();

const runTestSuite = async () => {
  console.log('================================================================');
  console.log('  ATTENDANCE <-> EMPLOYEE MANAGEMENT SYNCHRONIZATION TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      if (details) console.log(`         -> ${details}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title}`);
      if (details) console.error(`         -> ${details}`);
      failed++;
    }
  };

  try {
    await connectDB();
    console.log('  Connected to MongoDB\n');

    const todayStr = getIndiaDateStr();
    console.log(`  Current Date (IST): ${todayStr}`);
    console.log(`  Timezone configured: ${TIMEZONE}\n`);

    // 1. Setup a dedicated test mechanic
    let testMechanic = await Employee.findOne({ email: 'sync.test.mech@garage.com' });
    if (!testMechanic) {
      testMechanic = await Employee.create({
        fullName: 'Keerthan SyncTest',
        email: 'sync.test.mech@garage.com',
        phone: '9988776655',
        role: 'Mechanic',
        specialization: 'Engine Tuning',
        experience: 4,
        joiningDate: new Date(),
        status: 'Active',
        availability: 'Available',
      });
    } else {
      testMechanic.status = 'Active';
      testMechanic.availability = 'Available';
      await testMechanic.save();
    }

    const mockAdminUser = { _id: new mongoose.Types.ObjectId(), role: 'admin' };

    // Clean up any existing attendance and job cards for this mechanic today
    await Attendance.deleteMany({ employeeId: testMechanic._id, date: todayStr });
    await JobCard.deleteMany({ assignedMechanic: testMechanic._id });

    // Helper to call getEmployees and find our test mechanic
    const fetchMechanicInEmployeeList = async () => {
      let result = null;
      const mockRes = {
        status(code) { this.statusCode = code; return this; },
        json(data) { result = data; return this; },
      };
      await getEmployees({ query: { keyword: 'Keerthan SyncTest', page: 1, limit: 10 } }, mockRes);
      return result?.employees?.find((e) => e._id.toString() === testMechanic._id.toString());
    };

    // =========================================================================
    // TEST 1: Employee has no attendance record -> "Not Checked In"
    // =========================================================================
    console.log('--- Test 1: Employee has no attendance record ---');
    const empT1 = await fetchMechanicInEmployeeList();
    assert(
      empT1 &&
      empT1.todayAttendance &&
      empT1.todayAttendance.checkedIn === false &&
      empT1.todayAttendance.checkedOut === false &&
      empT1.todayAttendance.status === 'Not Checked In',
      'Test 1: Employee Management displays "Not Checked In"',
      `checkedIn: ${empT1?.todayAttendance?.checkedIn}, status: "${empT1?.todayAttendance?.status}"`
    );

    // =========================================================================
    // TEST 2: Check in employee from Attendance -> "Checked In (actual time)"
    // =========================================================================
    console.log('\n--- Test 2: Check in employee from Attendance ---');
    let checkInRes = null;
    const mockCheckInRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { checkInRes = data; return this; },
    };

    await checkIn({ body: { employeeId: testMechanic._id.toString() }, user: mockAdminUser }, mockCheckInRes);

    const empT2 = await fetchMechanicInEmployeeList();
    const formattedCheckIn = formatTimeIST(empT2?.todayAttendance?.checkInTime);
    assert(
      empT2 &&
      empT2.todayAttendance &&
      empT2.todayAttendance.checkedIn === true &&
      empT2.todayAttendance.checkedOut === false &&
      empT2.todayAttendance.checkInTime !== null,
      `Test 2: Employee Management reflects "Checked In (${formattedCheckIn})"`,
      `checkedIn: ${empT2?.todayAttendance?.checkedIn}, checkInTime: ${empT2?.todayAttendance?.checkInTime}`
    );

    // =========================================================================
    // TEST 3: Refresh browser (refetch from DB) -> still "Checked In"
    // =========================================================================
    console.log('\n--- Test 3: Refresh browser / refetch from backend ---');
    const empT3 = await fetchMechanicInEmployeeList();
    assert(
      empT3 &&
      empT3.todayAttendance &&
      empT3.todayAttendance.checkedIn === true &&
      empT3.todayAttendance.checkedOut === false,
      'Test 3: After refresh, Employee Management still shows "Checked In"',
      `Persisted in MongoDB: checkedIn: ${empT3?.todayAttendance?.checkedIn}`
    );

    // =========================================================================
    // TEST 4: Check out employee -> "Checked Out (actual time)"
    // =========================================================================
    console.log('\n--- Test 4: Check out employee ---');
    let checkOutRes = null;
    const mockCheckOutRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { checkOutRes = data; return this; },
    };

    await checkOut({ body: { employeeId: testMechanic._id.toString() }, user: mockAdminUser }, mockCheckOutRes);

    const empT4 = await fetchMechanicInEmployeeList();
    const formattedCheckOut = formatTimeIST(empT4?.todayAttendance?.checkOutTime);
    assert(
      empT4 &&
      empT4.todayAttendance &&
      empT4.todayAttendance.checkedOut === true &&
      empT4.todayAttendance.checkOutTime !== null,
      `Test 4: Employee Management reflects "Checked Out (${formattedCheckOut})"`,
      `checkedOut: ${empT4?.todayAttendance?.checkedOut}, checkOutTime: ${empT4?.todayAttendance?.checkOutTime}`
    );

    // =========================================================================
    // TEST 5: Refresh browser -> status remains "Checked Out"
    // =========================================================================
    console.log('\n--- Test 5: Refresh browser / refetch from backend ---');
    const empT5 = await fetchMechanicInEmployeeList();
    assert(
      empT5 &&
      empT5.todayAttendance &&
      empT5.todayAttendance.checkedOut === true,
      'Test 5: Status remains "Checked Out" after browser refresh',
      `Persisted in MongoDB: checkedOut: ${empT5?.todayAttendance?.checkedOut}`
    );

    // =========================================================================
    // TEST 6: Mechanic checked in -> Capacity counts the mechanic
    // =========================================================================
    console.log('\n--- Test 6: Mechanic checked in -> Capacity counts the mechanic ---');
    // Re-check in the mechanic (clear checkOut to simulate active check-in)
    await checkIn({ body: { employeeId: testMechanic._id.toString() }, user: mockAdminUser }, mockCheckInRes);

    const capWithCheckIn = await calculateSlotCapacity(todayStr);

    let mechAvailRes6 = null;
    const mockMechRes6 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { mechAvailRes6 = data; return this; },
    };
    await getTodayMechanicAvailability({}, mockMechRes6);
    const mechItem6 = mechAvailRes6?.mechanics?.find((m) => m._id.toString() === testMechanic._id.toString());

    assert(
      mechItem6 &&
      mechItem6.status === 'Available' &&
      capWithCheckIn.checkedInMechanics >= 1,
      'Test 6: Mechanic checked in is counted in Capacity and marked Available',
      `Capacity checkedInMechanics: ${capWithCheckIn.checkedInMechanics}, Mechanic Status: "${mechItem6?.status}"`
    );

    // =========================================================================
    // TEST 7: Mechanic checked out -> Capacity does NOT count the mechanic
    // =========================================================================
    console.log('\n--- Test 7: Mechanic checked out -> Capacity does NOT count the mechanic ---');
    await checkOut({ body: { employeeId: testMechanic._id.toString() }, user: mockAdminUser }, mockCheckOutRes);

    const capWithCheckOut = await calculateSlotCapacity(todayStr);

    let mechAvailRes7 = null;
    const mockMechRes7 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { mechAvailRes7 = data; return this; },
    };
    await getTodayMechanicAvailability({}, mockMechRes7);
    const mechItem7 = mechAvailRes7?.mechanics?.find((m) => m._id.toString() === testMechanic._id.toString());

    assert(
      mechItem7 &&
      mechItem7.status === 'Checked Out' &&
      capWithCheckOut.checkedInMechanics < capWithCheckIn.checkedInMechanics,
      'Test 7: Checked-out mechanic is NOT counted in capacity',
      `Checked-in count reduced from ${capWithCheckIn.checkedInMechanics} to ${capWithCheckOut.checkedInMechanics}, Mechanic Status: "${mechItem7?.status}"`
    );

    // =========================================================================
    // TEST 8: Employee logs into ERP but does not check in -> Mechanic NOT available
    // =========================================================================
    console.log('\n--- Test 8: Employee logs into ERP without checking in ---');
    // Clear attendance for today completely
    await Attendance.deleteOne({ employeeId: testMechanic._id, date: todayStr });

    // User is active and logged in
    let mechAvailRes8 = null;
    const mockMechRes8 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { mechAvailRes8 = data; return this; },
    };
    await getTodayMechanicAvailability({}, mockMechRes8);
    const mechItem8 = mechAvailRes8?.mechanics?.find((m) => m._id.toString() === testMechanic._id.toString());

    assert(
      mechItem8 &&
      mechItem8.status === 'Not Checked In',
      'Test 8: Active mechanic without attendance check-in is NOT available',
      `Mechanic Status: "${mechItem8?.status}" (Never Available without check-in)`
    );

    // =========================================================================
    // TEST 9: Payroll sees past day without explicit attendance -> Default Present
    //         BUT mechanic availability for today remains NOT CHECKED IN
    // =========================================================================
    console.log('\n--- Test 9: Payroll rule vs Mechanic Availability ---');
    // Ensure no attendance record today for test mechanic
    await Attendance.deleteOne({ employeeId: testMechanic._id, date: todayStr });

    // Verify today's mechanic availability remains NOT CHECKED IN
    let mechAvailRes9 = null;
    const mockMechRes9 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { mechAvailRes9 = data; return this; },
    };
    await getTodayMechanicAvailability({}, mockMechRes9);
    const mechItem9 = mechAvailRes9?.mechanics?.find((m) => m._id.toString() === testMechanic._id.toString());

    assert(
      mechItem9 && mechItem9.status === 'Not Checked In',
      'Test 9: Mechanic availability today is strictly NOT CHECKED IN even though payroll supports past default Present',
      `Today status: "${mechItem9?.status}"`
    );

    // =========================================================================
    // TEST 10: Verify all times and dates use IST (Asia/Kolkata)
    // =========================================================================
    console.log('\n--- Test 10: Verify all times and dates use IST (Asia/Kolkata) ---');
    const now = new Date();
    const formatterIST = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const expectedTodayIST = formatterIST.format(now);
    const generatedDateStr = getIndiaDateStr(now);

    assert(
      generatedDateStr === expectedTodayIST,
      'Test 10: Attendance date strictly matches Asia/Kolkata calendar date',
      `Generated: ${generatedDateStr}, Expected IST: ${expectedTodayIST}`
    );

    // Clean up test data
    await Attendance.deleteMany({ employeeId: testMechanic._id, date: todayStr });
    await Employee.deleteOne({ _id: testMechanic._id });

    console.log('\n================================================================');
    console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
};

runTestSuite();
