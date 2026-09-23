import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import JobCard from '../models/JobCard.js';
import Vehicle from '../models/Vehicle.js';
import {
  getIndiaDateStr,
  getIndiaCurrentTimeParts,
  formatWorkingHours,
  getAttendanceStatusIST,
  isSameDayHalfDayLocked,
  HALF_DAY_LOCK_MESSAGE,
} from '../utils/dateUtils.js';

// Helper to find Employee record linked to logged-in user
const getEmployeeForUser = async (user) => {
  if (!user) return null;
  return await Employee.findOne({
    $or: [{ userRef: user._id }, { email: user.email.toLowerCase() }],
  });
};

// @desc    Check In for Today
// @route   POST /api/attendance/check-in
// @access  Private (Mechanic/Employee)
export const checkIn = async (req, res) => {
  try {
    let employee;
    let isSelfCheckIn = true;

    if (req.body.employeeId && req.user.role !== 'mechanic') {
      employee = await Employee.findById(req.body.employeeId);
      isSelfCheckIn = false;
    } else {
      employee = await getEmployeeForUser(req.user);
    }

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found for this account' });
    }

    const todayDate = getIndiaDateStr();

    // Check if record already exists for today
    let attendance = await Attendance.findOne({ employeeId: employee._id, date: todayDate });
    if (attendance && attendance.checkIn && !attendance.checkOut) {
      return res.status(400).json({ message: `${employee.fullName} is already checked in for today` });
    }

    const checkInTime = new Date();
    const { hours, minutes } = getIndiaCurrentTimeParts(checkInTime);

    // Check-In allowed from 08:30 AM onwards in IST for self check-in by mechanics
    if (isSelfCheckIn && (hours < 8 || (hours === 8 && minutes < 30))) {
      return res.status(400).json({ message: 'Check-in is only allowed from 08:30 AM onwards' });
    }

    // Late if check-in is after 09:15 AM in IST
    const isLate = hours > 9 || (hours === 9 && minutes > 15);
    const status = isLate ? 'Late' : 'Present';

    const markedByRole = isSelfCheckIn ? 'mechanic' : 'admin';

    if (attendance) {
      attendance.checkIn = checkInTime;
      attendance.checkOut = null;
      attendance.workingHours = 'In Progress';
      attendance.status = status;
      attendance.attendanceStatus = status;
      attendance.markedBy = req.user._id;
      attendance.markedByRole = markedByRole;
      await attendance.save();
    } else {
      attendance = new Attendance({
        employeeId: employee._id,
        date: todayDate,
        checkIn: checkInTime,
        status,
        attendanceStatus: status,
        markedBy: req.user._id,
        markedByRole,
      });
      await attendance.save();
    }

    employee.availability = 'Available';
    await employee.save();

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check Out for Today
// @route   POST /api/attendance/check-out
// @access  Private (Mechanic/Employee)
export const checkOut = async (req, res) => {
  try {
    let employee;
    
    if (req.body.employeeId && req.user.role !== 'mechanic') {
      employee = await Employee.findById(req.body.employeeId);
    } else {
      employee = await getEmployeeForUser(req.user);
    }

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found for this account' });
    }

    const todayDate = getIndiaDateStr();
    const attendance = await Attendance.findOne({ employeeId: employee._id, date: todayDate });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: `${employee.fullName} must check in before checking out` });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: `${employee.fullName} has already checked out for today` });
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;

    // Automatically calculate working hours formatted string
    attendance.workingHours = formatWorkingHours(attendance.checkIn, checkOutTime);

    // Automatically determine attendance status using IST
    const calculatedStatus = getAttendanceStatusIST(attendance.checkIn, checkOutTime);
    attendance.status = calculatedStatus;
    attendance.attendanceStatus = calculatedStatus;

    await attendance.save();

    employee.availability = 'Leave';
    await employee.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Today's Attendance Status
// @route   GET /api/attendance/today
// @access  Private (Mechanic/Employee/Admin)
export const getTodayAttendance = async (req, res) => {
  try {
    const todayDate = getIndiaDateStr();

    // If specific employee requested
    if (req.query.employeeId) {
      const attendance = await Attendance.findOne({ employeeId: req.query.employeeId, date: todayDate });
      const employee = await Employee.findById(req.query.employeeId);
      return res.json({
        checkedIn: Boolean(attendance && attendance.checkIn),
        checkedOut: Boolean(attendance && attendance.checkOut),
        attendance: attendance || null,
        employee,
      });
    }

    // If all today records requested
    if (req.query.all === 'true') {
      const attendances = await Attendance.find({ date: todayDate }).populate(
        'employeeId',
        'fullName employeeId email role specialization phone status availability'
      );
      return res.json(attendances);
    }

    const employee = await getEmployeeForUser(req.user);
    if (!employee) {
      if (req.user && (req.user.role === 'admin' || req.user.role === 'advisor')) {
        const attendances = await Attendance.find({ date: todayDate }).populate(
          'employeeId',
          'fullName employeeId email role specialization phone status availability'
        );
        return res.json({
          checkedIn: false,
          checkedOut: false,
          attendance: null,
          employee: null,
          allAttendances: attendances,
        });
      }
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const attendance = await Attendance.findOne({ employeeId: employee._id, date: todayDate });

    res.json({
      checkedIn: Boolean(attendance && attendance.checkIn),
      checkedOut: Boolean(attendance && attendance.checkOut),
      attendance: attendance || null,
      employee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Attendance History for Logged-in Mechanic
// @route   GET /api/attendance/my-history
// @access  Private (Mechanic/Employee)
export const getMechanicAttendanceHistory = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const history = await Attendance.find({ employeeId: employee._id })
      .sort({ date: -1 })
      .limit(60);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Admin Attendance Dashboard & Summary
// @route   GET /api/attendance/admin-summary
// @access  Private (Admin/Advisor)
export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const targetDate = req.query.date || getIndiaDateStr();

    // Total active mechanics & employees
    const allEmployees = await Employee.find({ status: 'Active' }).sort({ fullName: 1 });

    const attendanceRecords = await Attendance.find({ date: targetDate }).populate(
      'employeeId',
      'fullName employeeId email role specialization'
    );

    const recordMap = new Map();
    attendanceRecords.forEach((rec) => {
      if (rec.employeeId) {
        recordMap.set(rec.employeeId._id.toString(), rec);
      }
    });

    const todayDate = getIndiaDateStr();
    const isFutureDate = targetDate > todayDate;

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let earlyExitCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unprocessedCount = 0;
    let currentlyAvailableCount = 0;

    const fullAttendanceList = allEmployees.map((emp) => {
      const rec = recordMap.get(emp._id.toString());
      if (rec) {
        const currentStatus = rec.status || rec.attendanceStatus || 'Present';
        if (currentStatus === 'Late') {
          lateCount++;
          presentCount++;
        } else if (currentStatus === 'Half Day') {
          halfDayCount++;
        } else if (currentStatus === 'Early Exit') {
          earlyExitCount++;
        } else if (currentStatus === 'Leave') {
          leaveCount++;
        } else if (currentStatus === 'Absent') {
          absentCount++;
        } else {
          presentCount++;
        }
        
        const isEligibleCheckedIn = Boolean(
          rec.checkIn &&
          !rec.checkOut &&
          currentStatus !== 'Leave' &&
          currentStatus !== 'Absent' &&
          rec.attendanceStatus !== 'Leave' &&
          rec.attendanceStatus !== 'Absent'
        );
        if (isEligibleCheckedIn && targetDate === todayDate) {
          currentlyAvailableCount++;
        }
        
        return {
          employee: emp,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          workingHours: rec.workingHours,
          status: currentStatus,
          attendanceStatus: currentStatus,
          date: targetDate,
          isExplicit: true,
          remarks: rec.remarks || '',
        };
      } else if (isFutureDate) {
        // Future dates should not be marked absent
        unprocessedCount++;
        return {
          employee: emp,
          checkIn: null,
          checkOut: null,
          workingHours: null,
          status: 'Upcoming',
          attendanceStatus: 'Upcoming',
          date: targetDate,
          isExplicit: false,
          remarks: 'Future date - unprocessed',
        };
      } else {
        // Business Rule: Past dates up to today without explicit record are treated as Present by default
        presentCount++;
        return {
          employee: emp,
          checkIn: null,
          checkOut: null,
          workingHours: null,
          status: 'Present (Default)',
          attendanceStatus: 'Present (Default)',
          date: targetDate,
          isExplicit: false,
          isDefault: true,
          remarks: 'Present (Default)',
        };
      }
    });

    res.json({
      date: targetDate,
      isFutureDate,
      totalEmployees: allEmployees.length,
      presentEmployees: presentCount,
      lateEmployees: lateCount,
      halfDayEmployees: halfDayCount,
      earlyExitEmployees: earlyExitCount,
      absentEmployees: absentCount,
      leaveEmployees: leaveCount,
      unprocessedEmployees: unprocessedCount,
      lateArrivals: lateCount, // backwards compatibility
      currentlyAvailable: currentlyAvailableCount,
      attendanceList: fullAttendanceList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Explicitly Record or Update Attendance for an Employee (Admin/Advisor)
// @route   POST /api/attendance/mark
// @access  Private (Admin/Advisor)
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, remarks } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'Employee ID, date, and status are required' });
    }

    const todayDate = getIndiaDateStr();
    if (date > todayDate) {
      return res.status(400).json({ message: 'Attendance cannot be marked for future dates' });
    }

    const validStatuses = ['Present', 'Absent', 'Leave', 'Half Day', 'Late', 'Early Exit'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    // Business Rule: Once official working hours (09:00 AM - 07:00 PM IST) are completed,
    // Half Day Leave cannot be applied or changed for today.
    if (status === 'Half Day' && isSameDayHalfDayLocked(date)) {
      return res.status(400).json({ message: HALF_DAY_LOCK_MESSAGE });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let attendance = await Attendance.findOne({ employeeId, date });

    let checkIn = null;
    let checkOut = null;
    let workingHours = '';

    const isToday = (date === todayDate);

    if (status === 'Present') {
      checkIn = attendance?.checkIn || new Date(`${date}T09:00:00+05:30`);
      // If marking for today, checkOut should be null (they are currently on shift)
      checkOut = isToday ? null : (attendance?.checkOut || new Date(`${date}T17:30:00+05:30`));
      workingHours = isToday ? 'In Progress' : (attendance?.workingHours || '8h 30m');
    } else if (status === 'Half Day') {
      checkIn = attendance?.checkIn || new Date(`${date}T09:00:00+05:30`);
      // When taking half day leave, the employee is checked out
      const standardHalfDayEnd = new Date(`${date}T13:00:00+05:30`);
      const now = new Date();
      if (attendance?.checkOut) {
        checkOut = attendance.checkOut;
      } else if (isToday) {
        checkOut = now > checkIn ? now : standardHalfDayEnd;
      } else {
        checkOut = standardHalfDayEnd;
      }
      workingHours = formatWorkingHours(checkIn, checkOut) || '4h 0m';
    } else if (status === 'Late') {
      checkIn = attendance?.checkIn || new Date(`${date}T09:45:00+05:30`);
      checkOut = isToday ? null : (attendance?.checkOut || new Date(`${date}T17:30:00+05:30`));
      workingHours = isToday ? 'In Progress' : '7h 45m';
    } else {
      // Absent or Leave
      checkIn = null;
      checkOut = null;
      workingHours = '';
    }

    if (attendance) {
      attendance.status = status;
      attendance.attendanceStatus = status;
      attendance.checkIn = checkIn;
      attendance.checkOut = checkOut;
      attendance.workingHours = workingHours;
      attendance.markedBy = req.user._id;
      attendance.markedByRole = req.user.role;
      if (remarks !== undefined) attendance.remarks = remarks;
      await attendance.save();
    } else {
      attendance = new Attendance({
        employeeId,
        date,
        checkIn,
        checkOut,
        workingHours,
        status,
        attendanceStatus: status,
        markedBy: req.user._id,
        markedByRole: req.user.role,
        remarks: remarks || '',
      });
      await attendance.save();
    }

    // Update availability if marked for today
    if (date === todayDate) {
      if (status === 'Absent' || status === 'Leave' || status === 'Half Day') {
        employee.availability = 'Leave';
      } else if (status === 'Present' || status === 'Late') {
        const activeJc = await JobCard.findOne({
          assignedMechanic: employee._id,
          status: { $in: ['Open', 'In Progress', 'Assigned', 'Waiting for Parts'] }
        });
        employee.availability = activeJc ? 'Busy' : 'Available';
      }
      await employee.save();
    }

    res.status(200).json({
      message: `Attendance marked as ${status} successfully for ${employee.fullName} on ${date}`,
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Today's Mechanic Availability for Service Advisor / Admin
// @route   GET /api/attendance/mechanic-availability
// @access  Private (Admin/Advisor)
export const getTodayMechanicAvailability = async (req, res) => {
  try {
    const todayDate = getIndiaDateStr();
    
    // Find all active mechanic employees
    const mechanics = await Employee.find({ role: 'Mechanic', status: 'Active' }).sort({ fullName: 1 });
    const mechanicIds = mechanics.map(m => m._id);

    // Today's attendance records for mechanics
    const attendanceRecords = await Attendance.find({
      date: todayDate,
      employeeId: { $in: mechanicIds }
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach(rec => {
      attendanceMap.set(rec.employeeId.toString(), rec);
    });

    // Active Job Cards assigned to mechanics
    const activeJobCards = await JobCard.find({
      status: { $in: ['Open', 'In Progress', 'Waiting for Parts', 'Assigned'] },
      assignedMechanic: { $in: mechanicIds }
    }).populate('vehicle', 'vehicleNumber brand model');

    const jobCardMap = new Map();
    activeJobCards.forEach(jc => {
      if (jc.assignedMechanic) {
        jobCardMap.set(jc.assignedMechanic.toString(), jc);
      }
    });

    let totalMechanics = mechanics.length;
    let checkedIn = 0;
    let available = 0;
    let busy = 0;
    let notCheckedIn = 0;
    let onLeave = 0;

    const availabilityList = mechanics.map(mech => {
      const att = attendanceMap.get(mech._id.toString());
      const activeJc = jobCardMap.get(mech._id.toString());

      // Mechanic is available ONLY when:
      // role = Mechanic, status = Active, today's attendance exists, checkIn exists, checkOut does NOT exist,
      // and status is not Absent or Leave
      const isCheckedIn = Boolean(
        att &&
        att.checkIn &&
        !att.checkOut &&
        att.status !== 'Leave' &&
        att.status !== 'Absent' &&
        att.attendanceStatus !== 'Leave' &&
        att.attendanceStatus !== 'Absent'
      );

      let status = 'Not Checked In';
      let checkInTime = null;

      if (isCheckedIn) {
        checkedIn++;
        checkInTime = att.checkIn;
        if (activeJc) {
          status = 'Busy';
          busy++;
        } else {
          status = 'Available';
          available++;
        }
      } else if (att && att.checkOut) {
        status = 'Checked Out';
        notCheckedIn++;
      } else if (att && (att.status === 'Leave' || att.attendanceStatus === 'Leave' || att.remarks?.toLowerCase().includes('leave'))) {
        status = 'On Approved Leave';
        onLeave++;
      } else if (att && (att.status === 'Absent' || att.attendanceStatus === 'Absent')) {
        status = 'Absent';
        notCheckedIn++;
      } else {
        status = 'Not Checked In';
        notCheckedIn++;
      }

      return {
        _id: mech._id,
        employeeId: mech.employeeId,
        fullName: mech.fullName,
        specialization: mech.specialization,
        phone: mech.phone,
        checkInTime,
        status,
        activeJobCard: activeJc || null
      };
    });

    res.json({
      date: todayDate,
      totalMechanics,
      checkedIn,
      available,
      busy,
      notCheckedIn,
      onLeave,
      mechanics: availabilityList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
