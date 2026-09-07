import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    role: {
      type: String,
      enum: ['Mechanic', 'Service Advisor'],
      default: 'Mechanic',
      required: [true, 'Role is required'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      default: 'General Repairs',
    },
    experience: {
      type: Number,
      required: [true, 'Experience (in years) is required'],
      min: [0, 'Experience cannot be negative'],
    },
    availability: {
      type: String,
      enum: ['Available', 'Busy', 'Leave'],
      default: 'Available',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate employeeId before saving a new document
employeeSchema.pre('save', async function () {
  if (!this.isNew) {
    return;
  }

  // Find the last created employee based on createdAt
  const lastEmployee = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });

  if (lastEmployee && lastEmployee.employeeId) {
    // Extract the numeric part, e.g., 'EMP-000001' -> 1
    const lastIdStr = lastEmployee.employeeId.replace('EMP-', '');
    const lastIdNum = parseInt(lastIdStr, 10);

    if (!isNaN(lastIdNum)) {
      this.employeeId = `EMP-${String(lastIdNum + 1).padStart(6, '0')}`;
    } else {
      this.employeeId = 'EMP-000001';
    }
  } else {
    this.employeeId = 'EMP-000001';
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
