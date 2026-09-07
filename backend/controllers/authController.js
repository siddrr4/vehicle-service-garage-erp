import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      let customerRefId = user.customerRef;
      if (user.role === 'customer' && !user.customerRef) {
        try {
          let customerRecord = await Customer.findOne({ emailAddress: user.email });
          if (!customerRecord) {
            customerRecord = await Customer.create({
              fullName: `${user.firstName} ${user.lastName}`,
              mobileNumber: user.phone,
              emailAddress: user.email,
              address: 'N/A',
              city: 'N/A',
              state: 'N/A',
              pincode: 'N/A',
              userId: user._id
            });
          } else {
            customerRecord.userId = user._id;
            await customerRecord.save();
          }
          user.customerRef = customerRecord._id;
          await user.save();
          customerRefId = customerRecord._id;
        } catch (err) {
          console.error("Failed self-healing customer creation on login", err);
        }
      }

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        customerRef: customerRefId,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Can be restricted to Admin later)
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Password validation regex (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'customer',
      phone,
    });

    let customerRefId = null;
    if (user.role === 'customer') {
      // Check if a customer profile already exists for the email
      let customerRecord = await Customer.findOne({ emailAddress: email });
      
      if (customerRecord) {
        // Link existing customer to the new User
        customerRecord.userId = user._id;
        await customerRecord.save();
      } else {
        // Create a new CRM Customer record
        customerRecord = await Customer.create({
          fullName: `${firstName} ${lastName}`,
          mobileNumber: phone,
          emailAddress: email,
          address: 'N/A', // Placeholders as these are required in Customer schema
          city: 'N/A',
          state: 'N/A',
          pincode: 'N/A',
          userId: user._id
        });
      }
      
      user.customerRef = customerRecord._id;
      await user.save();
      customerRefId = customerRecord._id;
    }

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        customerRef: customerRefId,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', '), error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate field value entered', error: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        customerRef: user.customerRef,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    // Generate JWT reset token valid for 15 minutes
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    // Save token and 15-minute expiry in DB
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    const userName = `${user.firstName} ${user.lastName}`.trim();

    const emailSubject = 'Vehicle Service ERP - Password Reset';
    const emailBody = `Hello ${userName},\n\nWe received a request to reset your password.\n\nClick the link below:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nVehicle Service ERP Team`;

    try {
      await sendEmail({
        email: user.email,
        subject: emailSubject,
        message: emailBody,
      });

      res.status(200).json({ 
        message: 'Password reset link has been sent successfully.',
        resetToken: resetToken 
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'Email could not be sent. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Password validation regex (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      });
    }

    // Verify JWT token
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Find user by token and check expiry
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully. Please login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Change logged-in user's password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    // Password validation regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { authUser, registerUser, getUserProfile, forgotPassword, resetPassword, changePassword };


