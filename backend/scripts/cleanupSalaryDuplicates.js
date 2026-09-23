import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Employee from '../models/Employee.js';

export const runSalaryCleanup = async () => {
  await connectDB();
  console.log('=== SALARY STRUCTURE AUDIT & SAFE CLEANUP ===\n');

  // 1. Fetch all salary structures populated with employee
  const structures = await SalaryStructure.find()
    .populate('employee', 'fullName employeeId status')
    .sort({ employee: 1, effectiveDate: -1, createdAt: -1 });

  console.log(`Found ${structures.length} total salary structures in database.\n`);

  // Group by employee
  const employeeMap = new Map();
  for (const s of structures) {
    if (!s.employee) continue;
    const empId = s.employee._id.toString();
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee: s.employee,
        records: [],
      });
    }
    employeeMap.get(empId).records.push(s);
  }

  console.log(`Auditing ${employeeMap.size} employees with configured salary structures...\n`);

  let duplicateCount = 0;
  let normalizedCount = 0;

  for (const [empId, { employee, records }] of employeeMap.entries()) {
    console.log(`--------------------------------------------------`);
    console.log(`Employee: ${employee.fullName} (${employee.employeeId}) - Total records: ${records.length}`);

    // Check for same-date duplicates
    const dateMap = new Map();
    for (const rec of records) {
      const dateKey = rec.effectiveDate ? new Date(rec.effectiveDate).toISOString().split('T')[0] : 'unknown';
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey).push(rec);
    }

    let hasDuplicates = false;
    for (const [dateKey, sameDateRecords] of dateMap.entries()) {
      if (sameDateRecords.length > 1) {
        hasDuplicates = true;
        duplicateCount += (sameDateRecords.length - 1);
        console.log(`  ⚠️  DUPLICATE EFFECTIVE DATE DETECTED: ${dateKey} (${sameDateRecords.length} records)`);
        sameDateRecords.forEach((r, idx) => {
          console.log(`     [Record ${idx + 1}] ID: ${r._id}, Basic: ₹${r.basicSalary}, Allowances: ₹${r.allowances}, Deductions: ₹${r.deductions}, Remarks: "${r.remarks || ''}", CreatedAt: ${r.createdAt.toISOString()}, Current isActive: ${r.isActive}`);
        });
      }
    }

    // Determine the latest applicable salary structure chronologically
    // Sort records by effectiveDate DESC, then createdAt DESC
    const sortedRecords = [...records].sort((a, b) => {
      const dateA = new Date(a.effectiveDate || a.effectiveFrom || 0).getTime();
      const dateB = new Date(b.effectiveDate || b.effectiveFrom || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const latestRecord = sortedRecords[0];
    console.log(`  🎯 Chronologically Latest Structure: ID ${latestRecord._id} | ₹${latestRecord.basicSalary} | Effective: ${new Date(latestRecord.effectiveDate).toISOString().split('T')[0]}`);

    // Update active status:
    // 1. Latest record must be Active (isActive: true)
    // 2. All older / historical records must be Inactive (isActive: false)
    // 3. NO records are deleted
    for (const rec of records) {
      const isLatest = rec._id.toString() === latestRecord._id.toString();
      const targetActiveStatus = isLatest;

      if (rec.isActive !== targetActiveStatus) {
        await SalaryStructure.findByIdAndUpdate(rec._id, {
          isActive: targetActiveStatus,
          updatedBy: rec.updatedBy || rec.createdBy,
        });
        console.log(`  🔄 Updated record ${rec._id} (₹${rec.basicSalary}, ${new Date(rec.effectiveDate).toISOString().split('T')[0]}): isActive changed from ${rec.isActive} to ${targetActiveStatus}`);
        normalizedCount++;
      }
    }

    // Verify post-normalization:
    const activeRecords = await SalaryStructure.find({ employee: empId, isActive: true });
    console.log(`  ✅ Post-check: ${activeRecords.length} Active record(s) for ${employee.fullName}. Active ID: ${activeRecords[0]?._id} (₹${activeRecords[0]?.basicSalary})`);
  }

  console.log(`\n==================================================`);
  console.log(`SUMMARY:`);
  console.log(`- Duplicate records identified: ${duplicateCount}`);
  console.log(`- Records normalized: ${normalizedCount}`);
  console.log(`- Data deleted: 0 (All historical records preserved)`);
  console.log(`==================================================\n`);
};

// If run directly from terminal
if (process.argv[1] && process.argv[1].endsWith('cleanupSalaryDuplicates.js')) {
  runSalaryCleanup()
    .then(() => {
      console.log('Safe cleanup complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup error:', err);
      process.exit(1);
    });
}
