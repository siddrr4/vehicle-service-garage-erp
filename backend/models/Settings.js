import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Garage / Business Profile
  garageName: { type: String, default: 'Garage ERP Auto Services' },
  address: { type: String, default: '123 Garage Lane, Industrial Area, Phase II' },
  city: { type: String, default: 'Mumbai' },
  state: { type: String, default: 'Maharashtra' },
  pincode: { type: String, default: '400011' },
  phone: { type: String, default: '+91 98765 43210' },
  email: { type: String, default: 'support@garageerp.com' },
  gstin: { type: String, default: '27AAAAA1111A1Z1' },

  // Invoice Settings
  invoicePrefix: { type: String, default: 'INV' },
  invoiceNumbering: { type: Number, default: 1 },
  defaultTaxGst: { type: Number, default: 18 },
  showGstin: { type: Boolean, default: true },
  showGarageContact: { type: Boolean, default: true },

  // Service Charges
  defaultLabourCharge: { type: Number, default: 500 },
  defaultWashingCharge: { type: Number, default: 300 },

  // Payment Settings
  onlinePaymentEnabled: { type: Boolean, default: false },
  acceptedManualMethods: {
    type: [String],
    enum: ['Cash', 'UPI', 'Card', 'Other'],
    default: ['Cash', 'UPI', 'Card', 'Other']
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
