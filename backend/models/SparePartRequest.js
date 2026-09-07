import mongoose from 'mongoose';

const sparePartRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  jobCardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard',
    required: [true, 'Job Card ID is required']
  },
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Mechanic ID is required']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required']
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle ID is required']
  },
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SparePart',
    required: [true, 'Part ID is required']
  },
  requestedQuantity: {
    type: Number,
    required: [true, 'Requested Quantity is required'],
    min: [1, 'Requested Quantity must be at least 1']
  },
  issuedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  returnedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  returnPendingQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Issued', 'Rejected', 'Pending Return', 'Returned'],
    default: 'Pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  issuedAt: {
    type: Date
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate requestId before saving
sparePartRequestSchema.pre('save', async function() {
  if (!this.requestId) {
    const lastRequest = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    if (lastRequest && lastRequest.requestId) {
      const lastIdStr = lastRequest.requestId.replace('REQ-', '');
      const lastIdNum = parseInt(lastIdStr, 10);
      if (!isNaN(lastIdNum)) {
        this.requestId = `REQ-${String(lastIdNum + 1).padStart(6, '0')}`;
      } else {
        this.requestId = 'REQ-000001';
      }
    } else {
      this.requestId = 'REQ-000001';
    }
  }
});

const SparePartRequest = mongoose.model('SparePartRequest', sparePartRequestSchema);

export default SparePartRequest;
