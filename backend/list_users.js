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

async function listUsers() {
  console.log("Connecting...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected. Fetching users...");
  const users = await User.find({}, 'email role firstName lastName');
  console.log("Registered Users count:", users.length);
  users.forEach(u => {
    console.log(`- Email: ${u.email} | Role: ${u.role} | Name: ${u.firstName} ${u.lastName}`);
  });
  process.exit(0);
}

listUsers().catch(console.error);
