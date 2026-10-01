import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

dotenv.config();

// Ensure DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = 'test_security_otp_user@garage.com';
const INITIAL_PASSWORD = 'OldPassword@123';
const NEW_PASSWORD = 'NewSecuredP@ss2026!';

async function runTests() {
  console.log('=====================================================');
  console.log(' FORGOT PASSWORD FLOW & SECURITY VERIFICATION SUITE ');
  console.log('=====================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/garage_erp';
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  let passedTests = 0;
  let totalTests = 11;

  try {
    // SETUP: Create or reset test user
    await User.deleteOne({ email: TEST_EMAIL });
    const user = new User({
      firstName: 'Security',
      lastName: 'Tester',
      email: TEST_EMAIL,
      phone: '9876543210',
      password: INITIAL_PASSWORD,
      role: 'customer',
    });
    await user.save();
    console.log(`✓ Created clean test user: ${TEST_EMAIL}\n`);

    // TEST 1: Generic Response for Non-Existent Email (No Account Enumeration)
    console.log('[TEST 1] Non-existent email request (Account Enumeration Defense)...');
    const res1 = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_account_xyz_987@example.com' }),
    });
    const data1 = await res1.json();
    if (
      res1.status === 200 &&
      data1.message === 'If an account exists with this email address, a 6-digit verification code has been sent.'
    ) {
      console.log('  PASS: Generic response returned for non-existent email.');
      passedTests++;
    } else {
      console.error('  FAIL:', res1.status, data1);
    }

    // TEST 2: Forgot Password for Existing User + SHA-256 OTP Hash in DB
    console.log('\n[TEST 2] Forgot Password for valid user & DB storage inspection...');
    const res2 = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    const data2 = await res2.json();
    const updatedUser2 = await User.findOne({ email: TEST_EMAIL });

    const isHashed = updatedUser2.resetPasswordOtp && updatedUser2.resetPasswordOtp.length === 64;
    const isExpiry10m =
      updatedUser2.resetPasswordExpires &&
      updatedUser2.resetPasswordExpires.getTime() > Date.now() + 8 * 60 * 1000 &&
      updatedUser2.resetPasswordExpires.getTime() <= Date.now() + 10 * 60 * 1000 + 5000;

    if (
      res2.status === 200 &&
      data2.message === 'If an account exists with this email address, a 6-digit verification code has been sent.' &&
      isHashed &&
      isExpiry10m
    ) {
      console.log('  PASS: Response is generic and DB stores 64-char SHA-256 hash with 10-minute expiry.');
      passedTests++;
    } else {
      console.error('  FAIL:', { status: res2.status, isHashed, isExpiry10m });
    }

    // TEST 3: Invalid / Wrong OTP Rejection
    console.log('\n[TEST 3] Verify OTP with incorrect code...');
    const res3 = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
    });
    const data3 = await res3.json();
    if (res3.status === 400 && data3.message.includes('Invalid OTP')) {
      console.log('  PASS: Incorrect OTP rejected with HTTP 400.');
      passedTests++;
    } else {
      console.error('  FAIL:', res3.status, data3);
    }

    // TEST 4: Expired OTP Rejection
    console.log('\n[TEST 4] Verify OTP when expired...');
    // Seed known OTP '554433' and set expiry in past
    const knownOtp = '554433';
    updatedUser2.resetPasswordOtp = crypto.createHash('sha256').update(knownOtp).digest('hex');
    updatedUser2.resetPasswordExpires = new Date(Date.now() - 5000);
    await updatedUser2.save();

    const res4 = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: knownOtp }),
    });
    const data4 = await res4.json();
    if (res4.status === 400 && data4.message.includes('expired')) {
      console.log('  PASS: Expired OTP rejected with HTTP 400.');
      passedTests++;
    } else {
      console.error('  FAIL:', res4.status, data4);
    }

    // TEST 5: Valid OTP Verification & Issue Temporary Reset Token
    console.log('\n[TEST 5] Verify OTP with valid code & issue signed resetToken...');
    const validOtp = '789123';
    updatedUser2.resetPasswordOtp = crypto.createHash('sha256').update(validOtp).digest('hex');
    updatedUser2.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await updatedUser2.save();

    const res5 = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: validOtp }),
    });
    const data5 = await res5.json();
    const updatedUser5 = await User.findOne({ email: TEST_EMAIL });

    const issuedToken = data5.resetToken;
    const isOtpHolderCleared = updatedUser5.resetPasswordOtp === undefined;
    const isTokenHashedInDb =
      updatedUser5.resetPasswordToken &&
      updatedUser5.resetPasswordToken.length === 64 &&
      updatedUser5.resetPasswordToken === crypto.createHash('sha256').update(issuedToken).digest('hex');

    if (res5.status === 200 && issuedToken && isOtpHolderCleared && isTokenHashedInDb) {
      console.log('  PASS: OTP validated, resetToken issued, OTP cleared from DB, and resetToken hashed in DB.');
      passedTests++;
    } else {
      console.error('  FAIL:', { status: res5.status, hasToken: !!issuedToken, isOtpHolderCleared, isTokenHashedInDb });
    }

    // TEST 6: OTP Single-Use / Reuse Prevention
    console.log('\n[TEST 6] Re-verify same OTP to ensure single-use...');
    const res6 = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: validOtp }),
    });
    const data6 = await res6.json();
    if (res6.status === 400) {
      console.log('  PASS: Reused OTP rejected immediately (single-use enforced).');
      passedTests++;
    } else {
      console.error('  FAIL: Reused OTP was not rejected:', res6.status, data6);
    }

    // TEST 7: Password Complexity Validation
    console.log('\n[TEST 7] Password Complexity validation...');
    const res7 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: issuedToken, password: 'weak' }),
    });
    const data7 = await res7.json();
    if (res7.status === 400 && data7.message.includes('Password must be at least 8 characters long')) {
      console.log('  PASS: Weak password rejected by backend regex validation.');
      passedTests++;
    } else {
      console.error('  FAIL: Weak password was not rejected:', res7.status, data7);
    }

    // TEST 8: Invalid / Tampered Reset Token Rejection
    console.log('\n[TEST 8] Tampered / invalid resetToken rejection...');
    const res8 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: 'fake.jwt.token.here', password: NEW_PASSWORD }),
    });
    const data8 = await res8.json();
    if (res8.status === 400 && data8.message.includes('Invalid or expired reset session')) {
      console.log('  PASS: Tampered resetToken rejected.');
      passedTests++;
    } else {
      console.error('  FAIL: Tampered token was not rejected:', res8.status, data8);
    }

    // TEST 9: Successful Password Reset with valid token
    console.log('\n[TEST 9] Reset password with valid token...');
    const res9 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: issuedToken, password: NEW_PASSWORD }),
    });
    const data9 = await res9.json();
    const updatedUser9 = await User.findOne({ email: TEST_EMAIL });

    const allResetFieldsCleared =
      updatedUser9.resetPasswordOtp === undefined &&
      updatedUser9.resetPasswordToken === undefined &&
      updatedUser9.resetPasswordExpires === undefined;

    if (res9.status === 200 && data9.success && allResetFieldsCleared) {
      console.log('  PASS: Password reset successful and all reset fields cleared from DB.');
      passedTests++;
    } else {
      console.error('  FAIL:', { status: res9.status, data9, allResetFieldsCleared });
    }

    // TEST 10: Invalidation & Reuse Prevention of resetToken
    console.log('\n[TEST 10] Reuse same resetToken after password reset...');
    const res10 = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: issuedToken, password: 'AnotherPassword@123' }),
    });
    const data10 = await res10.json();
    if (res10.status === 400 && data10.message.includes('Invalid or expired reset session')) {
      console.log('  PASS: Reused resetToken rejected (token single-use enforced).');
      passedTests++;
    } else {
      console.error('  FAIL: Reused resetToken was not rejected:', res10.status, data10);
    }

    // TEST 11: Authentication with New vs Old Password
    console.log('\n[TEST 11] Login verification (Old vs New password)...');
    const oldLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: INITIAL_PASSWORD }),
    });
    const oldLoginData = await oldLoginRes.json();

    const newLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD }),
    });
    const newLoginData = await newLoginRes.json();

    if (oldLoginRes.status === 401 && newLoginRes.status === 200 && newLoginData.token) {
      console.log('  PASS: Old password rejected (401), New password accepted (200 + JWT).');
      passedTests++;
    } else {
      console.error('  FAIL:', { oldStatus: oldLoginRes.status, newStatus: newLoginRes.status });
    }

    // CLEANUP
    await User.deleteOne({ email: TEST_EMAIL });
    console.log(`\n✓ Cleaned up test user: ${TEST_EMAIL}`);

  } catch (err) {
    console.error('Unexpected error running tests:', err);
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n=====================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('=====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SECURITY REQUIREMENTS VERIFIED AND PASSING!\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED.\n');
    process.exit(1);
  }
}

runTests();
