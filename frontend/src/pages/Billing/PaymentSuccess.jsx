import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, Button } from 'react-bootstrap';
import { FaCheckCircle, FaArrowLeft, FaFileInvoiceDollar, FaPrint } from 'react-icons/fa';

const PaymentSuccess = () => {
  const location = useLocation();
  const { paymentDetails, invoice } = location.state || {};

  if (!invoice || !paymentDetails) {
    return (
      <div className="container py-5 text-center">
        <FaCheckCircle className="text-success mb-3" size={64} />
        <h3 className="fw-bold">Payment Completed</h3>
        <p className="text-muted">Your transaction was successful.</p>
        <Link to="/dashboard" className="btn btn-primary mt-3">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container py-5 d-flex justify-content-center">
      <Card className="border-0 shadow-sm p-4 p-md-5 bg-white text-center" style={{ maxWidth: '550px', width: '100%' }}>
        <FaCheckCircle className="text-success mb-3 mx-auto" size={72} />
        <h2 className="fw-bold text-navy mb-2">Payment Successful ✓</h2>
        <p className="text-muted mb-4">Your payment has been verified and recorded.</p>

        <div className="bg-light p-4 rounded text-start mb-4 border">
          <div className="d-flex justify-content-between mb-2">
            <span className="text-secondary small">Invoice Number</span>
            <strong className="text-dark">{invoice.invoiceNumber}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-secondary small">Razorpay Payment ID</span>
            <strong className="text-dark font-monospace small">{paymentDetails.razorpay_payment_id}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-secondary small">Amount Paid</span>
            <strong className="text-success">₹{paymentDetails.amount.toFixed(2)}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-secondary small">Payment Date</span>
            <strong className="text-dark">{new Date().toLocaleString()}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2 border-top pt-2">
            <span className="text-secondary small">Remaining Balance</span>
            <strong className="text-danger">₹{invoice.balanceDue.toFixed(2)}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-secondary small">Payment Status</span>
            <span className={`badge ${invoice.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="d-grid gap-2">
          <Link to={`/billing/invoice/${invoice._id}`} className="btn btn-orange py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2">
            <FaFileInvoiceDollar /> View Invoice
          </Link>
          <Button variant="light" className="border py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2" onClick={() => window.print()}>
            <FaPrint /> Print Invoice
          </Button>
          <Link to="/my-job-cards" className="btn btn-link text-secondary mt-2 small d-flex align-items-center justify-content-center gap-1">
            <FaArrowLeft size={12} /> Back to My Job Cards
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
