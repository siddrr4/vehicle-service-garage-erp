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
      .sort({ updatedAt: -1 })
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
      .sort({ effectiveFrom: -1 })
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

    // 6. Validate effective date
    const rawEffDate = req.body.effectiveDate || effectiveFrom || new Date();
    const effDate = new Date(rawEffDate);
    if (isNaN(effDate.getTime())) {
      return res.status(400).json({ message: 'Valid effective date is required' });
    }

    // Enforce: only 1 active salary structure per employee at any given time
    // Deactivate previous active salary structure while preserving historical records
    if (isActive) {
      await SalaryStructure.updateMany(
        { employee: employeeId, isActive: true },
        { isActive: false }
      );
    }

    const structure = new SalaryStructure({
      employee: employeeId,
      salaryType,
      basicSalary: basicNum,
      allowances: allowNum,
      allowanceItems,
      deductions: dedNum,
      deductionItems,
      effectiveFrom: effDate,
      effectiveDate: effDate,
      isActive: Boolean(isActive),
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
    if (effectiveFrom) {
      structure.effectiveFrom = effectiveFrom;
      structure.effectiveDate = effectiveFrom;
    }
    if (req.body.effectiveDate) {
      structure.effectiveDate = req.body.effectiveDate;
      structure.effectiveFrom = req.body.effectiveDate;
    }
    if (remarks !== undefined) structure.remarks = remarks;

    if (isActive !== undefined) {
      if (isActive && !structure.isActive) {
        // Deactivate other active structures for this employee
        await SalaryStructure.updateMany(
          { employee: structure.employee, _id: { $ne: structure._id }, isActive: true },
          { isActive: false }
        );
      }
      structure.isActive = isActive;
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

    const newStatus = !structure.isActive;

    if (newStatus) {
      // Activating: deactivate any other active structures for this employee
      await SalaryStructure.updateMany(
        { employee: structure.employee, _id: { $ne: structure._id }, isActive: true },
        { isActive: false }
      );
    }

    structure.isActive = newStatus;
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

    await structure.deleteOne();
    res.json({ message: 'Salary structure removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
