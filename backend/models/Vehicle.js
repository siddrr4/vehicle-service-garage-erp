import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Vehicle must belong to a customer']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required']
  },
  model: {
    type: String,
    required: [true, 'Model is required']
  },
  manufacturingYear: {
    type: Number,
    required: [true, 'Manufacturing year is required']
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'],
    required: [true, 'Fuel type is required']
  },
  transmission: {
    type: String,
    enum: ['Manual', 'Automatic'],
    required: [true, 'Transmission type is required']
  },
  registrationDate: {
    type: Date,
    required: [true, 'Registration date is required']
  },
  insuranceProvider: {
    type: String,
    trim: true,
  },
  insuranceNumber: {
    type: String,
    maxLength: [50, 'Insurance number cannot exceed 50 characters'],
    trim: true,
    uppercase: true,
  },
  insuranceStartDate: {
    type: Date,
  },
  insuranceExpiryDate: {
    type: Date
  },
  warrantyExpiryDate: {
    type: Date
  },
  engineNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  chassisNumber: {
    type: String,
    maxLength: [17, 'Chassis number cannot exceed 17 characters'],
    trim: true,
    uppercase: true,
  },
  currentOdometerReading: {
    type: Number,
    required: [true, 'Current odometer reading is required'],
    min: [0, 'Odometer reading cannot be negative']
  },
  purchaseType: {
    type: String,
    enum: ['New', 'Used'],
    default: 'Used'
  },
  initialOdometer: {
    type: Number,
    default: 0
  },
  freeServicesEntitled: {
    type: Number,
    default: 0
  },
  freeServicesUsed: {
    type: Number,
    default: 0
  },
  freeServiceHistory: [{
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' },
    date: { type: Date },
    odometer: { type: Number },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

// Partial unique indexes for optional identification numbers (non-empty strings only)
vehicleSchema.index(
  { chassisNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { chassisNumber: { $type: 'string', $gt: '' } },
  }
);

vehicleSchema.index(
  { engineNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { engineNumber: { $type: 'string', $gt: '' } },
  }
);

vehicleSchema.index(
  { insuranceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { insuranceNumber: { $type: 'string', $gt: '' } },
  }
);

// Pre-save hook: ensure blank strings are converted to undefined
vehicleSchema.pre('save', function () {
  if (this.chassisNumber !== undefined && (this.chassisNumber === null || (typeof this.chassisNumber === 'string' && this.chassisNumber.trim() === ''))) {
    this.chassisNumber = undefined;
  }
  if (this.engineNumber !== undefined && (this.engineNumber === null || (typeof this.engineNumber === 'string' && this.engineNumber.trim() === ''))) {
    this.engineNumber = undefined;
  }
  if (this.insuranceNumber !== undefined && (this.insuranceNumber === null || (typeof this.insuranceNumber === 'string' && this.insuranceNumber.trim() === ''))) {
    this.insuranceNumber = undefined;
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
