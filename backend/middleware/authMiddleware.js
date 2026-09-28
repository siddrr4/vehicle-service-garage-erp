import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user && req.user.role === 'customer' && !req.user.customerRef) {
        const custDoc = await Customer.findOne({
          $or: [
            { userId: req.user._id },
            { emailAddress: req.user.email?.toLowerCase() },
            { mobileNumber: req.user.phone }
          ]
        }).select('_id');
        if (custDoc) {
          req.user.customerRef = custDoc._id;
        }
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

const adminOrAdvisor = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'advisor')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin or advisor' });
  }
};

export { protect, admin, restrictTo, adminOrAdvisor };
