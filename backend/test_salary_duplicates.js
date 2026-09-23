import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

import connectDB from './config/db.js';
import SalaryStructure from './models/SalaryStructure.js';
import Employee from './models/Employee.js';
import Payroll from './models/Payroll.js';
import {
  createSalaryStructure,
  updateSalaryStructure,
  toggleSalaryStructureStatus,
  getSalaryStructures,
  getSalaryStructureByEmployee,
} from './controllers/salaryController.js';
import { generateMonthlyPayroll } from './controllers/payrollController.js';

const createMockReqRes = ({ body = {}, params = {}, query = {}, user = {} } = {}) => {
  let statusCode = 200;
  let responseData = null;

  const req = {
    body,
    params,
    query,
    user: user._id ? user : { _id: new mongoose.Types.ObjectId(), role: 'admin' },
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
  console.log('   EMPLOYEE SALARY DUPLICATES & ACTIVE/INACTIVE TESTS   ');
  console.log('========================================================\n');

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

  // Tracking temporary records for cleanup
  let tempEmployeeA = null;
  let tempEmployeeB = null;
  const tempSalaryIds = [];

  try {
    // Setup 2 test employees
    tempEmployeeA = await Employee.create({
      fullName: 'Test Salary Emp Alpha',
      email: `test.alpha.${Date.now()}@example.com`,
      phone: '9988776655',
      role: 'Mechanic',
      specialization: 'General',
      experience: 3,
      status: 'Active',
      joiningDate: new Date('2026-01-01'),
    });

    tempEmployeeB = await Employee.create({
      fullName: 'Test Salary Emp Beta',
      email: `test.beta.${Date.now()}@example.com`,
      phone: '9988776656',
      role: 'Mechanic',
      specialization: 'General',
      experience: 4,
      status: 'Active',
      joiningDate: new Date('2026-01-01'),
    });

    console.log('Test employees created:', tempEmployeeA.fullName, 'and', tempEmployeeB.fullName);

    // =========================================================================
    // TEST 1: Employee with no salary structure -> create -> Active
    // =========================================================================
    console.log('\n--- TEST 1: First salary structure created becomes Active ---');
    {
      const { req, res } = createMockReqRes({
        body: {
          employee: tempEmployeeA._id.toString(),
          salaryType: 'Monthly',
          basicSalary: 30000,
          allowances: 3000,
          deductions: 1500,
          effectiveDate: '2026-06-01',
          isActive: true,
          remarks: 'Initial structure',
        },
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      if (data?._id) tempSalaryIds.push(data._id);

      assert(
        code === 201 && data && data.isActive === true && data.basicSalary === 30000,
        `Test 1: Structure created as Active (Status: ${code}, Basic: ₹${data?.basicSalary}, isActive: ${data?.isActive})`
      );
    }

    // =========================================================================
    // TEST 2: Create new salary with new effective date -> old becomes Inactive, new becomes Active
    // =========================================================================
    console.log('\n--- TEST 2: New salary structure deactivates previous active structure ---');
    {
      const { req, res } = createMockReqRes({
        body: {
          employee: tempEmployeeA._id.toString(),
          salaryType: 'Monthly',
          basicSalary: 38000,
          allowances: 4000,
          deductions: 2000,
          effectiveDate: '2026-07-01',
          isActive: true,
          remarks: 'Mid-year increment',
        },
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      if (data?._id) tempSalaryIds.push(data._id);

      // Query database to check active status of both structures
      const activeRecords = await SalaryStructure.find({ employee: tempEmployeeA._id, isActive: true });
      const allRecords = await SalaryStructure.find({ employee: tempEmployeeA._id });

      assert(
        code === 201 &&
        activeRecords.length === 1 &&
        activeRecords[0]._id.toString() === data._id.toString() &&
        allRecords.length === 2,
        `Test 2: New structure is Active (ID: ${data?._id}), previous structure deactivated. Active count: ${activeRecords.length}, Total records: ${allRecords.length}`
      );
    }

    // =========================================================================
    // TEST 3: Try creating same employee + same effective date -> rejected
    // =========================================================================
    console.log('\n--- TEST 3: Duplicate effective date for same employee is rejected ---');
    {
      const { req, res } = createMockReqRes({
        body: {
          employee: tempEmployeeA._id.toString(),
          salaryType: 'Monthly',
          basicSalary: 45000,
          effectiveDate: '2026-07-01', // Same date as existing structure from Test 2
          remarks: 'Duplicate attempt',
        },
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 400 && data?.message?.includes('Salary structure already exists for this employee'),
        `Test 3: Duplicate effective date rejected (Status: ${code}, Message: "${data?.message}")`
      );
    }

    // =========================================================================
    // TEST 4: Two employees can have the same effective date -> allowed
    // =========================================================================
    console.log('\n--- TEST 4: Different employees can share the same effective date ---');
    {
      const { req, res } = createMockReqRes({
        body: {
          employee: tempEmployeeB._id.toString(),
          salaryType: 'Monthly',
          basicSalary: 25000,
          effectiveDate: '2026-07-01', // Same date as employee A
          isActive: true,
          remarks: 'Employee B structure',
        },
      });

      await createSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      if (data?._id) tempSalaryIds.push(data._id);

      assert(
        code === 201 && data?.basicSalary === 25000 && data?.isActive === true,
        `Test 4: Employee B successfully assigned salary on 2026-07-01 (Status: ${code}, Basic: ₹${data?.basicSalary})`
      );
    }

    // =========================================================================
    // TEST 5: Historical records remain visible
    // =========================================================================
    console.log('\n--- TEST 5: Historical records remain visible and accessible ---');
    {
      const { req, res } = createMockReqRes({
        params: { employeeId: tempEmployeeA._id.toString() },
      });

      await getSalaryStructureByEmployee(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 200 &&
        data?.activeStructure?._id?.toString() === tempSalaryIds[1]?.toString() &&
        data?.history?.length === 2,
        `Test 5: History retrieved for employee. Active: ₹${data?.activeStructure?.basicSalary}, Historical count: ${data?.history?.length}`
      );
    }

    // =========================================================================
    // TEST 6: Only one Active salary exists per employee (Active count <= 1)
    // =========================================================================
    console.log('\n--- TEST 6: Active count constraint <= 1 verified ---');
    {
      const activeA = await SalaryStructure.find({ employee: tempEmployeeA._id, isActive: true });
      const activeB = await SalaryStructure.find({ employee: tempEmployeeB._id, isActive: true });

      assert(
        activeA.length === 1 && activeB.length === 1,
        `Test 6: Active structures verified strictly 1 per employee (Emp A: ${activeA.length}, Emp B: ${activeB.length})`
      );
    }

    // =========================================================================
    // TEST 7: Editing salary does not create duplicates
    // =========================================================================
    console.log('\n--- TEST 7: Editing salary validates against duplicate dates and preserves active rule ---');
    {
      // Attempt to edit structure 2 date to match structure 1 date (2026-06-01)
      const { req, res } = createMockReqRes({
        params: { id: tempSalaryIds[1].toString() },
        body: {
          effectiveDate: '2026-06-01', // Collides with structure 1
        },
      });

      await updateSalaryStructure(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 400 && data?.message?.includes('already exists'),
        `Test 7a: Edit rejecting date collision (Status: ${code}, Message: "${data?.message}")`
      );

      // Now edit valid amount without date collision
      const { req: reqValid, res: resValid } = createMockReqRes({
        params: { id: tempSalaryIds[1].toString() },
        body: {
          basicSalary: 39000,
          remarks: 'Updated basic amount',
        },
      });

      await updateSalaryStructure(reqValid, resValid);
      const codeValid = resValid.getStatusCode();
      const dataValid = resValid.getData();

      assert(
        codeValid === 200 && dataValid?.basicSalary === 39000 && dataValid?.isActive === true,
        `Test 7b: Valid edit accepted and active status kept (Status: ${codeValid}, Basic: ₹${dataValid?.basicSalary}, isActive: ${dataValid?.isActive})`
      );
    }

    // =========================================================================
    // TEST 8: Payroll still works with active salary structure
    // =========================================================================
    console.log('\n--- TEST 8: Payroll compatibility check ---');
    {
      // Generate payroll for Employee A for September 2026
      const { req, res } = createMockReqRes({
        body: {
          month: 9,
          year: 2026,
          employeeId: tempEmployeeA._id.toString(),
        },
      });

      await generateMonthlyPayroll(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      const createdPayroll = await Payroll.findOne({
        employee: tempEmployeeA._id,
        month: 9,
        year: 2026,
      });

      assert(
        code === 200 && createdPayroll !== null && createdPayroll.netSalary > 0,
        `Test 8: Payroll successfully generated using active salary structure (Status: ${code}, Net Salary: ₹${createdPayroll?.netSalary}, Basic: ₹${createdPayroll?.basicSalary})`
      );

      if (createdPayroll) {
        await Payroll.deleteOne({ _id: createdPayroll._id });
      }
    }

    // =========================================================================
    // TEST 9: Deepak Rao existing duplicate audit & active status
    // =========================================================================
    console.log('\n--- TEST 9 & 10: Deepak Rao duplicate audit & active status ---');
    {
      const deepak = await Employee.findOne({ employeeId: 'EMP-000008' });
      assert(deepak !== null, `Found Deepak Rao (ID: ${deepak?._id})`);

      const deepakStructures = await SalaryStructure.find({ employee: deepak._id })
        .sort({ effectiveDate: -1 });

      assert(
        deepakStructures.length === 3,
        `Deepak Rao has all 3 historical records intact (Count: ${deepakStructures.length})`
      );

      const activeDeepak = deepakStructures.filter((s) => s.isActive);
      const inactiveDeepak = deepakStructures.filter((s) => !s.isActive);

      assert(
        activeDeepak.length === 1 &&
        activeDeepak[0].basicSalary === 42000 &&
        new Date(activeDeepak[0].effectiveDate).toISOString().startsWith('2026-10-01'),
        `Deepak Rao's latest structure is Active (₹${activeDeepak[0]?.basicSalary}, Date: ${activeDeepak[0]?.effectiveDate?.toISOString()})`
      );

      assert(
        inactiveDeepak.length === 2 &&
        inactiveDeepak.every((s) => new Date(s.effectiveDate).toISOString().startsWith('2026-09-01')),
        `Deepak Rao's 2026-09-01 duplicates remain Inactive historical records (Count: ${inactiveDeepak.length})`
      );
    }

    // =========================================================================
    // TEST 11: Duplicate scan endpoint
    // =========================================================================
    console.log('\n--- TEST 11: GET /api/salary/duplicates endpoint ---');
    {
      const { req, res } = createMockReqRes();
      const { getDuplicateSalaryStructures } = await import('./controllers/salaryController.js');

      await getDuplicateSalaryStructures(req, res);
      const code = res.getStatusCode();
      const data = res.getData();

      assert(
        code === 200 && data && data.totalDuplicateGroups >= 1,
        `Duplicate scan endpoint successfully reports duplicates (Total groups: ${data?.totalDuplicateGroups})`
      );
    }

    // =========================================================================
    // TEST 12: No other employees corrupted or deleted
    // =========================================================================
    console.log('\n--- TEST 12: Database integrity check across all staff ---');
    {
      const allEmployeesWithSalary = await SalaryStructure.distinct('employee');
      let allPassed = true;

      for (const empId of allEmployeesWithSalary) {
        const activeCount = await SalaryStructure.countDocuments({ employee: empId, isActive: true });
        if (activeCount > 1) {
          allPassed = false;
          console.error(`Employee ${empId} has ${activeCount} active structures!`);
        }
      }

      assert(
        allPassed === true,
        `All employees in database have Active salary structures <= 1`
      );
    }

  } finally {
    // Cleanup temporary test data
    console.log('\nCleaning up temporary test records...');
    if (tempSalaryIds.length > 0) {
      await SalaryStructure.deleteMany({ _id: { $in: tempSalaryIds } });
    }
    if (tempEmployeeA) {
      await Employee.deleteOne({ _id: tempEmployeeA._id });
    }
    if (tempEmployeeB) {
      await Employee.deleteOne({ _id: tempEmployeeB._id });
    }
    console.log('Cleanup complete.');
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
