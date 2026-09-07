import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import JobCard from '../models/JobCard.js';

// @desc    Get all employees with search, filter, and pagination
// @route   GET /api/employees
// @access  Private (Admin/Advisor)
export const getEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const keywordFilter = req.query.keyword
      ? {
          $or: [
            { employeeId: { $regex: req.query.keyword, $options: 'i' } },
            { fullName: { $regex: req.query.keyword, $options: 'i' } },
            { email: { $regex: req.query.keyword, $options: 'i' } },
            { phone: { $regex: req.query.keyword, $options: 'i' } },
            { specialization: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    const filterQuery = {};
    if (req.query.role) {
      filterQuery.role = req.query.role;
    }
    if (req.query.availability) {
      filterQuery.availability = req.query.availability;
    }
    if (req.query.status) {
      filterQuery.status = req.query.status;
    }

    const combinedQuery = { ...keywordFilter, ...filterQuery };

    const count = await Employee.countDocuments(combinedQuery);

    const employees = await Employee.find(combinedQuery)
      .populate('userRef', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      employees,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active mechanics list for dropdowns/assignment
// @route   GET /api/employees/active-mechanics
// @access  Private
export const getActiveMechanics = async (req, res) => {
  try {
    const allMechanics = await Employee.find({
      role: 'Mechanic',
      status: 'Active',
    }).sort({ fullName: 1 }).lean();

    // Get today's attendance
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const mechanicIds = allMechanics.map((m) => m._id);
    const todayAttendance = await Attendance.find({
      employeeId: { $in: mechanicIds },
      date: todayStr,
    });

    // Get active job cards for these mechanics
    const activeJobCards = await JobCard.aggregate([
      {
        $match: {
          assignedMechanic: { $in: mechanicIds },
          status: { $in: ['Assigned', 'In Progress'] }
        }
      },
      {
        $group: {
          _id: '$assignedMechanic',
          count: { $sum: 1 }
        }
      }
    ]);

    const activeJobsMap = new Map();
    activeJobCards.forEach(jc => {
      activeJobsMap.set(jc._id.toString(), jc.count);
    });

    // Filter mechanics who are checked in and NOT checked out
    const availableMechanics = allMechanics.filter((mechanic) => {
      const attendanceRecord = todayAttendance.find(
        (record) => record.employeeId.toString() === mechanic._id.toString()
      );
      return attendanceRecord && attendanceRecord.checkIn && !attendanceRecord.checkOut;
    }).map((mechanic) => {
      const activeJobsCount = activeJobsMap.get(mechanic._id.toString()) || 0;
      return {
        ...mechanic,
        activeJobsCount,
        displayStatus: activeJobsCount > 0 ? 'Busy' : 'Available'
      };
    });

    res.json(availableMechanics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee statistics for dashboard
// @route   GET /api/employees/stats
// @access  Private
export const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const totalMechanics = await Employee.countDocuments({ role: 'Mechanic', status: 'Active' });
    const availableMechanics = await Employee.countDocuments({
      role: 'Mechanic',
      status: 'Active',
      availability: 'Available',
    });
    const busyMechanics = await Employee.countDocuments({
      role: 'Mechanic',
      status: 'Active',
      availability: 'Busy',
    });
    const leaveMechanics = await Employee.countDocuments({
      role: 'Mechanic',
      status: 'Active',
      availability: 'Leave',
    });
    const serviceAdvisors = await Employee.countDocuments({ role: 'Service Advisor', status: 'Active' });

    res.json({
      totalEmployees,
      totalMechanics,
      availableMechanics,
      busyMechanics,
      leaveMechanics,
      serviceAdvisors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('userRef', 'firstName lastName email role');

    if (employee) {
      res.json(employee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (Admin/Advisor)
export const createEmployee = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      specialization,
      experience,
      availability,
      joiningDate,
      status,
    } = req.body;

    // Check if employee email already exists
    const employeeExists = await Employee.findOne({ email: email.toLowerCase() });
    if (employeeExists) {
      return res.status(400).json({ message: 'An employee with this email already exists' });
    }

    // Split fullName for User model
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Employee';
    const lastName = nameParts.slice(1).join(' ') || 'Staff';
    const userRole = (role || 'Mechanic') === 'Mechanic' ? 'mechanic' : 'advisor';
    const employeeStatus = status || 'Active';

    // Create or find matching User record for login
    let userRef = null;
    let matchingUser = await User.findOne({ email: email.toLowerCase() });

    if (!matchingUser) {
      const userPassword = password || 'Password@123';
      matchingUser = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: userPassword,
        phone: phone || '0000000000',
        role: userRole,
        isActive: employeeStatus === 'Active',
      });
      userRef = matchingUser._id;
    } else {
      matchingUser.role = userRole;
      matchingUser.isActive = employeeStatus === 'Active';
      if (password) {
        matchingUser.password = password;
      }
      await matchingUser.save();
      userRef = matchingUser._id;
    }

    const employee = new Employee({
      fullName,
      email: email.toLowerCase(),
      phone,
      role: role || 'Mechanic',
      specialization: specialization || 'General Repairs',
      experience,
      availability: availability || 'Available',
      joiningDate: joiningDate || Date.now(),
      status: employeeStatus,
      userRef,
    });

    const createdEmployee = await employee.save();
    res.status(201).json(createdEmployee);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an employee
// @route   PUT /api/employees/:id
// @access  Private (Admin/Advisor)
export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (employee) {
      // Check email uniqueness if email changed
      if (req.body.email && req.body.email.toLowerCase() !== employee.email) {
        const emailExists = await Employee.findOne({ email: req.body.email.toLowerCase() });
        if (emailExists) {
          return res.status(400).json({ message: 'An employee with this email already exists' });
        }
        employee.email = req.body.email.toLowerCase();
      }

      employee.fullName = req.body.fullName || employee.fullName;
      employee.phone = req.body.phone || employee.phone;
      employee.role = req.body.role || employee.role;
      employee.specialization = req.body.specialization || employee.specialization;
      employee.experience = req.body.experience !== undefined ? req.body.experience : employee.experience;
      employee.availability = req.body.availability || employee.availability;
      employee.joiningDate = req.body.joiningDate || employee.joiningDate;
      employee.status = req.body.status || employee.status;

      // Update or link matching user
      const userRole = employee.role === 'Mechanic' ? 'mechanic' : 'advisor';
      let userRecord = null;
      if (employee.userRef) {
        userRecord = await User.findById(employee.userRef);
      } else {
        userRecord = await User.findOne({ email: employee.email });
      }

      if (userRecord) {
        userRecord.email = employee.email;
        userRecord.phone = employee.phone;
        userRecord.role = userRole;
        userRecord.isActive = employee.status === 'Active';
        if (req.body.password) {
          userRecord.password = req.body.password;
        }
        const nameParts = employee.fullName.trim().split(' ');
        userRecord.firstName = nameParts[0] || userRecord.firstName;
        userRecord.lastName = nameParts.slice(1).join(' ') || userRecord.lastName;
        await userRecord.save();
        employee.userRef = userRecord._id;
      }

      const updatedEmployee = await employee.save();
      res.json(updatedEmployee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (employee) {
      if (employee.userRef) {
        await User.findByIdAndDelete(employee.userRef);
      } else {
        await User.findOneAndDelete({ email: employee.email });
      }
      await Employee.deleteOne({ _id: employee._id });
      res.json({ message: 'Employee and linked account deleted successfully' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

