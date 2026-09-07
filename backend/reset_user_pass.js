import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
dotenv.config();

// Fix DNS if local ISP has issues
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/garage_erp";

async function resetPass() {
  console.log("Connecting...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");
  
  const customerEmail = process.env.RESET_EMAIL || process.argv[2] || 'admin@garage.com';
  const user = await User.findOne({ email: customerEmail });
  if (user) {
    user.password = 'Password123@';
    await user.save();
    console.log(`Password for ${customerEmail} successfully reset to: Password123@`);
  } else {
    console.log(`User ${customerEmail} not found.`);
  }
  process.exit(0);
}

resetPass().catch(console.error);
