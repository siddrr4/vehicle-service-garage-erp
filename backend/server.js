import express from 'express';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix for querySrv ECONNREFUSED issue on local DNS servers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('DNS fallback servers set to Google DNS (8.8.8.8)');
} catch (e) {
  console.warn('Unable to set DNS servers:', e.message);
}
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import jobCardRoutes from './routes/jobCardRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import sparePartRoutes from './routes/sparePartRoutes.js';
import sparePartRequestRoutes from './routes/sparePartRequestRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import serviceHistoryRoutes from './routes/serviceHistoryRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import insuranceRenewalRoutes from './routes/insuranceRenewalRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

// Startup configuration check for Razorpay credentials
if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'dummy_key') {
  console.error('CONFIGURATION ERROR: RAZORPAY_KEY_ID is missing or not configured in environment variables.');
} else {
  console.log('Razorpay Key ID configuration: DETECTED (' + process.env.RAZORPAY_KEY_ID.substring(0, 12) + '...)');
}

if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'dummy_secret') {
  console.error('CONFIGURATION ERROR: RAZORPAY_KEY_SECRET is missing or not configured in environment variables.');
} else {
  console.log('Razorpay Key Secret configuration: DETECTED');
}

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows parsing JSON body

// Pre-flight database connection middleware for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/job-cards', jobCardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/spare-parts-requests', sparePartRequestRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/service-history', serviceHistoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/insurance-renewals', insuranceRenewalRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Global Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export default app;
