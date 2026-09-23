import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Employee from '../models/Employee.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Payroll from '../models/Payroll.js';

export const setupPayrollPeriods = async () => {
  await connectDB();
  console.log('================================================================');
  console.log('       SETUP AUGUST (PAID) & SEPTEMBER (PENDING) PAYROLL        ');
  console.log('================================================================\n');

  // 1. UPDATE DEEPAK RAO'S SALARY STRUCTURES
  const deepak = await Employee.findOne({ employeeId: 'EMP-000008' });
  if (deepak) {
    console.log('Aligning Deepak Rao salary structure dates...');
    
    // Set 42k to Sep 1, 2026 (Active Current)
    await SalaryStructure.findByIdAndUpdate('6aa11f9553d54fde07dbfdf0', {
      effectiveDate: new Date('2026-09-01T00:00:00.000Z'),
      effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      isActive: true,
      remarks: 'Current Promotion (Effective September 2026)',
    });

    // Set 35k to Aug 1, 2026 (Inactive History)
    await SalaryStructure.findByIdAndUpdate('6aa11f9453d54fde07dbfdef', {
      effectiveDate: new Date('2026-08-01T00:00:00.000Z'),
      effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
      isActive: false,
      remarks: 'Revised Package (August 2026)',
    });

    // Set 32k to Jul 1, 2026 (Inactive History)
    await SalaryStructure.findByIdAndUpdate('6a9e7a01c3f92fbcd854a6b4', {
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
      isActive: false,
      remarks: 'Initial Garage Joining Package (July 2026)',
    });

    console.log('  ✓ Deepak Rao salary timeline aligned: July 2026 -> August 2026 -> September 2026 (Active)\n');
  }

  // 2. SETUP PAYROLL FOR ALL MECHANICS
  const mechanics = await Employee.find({ role: 'Mechanic' });
  console.log(`Processing payroll for ${mechanics.length} mechanics...\n`);

  for (const emp of mechanics) {
    // Find active structure
    const activeStruct = await SalaryStructure.findOne({ employee: emp._id, isActive: true });
    // Find August structure if available (for Deepak Rao, use the 35k structure from August)
    let augStruct = await SalaryStructure.findOne({ 
      employee: emp._id, 
      effectiveDate: { $lte: new Date('2026-08-31') } 
    }).sort({ effectiveDate: -1 });

    if (!augStruct) {
      augStruct = activeStruct;
    }

    if (!augStruct) {
      console.log(`  Skipping ${emp.fullName}: No salary structure found.`);
      continue;
    }

    const basicSalary = augStruct.basicSalary || 30000;
    const allowances = typeof augStruct.allowances === 'number'
      ? augStruct.allowances
      : (Array.isArray(augStruct.allowanceItems) ? augStruct.allowanceItems.reduce((s, a) => s + (Number(a.amount) || 0), 0) : 0);
    const deductions = typeof augStruct.deductions === 'number'
      ? augStruct.deductions
      : (Array.isArray(augStruct.deductionItems) ? augStruct.deductionItems.reduce((s, d) => s + (Number(d.amount) || 0), 0) : 0);
    const netAug = Math.max(0, basicSalary + allowances - deductions);

    // --- AUGUST 2026 PAYROLL (PAID) ---
    const augPayrollData = {
      employee: emp._id,
      salaryStructure: augStruct._id,
      month: 8,
      year: 2026,
      salaryType: augStruct.salaryType || 'Monthly',
      workingDays: 26,
      totalWorkingDays: 26,
      workingDaysConsidered: 26,
      futureWorkingDays: 0,
      presentDays: 26,
      leaveDays: 0,
      halfDays: 0,
      absentDays: 0,
      calculatedUpTo: 'August 31, 2026',
      basicSalary: basicSalary,
      monthlyBasicSalary: basicSalary,
      perDaySalary: Math.round(basicSalary / 26),
      allowances: allowances,
      totalAllowances: allowances,
      allowancesBreakdown: augStruct.allowanceItems || [],
      attendanceDeduction: 0,
      otherDeductions: deductions,
      totalDeductions: deductions,
      deductionsBreakdown: augStruct.deductionItems || [],
      grossEarnings: basicSalary + allowances,
      netSalary: netAug,
      paymentStatus: 'Paid',
      paymentDate: new Date('2026-08-31T17:00:00.000Z'),
      paymentMethod: 'Bank Transfer',
      transactionReference: `SAL-AUG2026-${emp.employeeId}`,
      remarks: 'August 2026 salary disbursed successfully',
      paymentRemarks: 'Disbursed via automated bank batch transfer on 31 Aug 2026',
    };

    const existingAug = await Payroll.findOne({ employee: emp._id, month: 8, year: 2026 });
    if (existingAug) {
      Object.assign(existingAug, augPayrollData);
      await existingAug.save();
      console.log(`  ✓ Updated August 2026 [PAID] for ${emp.fullName} (${emp.employeeId}) - Net: ₹${netAug.toLocaleString('en-IN')}`);
    } else {
      await Payroll.create(augPayrollData);
      console.log(`  + Created August 2026 [PAID] for ${emp.fullName} (${emp.employeeId}) - Net: ₹${netAug.toLocaleString('en-IN')}`);
    }

    // --- SEPTEMBER 2026 PAYROLL (PENDING - FOR END OF MONTH) ---
    const existingSep = await Payroll.findOne({ employee: emp._id, month: 9, year: 2026 });
    if (existingSep) {
      existingSep.paymentStatus = 'Pending';
      existingSep.paymentDate = undefined;
      existingSep.paymentMethod = undefined;
      existingSep.transactionReference = '';
      existingSep.paymentRemarks = 'Pending end of month payout for September 2026';
      await existingSep.save();
      console.log(`  ✓ Set September 2026 [PENDING] for ${emp.fullName} (${emp.employeeId}) - Net: ₹${(existingSep.netSalary || 0).toLocaleString('en-IN')}`);
    }
  }

  console.log('\n================================================================');
  console.log('PAYROLL SETUP COMPLETE:');
  console.log(' - August 2026 (Past Period): All mechanics marked as PAID');
  console.log(' - September 2026 (Current Period): All mechanics set to PENDING (payable at end of month)');
  console.log('================================================================\n');

  await mongoose.disconnect();
};

setupPayrollPeriods().catch((err) => {
  console.error('Setup error:', err);
  process.exit(1);
});
