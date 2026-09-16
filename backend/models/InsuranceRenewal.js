import mongoose from 'mongoose';

const insuranceRenewalSchema = new mongoose.Schema(
  {
    renewalNumber: {
      type: String,
      unique: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle reference is required'],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    previousInsurance: {
      provider: { type: String, default: '' },
      policyNumber: { type: String, default: '' },
      expiryDate: { type: Date, default: null },
    },
    newInsurance: {
      provider: {
        type: String,
        required: [true, 'New insurance provider is required'],
        trim: true,
      },
      policyNumber: {
        type: String,
        required: [true, 'New policy number is required'],
        trim: true,
      },
      startDate: {
        type: Date,
        required: [true, 'Insurance start date is required'],
      },
      expiryDate: {
        type: Date,
        required: [true, 'Insurance expiry date is required'],
      },
    },
    amount: {
      type: Number,
      required: [true, 'Renewal amount is required'],
      min: [1, 'Renewal amount must be greater than zero'],
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: 'Razorpay',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate renewalNumber (e.g., INS-000001)
insuranceRenewalSchema.pre('save', async function () {
  if (!this.isNew) {
    return;
  }

  const lastRecord = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });

  if (lastRecord && lastRecord.renewalNumber) {
    const lastIdStr = lastRecord.renewalNumber.replace('INS-', '');
    const lastIdNum = parseInt(lastIdStr, 10);

    if (!isNaN(lastIdNum)) {
      this.renewalNumber = `INS-${String(lastIdNum + 1).padStart(6, '0')}`;
    } else {
      this.renewalNumber = 'INS-000001';
    }
  } else {
    this.renewalNumber = 'INS-000001';
  }
});

const InsuranceRenewal = mongoose.model('InsuranceRenewal', insuranceRenewalSchema);

export default InsuranceRenewal;
