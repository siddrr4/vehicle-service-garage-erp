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
  insuranceNumber: {
    type: String,
    maxLength: [20, 'Insurance number cannot exceed 20 characters']
  },
  insuranceExpiryDate: {
    type: Date
  },
  warrantyExpiryDate: {
    type: Date
  },
  engineNumber: {
    type: String
  },
  chassisNumber: {
    type: String,
    maxLength: [17, 'Chassis number cannot exceed 17 characters']
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

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
