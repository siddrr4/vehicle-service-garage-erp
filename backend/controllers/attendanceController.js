import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import JobCard from '../models/JobCard.js';

// Helper to get formatted YYYY-MM-DD string
const getFormattedDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to find Employee record linked to logged-in user
const getEmployeeForUser = async (user) => {
  if (!user) return null;
  return await Employee.findOne({
    $or: [{ userRef: user._id }, { email: user.email.toLowerCase() }],
  });
};

// Helper to format working hours string
const formatWorkingHours = (checkIn, checkOut) => {
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const totalMinutes = Math.floor(Math.max(0, diffMs / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

// Helper to determine status from working hours and check-in time
const getAttendanceStatus = (checkInTime, checkOutTime) => {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));

  if (diffHours < 4) {
    return 'Early Exit';
  } else if (diffHours < 8) {
    return 'Half Day';
  } else {
    // Check if check-in was after 09:15 AM
    const hours = checkIn.getHours();
    const minutes = checkIn.getMinutes();
    const isLateCheckIn = hours > 9 || (hours === 9 && minutes > 15);
    return isLateCheckIn ? 'Late' : 'Present';
  }
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

    const todayDate = getFormattedDate();

    // Check if record already exists for today
    let attendance = await Attendance.findOne({ employeeId: employee._id, date: todayDate });
    if (attendance && attendance.checkIn) {
      return res.status(400).json({ message: 'You have already checked in for today' });
    }

    const checkInTime = new Date();
    const hours = checkInTime.getHours();
    const minutes = checkInTime.getMinutes();

    // Check-In allowed from 08:30 AM onwards
    if (hours < 8 || (hours === 8 && minutes < 30)) {
      return res.status(400).json({ message: 'Check-in is only allowed from 08:30 AM onwards' });
    }

    // Late if check-in is after 09:15 AM
    const isLate = hours > 9 || (hours === 9 && minutes > 15);
    const status = isLate ? 'Late' : 'Present';

    const markedByRole = isSelfCheckIn ? 'mechanic' : 'admin';

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

    const todayDate = getFormattedDate();
    const attendance = await Attendance.findOne({ employeeId: employee._id, date: todayDate });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'You must check in before checking out' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'You have already checked out for today' });
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;

    // Automatically calculate working hours formatted string
    attendance.workingHours = formatWorkingHours(attendance.checkIn, checkOutTime);

    // Automatically determine attendance status
    const calculatedStatus = getAttendanceStatus(attendance.checkIn, checkOutTime);
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
// @access  Private (Mechanic/Employee)
export const getTodayAttendance = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const todayDate = getFormattedDate();
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
    const targetDate = req.query.date || getFormattedDate();

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

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let earlyExitCount = 0;
    let absentCount = 0;
    let currentlyAvailableCount = 0;

    const fullAttendanceList = allEmployees.map((emp) => {
      const rec = recordMap.get(emp._id.toString());
      if (rec) {
        const currentStatus = rec.status || rec.attendanceStatus || 'Present';
        if (currentStatus === 'Late') {
          lateCount++;
        } else if (currentStatus === 'Half Day') {
          halfDayCount++;
        } else if (currentStatus === 'Early Exit') {
          earlyExitCount++;
        } else {
          presentCount++;
        }
        
        if (rec.checkIn && !rec.checkOut) {
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
        };
      } else {
        absentCount++;
        return {
          employee: emp,
          checkIn: null,
          checkOut: null,
          workingHours: '',
          status: 'Absent',
          attendanceStatus: 'Absent',
          date: targetDate,
        };
      }
    });

    res.json({
      date: targetDate,
      totalEmployees: allEmployees.length,
      presentEmployees: presentCount,
      lateEmployees: lateCount,
      halfDayEmployees: halfDayCount,
      earlyExitEmployees: earlyExitCount,
      absentEmployees: absentCount,
      lateArrivals: lateCount, // backwards compatibility
      currentlyAvailable: currentlyAvailableCount,
      attendanceList: fullAttendanceList,
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
    const todayDate = getFormattedDate();
    
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
      status: { $in: ['Open', 'In Progress', 'Waiting for Parts'] },
      assignedMechanic: { $in: mechanicIds }
    }).populate('vehicle', 'vehicleNumber brand model');

    const jobCardMap = new Map();
    activeJobCards.forEach(jc => {
      jobCardMap.set(jc.assignedMechanic.toString(), jc);
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

      let status = 'Not Checked In / Absent';
      let checkInTime = null;

      if (att && att.checkIn && !att.checkOut) {
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
      } else if (att && (att.status === 'Leave' || att.remarks?.toLowerCase().includes('leave'))) {
        status = 'On Approved Leave';
        onLeave++;
      } else {
        status = 'Not Checked In / Absent';
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
