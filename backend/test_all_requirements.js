import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import SalaryStructure from './models/SalaryStructure.js';
import Attendance from './models/Attendance.js';
import JobCard from './models/JobCard.js';
import Appointment from './models/Appointment.js';
import { createSalaryStructure } from './controllers/salaryController.js';
import { calculateSlotCapacity } from './controllers/appointmentController.js';

// Mock Express req and res helper
const createMockReqRes = (body = {}, params = {}, query = {}, user = {}) => {
  let statusCode = 200;
  let responseData = null;

  const req = {
    body,
    params,
    query,
    user: user._id ? user : { _id: '6a72c83ba82d50f76bd15ee7', role: 'admin' },
  };

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    send: (data) => {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
};

async function runTests() {
  console.log('========================================================');
  console.log('   VEHICLE ERP: SALARY & CAPACITY TEST SUITE           ');
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

  // Find an existing employee to test with
  const testEmp = await Employee.findOne({ role: 'Mechanic', status: 'Active' });
  if (!testEmp) {
    console.error('No active mechanic employee found to run tests!');
    process.exit(1);
  }
  console.log(`Using test employee: ${testEmp.fullName} (${testEmp._id})`);

  // Track created salary structures to clean up
  const createdSalaryStructureIds = [];

  // Track state to restore
  const testDate = '2026-09-09';
  const activeMechanics = await Employee.find({ role: 'Mechanic', status: 'Active' });
  console.log(`Found ${activeMechanics.length} active mechanics in database.`);
  const mechIds = activeMechanics.map(m => m._id);

  // Save existing attendance for testDate
  const originalAttendance = await Attendance.find({ date: testDate, employeeId: { $in: mechIds } });
  
  // Save existing active job cards to restore their original status
  const existingActiveJobCards = await JobCard.find({
    status: { $in: ['Open', 'In Progress', 'Waiting for Parts', 'Assigned', 'Pending'] },
    assignedMechanic: { $in: mechIds }
  });
  console.log(`Temporarily stashing ${existingActiveJobCards.length} active Job Cards in DB during test run...`);

  const tempJobCardIds = [];

  try {
    // Temporarily mark existing active job cards as 'Delivered' so we have a clean slate for capacity tests
    for (const jc of existingActiveJobCards) {
      await JobCard.findByIdAndUpdate(jc._id, { status: 'Delivered' });
    }

    // ==========================================
    // PART 1: SALARY TESTS
    // ==========================================
    console.log('\n--- PART 1: SALARY TESTS ---');

    // Salary Test 1: Create a valid salary structure
    {
      const { req, res } = createMockReqRes({
        employee: testEmp._id.toString(),
        salaryType: 'Monthly',
        basicSalary: 35000,
        allowances: [{ name: 'HRA', amount: 5000 }, { name: 'Transport', amount: 2000 }],
        deductions: [{ name: 'PF', amount: 1800 }, { name: 'Tax', amount: 1200 }],
        effectiveDate: '2026-09-01',
        isActive: true,
        remarks: 'Test salary structure 1',
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 201 && data && data.basicSalary === 35000 && data.allowances === 7000 && data.deductions === 3000,
        `Salary Test 1: Valid salary structure created successfully (Status: ${code}, Basic: ${data?.basicSalary}, Allowances: ${data?.allowances}, Deductions: ${data?.deductions})`
      );
      if (data?._id) createdSalaryStructureIds.push(data._id);
    }

    // Salary Test 2: Try negative basic salary
    {
      const { req, res } = createMockReqRes({
        employee: testEmp._id.toString(),
        salaryType: 'Monthly',
        basicSalary: -10000,
        effectiveDate: '2026-09-01',
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 400 && data?.message?.includes('cannot be negative'),
        `Salary Test 2: Negative basic salary correctly rejected (Status: ${code}, Message: "${data?.message}")`
      );
    }

    // Salary Test 3: Try missing employee
    {
      const { req, res } = createMockReqRes({
        salaryType: 'Monthly',
        basicSalary: 25000,
        effectiveDate: '2026-09-01',
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 400 && data?.message?.includes('Employee is required'),
        `Salary Test 3: Missing employee correctly rejected (Status: ${code}, Message: "${data?.message}")`
      );
    }

    // Salary Test 4: Try duplicate active salary structure
    {
      // Create a second active salary structure for testEmp with later date
      const { req, res } = createMockReqRes({
        employee: testEmp._id.toString(),
        salaryType: 'Monthly',
        basicSalary: 42000,
        allowances: 4000,
        deductions: 2000,
        effectiveDate: '2026-10-01',
        isActive: true,
        remarks: 'Test salary structure 2 (newer promotion)',
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();
      if (data?._id) createdSalaryStructureIds.push(data._id);

      // Verify in DB that only 1 structure is active for this employee
      const activeStructures = await SalaryStructure.find({ employee: testEmp._id, isActive: true });
      const allStructures = await SalaryStructure.find({ employee: testEmp._id, _id: { $in: createdSalaryStructureIds } });

      assert(
        code === 201 && activeStructures.length === 1 && activeStructures[0]._id.toString() === data._id.toString() && allStructures.length === 2,
        `Salary Test 4: Prevent duplicate active salary structure (Active count: ${activeStructures.length}, Total preserved historical records: ${allStructures.length})`
      );
    }

    // ==========================================
    // PART 2: CAPACITY TESTS
    // ==========================================
    console.log('\n--- PART 2: CAPACITY TESTS ---');

    // Helper to clear today's test state
    const resetTestAttendance = async () => {
      await Attendance.deleteMany({ date: testDate, employeeId: { $in: mechIds } });
      await JobCard.deleteMany({ _id: { $in: tempJobCardIds } });
      tempJobCardIds.length = 0;
    };

    // Capacity Test 1: No mechanics checked in
    {
      await resetTestAttendance();

      const result = await calculateSlotCapacity(testDate);
      const sampleSlot = result.slots[0];

      assert(
        result.capacityPerSlot === 0 && sampleSlot.capacity === 0 && sampleSlot.available === 0 && sampleSlot.status === 'No Capacity',
        `Capacity Test 1: No mechanics checked in -> capacity = 0, "No Capacity" (Got capacityPerSlot: ${result.capacityPerSlot}, slot status: "${sampleSlot.status}", NOT 5)`
      );
    }

    // Capacity Test 2: 6 checked-in mechanics, 0 busy
    {
      await resetTestAttendance();

      const test6Mechs = activeMechanics.slice(0, 6);
      for (const m of test6Mechs) {
        await Attendance.create({
          employeeId: m._id,
          date: testDate,
          checkIn: new Date('2026-09-09T09:00:00.000Z'),
          checkOut: null,
          status: 'Present',
        });
      }

      const result = await calculateSlotCapacity(testDate);
      const sampleSlot = result.slots[0];

      assert(
        result.capacityPerSlot === 6 && sampleSlot.capacity === 6 && sampleSlot.status === 'Available',
        `Capacity Test 2: 6 checked-in mechanics + none busy -> capacity = 6 (Got capacityPerSlot: ${result.capacityPerSlot}, slot status: "${sampleSlot.status}")`
      );
    }

    // Capacity Test 3: 6 checked-in mechanics + 2 busy
    {
      const test6Mechs = activeMechanics.slice(0, 6);
      const busyMech1 = test6Mechs[0];
      const busyMech2 = test6Mechs[1];

      const jc1 = await JobCard.create({
        jobCardNumber: `JC-TEST-${Date.now()}-1`,
        customer: busyMech1._id,
        vehicle: busyMech1._id,
        serviceRequest: busyMech1._id,
        assignedMechanic: busyMech1._id,
        complaint: 'Engine oil change and filter inspection',
        status: 'In Progress',
      });
      tempJobCardIds.push(jc1._id);

      const jc2 = await JobCard.create({
        jobCardNumber: `JC-TEST-${Date.now()}-2`,
        customer: busyMech2._id,
        vehicle: busyMech2._id,
        serviceRequest: busyMech2._id,
        assignedMechanic: busyMech2._id,
        complaint: 'Brake pad replacement and wheel alignment',
        status: 'Assigned',
      });
      tempJobCardIds.push(jc2._id);

      const result = await calculateSlotCapacity(testDate);
      const sampleSlot = result.slots[0];

      assert(
        result.capacityPerSlot === 4 && sampleSlot.capacity === 4,
        `Capacity Test 3: 6 checked-in mechanics + 2 busy -> capacity = 4 (Got capacityPerSlot: ${result.capacityPerSlot})`
      );
    }

    // Capacity Test 4: Mechanic checked out -> not counted
    {
      await resetTestAttendance();

      // Check in 6 mechanics, but 1 has checked out
      const test6Mechs = activeMechanics.slice(0, 6);
      for (let i = 0; i < 5; i++) {
        await Attendance.create({
          employeeId: test6Mechs[i]._id,
          date: testDate,
          checkIn: new Date('2026-09-09T09:00:00.000Z'),
          checkOut: null,
          status: 'Present',
        });
      }
      // 6th mechanic checked out
      await Attendance.create({
        employeeId: test6Mechs[5]._id,
        date: testDate,
        checkIn: new Date('2026-09-09T09:00:00.000Z'),
        checkOut: new Date('2026-09-09T13:00:00.000Z'),
        status: 'Present',
      });

      const result = await calculateSlotCapacity(testDate);
      assert(
        result.capacityPerSlot === 5,
        `Capacity Test 4: Mechanic checked out -> not counted in capacity (Got capacityPerSlot: ${result.capacityPerSlot}, expected 5)`
      );
    }

    // Capacity Test 5: Mechanic on Leave -> not counted
    {
      await resetTestAttendance();

      const test6Mechs = activeMechanics.slice(0, 6);
      for (let i = 0; i < 5; i++) {
        await Attendance.create({
          employeeId: test6Mechs[i]._id,
          date: testDate,
          checkIn: new Date('2026-09-09T09:00:00.000Z'),
          checkOut: null,
          status: 'Present',
        });
      }
      // 6th mechanic on Leave
      await Attendance.create({
        employeeId: test6Mechs[5]._id,
        date: testDate,
        checkIn: new Date('2026-09-09T09:00:00.000Z'),
        checkOut: null,
        status: 'Leave',
      });

      const result = await calculateSlotCapacity(testDate);
      assert(
        result.capacityPerSlot === 5,
        `Capacity Test 5: Mechanic on Leave -> not counted in capacity (Got capacityPerSlot: ${result.capacityPerSlot}, expected 5)`
      );
    }

    // Capacity Test 6: Mechanic is Present & checked in but assigned to an active Job Card
    {
      await resetTestAttendance();

      // Only 1 mechanic is checked in
      const mech = activeMechanics[0];
      await Attendance.create({
        employeeId: mech._id,
        date: testDate,
        checkIn: new Date('2026-09-09T09:00:00.000Z'),
        checkOut: null,
        status: 'Present',
      });

      // That mechanic is assigned to an active Job Card
      const jc = await JobCard.create({
        jobCardNumber: `JC-TEST-${Date.now()}-BUSY`,
        customer: mech._id,
        vehicle: mech._id,
        serviceRequest: mech._id,
        assignedMechanic: mech._id,
        complaint: 'Clutch plate overhaul',
        status: 'In Progress',
      });
      tempJobCardIds.push(jc._id);

      const result = await calculateSlotCapacity(testDate);
      assert(
        result.capacityPerSlot === 0 && result.slots[0].status === 'No Capacity',
        `Capacity Test 6: Mechanic Present but assigned to active Job Card is Busy -> capacity = 0 ("No Capacity") (Got capacity: ${result.capacityPerSlot}, status: "${result.slots[0].status}")`
      );
    }

    // Future Date Capacity Test (Part 7: Future Date Rule)
    {
      await resetTestAttendance();
      const futureDate = '2026-09-15';
      const result = await calculateSlotCapacity(futureDate);
      assert(
        result.capacityPerSlot === activeMechanics.length,
        `Future Date Test: Future date capacity derives strictly from active mechanic count (${activeMechanics.length}) without dummy fallback (Got: ${result.capacityPerSlot})`
      );
    }

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    console.log('\n--- Cleaning up temporary test data & restoring state ---');
    // Delete test attendance
    await Attendance.deleteMany({ date: testDate, employeeId: { $in: mechIds } });
    // Delete temp job cards
    await JobCard.deleteMany({ _id: { $in: tempJobCardIds } });
    // Delete test salary structures
    if (createdSalaryStructureIds.length > 0) {
      await SalaryStructure.deleteMany({ _id: { $in: createdSalaryStructureIds } });
    }
    // Restore original attendance
    for (const att of originalAttendance) {
      await Attendance.create(att.toObject());
    }
    // Restore original job cards
    for (const jc of existingActiveJobCards) {
      await JobCard.findByIdAndUpdate(jc._id, { status: jc.status });
    }
    console.log('Cleanup and state restoration completed.');
  }

  console.log(`\n==========================================`);
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==========================================`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
