import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
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
  serviceType: {
    type: String,
    required: [true, 'Service type is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required']
  },
  problemDescription: {
    type: String,
    required: [true, 'Problem description is required']
  },
  serviceAdvisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-In', 'In Progress', 'Completed', 'Cancelled', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  bookingType: {
    type: String,
    enum: ['Online', 'Walk-in'],
    default: 'Online'
  },
  advisorRecommendation: {
    recommendationText: { type: String },
    recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recommendedAt: { type: Date }
  }
}, {
  timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
