import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ email: 'admin@garage.com' });

    if (adminExists) {
      adminExists.password = 'Password123@';
      await adminExists.save();
      console.log('Admin user password updated to Password123@');
      process.exit();
    }

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@garage.com',
      password: 'Password123@',
      role: 'admin',
      phone: '1234567890'
    });

    if (admin) {
      console.log('Admin user seeded successfully');
      console.log(`Email: admin@garage.com`);
      console.log(`Password: Password123@`);
    }

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
