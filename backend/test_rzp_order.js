import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

console.log('Key ID:', JSON.stringify(process.env.RAZORPAY_KEY_ID));
console.log('Key Secret length:', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0);
if (process.env.RAZORPAY_KEY_SECRET) {
  console.log('Char codes:', Array.from(process.env.RAZORPAY_KEY_SECRET).map(c => c.charCodeAt(0)));
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const options = {
  amount: 100, // 1 INR in paise
  currency: 'INR',
  receipt: 'test_receipt_123'
};

try {
  const order = await razorpay.orders.create(options);
  console.log('Order created successfully:', order);
} catch (error) {
  console.error('Error creating order:', error);
}
