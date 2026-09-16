import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'], // Formatted YYYY-MM-DD
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    workingHours: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half Day', 'Early Exit', 'Leave'],
      default: 'Present',
    },
    attendanceStatus: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half Day', 'Early Exit', 'Leave'],
      default: 'Present',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    markedByRole: {
      type: String,
      enum: ['admin', 'mechanic', 'advisor'],
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one attendance record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
