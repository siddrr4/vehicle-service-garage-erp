import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import JobCard from '../models/JobCard.js';
import Appointment from '../models/Appointment.js';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search functionality
    const keywordMatch = req.query.keyword
      ? {
          $or: [
            { fullName: { $regex: req.query.keyword, $options: 'i' } },
            { mobileNumber: { $regex: req.query.keyword, $options: 'i' } },
            { emailAddress: { $regex: req.query.keyword, $options: 'i' } }
          ],
        }
      : {};

    const pipeline = [
      { $match: keywordMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userAccount'
        }
      },
      {
        $match: {
          $and: [
            {
              $or: [
                { userAccount: { $size: 0 } },
                { 'userAccount.role': 'customer' }
              ]
            },
            {
              fullName: { $not: /^(admin|manager|mechanic|service advisor|advisor|receptionist)\b/i }
            }
          ]
        }
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          customers: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'vehicles',
                localField: '_id',
                foreignField: 'customer',
                as: 'vehicles'
              }
            },
            {
              $addFields: {
                totalVehicles: { $size: '$vehicles' }
              }
            },
            {
              $project: {
                vehicles: 0,
                userAccount: 0
              }
            }
          ]
        }
      }
    ];

    const result = await Customer.aggregate(pipeline);
    const count = result[0]?.metadata[0]?.total || 0;
    const customers = result[0]?.customers || [];

    // Global counts across all garage customers
    const globalStatsPipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userAccount'
        }
      },
      {
        $match: {
          $and: [
            {
              $or: [
                { userAccount: { $size: 0 } },
                { 'userAccount.role': 'customer' }
              ]
            },
            {
              fullName: { $not: /^(admin|manager|mechanic|service advisor|advisor|receptionist)\b/i }
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $ne: ['$status', 'Inactive'] }, 1, 0] }
          }
        }
      }
    ];

    const [globalStats, totalVehicles] = await Promise.all([
      Customer.aggregate(globalStatsPipeline),
      Vehicle.countDocuments()
    ]);

    const stats = {
      totalCustomers: globalStats[0]?.totalCustomers || count,
      activeCustomers: globalStats[0]?.activeCustomers || 0,
      totalVehicles: totalVehicles || 0
    };

    res.json({
      customers,
      page,
      pages: Math.ceil(count / limit) || 1,
      total: count,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      if (customer.userId) {
        const user = await User.findById(customer.userId);
        if (user && user.role !== 'customer') {
          return res.status(404).json({ message: 'Customer not found' });
        }
      }
      if (/^(admin|manager|mechanic|service advisor|advisor|receptionist)\b/i.test(customer.fullName)) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Get associated vehicles, job cards, and appointments
      const vehicles = await Vehicle.find({ customer: customer._id });
      const jobCards = await JobCard.find({ customer: customer._id })
        .populate('vehicle', 'vehicleNumber brand model')
        .populate('assignedMechanic', 'fullName')
        .populate('partsUsed.part', 'partName')
        .sort({ createdAt: -1 });
      const appointments = await Appointment.find({ customer: customer._id })
        .populate('vehicle', 'vehicleNumber brand model')
        .sort({ appointmentDate: -1 });

      res.json({ customer, vehicles, jobCards, appointments });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res) => {
  try {
    const { fullName, mobileNumber, emailAddress, address, city, state, pincode, aadharNumber } = req.body;

    if (aadharNumber) {
      const aadharExists = await Customer.findOne({ aadharNumber });
      if (aadharExists) {
        return res.status(400).json({ message: 'Customer with this Aadhar number already exists' });
      }
    }

    // Check for duplicate mobile number
    const mobileExists = await Customer.findOne({ mobileNumber });
    if (mobileExists) {
      return res.status(400).json({ message: 'Customer with this mobile number already exists' });
    }

    // Check for duplicate email address if provided
    if (emailAddress) {
      const emailExists = await Customer.findOne({ emailAddress });
      if (emailExists) {
        return res.status(400).json({ message: 'Customer with this email address already exists' });
      }

      const existingUser = await User.findOne({ email: emailAddress.toLowerCase() });
      if (existingUser && existingUser.role !== 'customer') {
        return res.status(400).json({ message: 'Cannot create customer record for employee/admin user accounts' });
      }
    }

    const customer = new Customer({
      fullName,
      mobileNumber,
      emailAddress,
      address,
      city,
      state,
      pincode,
      aadharNumber
    });

    const createdCustomer = await customer.save();
    res.status(201).json(createdCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
  try {
    const { fullName, mobileNumber, emailAddress, address, city, state, pincode, aadharNumber } = req.body;

    const customer = await Customer.findById(req.params.id);

    if (customer) {
      customer.fullName = fullName || customer.fullName;
      customer.mobileNumber = mobileNumber || customer.mobileNumber;
      customer.emailAddress = emailAddress || customer.emailAddress;
      customer.address = address || customer.address;
      customer.city = city || customer.city;
      customer.state = state || customer.state;
      customer.pincode = pincode || customer.pincode;

      if (aadharNumber && aadharNumber !== customer.aadharNumber) {
        const aadharExists = await Customer.findOne({ aadharNumber });
        if (aadharExists) {
          return res.status(400).json({ message: 'Customer with this Aadhar number already exists' });
        }
        customer.aadharNumber = aadharNumber;
      }

      if (mobileNumber && mobileNumber !== customer.mobileNumber) {
        const mobileExists = await Customer.findOne({ mobileNumber });
        if (mobileExists) {
          return res.status(400).json({ message: 'Customer with this mobile number already exists' });
        }
      }

      if (emailAddress && emailAddress !== customer.emailAddress) {
        const emailExists = await Customer.findOne({ emailAddress });
        if (emailExists) {
          return res.status(400).json({ message: 'Customer with this email address already exists' });
        }
      }

      const updatedCustomer = await customer.save();

      // Synchronize changes to User collection
      try {
        const user = await User.findOne({
          $or: [
            { customerRef: customer._id },
            { _id: customer.userId }
          ]
        });

        if (user) {
          const nameParts = (fullName || customer.fullName).trim().split(' ');
          user.firstName = nameParts[0] || user.firstName;
          user.lastName = nameParts.slice(1).join(' ') || user.lastName || 'N/A';
          user.email = emailAddress || customer.emailAddress || user.email;
          user.phone = mobileNumber || customer.mobileNumber || user.phone;
          await user.save();
        }
      } catch (err) {
        console.error("Failed to sync customer updates to User collection", err);
      }

      res.json(updatedCustomer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
      // Optionally delete all associated vehicles
      await Vehicle.deleteMany({ customer: customer._id });
      
      // Delete associated User account
      try {
        await User.deleteOne({
          $or: [
            { customerRef: customer._id },
            { _id: customer.userId }
          ]
        });
      } catch (err) {
        console.error("Failed to delete associated user account", err);
      }
      
      await customer.deleteOne();
      res.json({ message: 'Customer, associated user account, and vehicles removed' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
