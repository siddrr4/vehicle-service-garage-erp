import Invoice from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import ServiceHistory from '../models/ServiceHistory.js';
import Settings from '../models/Settings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// @desc    Generate a new invoice from a completed Job Card
// @route   POST /api/billing/generate
// @access  Private (Admin/Advisor)
export const generateInvoice = async (req, res) => {
  try {
    const { jobCardId, discount = 0 } = req.body;

    const jobCard = await JobCard.findById(jobCardId)
      .populate('customer')
      .populate('vehicle')
      .populate('partsUsed.part');

    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    if (jobCard.status !== 'Completed' && jobCard.status !== 'Delivered') {
      return res.status(400).json({ message: 'Job Card must be Completed before generating an invoice' });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ jobCard: jobCardId });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice already exists for this Job Card' });
    }

    // Load settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // Determine if it qualifies as a free service based on completed/delivered jobs count for this vehicle
    const completedJobCount = await JobCard.countDocuments({
      vehicle: jobCard.vehicle._id,
      status: { $in: ['Completed', 'Delivered'] },
      _id: { $ne: jobCard._id } // exclude current one if it's already counted in completed
    });

    const isFreeService = completedJobCount < 3;
    const freeServiceNumber = isFreeService ? completedJobCount + 1 : null;

    // Calculate costs
    let totalParts = 0;
    let partsTax = 0;
    
    if (jobCard.partsUsed && jobCard.partsUsed.length > 0) {
      jobCard.partsUsed.forEach(item => {
        const itemTotal = item.quantity * item.sellingPrice;
        totalParts += itemTotal;
        partsTax += itemTotal * (item.gstPercent / 100);
      });
    }

    let totalLabour = 0;
    let totalWashing = 0;

    if (isFreeService) {
      totalLabour = 0;
      totalWashing = 0;
    } else {
      if (jobCard.servicesPerformed && jobCard.servicesPerformed.length > 0) {
        jobCard.servicesPerformed.forEach(srv => {
          totalLabour += srv.labourCharge || 0;
          totalWashing += srv.washingCharge || 0;
        });
      } else {
        // Fallback to settings / estimatedCost if servicesPerformed array is missing/empty
        totalLabour = settings.defaultLabourCharge || 500;
        totalWashing = settings.defaultWashingCharge || 300;
      }
    }

    const defaultTaxRate = settings?.defaultTaxGst || 18;
    const serviceTax = isFreeService ? 0 : ((totalLabour + totalWashing) * (defaultTaxRate / 100));
    const finalTaxAmount = partsTax + serviceTax;
    const grandTotal = (totalParts + totalLabour + totalWashing + finalTaxAmount) - Number(discount);

    const invoice = new Invoice({
      jobCard: jobCard._id,
      customer: jobCard.customer._id,
      vehicle: jobCard.vehicle._id,
      totalParts,
      totalLabour,
      totalWashing,
      discount: Number(discount),
      taxAmount: finalTaxAmount,
      grandTotal,
      balanceDue: grandTotal,
      status: 'Unpaid',
      isFreeService,
      freeServiceNumber
    });

    const createdInvoice = await invoice.save();
    
    // Link invoice to ServiceHistory
    await ServiceHistory.findOneAndUpdate(
      { jobCard: jobCard._id },
      { invoice: createdInvoice._id }
    );
    
    // Populate to return full info
    await createdInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode');
    await createdInvoice.populate('vehicle', 'vehicleNumber brand model');
    await createdInvoice.populate('jobCard');
    
    res.status(201).json(createdInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all invoices
// @route   GET /api/billing
// @access  Private (Admin/Advisor)
export const getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const keyword = req.query.keyword
      ? { invoiceNumber: { $regex: req.query.keyword, $options: 'i' } }
      : {};

    const filterQuery = {};
    if (req.query.status) {
      filterQuery.status = req.query.status;
    }

    const combinedQuery = { ...keyword, ...filterQuery };
    const count = await Invoice.countDocuments(combinedQuery);

    const invoices = await Invoice.find(combinedQuery)
      .populate('customer', 'fullName mobileNumber')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate({
        path: 'jobCard',
        select: 'jobNumber estimatedDeliveryDate status',
        populate: { path: 'assignedMechanic', select: 'fullName' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      invoices,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/billing/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode')
      .populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'partsUsed.part', select: 'partName partNumber manufacturer' },
          { path: 'assignedMechanic', select: 'fullName' },
          { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode' },
          { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading' }
        ]
      });

    if (invoice) {
      if (req.user && req.user.role === 'customer') {
        if (!req.user.customerRef || invoice.customer._id.toString() !== req.user.customerRef.toString()) {
          return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }
      }
      res.json(invoice);
    } else {
      res.status(404).json({ message: 'Invoice not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get invoice by JobCard ID
// @route   GET /api/billing/jobcard/:jobCardId
// @access  Private
export const getInvoiceByJobCard = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ jobCard: req.params.jobCardId })
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode')
      .populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'partsUsed.part', select: 'partName partNumber manufacturer' },
          { path: 'assignedMechanic', select: 'fullName' },
          { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode' },
          { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading' }
        ]
      });

    if (invoice) {
      if (req.user && req.user.role === 'customer') {
        if (!req.user.customerRef || invoice.customer._id.toString() !== req.user.customerRef.toString()) {
          return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }
      }
      res.json(invoice);
    } else {
      res.status(404).json({ message: 'Invoice not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record a payment
// @route   POST /api/billing/:id/pay
// @access  Private (Admin/Advisor)
export const recordPayment = async (req, res) => {
  try {
    const { amount, method, transactionId } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user && req.user.role === 'customer') {
      if (!req.user.customerRef || invoice.customer.toString() !== req.user.customerRef.toString()) {
        return res.status(403).json({ message: 'Not authorized to pay this invoice' });
      }
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({ message: 'Invoice is already fully paid' });
    }

    const payAmount = Number(amount);
    
    if (payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero' });
    }

    if (payAmount > invoice.balanceDue) {
      return res.status(400).json({ message: `Payment cannot exceed balance due of ₹${invoice.balanceDue}` });
    }

    // Add payment record
    invoice.payments.push({
      amount: payAmount,
      method,
      transactionId,
      date: new Date(),
      recordedBy: req.user ? req.user._id : undefined
    });

    // Update totals
    invoice.amountPaid += payAmount;
    invoice.balanceDue = invoice.grandTotal - invoice.amountPaid;

    // Update status
    if (invoice.balanceDue <= 0) {
      invoice.status = 'Paid';
    } else {
      invoice.status = 'Partially Paid';
    }

    const updatedInvoice = await invoice.save();
    
    // Repopulate for frontend
    await updatedInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode');
    await updatedInvoice.populate('vehicle', 'vehicleNumber brand model');
    await updatedInvoice.populate({
      path: 'jobCard',
      populate: [
        { path: 'partsUsed.part', select: 'partName partNumber' },
        { path: 'assignedMechanic', select: 'fullName' }
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in customer's invoices
// @route   GET /api/billing/my-invoices
// @access  Private (Customer)
export const getMyInvoices = async (req, res) => {
  try {
    if (!req.user || !req.user.customerRef) {
      return res.status(404).json({ message: 'Customer profile not linked to this account.' });
    }
    const invoices = await Invoice.find({ customer: req.user.customerRef })
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('jobCard', 'jobNumber status')
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get billing configuration (Razorpay Key ID)
// @route   GET /api/billing/config
// @access  Private
export const getBillingConfig = async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'dummy_key') {
    return res.status(400).json({ message: 'Razorpay payment gateway is not configured.' });
  }
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
  });
};

// @desc    Create Razorpay order for an invoice
// @route   POST /api/billing/:id/create-payment-order
// @access  Private
export const createPaymentOrder = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Verify ownership if customer
    if (req.user && req.user.role === 'customer') {
      const customerId = invoice.customer._id ? invoice.customer._id.toString() : invoice.customer.toString();
      if (!req.user.customerRef || customerId !== req.user.customerRef.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to pay this invoice' });
      }
    }

    // Verify invoice status is Unpaid or Partially Paid
    if (invoice.status === 'Paid' || invoice.balanceDue <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice is already fully paid' });
    }

    // Recalculate and validate payable amount from database (do not blindly trust frontend amount)
    let payAmount = invoice.balanceDue;
    if (req.body.amount !== undefined) {
      const reqAmount = Number(req.body.amount);
      if (!isNaN(reqAmount) && reqAmount > 0 && reqAmount <= invoice.balanceDue) {
        payAmount = reqAmount;
      }
    }

    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount. Amount must be greater than zero.' });
    }

    // Diagnostics checks
    if (!process.env.RAZORPAY_KEY_ID) {
      console.error('Razorpay Error: RAZORPAY_KEY_ID is not configured in backend .env');
      return res.status(500).json({ success: false, message: 'Razorpay configuration error: Key ID is missing.' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay Error: RAZORPAY_KEY_SECRET is not configured in backend .env');
      return res.status(500).json({ success: false, message: 'Razorpay configuration error: Key Secret is missing.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: Math.round(payAmount * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_${invoice.invoiceNumber}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Save the Razorpay order ID against the invoice record
    invoice.razorpayOrderId = order.id;
    await invoice.save();

    res.json({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      invoiceNumber: invoice.invoiceNumber
    });
  } catch (error) {
    // Log detailed diagnostics safe errors
    const rzpErr = error.error || {};
    console.error('=== RAZORPAY ORDER CREATION FAILURE ===');
    console.error(`Endpoint: POST /api/billing/${req.params.id}/create-payment-order`);
    console.error(`Invoice ID: ${req.params.id}`);
    console.error(`Razorpay Error Code: ${rzpErr.code || 'N/A'}`);
    console.error(`Razorpay Error Description: ${rzpErr.description || error.message || 'N/A'}`);
    console.error(`HTTP Status Code: ${error.statusCode || 500}`);
    console.error('=======================================');

    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Unable to create Razorpay order',
      error: rzpErr.description || error.message || 'Razorpay order creation failed.'
    });
  }
};

// @desc    Verify Razorpay payment signature and record payment
// @route   POST /api/billing/:id/verify-payment
// @access  Private
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Verify ownership if customer
    if (req.user && req.user.role === 'customer') {
      if (!req.user.customerRef || invoice.customer.toString() !== req.user.customerRef.toString()) {
        return res.status(403).json({ message: 'Not authorized to pay this invoice' });
      }
    }

    // Duplicate payment protection
    const isDuplicate = invoice.payments.some(
      p => p.razorpayPaymentId === razorpay_payment_id
    );
    if (isDuplicate) {
      return res.status(400).json({ message: 'Payment already recorded' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(400).json({ message: 'Razorpay payment gateway is not configured.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment) {
      return res.status(404).json({ message: 'Razorpay payment not found.' });
    }

    const payAmount = payment.amount / 100; // converted to Rs

    // Check that amount matches invoice balance due and does not exceed it
    if (payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero' });
    }

    if (payAmount > invoice.balanceDue + 0.01) { // small tolerance for floating point numbers
      return res.status(400).json({ message: `Payment amount ₹${payAmount} exceeds balance due of ₹${invoice.balanceDue}` });
    }

    // Add payment record
    let mappedMethod = 'Razorpay';
    if (payment.method) {
      const lowerMethod = payment.method.toLowerCase();
      if (lowerMethod === 'card') {
        mappedMethod = 'Card';
      } else if (lowerMethod === 'upi') {
        mappedMethod = 'UPI';
      } else if (lowerMethod === 'cash') {
        mappedMethod = 'Cash';
      } else {
        mappedMethod = 'Razorpay';
      }
    }

    invoice.payments.push({
      amount: payAmount,
      method: mappedMethod,
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      date: new Date(),
      recordedBy: req.user ? req.user._id : undefined
    });

    // Update totals
    invoice.amountPaid += payAmount;
    invoice.balanceDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);

    // Update status
    if (invoice.balanceDue <= 0.01) {
      invoice.status = 'Paid';
      invoice.balanceDue = 0;
    } else {
      invoice.status = 'Partially Paid';
    }

    const updatedInvoice = await invoice.save();
    
    // Repopulate for frontend
    await updatedInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode');
    await updatedInvoice.populate('vehicle', 'vehicleNumber brand model');
    await updatedInvoice.populate({
      path: 'jobCard',
      populate: [
        { path: 'partsUsed.part', select: 'partName partNumber' },
        { path: 'assignedMechanic', select: 'fullName' }
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to auto generate invoice when Job Card is Completed
export const autoGenerateInvoice = async (jobCard) => {
  try {
    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ jobCard: jobCard._id });
    if (existingInvoice) {
      return existingInvoice;
    }

    // Fully populate the Job Card to get correct customer and vehicle records
    const populatedJobCard = await JobCard.findById(jobCard._id)
      .populate('customer')
      .populate('vehicle')
      .populate('partsUsed.part');

    if (!populatedJobCard) {
      console.error(`Auto invoice failed: Job Card ${jobCard._id} not found.`);
      return null;
    }

    const vehicleId = populatedJobCard.vehicle._id || populatedJobCard.vehicle;
    const customerId = populatedJobCard.customer._id || populatedJobCard.customer;

    // Load settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // Determine if it qualifies as a free service based on completed/delivered jobs count for this vehicle
    const completedJobCount = await JobCard.countDocuments({
      vehicle: vehicleId,
      status: { $in: ['Completed', 'Delivered'] },
      _id: { $ne: populatedJobCard._id }
    });

    const isFreeService = completedJobCount < 3;
    const freeServiceNumber = isFreeService ? completedJobCount + 1 : null;

    // Calculate costs
    let totalParts = 0;
    let partsTax = 0;
    
    if (populatedJobCard.partsUsed && populatedJobCard.partsUsed.length > 0) {
      populatedJobCard.partsUsed.forEach(item => {
        const itemTotal = item.quantity * item.sellingPrice;
        totalParts += itemTotal;
        partsTax += itemTotal * (item.gstPercent / 100);
      });
    }

    let totalLabour = 0;
    let totalWashing = 0;

    if (isFreeService) {
      totalLabour = 0;
      totalWashing = 0;
    } else {
      if (populatedJobCard.servicesPerformed && populatedJobCard.servicesPerformed.length > 0) {
        populatedJobCard.servicesPerformed.forEach(srv => {
          totalLabour += srv.labourCharge !== undefined ? srv.labourCharge : (srv.isFreeService ? 0 : settings.defaultLabourCharge);
          totalWashing += srv.washingCharge !== undefined ? srv.washingCharge : (srv.isFreeService ? 0 : settings.defaultWashingCharge);
        });
      } else {
        const isFree = populatedJobCard.servicesPerformed && populatedJobCard.servicesPerformed.some(srv => srv.isFreeService);
        totalLabour = isFree ? 0 : settings.defaultLabourCharge;
        totalWashing = isFree ? 0 : settings.defaultWashingCharge;
      }
    }

    const defaultTaxRate = settings.defaultTaxGst || 18;
    const serviceTax = isFreeService ? 0 : ((totalLabour + totalWashing) * (defaultTaxRate / 100));
    const finalTaxAmount = partsTax + serviceTax;
    const grandTotal = (totalParts + totalLabour + totalWashing + finalTaxAmount);

    const invoice = new Invoice({
      jobCard: populatedJobCard._id,
      customer: customerId,
      vehicle: vehicleId,
      totalParts,
      totalLabour,
      totalWashing,
      discount: 0,
      taxAmount: finalTaxAmount,
      grandTotal,
      balanceDue: grandTotal,
      status: 'Unpaid',
      isFreeService,
      freeServiceNumber
    });

    const createdInvoice = await invoice.save();
    
    // Link invoice to ServiceHistory
    await ServiceHistory.findOneAndUpdate(
      { jobCard: populatedJobCard._id },
      { invoice: createdInvoice._id }
    );
    
    return createdInvoice;
  } catch (error) {
    console.error('Auto invoice generation failed:', error);
    return null;
  }
};
