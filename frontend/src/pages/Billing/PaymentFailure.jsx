import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { FaTimesCircle, FaArrowLeft, FaUndo, FaFileInvoiceDollar } from 'react-icons/fa';

const PaymentFailure = () => {
  const location = useLocation();
  const { error, invoiceId, invoiceNumber, amount, balanceDue } = location.state || {};

  return (
    <div className="container py-5 d-flex justify-content-center">
      <Card className="border-0 shadow-sm p-4 p-md-5 bg-white text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <FaTimesCircle className="text-danger mb-3 mx-auto" size={72} />
        <h2 className="fw-bold text-navy mb-2">Payment Failed / Cancelled</h2>
        <p className="text-muted mb-4">Your payment could not be completed. No payment has been recorded against your invoice.</p>

        <div className="bg-light p-4 rounded text-start mb-4 border">
          {invoiceNumber && (
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary small">Invoice Number</span>
              <strong className="text-dark">{invoiceNumber}</strong>
            </div>
          )}
          {amount !== undefined && (
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary small">Attempted Amount</span>
              <strong className="text-danger">₹{amount.toFixed(2)}</strong>
            </div>
          )}
          {balanceDue !== undefined && (
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary small">Current Balance Due</span>
              <strong className="text-dark">₹{balanceDue.toFixed(2)}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger p-3 mb-4 rounded border text-start">
            <span className="small d-block fw-semibold text-danger mb-1">Reason:</span>
            <span className="small text-secondary">{error}</span>
          </div>
        )}

        <div className="d-grid gap-2">
          {invoiceId ? (
            <>
              <Link to={`/billing/invoice/${invoiceId}`} className="btn btn-orange py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2">
                <FaUndo /> Try Again
              </Link>
              <Link to={`/billing/invoice/${invoiceId}`} className="btn btn-light border py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2">
                <FaFileInvoiceDollar /> View Invoice
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="btn btn-orange py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2">
              Go to Dashboard
            </Link>
          )}
          <Link to="/my-job-cards" className="btn btn-link text-secondary mt-2 small d-flex align-items-center justify-content-center gap-1">
            <FaArrowLeft size={12} /> Back to My Job Cards
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PaymentFailure;
