import Razorpay from 'razorpay';
import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import InsuranceRenewal from '../models/InsuranceRenewal.js';
import Notification from '../models/Notification.js';
import Settings from '../models/Settings.js';
import {
  notifyCustomer,
  notifyAdminsAndAdvisors,
} from '../services/notificationService.js';
import { getIndiaStartOfDay, getIndiaDateStr, formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * Check if the authenticated user is authorized for a vehicle's customer
 */
const isAuthorizedForVehicle = (user, vehicleCustomer) => {
  if (!user) return false;
  if (['admin', 'advisor'].includes(user.role)) return true;

  if (user.role === 'customer') {
    const custId = vehicleCustomer._id ? vehicleCustomer._id.toString() : vehicleCustomer.toString();
    if (user.customerRef && user.customerRef.toString() === custId) return true;
    if (vehicleCustomer.userId && vehicleCustomer.userId.toString() === user._id.toString()) return true;
  }

  return false;
};

/**
 * @desc    Get vehicle insurance & customer details for renewal workbench
 * @route   GET /api/insurance-renewals/vehicle/:vehicleId
 * @access  Private
 */
export const getVehicleInsuranceDetails = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId).populate(
      'customer',
      'fullName mobileNumber emailAddress address city state pincode userId'
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (!isAuthorizedForVehicle(req.user, vehicle.customer)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view or renew insurance for this vehicle',
      });
    }

    // Determine current status and remaining days
    let insuranceStatus = 'Not Registered';
    let daysRemaining = null;

    if (vehicle.insuranceExpiryDate) {
      const today = getIndiaStartOfDay();
      const expiry = getIndiaStartOfDay(vehicle.insuranceExpiryDate);
      const diffMs = expiry.getTime() - today.getTime();
      daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        insuranceStatus = 'Expired';
      } else if (daysRemaining <= 30) {
        insuranceStatus = 'Expiring Soon';
      } else {
        insuranceStatus = 'Active';
      }
    }

    // Fetch previous completed renewal if any
    const lastRenewal = await InsuranceRenewal.findOne({
      vehicle: vehicle._id,
      paymentStatus: 'Completed',
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      vehicle: {
        _id: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        manufacturingYear: vehicle.manufacturingYear,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        currentOdometerReading: vehicle.currentOdometerReading,
        insuranceProvider: vehicle.insuranceProvider || '',
        insuranceNumber: vehicle.insuranceNumber || '',
        insuranceStartDate: vehicle.insuranceStartDate || null,
        insuranceExpiryDate: vehicle.insuranceExpiryDate || null,
      },
      customer: vehicle.customer,
      currentStatus: insuranceStatus,
      daysRemaining,
      lastRenewal,
    });
  } catch (error) {
    console.error('Error in getVehicleInsuranceDetails:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create Razorpay Test Mode order for insurance renewal
 * @route   POST /api/insurance-renewals/create-order
 * @access  Private
 */
export const createRenewalOrder = async (req, res) => {
  try {
    const { vehicleId, provider, policyNumber, startDate, expiryDate, amount } = req.body;

    // Strict Field Validations
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'Vehicle ID is required' });
    }
    if (!provider || !provider.trim()) {
      return res.status(400).json({ success: false, message: 'New insurance provider is required' });
    }
    if (!policyNumber || !policyNumber.trim()) {
      return res.status(400).json({ success: false, message: 'New policy number is required' });
    }
    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Insurance start date is required' });
    }
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'Insurance expiry date is required' });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(expiryDate);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or expiry date format' });
    }

    if (eDate <= sDate) {
      return res.status(400).json({
        success: false,
        message: 'Insurance expiry date must be strictly after the start date',
      });
    }

    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid renewal premium amount.',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Renewal premium amount cannot be ₹0 or negative.',
      });
    }

    if (numAmount < 1001 || numAmount > 1999) {
      return res.status(400).json({
        success: false,
        message: 'Renewal premium quotation must be between ₹1,001 and ₹1,999 for demo policy renewals.',
      });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('customer');
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (!isAuthorizedForVehicle(req.user, vehicle.customer)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create renewal order for this vehicle',
      });
    }

    // Diagnostics checks for Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'Razorpay configuration error: Gateway credentials are missing.',
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const cleanReg = vehicle.vehicleNumber.replace(/[^A-Za-z0-9]/g, '');
    const receiptId = `ins_${cleanReg}_${Date.now()}`.substring(0, 40);

    const orderOptions = {
      amount: Math.round(numAmount * 100), // in paise
      currency: 'INR',
      receipt: receiptId,
    };

    const order = await razorpay.orders.create(orderOptions);

    const gstRate = 18;
    const basePremium = Math.round((numAmount / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = Math.round((numAmount - basePremium) * 100) / 100;

    // Create pending InsuranceRenewal transaction
    const renewal = await InsuranceRenewal.create({
      vehicle: vehicle._id,
      customer: vehicle.customer._id,
      previousInsurance: {
        provider: vehicle.insuranceProvider || '',
        policyNumber: vehicle.insuranceNumber || '',
        expiryDate: vehicle.insuranceExpiryDate || null,
      },
      newInsurance: {
        provider: provider.trim(),
        policyNumber: policyNumber.trim(),
        startDate: sDate,
        expiryDate: eDate,
      },
      amount: numAmount,
      paidAmount: 0,
      premiumAmount: basePremium,
      gstAmount: gstAmount,
      gstRate: gstRate,
      paymentStatus: 'Pending',
      razorpayOrderId: order.id,
      processedBy: req.user._id,
    });

    res.json({
      success: true,
      renewalId: renewal._id,
      renewalNumber: renewal.renewalNumber,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      premiumAmount: basePremium,
      gstAmount: gstAmount,
      gstRate: gstRate,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      vehicleNumber: vehicle.vehicleNumber,
    });
  } catch (error) {
    console.error('Error creating renewal order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create insurance renewal payment order',
    });
  }
};

/**
 * @desc    Verify Razorpay payment via fetch API, update vehicle insurance & create notification
 * @route   POST /api/insurance-renewals/verify-payment
 * @access  Private
 */
export const verifyRenewalPayment = async (req, res) => {
  try {
    const { renewalId, razorpay_order_id, razorpay_payment_id } = req.body;

    if (!renewalId || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Renewal ID and Razorpay Payment ID are required',
      });
    }

    // 1. Check if InsuranceRenewal record exists
    const renewal = await InsuranceRenewal.findById(renewalId)
      .populate('vehicle')
      .populate('customer');

    if (!renewal) {
      return res.status(404).json({ success: false, message: 'Insurance renewal record not found' });
    }

    // 8. Prevent duplicate payment completion
    if (['Completed', 'Paid', 'PAID'].includes(renewal.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Insurance renewal has already been completed.',
      });
    }

    // 2. Authorization check: belongs to authenticated/authorized user
    if (!isAuthorizedForVehicle(req.user, renewal.customer)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify payment for this renewal',
      });
    }

    // Gateway configuration check
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay configuration error: Gateway credentials are missing.',
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 3. Check if Razorpay payment exists
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Razorpay payment record not found on gateway',
      });
    }

    // 4. Verify payment status is 'captured'
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: `Payment status is '${payment.status}', expected 'captured'`,
      });
    }

    // 5. Verify payment.order_id matches renewal.razorpayOrderId
    if (!payment.order_id || payment.order_id !== renewal.razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment order ID does not match the stored insurance renewal order reference',
      });
    }

    // 6. Verify payment amount exactly matches stored renewal amount (in paise)
    const expectedPaise = Math.round(renewal.amount * 100);
    if (payment.amount !== expectedPaise) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ₹${payment.amount / 100} does not match stored renewal amount ₹${renewal.amount}`,
      });
    }

    // 7. Verify currency is INR where provided
    if (payment.currency && payment.currency.toUpperCase() !== 'INR') {
      return res.status(400).json({
        success: false,
        message: `Payment currency must be INR (received: ${payment.currency})`,
      });
    }

    // Map payment method
    let mappedMethod = 'Razorpay';
    if (payment.method) {
      const lower = payment.method.toLowerCase();
      if (lower === 'card') mappedMethod = 'Card';
      else if (lower === 'upi') mappedMethod = 'UPI';
      else if (lower === 'netbanking') mappedMethod = 'NetBanking';
      else mappedMethod = 'Razorpay';
    }

    const now = new Date();
    const istDateTimeStr = formatDateTimeIST(now);
    const totalAmount = Number(renewal.amount);
    const gstRate = renewal.gstRate || 18;
    const basePremium = renewal.premiumAmount || Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = renewal.gstAmount || Math.round((totalAmount - basePremium) * 100) / 100;

    // 1. Mark transaction as PAID, store Razorpay ID, paid amount and payment date/time in IST
    renewal.paymentStatus = 'PAID';
    renewal.paidAmount = totalAmount;
    renewal.premiumAmount = basePremium;
    renewal.gstAmount = gstAmount;
    renewal.gstRate = gstRate;
    renewal.razorpayPaymentId = razorpay_payment_id;
    renewal.paymentMethod = mappedMethod;
    renewal.paymentDate = now;
    renewal.paymentDateIST = istDateTimeStr;
    renewal.processedBy = req.user._id;
    await renewal.save();

    // 2. Update existing Vehicle insurance details
    const vehicle = await Vehicle.findById(renewal.vehicle._id);
    vehicle.insuranceProvider = renewal.newInsurance.provider;
    vehicle.insuranceNumber = renewal.newInsurance.policyNumber;
    vehicle.insuranceStartDate = renewal.newInsurance.startDate;
    vehicle.insuranceExpiryDate = renewal.newInsurance.expiryDate;
    await vehicle.save();

    // 3. Mark existing INSURANCE_EXPIRY notifications for this vehicle as renewed and replace warning with Active/Renewed status
    await Notification.updateMany(
      {
        relatedEntityType: 'Vehicle',
        relatedEntityId: vehicle._id,
        type: 'INSURANCE_EXPIRY',
      },
      {
        $set: {
          'metadata.isRenewed': true,
          'metadata.status': 'Active',
          'metadata.policyNumber': renewal.newInsurance.policyNumber,
          'metadata.provider': renewal.newInsurance.provider,
          'metadata.expiryDate': getIndiaDateStr(renewal.newInsurance.expiryDate),
          'metadata.renewalId': renewal._id,
          title: `Insurance Active / Renewed (${vehicle.vehicleNumber})`,
          message: `Insurance is ACTIVE. Policy ${renewal.newInsurance.policyNumber} renewed with ${renewal.newInsurance.provider} until ${getIndiaDateStr(renewal.newInsurance.expiryDate)}.`,
          isRead: true,
        },
      }
    );

    // 4. Create Success Notifications
    const successMeta = {
      vehicleNumber: vehicle.vehicleNumber,
      policyNumber: renewal.newInsurance.policyNumber,
      provider: renewal.newInsurance.provider,
      expiryDate: getIndiaDateStr(renewal.newInsurance.expiryDate),
      amount: renewal.amount,
      paidAmount: totalAmount,
      premiumAmount: basePremium,
      gstAmount: gstAmount,
      renewalNumber: renewal.renewalNumber,
      renewalId: renewal._id,
      razorpayPaymentId: razorpay_payment_id,
      paymentDateIST: istDateTimeStr,
    };

    // Notify Customer
    if (vehicle.customer) {
      await notifyCustomer(vehicle.customer, {
        type: 'INSURANCE_RENEWED',
        title: 'Insurance Renewed - Active',
        message: `Insurance for vehicle ${vehicle.vehicleNumber} has been successfully renewed. Policy: ${renewal.newInsurance.policyNumber}.`,
        relatedEntityType: 'Vehicle',
        relatedEntityId: vehicle._id,
        metadata: successMeta,
      });
    }

    // Notify Workshop Admins & Advisors
    await notifyAdminsAndAdvisors({
      type: 'INSURANCE_RENEWED',
      title: `[Insurance] ${vehicle.vehicleNumber} Renewed & Paid`,
      message: `Insurance for vehicle ${vehicle.vehicleNumber} has been renewed by ${renewal.customer.fullName} (Policy: ${renewal.newInsurance.policyNumber}, ₹${totalAmount}).`,
      relatedEntityType: 'Vehicle',
      relatedEntityId: vehicle._id,
      metadata: successMeta,
    });

    let settings = await Settings.findOne();
    if (!settings) settings = {};

    res.json({
      success: true,
      message: 'Insurance renewed successfully',
      renewal: {
        _id: renewal._id,
        renewalNumber: renewal.renewalNumber,
        amount: totalAmount,
        paidAmount: totalAmount,
        premiumAmount: basePremium,
        gstAmount: gstAmount,
        gstRate: gstRate,
        paymentStatus: renewal.paymentStatus,
        paymentDate: renewal.paymentDate,
        paymentDateIST: renewal.paymentDateIST,
        razorpayPaymentId: renewal.razorpayPaymentId,
        razorpayOrderId: renewal.razorpayOrderId,
        paymentMethod: renewal.paymentMethod,
        newInsurance: renewal.newInsurance,
        previousInsurance: renewal.previousInsurance,
      },
      vehicle: {
        _id: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        insuranceProvider: vehicle.insuranceProvider,
        insuranceNumber: vehicle.insuranceNumber,
        insuranceStartDate: vehicle.insuranceStartDate,
        insuranceExpiryDate: vehicle.insuranceExpiryDate,
      },
      customer: {
        _id: renewal.customer._id,
        fullName: renewal.customer.fullName,
        mobileNumber: renewal.customer.mobileNumber,
        emailAddress: renewal.customer.emailAddress,
        address: renewal.customer.address,
        city: renewal.customer.city,
        state: renewal.customer.state,
        pincode: renewal.customer.pincode,
        gstin: renewal.customer.gstin,
      },
      garageSettings: {
        garageName: settings.garageName || 'Garage ERP Auto Services',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        pincode: settings.pincode || '',
        phone: settings.phone || '',
        email: settings.email || '',
        gstin: settings.gstin || '',
      },
    });
  } catch (error) {
    console.error('Error verifying renewal payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

/**
 * @desc    Record payment cancellation or gateway error without changing vehicle insurance
 * @route   POST /api/insurance-renewals/record-failure
 * @access  Private
 */
export const recordRenewalFailure = async (req, res) => {
  try {
    const { renewalId, reason } = req.body;

    if (!renewalId) {
      return res.status(400).json({ success: false, message: 'Renewal ID is required' });
    }

    const renewal = await InsuranceRenewal.findById(renewalId);
    if (!renewal) {
      return res.status(404).json({ success: false, message: 'Renewal record not found' });
    }

    // If not already completed or paid, mark as Failed
    if (!['Completed', 'Paid', 'PAID'].includes(renewal.paymentStatus)) {
      renewal.paymentStatus = 'Failed';
      renewal.failureReason = reason || 'Payment cancelled or dismissed by user';
      await renewal.save();
    }

    res.json({
      success: true,
      message: 'Payment failure recorded. Vehicle insurance status remains unchanged.',
    });
  } catch (error) {
    console.error('Error recording renewal failure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get complete insurance renewal receipt by Renewal ID
 * @route   GET /api/insurance-renewals/receipt/:id
 * @access  Private
 */
export const getRenewalReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const renewal = await InsuranceRenewal.findById(id)
      .populate('vehicle')
      .populate('customer');

    if (!renewal) {
      return res.status(404).json({ success: false, message: 'Insurance renewal receipt not found' });
    }

    if (!isAuthorizedForVehicle(req.user, renewal.customer)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this insurance renewal receipt',
      });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = {};

    const totalAmount = Number(renewal.paidAmount || renewal.amount || 0);
    const gstRate = renewal.gstRate || 18;
    const premiumAmount = renewal.premiumAmount || Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = renewal.gstAmount || Math.round((totalAmount - premiumAmount) * 100) / 100;

    res.json({
      success: true,
      renewal: {
        _id: renewal._id,
        renewalNumber: renewal.renewalNumber,
        amount: totalAmount,
        paidAmount: totalAmount,
        premiumAmount,
        gstAmount,
        gstRate,
        paymentStatus: renewal.paymentStatus,
        paymentDate: renewal.paymentDate,
        paymentDateIST: renewal.paymentDateIST || (renewal.paymentDate ? formatDateTimeIST(renewal.paymentDate) : ''),
        razorpayPaymentId: renewal.razorpayPaymentId,
        razorpayOrderId: renewal.razorpayOrderId,
        paymentMethod: renewal.paymentMethod,
        newInsurance: renewal.newInsurance,
        previousInsurance: renewal.previousInsurance,
        createdAt: renewal.createdAt,
      },
      vehicle: renewal.vehicle,
      customer: renewal.customer,
      garageSettings: {
        garageName: settings.garageName || 'Garage ERP Auto Services',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        pincode: settings.pincode || '',
        phone: settings.phone || '',
        email: settings.email || '',
        gstin: settings.gstin || '',
      },
    });
  } catch (error) {
    console.error('Error fetching insurance renewal receipt:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get insurance renewal history for a vehicle
 * @route   GET /api/insurance-renewals/vehicle/:vehicleId/history
 * @access  Private
 */
export const getVehicleRenewalHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId).populate('customer');
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (!isAuthorizedForVehicle(req.user, vehicle.customer)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view renewal history for this vehicle',
      });
    }

    const renewals = await InsuranceRenewal.find({ vehicle: vehicle._id })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'fullName role');

    res.json({ success: true, renewals });
  } catch (error) {
    console.error('Error fetching renewal history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
