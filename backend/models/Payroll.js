import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    salaryStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure',
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
    salaryType: {
      type: String,
      enum: ['Monthly', 'Daily'],
      default: 'Monthly',
      required: true,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    totalWorkingDays: {
      type: Number,
      default: 0,
    },
    workingDaysConsidered: {
      type: Number,
      default: 0,
    },
    futureWorkingDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      required: true,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    calculatedUpTo: {
      type: String,
      default: '',
    },
    basicSalary: {
      type: Number,
      required: true,
      min: [0, 'Basic salary cannot be negative'],
    },
    monthlyBasicSalary: {
      type: Number,
      default: 0,
      min: [0, 'Monthly basic salary cannot be negative'],
    },
    perDaySalary: {
      type: Number,
      default: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative'],
    },
    totalAllowances: {
      type: Number,
      default: 0,
    },
    allowancesBreakdown: {
      type: [itemSchema],
      default: [],
    },
    attendanceDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Attendance deduction cannot be negative'],
    },
    otherDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Other deductions cannot be negative'],
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    deductionsBreakdown: {
      type: [itemSchema],
      default: [],
    },
    grossEarnings: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: [0, 'Net salary cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
    },
    transactionReference: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    paymentRemarks: {
      type: String,
      default: '',
      trim: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

payrollSchema.pre('save', function () {
  if (this.workingDays && !this.totalWorkingDays) {
    this.totalWorkingDays = this.workingDays;
  }
  if (this.totalWorkingDays && !this.workingDays) {
    this.workingDays = this.totalWorkingDays;
  }
  if (this.allowances && !this.totalAllowances) {
    this.totalAllowances = this.allowances;
  }
  if (this.totalAllowances && !this.allowances) {
    this.allowances = this.totalAllowances;
  }
  if (this.remarks && !this.paymentRemarks) {
    this.paymentRemarks = this.remarks;
  }
});

// Compound unique index ensuring one payroll record per employee per month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
