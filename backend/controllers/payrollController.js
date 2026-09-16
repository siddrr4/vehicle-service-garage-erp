import Payroll from '../models/Payroll.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import { getIndiaDateParts } from '../utils/dateUtils.js';
import { notifyMechanic } from '../services/notificationService.js';

// Helper to find Employee linked to user
const getEmployeeForUser = async (user) => {
  if (!user) return null;
  return await Employee.findOne({
    $or: [{ userRef: user._id }, { email: user.email.toLowerCase() }],
  });
};

// Helper to compute standard working days (Mon-Sat, excluding Sundays) for a given month & year
const getWorkingDaysInMonth = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    // 0 = Sunday
    if (d.getDay() !== 0) {
      workingDays++;
    }
  }

  return { daysInMonth, workingDays };
};

// @desc    Get all payroll records with filters and summary stats
// @route   GET /api/payroll
// @access  Private (Admin/Advisor)
export const getPayrolls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.query.month) {
      filter.month = parseInt(req.query.month);
    }
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    if (req.query.paymentStatus && req.query.paymentStatus !== 'All') {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const matchingEmployees = await Employee.find({
        $or: [
          { fullName: searchRegex },
          { employeeId: searchRegex },
          { specialization: searchRegex },
        ],
      }).select('_id');
      const empIds = matchingEmployees.map((e) => e._id);
      filter.employee = { $in: empIds };
    }

    const total = await Payroll.countDocuments(filter);
    const payrolls = await Payroll.find(filter)
      .populate('employee', 'fullName employeeId role specialization phone email status joiningDate')
      .populate('generatedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate summary totals for the filtered scope
    const allFiltered = await Payroll.find(filter).select('netSalary paymentStatus');
    let totalPayrollAmount = 0;
    let totalPaidAmount = 0;
    let totalPendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    allFiltered.forEach((p) => {
      totalPayrollAmount += p.netSalary || 0;
      if (p.paymentStatus === 'Paid') {
        totalPaidAmount += p.netSalary || 0;
        paidCount++;
      } else {
        totalPendingAmount += p.netSalary || 0;
        pendingCount++;
      }
    });

    res.json({
      payrolls,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
      summary: {
        totalPayrollAmount,
        totalPaidAmount,
        totalPendingAmount,
        paidCount,
        pendingCount,
        totalEmployees: allFiltered.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Monthly Payroll using actual Attendance records
// @route   POST /api/payroll/generate
// @access  Private (Admin)
export const generateMonthlyPayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;

    const m = parseInt(month);
    const y = parseInt(year);

    if (!m || m < 1 || m > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) is required' });
    }
    if (!y || y < 2000 || y > 2100) {
      return res.status(400).json({ message: 'Valid 4-digit year is required' });
    }

    const { year: currentYear, month: currentMonth, day: currentDay } = getIndiaDateParts();

    if (y > currentYear || (y === currentYear && m > currentMonth)) {
      return res.status(400).json({ message: 'Cannot generate payroll for future months before they occur' });
    }

    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrentMonth = (y === currentYear && m === currentMonth);
    const cutoffDay = isCurrentMonth ? currentDay : daysInMonth;

    const monthStr = String(m).padStart(2, '0');
    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const calculatedUpTo = isCurrentMonth
      ? `${monthNames[m]} ${currentDay}, ${y}`
      : `${monthNames[m]} ${daysInMonth}, ${y}`;

    // Collect all standard working days (Mon-Sat, excluding Sundays) in the month
    const workingDaysConsideredList = [];
    let futureWorkingDaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m - 1, d);
      // 0 = Sunday
      if (dateObj.getDay() !== 0) {
        const dayStr = `${y}-${monthStr}-${String(d).padStart(2, '0')}`;
        if (d <= cutoffDay) {
          workingDaysConsideredList.push(dayStr);
        } else {
          futureWorkingDaysCount++;
        }
      }
    }

    const workingDaysConsidered = workingDaysConsideredList.length;
    const totalWorkingDays = workingDaysConsidered + futureWorkingDaysCount;

    // Target employees
    let employeeFilter = { status: 'Active' };
    if (employeeId) {
      employeeFilter._id = employeeId;
    }

    const employees = await Employee.find(employeeFilter).sort({ fullName: 1 });
    if (employees.length === 0) {
      return res.status(404).json({ message: 'No active employees found' });
    }

    let generatedCount = 0;
    let updatedCount = 0;
    let skippedPaidCount = 0;
    let missingSalaryCount = 0;
    const processedPayrolls = [];

    for (const emp of employees) {
      // 1. Fetch active salary structure
      const salaryStruct = await SalaryStructure.findOne({
        employee: emp._id,
        isActive: true,
      });

      if (!salaryStruct) {
        missingSalaryCount++;
        continue;
      }

      // 2. Check if a payroll already exists for this employee + month + year
      const existingPayroll = await Payroll.findOne({
        employee: emp._id,
        month: m,
        year: y,
      });

      // Business Rule: If payroll is already marked Paid, DO NOT overwrite it
      if (existingPayroll && existingPayroll.paymentStatus === 'Paid') {
        skippedPaidCount++;
        processedPayrolls.push(existingPayroll);
        continue;
      }

      // 3. Aggregate actual attendance records from Attendance collection up to cutoff day
      const cutoffDateStr = `${y}-${monthStr}-${String(cutoffDay).padStart(2, '0')}`;
      const attendanceRecords = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: `${y}-${monthStr}-01`, $lte: cutoffDateStr },
      });

      const attendanceMap = new Map();
      attendanceRecords.forEach((att) => {
        attendanceMap.set(att.date, att);
      });

      let presentDays = 0;
      let leaveDays = 0;
      let halfDays = 0;
      let absentDays = 0;

      // Evaluate each applicable working day up to cutoff according to attendance priority rules
      workingDaysConsideredList.forEach((dayStr) => {
        const att = attendanceMap.get(dayStr);
        if (att) {
          const st = att.status || att.attendanceStatus || '';
          const rem = (att.remarks || '').toLowerCase();

          if (st === 'Absent') {
            absentDays += 1;
          } else if (st === 'Leave' || rem.includes('leave')) {
            leaveDays += 1;
          } else if (st === 'Half Day') {
            halfDays += 1;
            presentDays += 0.5;
          } else {
            // Present, Late, Early Exit, or check-in
            presentDays += 1;
          }
        } else {
          // REQUIRED BUSINESS RULE:
          // Past dates up to today without an explicit record are treated as Present by default!
          presentDays += 1;
        }
      });

      // 4. Calculate Net Salary according to business rules
      const monthlyBasicSalary = salaryStruct.salaryType === 'Monthly' ? salaryStruct.basicSalary : 0;
      const allowances = salaryStruct.allowances || 0;
      const otherDeductions = salaryStruct.deductions || 0;
      let attendanceDeduction = 0;
      let earnedBasicSalary = 0;
      let perDaySalary = 0;
      let netSalary = 0;

      if (salaryStruct.salaryType === 'Monthly') {
        const rawPerDay = totalWorkingDays > 0 ? (monthlyBasicSalary / totalWorkingDays) : 0;
        perDaySalary = Math.round(rawPerDay);

        // Earned basic salary:
        // When full month is considered (workingDaysConsidered >= totalWorkingDays), it is the full monthly basic salary.
        // When partial month is considered (workingDaysConsidered < totalWorkingDays), it is prorated by workingDaysConsidered.
        if (workingDaysConsidered >= totalWorkingDays) {
          earnedBasicSalary = monthlyBasicSalary;
        } else {
          earnedBasicSalary = Math.round(rawPerDay * workingDaysConsidered);
        }

        // LOP deduction only applies to explicit past absences (and 0.5 for half day) during the considered period
        const lopDays = absentDays + (halfDays * 0.5);
        attendanceDeduction = Math.round(perDaySalary * lopDays);

        netSalary = Math.max(0, Math.round(earnedBasicSalary + allowances - attendanceDeduction - otherDeductions));
      } else {
        // Daily Salary: Net Salary based on actual payable/worked days
        perDaySalary = salaryStruct.basicSalary;
        const payableDays = presentDays + leaveDays;
        earnedBasicSalary = Math.round(perDaySalary * payableDays);
        attendanceDeduction = 0;
        netSalary = Math.max(0, Math.round(earnedBasicSalary + allowances - otherDeductions));
      }

      const totalAllowances = allowances;
      const totalDeductions = attendanceDeduction + otherDeductions;
      const grossEarnings = earnedBasicSalary + totalAllowances;

      // 5. Store / Update historical payroll record
      const payrollData = {
        employee: emp._id,
        salaryStructure: salaryStruct._id,
        month: m,
        year: y,
        salaryType: salaryStruct.salaryType,
        workingDays: workingDaysConsidered,
        totalWorkingDays: totalWorkingDays,
        workingDaysConsidered: workingDaysConsidered,
        futureWorkingDays: futureWorkingDaysCount,
        presentDays,
        leaveDays,
        halfDays,
        absentDays,
        calculatedUpTo,
        basicSalary: earnedBasicSalary,
        monthlyBasicSalary,
        perDaySalary,
        allowances,
        totalAllowances,
        allowancesBreakdown: salaryStruct.allowanceItems || [],
        attendanceDeduction,
        otherDeductions,
        totalDeductions,
        deductionsBreakdown: salaryStruct.deductionItems || [],
        grossEarnings,
        netSalary,
        paymentStatus: existingPayroll ? existingPayroll.paymentStatus : 'Pending',
        generatedBy: req.user?._id,
      };

      let savedRecord;
      if (existingPayroll) {
        Object.assign(existingPayroll, payrollData);
        savedRecord = await existingPayroll.save();
        updatedCount++;
      } else {
        savedRecord = await Payroll.create(payrollData);
        generatedCount++;
      }

      await notifyMechanic(emp._id, {
        type: 'PAYROLL_GENERATED',
        title: 'Payroll has been generated',
        message: `Your payroll for ${m}/${y} has been generated. Net Salary: ₹${payrollData.netSalary}. Click to view payslip.`,
        relatedEntityType: 'Payroll',
        relatedEntityId: savedRecord._id,
        metadata: {
          payrollId: savedRecord._id,
          month: m,
          year: y,
          netSalary: payrollData.netSalary,
        },
      });

      const populated = await Payroll.findById(savedRecord._id).populate(
        'employee',
        'fullName employeeId role specialization phone email status joiningDate'
      );
      processedPayrolls.push(populated);
    }

    res.json({
      message: `Payroll generation completed for ${m}/${y}`,
      month: m,
      year: y,
      totalEmployees: employees.length,
      generatedCount,
      updatedCount,
      skippedPaidCount,
      missingSalaryCount,
      payrolls: processedPayrolls,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single payroll record (for Payslip View)
// @route   GET /api/payroll/:id
// @access  Private (Admin, Advisor, or Owning Employee)
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'fullName employeeId role specialization phone email status joiningDate userRef')
      .populate('generatedBy', 'firstName lastName email')
      .populate('paidBy', 'firstName lastName email');

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    // Authorization check: Admin and Advisor can view all. Mechanic can only view their own.
    if (req.user.role === 'mechanic') {
      const myEmployee = await getEmployeeForUser(req.user);
      if (!myEmployee || myEmployee._id.toString() !== payroll.employee._id.toString()) {
        return res.status(403).json({ message: 'You are not authorized to view this payslip' });
      }
    }

    // Fetch garage business settings for payslip branding
    const settings = (await Settings.findOne()) || {
      garageName: 'Garage ERP Auto Services',
      address: '123 Garage Lane, Industrial Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400011',
      phone: '+91 98765 43210',
      email: 'support@garageerp.com',
      gstin: '27AAAAA1111A1Z1',
    };

    res.json({
      payroll,
      garage: settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark Salary as Paid
// @route   PUT /api/payroll/:id/payment
// @access  Private (Admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentDate, paymentMethod, transactionReference, remarks } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    const validMethods = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: `Payment method must be one of: ${validMethods.join(', ')}` });
    }

    payroll.paymentStatus = 'Paid';
    payroll.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    payroll.paymentMethod = paymentMethod;
    payroll.transactionReference = transactionReference || '';
    payroll.remarks = remarks !== undefined ? remarks : payroll.remarks;
    payroll.paidBy = req.user._id;

    await payroll.save();

    const populated = await Payroll.findById(payroll._id)
      .populate('employee', 'fullName employeeId role specialization phone email status joiningDate')
      .populate('generatedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName');

    res.json({
      message: 'Salary marked as Paid successfully',
      payroll: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Payslips for the Logged-in Employee / Mechanic
// @route   GET /api/payroll/my-payslips
// @access  Private (Mechanic/Employee)
export const getMyPayslips = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found for this user account' });
    }

    const payslips = await Payroll.find({ employee: employee._id })
      .sort({ year: -1, month: -1 })
      .populate('employee', 'fullName employeeId role specialization joiningDate');

    res.json({
      payrolls: payslips,
      payslips,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
