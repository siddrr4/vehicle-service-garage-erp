import Razorpay from 'razorpay';
console.log('Razorpay:', Razorpay);
try {
  const r = new Razorpay({ key_id: 'abc', key_secret: '123' });
  console.log('Constructor works, instance:', !!r);
} catch (e) {
  console.error('Error instantiating:', e);
}
