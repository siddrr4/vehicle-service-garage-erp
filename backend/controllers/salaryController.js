import SalaryStructure from '../models/SalaryStructure.js';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

// @desc    Get all salary structures
// @route   GET /api/salary
// @access  Private (Admin/Advisor)
export const getSalaryStructures = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.salaryType) {
      filter.salaryType = req.query.salaryType;
    }

    const searchTerm = req.query.keyword || req.query.search;
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
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

    const total = await SalaryStructure.countDocuments(filter);
    const structures = await SalaryStructure.find(filter)
      .populate('employee', 'fullName employeeId role specialization phone email status')
      .populate('createdBy', 'firstName lastName email')
      .sort({ effectiveDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      salaryStructures: structures,
      structures,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get salary structure for a specific employee
// @route   GET /api/salary/employee/:employeeId
// @access  Private (Admin/Advisor)
export const getSalaryStructureByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const activeStructure = await SalaryStructure.findOne({
      employee: employeeId,
      isActive: true,
    }).populate('employee', 'fullName employeeId role specialization phone email status');

    const history = await SalaryStructure.find({ employee: employeeId })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .populate('createdBy', 'firstName lastName');

    res.json({
      employee,
      activeStructure,
      history,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new salary structure
// @route   POST /api/salary
// @access  Private (Admin)
export const createSalaryStructure = async (req, res) => {
  try {
    const {
      employee: employeeId,
      salaryType = 'Monthly',
      basicSalary,
      allowances = 0,
      deductions = 0,
      effectiveFrom = new Date(),
      isActive = true,
      remarks = '',
    } = req.body;

    // 1. Validate employee
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // 2. Validate salaryType
    const validSalaryTypes = ['Monthly', 'Daily'];
    if (!validSalaryTypes.includes(salaryType)) {
      return res.status(400).json({ message: 'Salary type must be either Monthly or Daily' });
    }

    // 3. Validate and parse basicSalary
    if (basicSalary === undefined || basicSalary === null || basicSalary === '') {
      return res.status(400).json({ message: 'Basic salary is required' });
    }
    const basicNum = Number(basicSalary);
    if (isNaN(basicNum)) {
      return res.status(400).json({ message: 'Basic salary must be a valid number' });
    }
    if (basicNum < 0) {
      return res.status(400).json({ message: 'Basic salary cannot be negative' });
    }

    // 4. Validate and parse allowances
    let allowNum = 0;
    let allowanceItems = [];
    if (Array.isArray(allowances)) {
      allowanceItems = allowances;
      for (const a of allowances) {
        const amt = Number(a.amount);
        if (isNaN(amt) || amt < 0) {
          return res.status(400).json({ message: `Allowance amount for "${a.name || 'item'}" cannot be negative` });
        }
        allowNum += amt;
      }
    } else if (allowances !== undefined && allowances !== null && allowances !== '') {
      allowNum = Number(allowances);
      if (isNaN(allowNum) || allowNum < 0) {
        return res.status(400).json({ message: 'Allowances cannot be negative' });
      }
    }

    // 5. Validate and parse deductions
    let dedNum = 0;
    let deductionItems = [];
    if (Array.isArray(deductions)) {
      deductionItems = deductions;
      for (const d of deductions) {
        const amt = Number(d.amount);
        if (isNaN(amt) || amt < 0) {
          return res.status(400).json({ message: `Deduction amount for "${d.name || 'item'}" cannot be negative` });
        }
        dedNum += amt;
      }
    } else if (deductions !== undefined && deductions !== null && deductions !== '') {
      dedNum = Number(deductions);
      if (isNaN(dedNum) || dedNum < 0) {
        return res.status(400).json({ message: 'Deductions cannot be negative' });
      }
    }

    // 6. Validate effective date and check for same-date duplicates
    const rawEffDate = req.body.effectiveDate || effectiveFrom || new Date();
    const effDate = new Date(rawEffDate);
    if (isNaN(effDate.getTime())) {
      return res.status(400).json({ message: 'Valid effective date is required' });
    }

    const startOfDay = new Date(Date.UTC(effDate.getUTCFullYear(), effDate.getUTCMonth(), effDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(effDate.getUTCFullYear(), effDate.getUTCMonth(), effDate.getUTCDate(), 23, 59, 59, 999));

    // REQUIRED BUSINESS RULE: Prevent duplicate salary structures with the same employee and same effective date
    const existingSameDate = await SalaryStructure.findOne({
      employee: employeeId,
      effectiveDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingSameDate) {
      return res.status(400).json({
        message: 'Salary structure already exists for this employee with the selected effective date.',
      });
    }

    // Check if a chronologically later salary structure already exists for this employee
    const existingLaterStructure = await SalaryStructure.findOne({
      employee: employeeId,
      effectiveDate: { $gt: endOfDay },
    });

    // Determine active status:
    // If user explicitly requests isActive=false, respect it.
    // If a strictly newer salary structure already exists, the newer one remains active, and this older record is inactive.
    let willBeActive = isActive !== undefined ? Boolean(isActive) : true;
    if (existingLaterStructure && !req.body.forceActive) {
      willBeActive = false;
    }

    // Enforce: only 1 active salary structure per employee at any given time
    // If this new structure will be active, deactivate all previous active structures
    if (willBeActive) {
      await SalaryStructure.updateMany(
        { employee: employeeId, isActive: true },
        { isActive: false }
      );
    } else {
      // If willBeActive is false, check if the employee has ANY active salary structure.
      // If no active structure exists, make the latest one active.
      const currentActiveCount = await SalaryStructure.countDocuments({
        employee: employeeId,
        isActive: true,
      });
      if (currentActiveCount === 0 && !existingLaterStructure) {
        willBeActive = true;
      }
    }

    const structure = new SalaryStructure({
      employee: employeeId,
      salaryType,
      basicSalary: basicNum,
      allowances: allowNum,
      allowanceItems,
      deductions: dedNum,
      deductionItems,
      effectiveFrom: startOfDay,
      effectiveDate: startOfDay,
      isActive: willBeActive,
      remarks,
      createdBy: req.user._id,
    });

    await structure.save();

    const populated = await SalaryStructure.findById(structure._id).populate(
      'employee',
      'fullName employeeId role specialization phone email status'
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a salary structure
// @route   PUT /api/salary/:id
// @access  Private (Admin)
export const updateSalaryStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ message: 'Salary structure not found' });
    }

    const {
      salaryType,
      basicSalary,
      allowances,
      deductions,
      effectiveFrom,
      isActive,
      remarks,
    } = req.body;

    if (basicSalary !== undefined) {
      const basicNum = Number(basicSalary);
      if (isNaN(basicNum) || basicNum < 0) {
        return res.status(400).json({ message: 'Basic salary must be a non-negative number' });
      }
      structure.basicSalary = basicNum;
    }

    if (allowances !== undefined) {
      if (Array.isArray(allowances)) {
        structure.allowanceItems = allowances;
        structure.allowances = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      } else {
        const allowNum = Number(allowances);
        if (isNaN(allowNum) || allowNum < 0) {
          return res.status(400).json({ message: 'Allowances cannot be negative' });
        }
        structure.allowances = allowNum;
      }
    }

    if (deductions !== undefined) {
      if (Array.isArray(deductions)) {
        structure.deductionItems = deductions;
        structure.deductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      } else {
        const dedNum = Number(deductions);
        if (isNaN(dedNum) || dedNum < 0) {
          return res.status(400).json({ message: 'Deductions cannot be negative' });
        }
        structure.deductions = dedNum;
      }
    }

    if (salaryType) structure.salaryType = salaryType;

    // Check effective date update and prevent duplicates
    const newEffDate = req.body.effectiveDate || effectiveFrom;
    if (newEffDate) {
      const parsedDate = new Date(newEffDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Valid effective date is required' });
      }
      const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 23, 59, 59, 999));

      const duplicate = await SalaryStructure.findOne({
        employee: structure.employee,
        _id: { $ne: structure._id },
        effectiveDate: { $gte: startOfDay, $lte: endOfDay },
      });

      if (duplicate) {
        return res.status(400).json({
          message: 'Salary structure already exists for this employee with the selected effective date.',
        });
      }

      structure.effectiveDate = startOfDay;
      structure.effectiveFrom = startOfDay;
    }

    if (remarks !== undefined) structure.remarks = remarks;

    // Active status management:
    // Ensure: Active salary structures <= 1 per employee
    // Prevent accidentally deactivating all salary structures for an employee
    if (isActive !== undefined) {
      const targetActive = Boolean(isActive);

      if (targetActive) {
        // Activating this structure: deactivate all other structures for this employee
        await SalaryStructure.updateMany(
          { employee: structure.employee, _id: { $ne: structure._id }, isActive: true },
          { isActive: false }
        );
        structure.isActive = true;
      } else if (structure.isActive && !targetActive) {
        // Requested to deactivate the currently active structure
        // Find another structure for this employee to fall back to
        const otherStructure = await SalaryStructure.findOne({
          employee: structure.employee,
          _id: { $ne: structure._id },
        }).sort({ effectiveDate: -1, createdAt: -1 });

        if (!otherStructure) {
          return res.status(400).json({
            message: 'Cannot deactivate the only salary structure for an employee.',
          });
        }

        // Deactivate this structure and designate the latest other structure as active
        structure.isActive = false;
        otherStructure.isActive = true;
        await otherStructure.save();
      } else {
        structure.isActive = targetActive;
      }
    }

    structure.updatedBy = req.user._id;
    await structure.save();

    const populated = await SalaryStructure.findById(structure._id).populate(
      'employee',
      'fullName employeeId role specialization phone email status'
    );

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle salary structure active status
// @route   PATCH /api/salary/:id/toggle-status
// @access  Private (Admin)
export const toggleSalaryStructureStatus = async (req, res) => {
  try {
    const structure = await SalaryStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ message: 'Salary structure not found' });
    }

    if (!structure.isActive) {
      // Activating this structure:
      // Deactivate any other active structures for this employee
      await SalaryStructure.updateMany(
        { employee: structure.employee, _id: { $ne: structure._id }, isActive: true },
        { isActive: false }
      );
      structure.isActive = true;
    } else {
      // Attempting to deactivate the current active structure:
      // Check if there are other structures for this employee to fall back to
      const otherStructure = await SalaryStructure.findOne({
        employee: structure.employee,
        _id: { $ne: structure._id },
      }).sort({ effectiveDate: -1, createdAt: -1 });

      if (!otherStructure) {
        return res.status(400).json({
          message: 'Cannot deactivate the only salary structure for an employee.',
        });
      }

      // Promote the latest other structure to Active and deactivate this one
      structure.isActive = false;
      otherStructure.isActive = true;
      await otherStructure.save();
    }

    structure.updatedBy = req.user._id;
    await structure.save();

    const populated = await SalaryStructure.findById(structure._id).populate(
      'employee',
      'fullName employeeId role specialization phone email status'
    );

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a salary structure
// @route   DELETE /api/salary/:id
// @access  Private (Admin)
export const deleteSalaryStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ message: 'Salary structure not found' });
    }

    // Check if payroll records exist for this employee
    const payrollCount = await Payroll.countDocuments({ employee: structure.employee });
    if (payrollCount > 0 && structure.isActive) {
      return res.status(400).json({
        message: 'Cannot delete an active salary structure associated with existing payroll records. Please deactivate it instead.',
      });
    }

    const empId = structure.employee;
    const wasActive = structure.isActive;

    await structure.deleteOne();

    // If deleted structure was active, promote the newest remaining structure to active
    if (wasActive) {
      const remainingLatest = await SalaryStructure.findOne({ employee: empId })
        .sort({ effectiveDate: -1, createdAt: -1 });
      if (remainingLatest) {
        remainingLatest.isActive = true;
        await remainingLatest.save();
      }
    }

    res.json({ message: 'Salary structure removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get duplicate salary structures report
// @route   GET /api/salary/duplicates
// @access  Private (Admin)
export const getDuplicateSalaryStructures = async (req, res) => {
  try {
    const structures = await SalaryStructure.find()
      .populate('employee', 'fullName employeeId status')
      .sort({ employee: 1, effectiveDate: -1, createdAt: -1 });

    const employeeMap = new Map();
    structures.forEach((s) => {
      if (!s.employee) return;
      const empId = s.employee._id.toString();
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employee: s.employee,
          records: [],
        });
      }
      employeeMap.get(empId).records.push(s);
    });

    const duplicateGroups = [];
    for (const [empId, { employee, records }] of employeeMap.entries()) {
      const dateMap = new Map();
      records.forEach((r) => {
        const dateKey = r.effectiveDate ? new Date(r.effectiveDate).toISOString().split('T')[0] : 'unknown';
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey).push(r);
      });

      for (const [dateKey, sameDateRecords] of dateMap.entries()) {
        if (sameDateRecords.length > 1) {
          duplicateGroups.push({
            employee,
            effectiveDate: dateKey,
            count: sameDateRecords.length,
            records: sameDateRecords,
          });
        }
      }
    }

    res.json({
      totalDuplicateGroups: duplicateGroups.length,
      duplicateGroups,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Safe cleanup of duplicate salary structures (normalizes active status without deleting data)
// @route   POST /api/salary/cleanup-duplicates
// @access  Private (Admin)
export const cleanupSalaryDuplicatesHandler = async (req, res) => {
  try {
    const structures = await SalaryStructure.find()
      .populate('employee', 'fullName employeeId status')
      .sort({ employee: 1, effectiveDate: -1, createdAt: -1 });

    const employeeMap = new Map();
    structures.forEach((s) => {
      if (!s.employee) return;
      const empId = s.employee._id.toString();
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employee: s.employee,
          records: [],
        });
      }
      employeeMap.get(empId).records.push(s);
    });

    let duplicateCount = 0;
    let normalizedCount = 0;

    for (const [empId, { employee, records }] of employeeMap.entries()) {
      // Find chronologically latest record
      const sortedRecords = [...records].sort((a, b) => {
        const dateA = new Date(a.effectiveDate || a.effectiveFrom || 0).getTime();
        const dateB = new Date(b.effectiveDate || b.effectiveFrom || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      const latestRecord = sortedRecords[0];

      // Check for same-date duplicates
      const dateMap = new Map();
      records.forEach((r) => {
        const dateKey = r.effectiveDate ? new Date(r.effectiveDate).toISOString().split('T')[0] : 'unknown';
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
        dateMap.get(dateKey).push(r);
      });

      for (const sameDateRecords of dateMap.values()) {
        if (sameDateRecords.length > 1) {
          duplicateCount += (sameDateRecords.length - 1);
        }
      }

      // Safe update: make latest record Active, older records Inactive. No deletion.
      for (const rec of records) {
        const isLatest = rec._id.toString() === latestRecord._id.toString();
        if (rec.isActive !== isLatest) {
          await SalaryStructure.findByIdAndUpdate(rec._id, {
            isActive: isLatest,
            updatedBy: req.user?._id || rec.createdBy,
          });
          normalizedCount++;
        }
      }
    }

    res.json({
      message: 'Salary structures normalized successfully without deleting historical records.',
      duplicateRecordsIdentified: duplicateCount,
      recordsNormalized: normalizedCount,
      deletedCount: 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
