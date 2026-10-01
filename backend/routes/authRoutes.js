import express from 'express';
import { 
  authUser, 
  registerUser, 
  getUserProfile, 
  forgotPassword, 
  verifyOtp, 
  resendOtp, 
  resetPassword, 
  changePassword 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.route('/profile').get(protect, getUserProfile);

export default router;

