import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  jobCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard',
    required: true,
    unique: true // One invoice per JobCard
  },
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
  totalParts: {
    type: Number,
    default: 0
  },
  totalLabour: {
    type: Number,
    default: 0
  },
  totalWashing: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid'
  },
  isFreeService: {
    type: Boolean,
    default: false
  },
  freeServiceNumber: {
    type: Number
  },
  placeOfSupply: {
    type: String,
    default: 'Karnataka'
  },
  isInterState: {
    type: Boolean,
    default: false
  },
  amountInWords: {
    type: String
  },
  taxBreakup: {
    partsTaxable: { type: Number, default: 0 },
    partsCgst: { type: Number, default: 0 },
    partsSgst: { type: Number, default: 0 },
    partsIgst: { type: Number, default: 0 },
    partsCess: { type: Number, default: 0 },
    partsTotal: { type: Number, default: 0 },
    servicesTaxable: { type: Number, default: 0 },
    servicesCgst: { type: Number, default: 0 },
    servicesSgst: { type: Number, default: 0 },
    servicesIgst: { type: Number, default: 0 },
    servicesCess: { type: Number, default: 0 },
    servicesTotal: { type: Number, default: 0 },
    totalTaxable: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalCess: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },
  razorpayOrderId: {
    type: String
  },
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Other', 'Razorpay'], required: true },
    transactionId: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String }
  }]
}, {
  timestamps: true
});

// Auto-generate invoiceNumber
invoiceSchema.pre('save', async function() {
  if (!this.isNew) {
    return;
  }
  
  const lastInvoice = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastIdStr = lastInvoice.invoiceNumber.replace('INV-', '');
    const lastIdNum = parseInt(lastIdStr, 10);
    
    if (!isNaN(lastIdNum)) {
      this.invoiceNumber = `INV-${String(lastIdNum + 1).padStart(6, '0')}`;
    } else {
      this.invoiceNumber = 'INV-000001';
    }
  } else {
    this.invoiceNumber = 'INV-000001';
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
