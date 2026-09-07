import mongoose from 'mongoose';

const serviceHistorySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  jobCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard',
    required: true,
    unique: true // One ServiceHistory per JobCard
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  serviceDate: {
    type: Date,
    default: Date.now
  },
  odometerReading: {
    type: Number
  },
  isFreeService: {
    type: Boolean,
    default: false
  },
  freeServiceNumber: {
    type: Number
  }
}, {
  timestamps: true
});

const ServiceHistory = mongoose.model('ServiceHistory', serviceHistorySchema);

export default ServiceHistory;
