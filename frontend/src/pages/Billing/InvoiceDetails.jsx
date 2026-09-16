import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Table, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { FaArrowLeft, FaPrint, FaCar, FaUser, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import billingService from '../../services/billingService';
import settingService from '../../services/settingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { AuthContext } from '../../context/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useContext(AuthContext);
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    const fetchInvoiceAndSettings = async () => {
      try {
        const [invoiceData, settingsData] = await Promise.all([
          billingService.getInvoiceById(id),
          settingService.getPublicSettings()
        ]);
        setInvoice(invoiceData);
        setSettings(settingsData);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load invoice details');
        setLoading(false);
        navigate(user?.role === 'customer' ? '/customer-dashboard' : '/billing');
      }
    };
    fetchInvoiceAndSettings();
  }, [id, navigate, user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner />;
  if (!invoice) return <div className="text-center py-5">Invoice not found.</div>;

  const handleOpenPayModal = () => {
    setPayAmount(invoice.balanceDue);
    setPayMethod(user?.role === 'customer' ? 'UPI' : 'Cash');
    setTxnId('');
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0 || amount > invoice.balanceDue + 0.01) {
      toast.error('Invalid payment amount.');
      return;
    }
    
    if (user?.role === 'customer') {
      if (loading) return; // Prevent double click
      try {
        setLoading(true);
        const orderData = await billingService.createPaymentOrder(invoice._id, amount);
        
        if (!orderData.razorpayKeyId) {
          throw new Error('Razorpay Payment Gateway is not configured');
        }

        setShowPayModal(false);

        const options = {
          key: orderData.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Garage ERP Auto Services',
          description: `Invoice: ${orderData.invoiceNumber}`,
          order_id: orderData.razorpayOrderId,
          handler: async function (response) {
            try {
              setLoading(true);
              const verificationData = await billingService.verifyPayment(invoice._id, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              
              toast.success('Payment completed successfully!');
              navigate('/payment-success', { 
                state: { 
                  paymentDetails: {
                    razorpay_payment_id: response.razorpay_payment_id,
                    amount: amount
                  },
                  invoice: verificationData
                } 
              });
            } catch (err) {
              navigate('/payment-failure', { 
                state: { 
                  error: err.response?.data?.message || 'Payment verification failed',
                  invoiceId: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  amount: amount,
                  balanceDue: invoice.balanceDue
                } 
              });
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: invoice.customer?.fullName || '',
            email: invoice.customer?.emailAddress || '',
            contact: invoice.customer?.mobileNumber || ''
          },
          theme: {
            color: '#F4511E'
          },
          modal: {
            ondismiss: function () {
              navigate('/payment-failure', { 
                state: { 
                  error: 'Payment checkout closed by user',
                  invoiceId: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  amount: amount,
                  balanceDue: invoice.balanceDue
                } 
              });
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        console.error('Razorpay process error:', error);
        toast.error(error.response?.data?.message || error.message || 'Razorpay initialization failed');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        const data = await billingService.recordPayment(invoice._id, { 
          amount, 
          method: payMethod, 
          transactionId: txnId 
        });
        setInvoice(data);
        setShowPayModal(false);
        toast.success('Payment recorded successfully!');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to record payment');
      } finally {
        setLoading(false);
      }
    }
  };

  const jobCard = invoice.jobCard;

  return (
    <div className="container-fluid p-0">
      
      {/* Top action header (hidden on print) */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <div className="d-flex align-items-center gap-3">
          <Link to={user?.role === 'customer' ? '/customer-dashboard' : '/billing'} className="btn btn-light border btn-sm text-muted">
            <FaArrowLeft /> {user?.role === 'customer' ? 'Back to Dashboard' : 'Back to Billing'}
          </Link>
          <h4 className="fw-bold m-0 text-navy">Invoice: {invoice.invoiceNumber}</h4>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {user?.role === 'customer' && invoice.balanceDue === 0 && (
            <span className="text-success fw-bold me-2 fs-5">
              ✓ Paid ({invoice.status === 'Unpaid' ? 'Pending' : invoice.status})
            </span>
          )}
          {invoice.balanceDue > 0 && (
            <Button 
              variant={user?.role === 'customer' ? 'orange' : 'primary'} 
              className="d-flex align-items-center gap-2 shadow-sm no-print" 
              onClick={handleOpenPayModal}
            >
              <span>
                {user?.role === 'customer' 
                  ? (invoice.amountPaid > 0 ? 'Pay Remaining Amount' : 'Pay Now') 
                  : 'Record Payment'
                }
              </span>
            </Button>
          )}
          {user?.role !== 'customer' && invoice.balanceDue === 0 && (
            <span className="text-success fw-bold me-2 fs-5">
              ✓ Paid
            </span>
          )}
          <Button variant="success" className="d-flex align-items-center gap-2 shadow-sm no-print" onClick={handlePrint}>
            <FaPrint /> <span>Print / Save as PDF</span>
          </Button>
        </div>
      </div>

      {/* Invoice Area */}
      <Card className="border-0 shadow-sm invoice-container p-4 p-md-5 bg-white text-dark">
        <div className="invoice-print-area">
          
          {/* Invoice Header */}
          <Row className="mb-4 border-bottom pb-4 align-items-center">
            <Col xs={12} md={6}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <FaCar className="text-orange" size={32} />
                <h3 className="fw-bold text-navy mb-0">{settings?.garageName || 'GARAGE ERP AUTO SERVICES'}</h3>
              </div>
              <p className="text-muted small mb-0">
                {settings?.showGarageContact !== false ? (
                  <>
                    {settings?.address || '123 Garage Lane, Industrial Area, Phase II'}<br/>
                    {settings?.city || 'Mumbai'}, {settings?.state || 'Maharashtra'} - {settings?.pincode || '400011'}<br/>
                    Phone: {settings?.phone || '+91 98765 43210'} &bull; Email: {settings?.email || 'support@garageerp.com'}<br/>
                  </>
                ) : null}
                {settings?.showGstin !== false && settings?.gstin ? (
                  <><strong>GSTIN:</strong> {settings.gstin}</>
                ) : null}
              </p>
            </Col>
            
            <Col xs={12} md={6} className="text-md-end mt-3 mt-md-0">
              <h1 className="fw-bold text-navy mb-1 tracking-wider text-uppercase" style={{ fontSize: '2.5rem' }}>Tax Invoice</h1>
              <div className="small text-secondary">
                <div><strong>Invoice No:</strong> {invoice.invoiceNumber}</div>
                <div><strong>Invoice Date:</strong> {formatDateIST(invoice.createdAt)}</div>
                <div><strong>Status:</strong> <span className={invoice.status === 'Paid' ? 'text-success fw-bold' : 'text-danger fw-bold'}>{invoice.status === 'Unpaid' ? 'Pending' : invoice.status}</span></div>
              </div>
            </Col>
          </Row>

          {/* Customer & Vehicle Profiles */}
          <Row className="g-4 mb-4 border-bottom pb-4">
            <Col xs={12} md={6}>
              <h6 className="fw-bold text-navy text-uppercase mb-2.5 d-flex align-items-center gap-2">
                <FaUser size={13} /> Billed To (Customer):
              </h6>
              <div className="ps-3 border-start border-2 border-secondary border-opacity-25 small text-secondary">
                <div className="fw-bold text-dark fs-6 mb-1">{invoice.customer?.fullName || jobCard.customer?.fullName || 'Not Provided'}</div>
                <div><strong>Mobile:</strong> {invoice.customer?.mobileNumber || jobCard.customer?.mobileNumber || 'Not Provided'}</div>
                <div><strong>Email:</strong> {invoice.customer?.emailAddress || jobCard.customer?.emailAddress || 'Not Provided'}</div>
                {(invoice.customer?.address || jobCard.customer?.address) && (
                  <div className="mt-1">
                    {invoice.customer?.address || jobCard.customer?.address}, {invoice.customer?.city || jobCard.customer?.city}<br/>
                    {invoice.customer?.state || jobCard.customer?.state} - {invoice.customer?.pincode || jobCard.customer?.pincode}
                  </div>
                )}
              </div>
            </Col>
            
            <Col xs={12} md={6}>
              <h6 className="fw-bold text-navy text-uppercase mb-2.5 d-flex align-items-center gap-2">
                <FaCar size={13} /> Vehicle Details:
              </h6>
              <div className="ps-3 border-start border-2 border-secondary border-opacity-25 small text-secondary">
                <div className="fw-bold text-dark mb-1">REG NO: <span className="font-monospace text-primary">{invoice.vehicle?.vehicleNumber || jobCard.vehicle?.vehicleNumber || 'Not Available'}</span></div>
                <div><strong>Brand & Model:</strong> {invoice.vehicle?.brand || jobCard.vehicle?.brand || ''} {invoice.vehicle?.model || jobCard.vehicle?.model || ''}</div>
                <div><strong>Fuel Type:</strong> {invoice.vehicle?.fuelType || jobCard.vehicle?.fuelType || 'Not Provided'}</div>
                <div><strong>Odometer:</strong> {invoice.odometerAtService || jobCard.odometerAtService || invoice.vehicle?.currentOdometerReading || jobCard.vehicle?.currentOdometerReading || 'Not Available'} km</div>
              </div>
            </Col>
          </Row>

          {/* Job Card description */}
          <div className="mb-4 small">
            <h6 className="fw-bold text-navy text-uppercase mb-2">Service Breakdown:</h6>
            <div className="p-3 bg-light rounded text-secondary border">
              <div><strong>Job Card No:</strong> {jobCard.jobNumber}</div>
              <div><strong>Complaint:</strong> {jobCard.complaint}</div>
              <div><strong>Mechanic:</strong> {jobCard.assignedMechanic?.fullName || 'N/A'}</div>
              <div><strong>Service Completion Date:</strong> {jobCard.completionTime ? formatDateIST(jobCard.completionTime) : 'N/A'}</div>
              {jobCard.workDescription && (
                <div className="mt-1">
                  <strong>Work Done:</strong> {jobCard.workDescription}
                </div>
              )}
            </div>
          </div>

          {/* Labor / Services Table */}
          <h6 className="fw-bold text-navy text-uppercase mb-2">1. Labor & Service Charges</h6>
          <Table borderless className="align-middle mb-4 border rounded overflow-hidden small">
            <thead className="table-light border-bottom text-muted">
              <tr>
                <th className="ps-3" style={{ width: '50px' }}>#</th>
                <th>Service & Labor Description</th>
                <th className="text-end" style={{ width: '150px' }}>Labour (₹)</th>
                <th className="text-end" style={{ width: '150px' }}>Washing (₹)</th>
                <th className="text-end pe-3" style={{ width: '150px' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {jobCard?.servicesPerformed && jobCard.servicesPerformed.length > 0 ? (
                jobCard.servicesPerformed.map((srv, idx) => (
                  <tr key={idx} className="border-bottom">
                    <td className="ps-3">{idx + 1}</td>
                    <td>
                      <div className="fw-bold text-dark">{srv.serviceName}</div>
                      {(srv.isFreeService || invoice.isFreeService) && <small className="text-success fw-bold">Free Service Included</small>}
                    </td>
                    <td className="text-end">
                      {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : `₹${srv.labourCharge.toFixed(2)}`}
                    </td>
                    <td className="text-end">
                      {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : `₹${srv.washingCharge.toFixed(2)}`}
                    </td>
                    <td className="text-end pe-3 fw-bold text-dark">
                      {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : `₹${(srv.labourCharge + srv.washingCharge).toFixed(2)}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="ps-3">1</td>
                  <td>
                    <div className="fw-bold text-dark">General Repairs & Services</div>
                    {invoice.isFreeService && <small className="text-success fw-bold">Free Service Included</small>}
                  </td>
                  <td className="text-end">
                    {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : '-'}
                  </td>
                  <td className="text-end">
                    {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : '-'}
                  </td>
                  <td className="text-end pe-3 fw-bold text-dark">
                    {invoice.isFreeService ? <span className="text-success fw-bold">FREE</span> : `₹${invoice.totalLabour.toFixed(2)}`}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Spare Parts consumed */}
          <h6 className="fw-bold text-navy text-uppercase mb-2">2. Automobile Spare Parts Consumed</h6>
          {!jobCard.partsUsed || jobCard.partsUsed.length === 0 ? (
            <div className="text-center py-3 bg-light text-muted small rounded mb-4 border">
              No spare parts were replaced during this service.
            </div>
          ) : (
            <Table borderless className="align-middle mb-4 border rounded overflow-hidden small table-hover">
              <thead className="table-light border-bottom text-muted">
                <tr>
                  <th className="ps-3" style={{ width: '50px' }}>#</th>
                  <th>Part Details (Code / Name)</th>
                  <th>Manufacturer</th>
                  <th>Unit Rate (₹)</th>
                  <th className="text-center">Qty</th>
                  <th>GST %</th>
                  <th className="text-end">Tax Amt (₹)</th>
                  <th className="text-end pe-3">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {jobCard.partsUsed.map((p, idx) => {
                  const partExcl = p.sellingPrice * p.quantity;
                  const partTax = partExcl * p.gstPercent / 100;
                  const partTotal = partExcl + partTax;
                  return (
                    <tr key={idx} className="border-bottom">
                      <td className="ps-3">{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark">{p.part?.partName || 'Part Deleted'}</div>
                        <div className="small font-monospace text-secondary">{p.part?.partNumber || 'PART-N/A'}</div>
                      </td>
                      <td>{p.part?.manufacturer || 'N/A'}</td>
                      <td>₹{p.sellingPrice.toFixed(2)}</td>
                      <td className="text-center fw-medium text-dark">{p.quantity}</td>
                      <td>{p.gstPercent}%</td>
                      <td>₹{partTax.toFixed(2)}</td>
                      <td className="text-end pe-3 fw-bold text-dark">₹{partTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          {/* Invoice Summary Box */}
          <Row className="mt-4 pt-2">
            <Col xs={12} md={6} className="mb-3 small">
              <div className="p-3 bg-light rounded border text-muted mb-3">
                <h6 className="fw-bold text-navy mb-2">Terms & Conditions:</h6>
                <ol className="ps-3 mb-0" style={{ fontSize: '0.75rem' }}>
                  <li>All payments must be made in full upon vehicle delivery.</li>
                  <li>Parts warranty is subject to manufacturer terms. No warranty on electrical items.</li>
                  <li>Vehicles are driven/tested at owners' risk.</li>
                </ol>
              </div>

              {invoice.payments && invoice.payments.length > 0 && (
                <div className="p-3 bg-white rounded border border-success">
                  <h6 className="fw-bold text-success mb-2">Payment History</h6>
                  <Table size="sm" borderless className="mb-0 small">
                    <tbody>
                      {invoice.payments.map((pay, i) => (
                        <tr key={i} className="border-bottom">
                          <td>{formatDateIST(pay.date)}</td>
                          <td>{pay.method}</td>
                          <td className="text-end fw-bold text-dark">₹{pay.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Col>

            <Col xs={12} md={6} className="ms-auto small">
              <div className="bg-light p-3 rounded border">
                {invoice.isFreeService && (
                  <div className="alert alert-success fw-bold text-center py-2 mb-3 small border-success">
                    ★ FREE SERVICE {invoice.freeServiceNumber} OF 3 – Labour & Washing ★
                  </div>
                )}
                
                <div className="d-flex justify-content-between mb-2 text-secondary">
                  <span>Labour:</span>
                  <span className="fw-medium text-dark">
                    {invoice.isFreeService ? 'FREE (₹0.00)' : `₹${invoice.totalLabour.toFixed(2)}`}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-secondary">
                  <span>Washing:</span>
                  <span className="fw-medium text-dark">
                    {invoice.isFreeService ? 'FREE (₹0.00)' : `₹${invoice.totalWashing.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="d-flex justify-content-between mb-2 text-secondary">
                  <span>Spare Parts:</span>
                  <span className="fw-medium text-dark">₹{invoice.totalParts.toFixed(2)}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-secondary">
                  <span>GST:</span>
                  <span className="fw-medium text-dark">₹{invoice.taxAmount.toFixed(2)}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-danger">
                    <span>Discount:</span>
                    <span className="fw-medium">- ₹{invoice.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-2 fs-6 fw-bold text-dark border-top pt-2">
                  <span>Grand Total:</span>
                  <span>₹{invoice.grandTotal.toFixed(2)}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 fs-6 text-success border-top pt-2">
                  <span>Amount Paid:</span>
                  <span>₹{invoice.amountPaid.toFixed(2)}</span>
                </div>

                <div className="d-flex justify-content-between fs-5 fw-bold text-danger border-top pt-2">
                  <span>Balance Due:</span>
                  <span style={{ fontSize: '1.4rem' }}>₹{invoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </Col>
          </Row>

          {/* Print Footer */}
          <div className="text-center mt-5 pt-4 border-top text-muted small" style={{ fontSize: '0.8rem' }}>
            <p className="mb-1"><strong>Thank you for choosing Garage ERP Auto Care!</strong></p>
            <p className="mb-0">This is a system-generated electronic tax invoice and does not require a physical signature.</p>
          </div>

        </div>
      </Card>
      
      {/* Styles for print output */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 0;
          }
          .sidebar, .navbar, .no-print, .toast-container {
            display: none !important;
          }
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .invoice-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .invoice-print-area {
            border: none !important;
            width: 100% !important;
          }
          .table-light {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold fs-5">Make Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePaySubmit}>
          <Modal.Body className="p-4">
            <div className="alert alert-info p-3 mb-4 rounded border-info text-dark">
              <div className="small">Invoice Number: <strong>{invoice.invoiceNumber}</strong></div>
              <div className="small">Grand Total: <strong>₹{invoice.grandTotal.toFixed(2)}</strong></div>
              <div className="small text-danger fw-bold">Balance Due: ₹{invoice.balanceDue.toFixed(2)}</div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold text-secondary small">Payment Amount (₹) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.balanceDue}
                required
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                disabled={user?.role === 'customer'}
              />
            </Form.Group>

            {user?.role === 'customer' ? (
              <div className="alert alert-warning small p-2 text-dark">
                You will be redirected to Razorpay checkout to securely pay the balance amount.
              </div>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold text-secondary small">Payment Method *</Form.Label>
                  <Form.Select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold text-secondary small">Transaction ID / Reference (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter transaction ref details"
                    value={txnId}
                    onChange={e => setTxnId(e.target.value)}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-top p-3 bg-light">
            <Button variant="light" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button variant="orange" type="submit" disabled={loading}>
              Confirm Payment
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
};

export default InvoiceDetails;
