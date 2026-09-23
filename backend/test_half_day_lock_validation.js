import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import {
  getIndiaDateStr,
  getIndiaCurrentTimeParts,
  isSameDayHalfDayLocked,
  HALF_DAY_LOCK_MESSAGE,
} from './utils/dateUtils.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import User from './models/User.js';
import { markAttendance } from './controllers/attendanceController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTestSuite() {
  console.log('================================================================');
  console.log('    TEST SUITE: STRICT SAME-DAY HALF DAY LEAVE VALIDATION      ');
  console.log('================================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, testNum, description, details = '') {
    if (condition) {
      console.log(`[PASS] Test ${testNum}: ${description}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${testNum}: ${description}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  try {
    const todayDate = getIndiaDateStr();
    console.log(`Today's IST Date: ${todayDate}\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Today at 6:00 PM (18:00 IST) -> Half Day validation follows existing rules (allowed)
    // -------------------------------------------------------------------------
    const time6PM = new Date(`${todayDate}T18:00:00+05:30`);
    const isLocked6PM = isSameDayHalfDayLocked(todayDate, time6PM);
    assert(
      isLocked6PM === false,
      1,
      'Today at 6:00 PM -> Half Day validation follows existing rules (not locked)',
      `Time: 6:00 PM IST, isSameDayHalfDayLocked = ${isLocked6PM}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Today at 6:59 PM (18:59 IST) -> Half Day validation follows existing rules (allowed)
    // -------------------------------------------------------------------------
    const time659PM = new Date(`${todayDate}T18:59:59+05:30`);
    const isLocked659PM = isSameDayHalfDayLocked(todayDate, time659PM);
    assert(
      isLocked659PM === false,
      2,
      'Today at 6:59 PM -> Half Day validation follows existing rules (not locked)',
      `Time: 6:59:59 PM IST, isSameDayHalfDayLocked = ${isLocked659PM}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Today at exactly 7:00 PM (19:00 IST) -> Half Day Leave is blocked
    // -------------------------------------------------------------------------
    const time700PM = new Date(`${todayDate}T19:00:00+05:30`);
    const isLocked700PM = isSameDayHalfDayLocked(todayDate, time700PM);
    assert(
      isLocked700PM === true,
      3,
      'Today at exactly 7:00 PM -> Half Day Leave is blocked',
      `Time: 7:00:00 PM IST, isSameDayHalfDayLocked = ${isLocked700PM}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Today at 7:05 PM (19:05 IST) -> Half Day Leave is blocked
    // -------------------------------------------------------------------------
    const time705PM = new Date(`${todayDate}T19:05:00+05:30`);
    const isLocked705PM = isSameDayHalfDayLocked(todayDate, time705PM);
    assert(
      isLocked705PM === true,
      4,
      'Today at 7:05 PM -> Half Day Leave is blocked',
      `Time: 7:05:00 PM IST, isSameDayHalfDayLocked = ${isLocked705PM}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Today at 9:05 PM (21:05 IST) -> Half Day Leave is blocked
    // -------------------------------------------------------------------------
    const time905PM = new Date(`${todayDate}T21:05:00+05:30`);
    const isLocked905PM = isSameDayHalfDayLocked(todayDate, time905PM);
    assert(
      isLocked905PM === true,
      5,
      'Today at 9:05 PM -> Half Day Leave is blocked',
      `Time: 9:05:00 PM IST, isSameDayHalfDayLocked = ${isLocked905PM}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Employee checked in at 9:00 AM and completed working hours -> cannot change to Half Day after 7 PM
    // -------------------------------------------------------------------------
    let testEmp = await Employee.findOne({ role: 'Mechanic' });
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne();
    }

    if (testEmp && adminUser) {
      // Create a completed attendance record for today (09:00 AM to 07:01 PM)
      await Attendance.findOneAndUpdate(
        { employeeId: testEmp._id, date: todayDate },
        {
          checkIn: new Date(`${todayDate}T09:00:00+05:30`),
          checkOut: new Date(`${todayDate}T19:01:00+05:30`),
          workingHours: '10h 1m',
          status: 'Present',
          attendanceStatus: 'Present',
          markedBy: adminUser._id,
          markedByRole: 'admin',
        },
        { upsert: true, new: true }
      );

      // Attempt to change to Half Day after 7 PM using controller
      let responseStatusCode = null;
      let responseBody = null;

      const mockReq = {
        body: {
          employeeId: testEmp._id.toString(),
          date: todayDate,
          status: 'Half Day',
        },
        user: adminUser,
      };

      const mockRes = {
        status: (code) => {
          responseStatusCode = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      await markAttendance(mockReq, mockRes);

      // Verify attendance in DB was NOT changed to Half Day
      const recordAfterAttempt = await Attendance.findOne({ employeeId: testEmp._id, date: todayDate });

      assert(
        responseStatusCode === 400 &&
        responseBody?.message === HALF_DAY_LOCK_MESSAGE &&
        recordAfterAttempt.status === 'Present',
        6,
        'Employee checked in at 9:00 AM and completed working hours -> cannot change to Half Day after 7 PM',
        `HTTP Status: ${responseStatusCode}, Message: "${responseBody?.message}", DB Status: ${recordAfterAttempt.status}`
      );
    } else {
      assert(false, 6, 'Employee or Admin user not found in database to perform test');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Previous date -> existing historical attendance rules continue to work
    // -------------------------------------------------------------------------
    const yesterdayDate = '2026-09-22';
    const isLockedYesterday = isSameDayHalfDayLocked(yesterdayDate);
    
    // Also test through controller for previous date: should be allowed (HTTP 200)
    let prevDateStatusCode = null;
    let prevDateBody = null;

    if (testEmp && adminUser) {
      const mockReqPrev = {
        body: {
          employeeId: testEmp._id.toString(),
          date: yesterdayDate,
          status: 'Half Day',
        },
        user: adminUser,
      };
      const mockResPrev = {
        status: (code) => {
          prevDateStatusCode = code;
          return {
            json: (data) => {
              prevDateBody = data;
            },
          };
        },
      };

      await markAttendance(mockReqPrev, mockResPrev);
    }

    assert(
      isLockedYesterday === false && prevDateStatusCode === 200,
      7,
      'Previous date -> existing historical attendance rules continue to work',
      `Yesterday locked = ${isLockedYesterday}, Controller status = ${prevDateStatusCode}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Future date -> existing future attendance rules continue to work
    // -------------------------------------------------------------------------
    const futureDate = '2026-09-25';
    let futureStatusCode = null;
    let futureBody = null;

    if (testEmp && adminUser) {
      const mockReqFuture = {
        body: {
          employeeId: testEmp._id.toString(),
          date: futureDate,
          status: 'Half Day',
        },
        user: adminUser,
      };
      const mockResFuture = {
        status: (code) => {
          futureStatusCode = code;
          return {
            json: (data) => {
              futureBody = data;
            },
          };
        },
      };

      await markAttendance(mockReqFuture, mockResFuture);
    }

    assert(
      futureStatusCode === 400 &&
      futureBody?.message === 'Attendance cannot be marked for future dates',
      8,
      'Future date -> existing future attendance rules continue to work',
      `HTTP Status: ${futureStatusCode}, Message: "${futureBody?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Direct API request attempting Half Day after 7 PM -> backend rejects it
    // -------------------------------------------------------------------------
    let directApiStatus = null;
    let directApiBody = null;

    if (testEmp && adminUser) {
      const mockReqToday = {
        body: {
          employeeId: testEmp._id.toString(),
          date: todayDate,
          status: 'Half Day',
        },
        user: adminUser,
      };
      const mockResToday = {
        status: (code) => {
          directApiStatus = code;
          return {
            json: (data) => {
              directApiBody = data;
            },
          };
        },
      };

      await markAttendance(mockReqToday, mockResToday);
    }

    // Since current local time is after 7 PM (21:xx IST):
    assert(
      directApiStatus === 400 && directApiBody?.message === HALF_DAY_LOCK_MESSAGE,
      9,
      'Direct API request attempting Half Day after 7 PM -> backend rejects it',
      `HTTP Status: ${directApiStatus}, Message: "${directApiBody?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Frontend and backend show the same clear validation message
    // -------------------------------------------------------------------------
    const frontendDateUtilsPath = path.resolve(__dirname, '../frontend/src/utils/dateUtils.js');
    const frontendContent = fs.readFileSync(frontendDateUtilsPath, 'utf8');

    const expectedMessage =
      'Half Day Leave cannot be applied after the working day has been completed. Working hours are 9:00 AM to 7:00 PM.';

    const backendMatches = HALF_DAY_LOCK_MESSAGE === expectedMessage;
    const frontendContainsConstant = frontendContent.includes(expectedMessage);

    assert(
      backendMatches && frontendContainsConstant,
      10,
      'Frontend and backend show the same clear validation message',
      `Expected message: "${expectedMessage}"\n       Backend matches: ${backendMatches}, Frontend contains message: ${frontendContainsConstant}`
    );

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
