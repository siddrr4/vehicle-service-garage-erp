import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const salaryStructureSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    salaryType: {
      type: String,
      enum: ['Monthly', 'Daily'],
      default: 'Monthly',
      required: [true, 'Salary type is required'],
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative'],
    },
    // Numeric summary
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative'],
    },
    // Optional itemized breakdown
    allowanceItems: {
      type: [itemSchema],
      default: [],
    },
    // Numeric summary
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative'],
    },
    // Optional itemized breakdown
    deductionItems: {
      type: [itemSchema],
      default: [],
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
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

// Pre-save hook to synchronize allowance/deduction sums and dates
salaryStructureSchema.pre('save', function () {
  if (this.allowanceItems && this.allowanceItems.length > 0) {
    this.allowances = this.allowanceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }
  if (this.deductionItems && this.deductionItems.length > 0) {
    this.deductions = this.deductionItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }
  if (this.effectiveDate && !this.effectiveFrom) {
    this.effectiveFrom = this.effectiveDate;
  }
  if (this.effectiveFrom && !this.effectiveDate) {
    this.effectiveDate = this.effectiveFrom;
  }
});

salaryStructureSchema.index({ employee: 1, isActive: 1 });

const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);

export default SalaryStructure;
