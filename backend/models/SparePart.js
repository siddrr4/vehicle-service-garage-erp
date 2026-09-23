import mongoose from 'mongoose';

const sparePartSchema = new mongoose.Schema({
  partNumber: {
    type: String,
    unique: true
  },
  partName: {
    type: String,
    required: [true, 'Part Name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Engine Parts',
      'Brake System',
      'Suspension',
      'Electrical',
      'Filters',
      'Oils & Lubricants',
      'Battery',
      'Tyres & Wheels',
      'Cooling System',
      'Transmission',
      'Accessories'
    ]
  },
  compatibleVehicleBrands: {
    type: [String],
    required: [true, 'Compatible Vehicle Brands is required']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit Price is required'],
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling Price is required'],
    min: 0
  },
  quantityAvailable: {
    type: Number,
    required: [true, 'Quantity Available is required'],
    min: 0,
    default: 0
  },
  minimumStockLevel: {
    type: Number,
    required: [true, 'Minimum Stock Level is required'],
    min: 0,
    default: 5
  },
  rackLocation: {
    type: String,
    required: [true, 'Rack Location is required'],
    trim: true
  },
  supplier: {
    type: String,
    required: [true, 'Supplier is required'],
    trim: true
  },
  warranty: {
    type: String,
    required: [true, 'Warranty is required'],
    trim: true
  },
  gstPercent: {
    type: Number,
    required: [true, 'GST Percentage is required'],
    min: 0,
    default: 18
  },
  hsnCode: {
    type: String,
    default: '8708',
    trim: true
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  stockLastUpdated: {
    type: Date,
    default: Date.now
  },
  stockHistory: [{
    action: {
      type: String,
      enum: ['Issued', 'Returned', 'Stock Added', 'Stock Removed', 'Stock Used']
    },
    quantity: {
      type: Number,
      required: true
    },
    mechanicName: {
      type: String,
      required: false
    },
    jobCardNumber: {
      type: String,
      required: false
    },
    date: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: String,
      required: true
    },
    remarks: {
      type: String
    }
  }]
}, {
  timestamps: true
});

// Auto-generate partNumber and update status before saving
sparePartSchema.pre('save', async function() {
  // Update status based on quantity
  if (this.quantityAvailable <= 0) {
    this.status = 'Out of Stock';
  } else if (this.quantityAvailable < this.minimumStockLevel) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }

  // Update stockLastUpdated when creating a new part or when quantityAvailable is modified
  if (this.isNew) {
    if (!this.stockLastUpdated) {
      this.stockLastUpdated = new Date();
    }
  } else if (this.isModified('quantityAvailable')) {
    this.stockLastUpdated = new Date();
  }

  // Generate partNumber if not set
  if (!this.partNumber) {
    const lastPart = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    if (lastPart && lastPart.partNumber) {
      const lastIdStr = lastPart.partNumber.replace('PART-', '');
      const lastIdNum = parseInt(lastIdStr, 10);
      if (!isNaN(lastIdNum)) {
        this.partNumber = `PART-${String(lastIdNum + 1).padStart(6, '0')}`;
      } else {
        this.partNumber = 'PART-000001';
      }
    } else {
      this.partNumber = 'PART-000001';
    }
  }
});

const SparePart = mongoose.model('SparePart', sparePartSchema);

export default SparePart;
