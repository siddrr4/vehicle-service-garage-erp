import mongoose from 'mongoose';

const roadsideAssistanceSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  jobCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard'
  },
  breakdownType: {
    type: String,
    enum: [
      'Engine Failure',
      'Flat Tyre',
      'Battery Jumpstart',
      'Accident / Towing',
      'Brake Issue',
      'Electrical Problem',
      'Fuel Outage',
      'Other Breakdown'
    ],
    default: 'Engine Failure'
  },
  problemDescription: {
    type: String,
    required: [true, 'Problem description is required']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required']
  },
  location: {
    latitude: {
      type: Number,
      required: [true, 'Breakdown latitude is required']
    },
    longitude: {
      type: Number,
      required: [true, 'Breakdown longitude is required']
    },
    address: {
      type: String,
      default: ''
    },
    landmark: {
      type: String,
      default: ''
    },
    distanceKm: {
      type: Number,
      required: [true, 'Calculated distance from garage is required']
    }
  },
  diagnosisOutcome: {
    type: String,
    enum: ['Pending Diagnosis', 'On-Site Repair', 'Showroom Pickup'],
    default: 'Pending Diagnosis'
  },
  diagnosisDetails: {
    diagnosisText: { type: String },
    diagnosedAt: { type: Date },
    diagnosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  onSiteRepairDetails: {
    workPerformed: { type: String },
    partsUsed: [{
      partName: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      cost: { type: Number, default: 0 }
    }],
    labourCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    customerConfirmation: {
      confirmed: { type: Boolean, default: false },
      customerName: { type: String },
      confirmedAt: { type: Date },
      feedback: { type: String }
    },
    completedAt: { type: Date }
  },
  pickupDetails: {
    pickupVehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    pickupLocation: {
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
    },
    conditionNotes: { type: String },
    dispatchedAt: { type: Date },
    pickedUpAt: { type: Date },
    arrivedAtShowroomAt: { type: Date },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Dispatched',
      'Assigned',
      'In Progress',
      'Resolved - On-Site Repair',
      'Pickup Dispatched',
      'Vehicle Picked Up',
      'Arrived at Showroom',
      'Completed',
      'Cancelled'
    ],
    default: 'Pending'
  },
  assignedMechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  dispatchedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-generate requestNumber before saving a new document
roadsideAssistanceSchema.pre('save', async function() {
  if (!this.isNew) {
    return;
  }

  const lastReq = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
  if (lastReq && lastReq.requestNumber) {
    const lastIdStr = lastReq.requestNumber.replace('RSA-', '');
    const lastIdNum = parseInt(lastIdStr, 10);
    if (!isNaN(lastIdNum)) {
      this.requestNumber = `RSA-${String(lastIdNum + 1).padStart(6, '0')}`;
    } else {
      this.requestNumber = 'RSA-000001';
    }
  } else {
    this.requestNumber = 'RSA-000001';
  }
});

const RoadsideAssistance = mongoose.model('RoadsideAssistance', roadsideAssistanceSchema);

export default RoadsideAssistance;
