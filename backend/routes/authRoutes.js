import express from 'express';
import { authUser, registerUser, getUserProfile, forgotPassword, resetPassword, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.route('/profile').get(protect, getUserProfile);

export default router;
