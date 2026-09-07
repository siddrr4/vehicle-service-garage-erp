import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Employee from './models/Employee.js';

dotenv.config();

const testModule4 = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB Atlas successfully.');

    // Check count of employees
    const count = await Employee.countDocuments();
    console.log(`Current Employee Count in MongoDB Atlas: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('Test error:', error.message);
    process.exit(1);
  }
};

testModule4();
