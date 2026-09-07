import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^\d{10}$/, 'Mobile number must be exactly 10 digits'],
    trim: true,
  },
  emailAddress: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  city: {
    type: String,
    required: [true, 'City is required'],
  },
  state: {
    type: String,
    required: [true, 'State is required'],
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
  },
  aadharNumber: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\d{12}$/, 'Aadhar number must be exactly 12 digits'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
});

// Auto-generate customerId before saving a new document
customerSchema.pre('save', async function() {
  if (!this.isNew) {
    return;
  }
  
  // Find the last created customer based on createdAt
  const lastCustomer = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  if (lastCustomer && lastCustomer.customerId) {
    // Extract the numeric part, e.g., 'CUS-0002' -> 2
    const lastIdStr = lastCustomer.customerId.replace('CUS-', '');
    const lastIdNum = parseInt(lastIdStr, 10);
    
    if (!isNaN(lastIdNum)) {
      this.customerId = `CUS-${String(lastIdNum + 1).padStart(4, '0')}`;
    } else {
      this.customerId = 'CUS-0001';
    }
  } else {
    this.customerId = 'CUS-0001';
  }
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
