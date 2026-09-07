import mongoose from 'mongoose';

const jobCardSchema = new mongoose.Schema({
  jobNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle is required']
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Service Request is required']
  },
  assignedMechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  complaint: {
    type: String,
    required: [true, 'Complaint is required']
  },
  workDescription: {
    type: String
  },
  serviceType: {
    type: String
  },
  servicesPerformed: [{
    serviceName: { type: String, required: true },
    labourCharge: { type: Number, required: true, default: 0 },
    washingCharge: { type: Number, required: true, default: 0 },
    isFreeService: { type: Boolean, default: false }
  }],
  estimatedCost: {
    type: Number,
    default: 0
  },
  estimatedDeliveryDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'In Progress', 'Waiting for Parts', 'Completed', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  startTime: { type: Date },
  completionTime: { type: Date },
  deliveryTime: { type: Date },
  partsUsed: [{
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SparePart',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    sellingPrice: {
      type: Number,
      required: true
    },
    gstPercent: {
      type: Number,
      required: true,
      default: 18
    },
    fromRequest: {
      type: Boolean,
      default: false
    }
  }],
  partsDeducted: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String
  },
  advisorRecommendation: {
    recommendationText: { type: String },
    recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recommendedAt: { type: Date }
  },
  odometerAtService: {
    type: Number
  }
}, {
  timestamps: true
});

// Auto-generate jobNumber before saving a new document
jobCardSchema.pre('save', async function() {
  if (!this.isNew) {
    return;
  }
  
  // Find the last created job card based on createdAt
  const lastJobCard = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  if (lastJobCard && lastJobCard.jobNumber) {
    // Extract the numeric part, e.g., 'JC-000001' -> 1
    const lastIdStr = lastJobCard.jobNumber.replace('JC-', '');
    const lastIdNum = parseInt(lastIdStr, 10);
    
    if (!isNaN(lastIdNum)) {
      this.jobNumber = `JC-${String(lastIdNum + 1).padStart(6, '0')}`;
    } else {
      this.jobNumber = 'JC-000001';
    }
  } else {
    this.jobNumber = 'JC-000001';
  }
});

const JobCard = mongoose.model('JobCard', jobCardSchema);

export default JobCard;
