import Settings from '../models/Settings.js';

// @desc    Get current settings (seeding defaults if none exist)
// @route   GET /api/settings
// @access  Private (Admin/Advisor)
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    
    // Check Razorpay credentials
    const hasRazorpayKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'dummy_key' && process.env.RAZORPAY_KEY_SECRET !== 'dummy_secret');
    const razorpayStatus = hasRazorpayKeys ? 'Configured' : 'Not Configured';

    res.json({
      ...settings.toObject(),
      razorpayStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin/Advisor)
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    // Assign fields
    settings.garageName = req.body.garageName !== undefined ? req.body.garageName : settings.garageName;
    settings.address = req.body.address !== undefined ? req.body.address : settings.address;
    settings.city = req.body.city !== undefined ? req.body.city : settings.city;
    settings.state = req.body.state !== undefined ? req.body.state : settings.state;
    settings.pincode = req.body.pincode !== undefined ? req.body.pincode : settings.pincode;
    settings.phone = req.body.phone !== undefined ? req.body.phone : settings.phone;
    settings.email = req.body.email !== undefined ? req.body.email : settings.email;
    settings.gstin = req.body.gstin !== undefined ? req.body.gstin : settings.gstin;

    settings.invoicePrefix = req.body.invoicePrefix !== undefined ? req.body.invoicePrefix : settings.invoicePrefix;
    settings.invoiceNumbering = req.body.invoiceNumbering !== undefined ? req.body.invoiceNumbering : settings.invoiceNumbering;
    settings.defaultTaxGst = req.body.defaultTaxGst !== undefined ? Number(req.body.defaultTaxGst) : settings.defaultTaxGst;
    settings.showGstin = req.body.showGstin !== undefined ? req.body.showGstin : settings.showGstin;
    settings.showGarageContact = req.body.showGarageContact !== undefined ? req.body.showGarageContact : settings.showGarageContact;

    settings.defaultLabourCharge = req.body.defaultLabourCharge !== undefined ? Number(req.body.defaultLabourCharge) : settings.defaultLabourCharge;
    settings.defaultWashingCharge = req.body.defaultWashingCharge !== undefined ? Number(req.body.defaultWashingCharge) : settings.defaultWashingCharge;

    settings.onlinePaymentEnabled = req.body.onlinePaymentEnabled !== undefined ? req.body.onlinePaymentEnabled : settings.onlinePaymentEnabled;
    settings.acceptedManualMethods = req.body.acceptedManualMethods !== undefined ? req.body.acceptedManualMethods : settings.acceptedManualMethods;

    const updatedSettings = await settings.save();
    
    const hasRazorpayKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'dummy_key' && process.env.RAZORPAY_KEY_SECRET !== 'dummy_secret');
    const razorpayStatus = hasRazorpayKeys ? 'Configured' : 'Not Configured';

    res.json({
      ...updatedSettings.toObject(),
      razorpayStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public/common settings for customer view/invoice rendering
// @route   GET /api/settings/public
// @access  Private (Any logged-in user)
export const getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const hasRazorpayKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'dummy_key' && process.env.RAZORPAY_KEY_SECRET !== 'dummy_secret');
    const razorpayStatus = hasRazorpayKeys ? 'Configured' : 'Not Configured';

    res.json({
      garageName: settings.garageName,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      phone: settings.phone,
      email: settings.email,
      gstin: settings.gstin,
      showGstin: settings.showGstin,
      showGarageContact: settings.showGarageContact,
      defaultLabourCharge: settings.defaultLabourCharge,
      defaultWashingCharge: settings.defaultWashingCharge,
      defaultTaxGst: settings.defaultTaxGst,
      onlinePaymentEnabled: settings.onlinePaymentEnabled,
      acceptedManualMethods: settings.acceptedManualMethods,
      razorpayStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
