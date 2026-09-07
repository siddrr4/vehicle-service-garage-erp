import mongoose from 'mongoose';

const waitingQueueSchema = new mongoose.Schema({
  queueNumber: {
    type: String,
    required: true,
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
  serviceType: {
    type: String,
    required: [true, 'Service type is required']
  },
  problemDescription: {
    type: String,
    required: false
  },
  arrivalTime: {
    type: Date,
    default: Date.now
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Waiting', 'Slot Available', 'Assigned', 'Cancelled'],
    default: 'Waiting'
  },
  assignedMechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false
  },
  assignedSlot: {
    type: String,
    required: false
  },
  appointmentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: false
  }
}, {
  timestamps: true
});

// Auto-generate queue number
waitingQueueSchema.pre('validate', async function(next) {
  if (!this.queueNumber) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      const lastInQueue = await this.constructor.findOne(
        { queueNumber: new RegExp(`^WQ-${dateStr}`) },
        {},
        { sort: { 'createdAt': -1 } }
      );
      
      let nextNum = 1;
      if (lastInQueue && lastInQueue.queueNumber) {
        const lastNumStr = lastInQueue.queueNumber.split('-')[2];
        if (lastNumStr) {
          nextNum = parseInt(lastNumStr, 10) + 1;
        }
      }
      
      this.queueNumber = `WQ-${dateStr}-${String(nextNum).padStart(3, '0')}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const WaitingQueue = mongoose.model('WaitingQueue', waitingQueueSchema);

export default WaitingQueue;
