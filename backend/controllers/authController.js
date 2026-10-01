import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import generateToken from '../utils/generateToken.js';
import sendEmail, { sendPasswordResetOtpEmail } from '../utils/sendEmail.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.trim();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') });

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
    console.error('Login error:', error);
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

// @desc    Forgot password - Generate and send 6-digit OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') });

    // Generic response message to avoid revealing account existence
    const genericMessage = 'If an account exists with this email address, a 6-digit verification code has been sent.';

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
        email: normalizedEmail,
      });
    }

    // 1. Generate cryptographically secure 6-digit numeric OTP using Node crypto
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 2. Store OTP securely as a SHA-256 hash in MongoDB
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';

    try {
      await sendPasswordResetOtpEmail({
        to: user.email,
        name: userName,
        otp,
      });

      return res.status(200).json({ 
        success: true,
        message: genericMessage,
        email: user.email,
      });
    } catch (emailError) {
      console.error('Email send error occurred');
      return res.status(500).json({ message: 'Unable to send OTP email at this time. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error occurred');
    return res.status(500).json({ message: 'Unable to process your request. Please try again later.' });
  }
};

// @desc    Verify OTP for password reset & issue temporary reset token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit OTP are required.' });
    }

    const cleanOtp = otp.toString().trim().replace(/\s+/g, '');
    const normalizedEmail = email.trim();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP code.' });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please request a new OTP.' });
    }

    if (Date.now() > user.resetPasswordExpires) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Compare hashed OTP
    const enteredHashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (user.resetPasswordOtp !== enteredHashedOtp) {
      return res.status(400).json({ message: 'Invalid OTP code. Please enter the correct 6-digit code.' });
    }

    // Generate secure temporary reset token
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Invalidate OTP immediately to prevent reuse, and store hashed resetToken
    user.resetPasswordOtp = undefined;
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
      email: user.email,
    });
  } catch (error) {
    console.error('Verify OTP error occurred');
    return res.status(500).json({ message: 'Unable to verify OTP. Please try again later.' });
  }
};

// @desc    Resend OTP for password reset
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res) => {
  return forgotPassword(req, res);
};

// @desc    Reset password using temporary reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { resetToken, token, password } = req.body;
    const activeToken = resetToken || token;

    if (!activeToken || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    // Password validation regex (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(activeToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please request a new OTP.' });
    }

    // Look up user with matching hashed token and active expiry
    const hashedToken = crypto.createHash('sha256').update(activeToken).digest('hex');
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please request a new OTP.' });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordOtp = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error occurred');
    return res.status(500).json({ message: 'Unable to reset password. Please try again later.' });
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

export { 
  authUser, 
  registerUser, 
  getUserProfile, 
  forgotPassword, 
  verifyOtp, 
  resendOtp, 
  resetPassword, 
  changePassword 
};


