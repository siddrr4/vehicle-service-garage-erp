import Invoice from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import ServiceHistory from '../models/ServiceHistory.js';
import Settings from '../models/Settings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  notifyCustomer,
  notifyAdminsAndAdvisors,
} from '../services/notificationService.js';

// State GST Codes mapping
export const STATE_GST_CODES = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'daman and diu': '25',
  'dadra and nagar haveli': '26',
  'maharashtra': '27',
  'andhra pradesh': '28',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'andaman and nicobar islands': '35',
  'telangana': '36',
  'andhra pradesh (new)': '37',
  'ladakh': '38'
};

export const getStateCode = (stateName) => {
  if (!stateName) return '';
  const normalized = stateName.trim().toLowerCase();
  return STATE_GST_CODES[normalized] || '';
};

// Convert number to Indian Currency Words (INR)
export function convertNumberToWordsINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rupees Zero Only';
  const num = Math.round(Number(amount) * 100) / 100;
  if (num === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o > 0 ? '-' + ones[o] : '');
  }

  function convertThreeDigits(n) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (h > 0) {
      str += ones[h] + ' Hundred';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const [rupeePartStr, paisePartStr] = num.toFixed(2).split('.');
  let rupeePart = parseInt(rupeePartStr, 10);
  const paisePart = parseInt(paisePartStr, 10);

  let words = '';

  const crore = Math.floor(rupeePart / 10000000);
  rupeePart %= 10000000;

  const lakh = Math.floor(rupeePart / 100000);
  rupeePart %= 100000;

  const thousand = Math.floor(rupeePart / 1000);
  rupeePart %= 1000;

  const remainder = rupeePart;

  if (crore > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(crore) + ' Crore';
  }
  if (lakh > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(lakh) + ' Lakh';
  }
  if (thousand > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(thousand) + ' Thousand';
  }
  if (remainder > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(remainder);
  }

  if (!words) {
    words = 'Zero';
  }

  let finalStr = `Rupees ${words.trim()}`;
  if (paisePart > 0) {
    finalStr += ` and ${convertTwoDigits(paisePart)} Paise`;
  }
  finalStr += ' Only';
  return finalStr;
}

// Compute comprehensive automotive GST breakdown for parts and services
export function computeInvoiceTaxBreakdown({ jobCard, customer, settings, discount = 0, isFreeService = false }) {
  const round = (val) => Math.round((Number(val) || 0) * 100) / 100;

  const garageState = (settings && settings.state) ? settings.state.trim() : 'Karnataka';
  const customerState = (customer && customer.state) ? customer.state.trim() : garageState;
  const isInterState = garageState.toLowerCase() !== customerState.toLowerCase();
  const stateCode = getStateCode(customerState);
  const placeOfSupply = stateCode ? `${customerState} (${stateCode})` : customerState;

  const defaultGstRate = Number(settings?.defaultTaxGst) || 18;

  // 1. Calculate Parts Breakdown
  let partsTaxable = 0;
  let partsCgst = 0;
  let partsSgst = 0;
  let partsIgst = 0;
  let partsCess = 0;
  let partsTotal = 0;

  if (jobCard && jobCard.partsUsed && jobCard.partsUsed.length > 0) {
    jobCard.partsUsed.forEach(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.sellingPrice) || 0;
      const gross = qty * rate;
      const itemDiscount = 0;
      const taxable = gross - itemDiscount;
      const gstRate = item.gstPercent !== undefined && item.gstPercent !== null 
        ? Number(item.gstPercent) 
        : defaultGstRate;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = taxable * (gstRate / 100);
      } else {
        cgst = taxable * ((gstRate / 2) / 100);
        sgst = taxable * ((gstRate / 2) / 100);
      }

      const cess = 0;
      const lineTotal = taxable + cgst + sgst + igst + cess;

      partsTaxable += taxable;
      partsCgst += cgst;
      partsSgst += sgst;
      partsIgst += igst;
      partsCess += cess;
      partsTotal += lineTotal;
    });
  }

  // 2. Calculate Services Breakdown
  let totalLabour = 0;
  let totalWashing = 0;
  let servicesTaxable = 0;
  let servicesCgst = 0;
  let servicesSgst = 0;
  let servicesIgst = 0;
  let servicesCess = 0;
  let servicesTotal = 0;

  if (!isFreeService) {
    if (jobCard && jobCard.servicesPerformed && jobCard.servicesPerformed.length > 0) {
      jobCard.servicesPerformed.forEach(srv => {
        const labour = Number(srv.labourCharge) || 0;
        const washing = Number(srv.washingCharge) || 0;
        totalLabour += labour;
        totalWashing += washing;
      });
    } else {
      totalLabour = Number(settings?.defaultLabourCharge) || 500;
      totalWashing = Number(settings?.defaultWashingCharge) || 300;
    }

    servicesTaxable = totalLabour + totalWashing;
    if (isInterState) {
      servicesIgst = servicesTaxable * (defaultGstRate / 100);
    } else {
      servicesCgst = servicesTaxable * ((defaultGstRate / 2) / 100);
      servicesSgst = servicesTaxable * ((defaultGstRate / 2) / 100);
    }
    servicesTotal = servicesTaxable + servicesCgst + servicesSgst + servicesIgst + servicesCess;
  }

  // 3. Matrix Totals
  const totalTaxable = round(partsTaxable + servicesTaxable);
  const totalCgst = round(partsCgst + servicesCgst);
  const totalSgst = round(partsSgst + servicesSgst);
  const totalIgst = round(partsIgst + servicesIgst);
  const totalCess = round(partsCess + servicesCess);
  const taxAmount = round(totalCgst + totalSgst + totalIgst + totalCess);
  const totalDiscount = round(Number(discount) || 0);

  const grandTotal = Math.max(0, round(totalTaxable + taxAmount - totalDiscount));
  const amountInWords = convertNumberToWordsINR(grandTotal);

  return {
    placeOfSupply,
    isInterState,
    amountInWords,
    totalParts: round(partsTaxable),
    totalLabour: round(totalLabour),
    totalWashing: round(totalWashing),
    taxAmount,
    grandTotal,
    taxBreakup: {
      partsTaxable: round(partsTaxable),
      partsCgst: round(partsCgst),
      partsSgst: round(partsSgst),
      partsIgst: round(partsIgst),
      partsCess: round(partsCess),
      partsTotal: round(partsTotal),
      servicesTaxable: round(servicesTaxable),
      servicesCgst: round(servicesCgst),
      servicesSgst: round(servicesSgst),
      servicesIgst: round(servicesIgst),
      servicesCess: round(servicesCess),
      servicesTotal: round(servicesTotal),
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalCess,
      totalDiscount,
      grandTotal
    }
  };
}

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

    // Calculate GST tax breakdown
    const breakdown = computeInvoiceTaxBreakdown({
      jobCard,
      customer: jobCard.customer,
      settings,
      discount: Number(discount) || 0,
      isFreeService
    });

    const invoice = new Invoice({
      jobCard: jobCard._id,
      customer: jobCard.customer._id,
      vehicle: jobCard.vehicle._id,
      totalParts: breakdown.totalParts,
      totalLabour: breakdown.totalLabour,
      totalWashing: breakdown.totalWashing,
      discount: breakdown.taxBreakup.totalDiscount,
      taxAmount: breakdown.taxAmount,
      grandTotal: breakdown.grandTotal,
      balanceDue: breakdown.grandTotal,
      status: 'Unpaid',
      isFreeService,
      freeServiceNumber,
      placeOfSupply: breakdown.placeOfSupply,
      isInterState: breakdown.isInterState,
      amountInWords: breakdown.amountInWords,
      taxBreakup: breakdown.taxBreakup
    });

    const createdInvoice = await invoice.save();
    
    // Link invoice to ServiceHistory
    await ServiceHistory.findOneAndUpdate(
      { jobCard: jobCard._id },
      { invoice: createdInvoice._id }
    );

    await notifyCustomer(createdInvoice.customer, {
      type: 'INVOICE_GENERATED',
      title: 'Your service invoice is ready',
      message: `Invoice ${createdInvoice.invoiceNumber} for ₹${createdInvoice.grandTotal} is ready for payment.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: createdInvoice._id,
    });
    
    // Populate to return full info
    await createdInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin');
    await createdInvoice.populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission');
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
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin')
      .populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'partsUsed.part', select: 'partName partNumber manufacturer hsnCode unitPrice sellingPrice' },
          { path: 'assignedMechanic', select: 'fullName employeeId mobileNumber' },
          { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode gstin' },
          { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission' },
          {
            path: 'serviceRequest',
            populate: { path: 'serviceAdvisor', select: 'fullName name email mobile' }
          }
        ]
      });

    if (invoice) {
      if (req.user && req.user.role === 'customer') {
        if (!req.user.customerRef || invoice.customer._id.toString() !== req.user.customerRef.toString()) {
          return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }
      }

      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }

      const invoiceObj = invoice.toObject();

      // Ensure taxBreakup, placeOfSupply, isInterState, and amountInWords are populated
      if (!invoiceObj.taxBreakup || !invoiceObj.taxBreakup.totalTaxable) {
        const computed = computeInvoiceTaxBreakdown({
          jobCard: invoiceObj.jobCard,
          customer: invoiceObj.customer,
          settings,
          discount: invoiceObj.discount || 0,
          isFreeService: invoiceObj.isFreeService
        });
        invoiceObj.taxBreakup = invoiceObj.taxBreakup || computed.taxBreakup;
        invoiceObj.placeOfSupply = invoiceObj.placeOfSupply || computed.placeOfSupply;
        invoiceObj.isInterState = invoiceObj.isInterState !== undefined ? invoiceObj.isInterState : computed.isInterState;
        invoiceObj.amountInWords = invoiceObj.amountInWords || computed.amountInWords;
      }

      invoiceObj.garageSettings = {
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
        defaultTaxGst: settings.defaultTaxGst
      };

      res.json(invoiceObj);
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
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin')
      .populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'partsUsed.part', select: 'partName partNumber manufacturer hsnCode unitPrice sellingPrice' },
          { path: 'assignedMechanic', select: 'fullName employeeId mobileNumber' },
          { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode gstin' },
          { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission' },
          {
            path: 'serviceRequest',
            populate: { path: 'serviceAdvisor', select: 'fullName name email mobile' }
          }
        ]
      });

    if (invoice) {
      if (req.user && req.user.role === 'customer') {
        if (!req.user.customerRef || invoice.customer._id.toString() !== req.user.customerRef.toString()) {
          return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }
      }

      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }

      const invoiceObj = invoice.toObject();

      if (!invoiceObj.taxBreakup || !invoiceObj.taxBreakup.totalTaxable) {
        const computed = computeInvoiceTaxBreakdown({
          jobCard: invoiceObj.jobCard,
          customer: invoiceObj.customer,
          settings,
          discount: invoiceObj.discount || 0,
          isFreeService: invoiceObj.isFreeService
        });
        invoiceObj.taxBreakup = invoiceObj.taxBreakup || computed.taxBreakup;
        invoiceObj.placeOfSupply = invoiceObj.placeOfSupply || computed.placeOfSupply;
        invoiceObj.isInterState = invoiceObj.isInterState !== undefined ? invoiceObj.isInterState : computed.isInterState;
        invoiceObj.amountInWords = invoiceObj.amountInWords || computed.amountInWords;
      }

      invoiceObj.garageSettings = {
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
        defaultTaxGst: settings.defaultTaxGst
      };

      res.json(invoiceObj);
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

    await notifyCustomer(updatedInvoice.customer, {
      type: 'PAYMENT_SUCCESS',
      title: 'Payment successful',
      message: `Payment of ₹${payAmount} received for Invoice ${updatedInvoice.invoiceNumber}. Remaining balance: ₹${updatedInvoice.balanceDue}.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: updatedInvoice._id,
    });

    await notifyAdminsAndAdvisors({
      type: 'PAYMENT_SUCCESS',
      title: 'Payment received',
      message: `Payment of ₹${payAmount} recorded for Invoice ${updatedInvoice.invoiceNumber} via ${method}.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: updatedInvoice._id,
    });
    
    // Repopulate for frontend
    await updatedInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin');
    await updatedInvoice.populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission');
    await updatedInvoice.populate({
      path: 'jobCard',
      populate: [
        { path: 'partsUsed.part', select: 'partName partNumber manufacturer hsnCode unitPrice sellingPrice' },
        { path: 'assignedMechanic', select: 'fullName employeeId mobileNumber' },
        { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode gstin' },
        { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission' },
        {
          path: 'serviceRequest',
          populate: { path: 'serviceAdvisor', select: 'fullName name email mobile' }
        }
      ]
    });

    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    const invoiceObj = updatedInvoice.toObject();
    if (!invoiceObj.taxBreakup || !invoiceObj.taxBreakup.totalTaxable) {
      const computed = computeInvoiceTaxBreakdown({
        jobCard: invoiceObj.jobCard,
        customer: invoiceObj.customer,
        settings,
        discount: invoiceObj.discount || 0,
        isFreeService: invoiceObj.isFreeService
      });
      invoiceObj.taxBreakup = invoiceObj.taxBreakup || computed.taxBreakup;
      invoiceObj.placeOfSupply = invoiceObj.placeOfSupply || computed.placeOfSupply;
      invoiceObj.isInterState = invoiceObj.isInterState !== undefined ? invoiceObj.isInterState : computed.isInterState;
      invoiceObj.amountInWords = invoiceObj.amountInWords || computed.amountInWords;
    }

    invoiceObj.garageSettings = {
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
      defaultTaxGst: settings.defaultTaxGst
    };

    res.json(invoiceObj);
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

    await notifyCustomer(updatedInvoice.customer, {
      type: 'PAYMENT_SUCCESS',
      title: 'Payment successful',
      message: `Online payment of ₹${payAmount} received for Invoice ${updatedInvoice.invoiceNumber}. Remaining balance: ₹${updatedInvoice.balanceDue}.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: updatedInvoice._id,
    });

    await notifyAdminsAndAdvisors({
      type: 'PAYMENT_SUCCESS',
      title: 'Payment received',
      message: `Online Razorpay payment of ₹${payAmount} received for Invoice ${updatedInvoice.invoiceNumber}.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: updatedInvoice._id,
    });
    
    // Repopulate for frontend
    await updatedInvoice.populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin');
    await updatedInvoice.populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission');
    await updatedInvoice.populate({
      path: 'jobCard',
      populate: [
        { path: 'partsUsed.part', select: 'partName partNumber manufacturer hsnCode unitPrice sellingPrice' },
        { path: 'assignedMechanic', select: 'fullName employeeId mobileNumber' },
        { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode gstin' },
        { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission' },
        {
          path: 'serviceRequest',
          populate: { path: 'serviceAdvisor', select: 'fullName name email mobile' }
        }
      ]
    });

    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    const invoiceObj = updatedInvoice.toObject();
    if (!invoiceObj.taxBreakup || !invoiceObj.taxBreakup.totalTaxable) {
      const computed = computeInvoiceTaxBreakdown({
        jobCard: invoiceObj.jobCard,
        customer: invoiceObj.customer,
        settings,
        discount: invoiceObj.discount || 0,
        isFreeService: invoiceObj.isFreeService
      });
      invoiceObj.taxBreakup = invoiceObj.taxBreakup || computed.taxBreakup;
      invoiceObj.placeOfSupply = invoiceObj.placeOfSupply || computed.placeOfSupply;
      invoiceObj.isInterState = invoiceObj.isInterState !== undefined ? invoiceObj.isInterState : computed.isInterState;
      invoiceObj.amountInWords = invoiceObj.amountInWords || computed.amountInWords;
    }

    invoiceObj.garageSettings = {
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
      defaultTaxGst: settings.defaultTaxGst
    };

    res.json(invoiceObj);
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

    // Calculate GST tax breakdown
    const breakdown = computeInvoiceTaxBreakdown({
      jobCard: populatedJobCard,
      customer: populatedJobCard.customer,
      settings,
      discount: 0,
      isFreeService
    });

    const invoice = new Invoice({
      jobCard: populatedJobCard._id,
      customer: customerId,
      vehicle: vehicleId,
      totalParts: breakdown.totalParts,
      totalLabour: breakdown.totalLabour,
      totalWashing: breakdown.totalWashing,
      discount: breakdown.taxBreakup.totalDiscount,
      taxAmount: breakdown.taxAmount,
      grandTotal: breakdown.grandTotal,
      balanceDue: breakdown.grandTotal,
      status: 'Unpaid',
      isFreeService,
      freeServiceNumber,
      placeOfSupply: breakdown.placeOfSupply,
      isInterState: breakdown.isInterState,
      amountInWords: breakdown.amountInWords,
      taxBreakup: breakdown.taxBreakup
    });

    const createdInvoice = await invoice.save();
    
    // Link invoice to ServiceHistory
    await ServiceHistory.findOneAndUpdate(
      { jobCard: populatedJobCard._id },
      { invoice: createdInvoice._id }
    );

    await notifyCustomer(createdInvoice.customer, {
      type: 'INVOICE_GENERATED',
      title: 'Your service invoice is ready',
      message: `Invoice ${createdInvoice.invoiceNumber} for ₹${createdInvoice.grandTotal} is ready for payment.`,
      relatedEntityType: 'Invoice',
      relatedEntityId: createdInvoice._id,
    });
    
    return createdInvoice;
  } catch (error) {
    console.error('Auto invoice generation failed:', error);
    return null;
  }
};
