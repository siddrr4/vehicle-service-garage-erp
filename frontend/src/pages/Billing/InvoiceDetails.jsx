import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Table, Row, Col, Button, Modal, Form, Badge } from 'react-bootstrap';
import { FaArrowLeft, FaPrint, FaDownload, FaCar, FaUser, FaTools, FaFileInvoiceDollar, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import billingService from '../../services/billingService';
import settingService from '../../services/settingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { AuthContext } from '../../context/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';
import { formatINR, numberToWordsINR } from '../../utils/currencyUtils';

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
          settingService.getPublicSettings().catch(() => null)
        ]);
        setInvoice(invoiceData);
        setSettings(invoiceData?.garageSettings || settingsData || {});
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

  const handleDownloadPdf = () => {
    toast.info("Select 'Save as PDF' in your browser print destination to download.", { autoClose: 3500 });
    setTimeout(() => {
      window.print();
    }, 400);
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
      if (loading) return;
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
          name: settings?.garageName || 'Garage ERP Auto Services',
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

  const jobCard = invoice.jobCard || {};
  const vehicle = invoice.vehicle || jobCard.vehicle || {};
  const customer = invoice.customer || jobCard.customer || {};
  const garage = invoice.garageSettings || settings || {};

  const isInterState = invoice.isInterState !== undefined 
    ? invoice.isInterState 
    : ((garage.state || 'Karnataka').toLowerCase() !== (customer.state || garage.state || 'Karnataka').toLowerCase());

  const placeOfSupply = invoice.placeOfSupply || customer.state || garage.state || 'Karnataka';
  const defaultGstRate = Number(garage.defaultTaxGst) || 18;

  // Derive tax breakdown if not directly stored
  const taxBreakup = invoice.taxBreakup || {
    partsTaxable: invoice.totalParts || 0,
    partsCgst: isInterState ? 0 : (invoice.totalParts || 0) * ((defaultGstRate / 2) / 100),
    partsSgst: isInterState ? 0 : (invoice.totalParts || 0) * ((defaultGstRate / 2) / 100),
    partsIgst: isInterState ? (invoice.totalParts || 0) * (defaultGstRate / 100) : 0,
    partsCess: 0,
    partsTotal: invoice.totalParts || 0,
    servicesTaxable: invoice.isFreeService ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0)),
    servicesCgst: invoice.isFreeService || isInterState ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0)) * ((defaultGstRate / 2) / 100),
    servicesSgst: invoice.isFreeService || isInterState ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0)) * ((defaultGstRate / 2) / 100),
    servicesIgst: invoice.isFreeService || !isInterState ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0)) * (defaultGstRate / 100),
    servicesCess: 0,
    servicesTotal: invoice.isFreeService ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0)),
    totalTaxable: (invoice.totalParts || 0) + (invoice.isFreeService ? 0 : ((invoice.totalLabour || 0) + (invoice.totalWashing || 0))),
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalCess: 0,
    totalDiscount: invoice.discount || 0,
    grandTotal: invoice.grandTotal || 0
  };

  const amountInWords = invoice.amountInWords || numberToWordsINR(invoice.grandTotal);

  // Latest payment information
  const lastPayment = invoice.payments && invoice.payments.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null;

  // Next Service Due estimation (+6 months or +5000 km)
  const currentOdo = vehicle.currentOdometerReading || 0;
  const nextOdoDue = currentOdo > 0 ? `${(currentOdo + 5000).toLocaleString('en-IN')} km` : 'After 5,000 km';
  const serviceDateObj = new Date(invoice.createdAt || invoice.invoiceDate || Date.now());
  const nextDateDueObj = new Date(serviceDateObj);
  nextDateDueObj.setMonth(nextDateDueObj.getMonth() + 6);
  const nextServiceDate = formatDateIST(nextDateDueObj);

  return (
    <div className="container-fluid p-0 pb-5">
      
      {/* Top action header (hidden on print) */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Link to={user?.role === 'customer' ? '/customer-dashboard' : '/billing'} className="btn btn-light border btn-sm text-muted shadow-sm">
            <FaArrowLeft className="me-1" /> {user?.role === 'customer' ? 'Back to Dashboard' : 'Back to Billing'}
          </Link>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold m-0 text-navy">Invoice {invoice.invoiceNumber}</h4>
            <Badge bg={invoice.status === 'Paid' ? 'success' : invoice.status === 'Partially Paid' ? 'warning' : 'danger'} className="text-uppercase px-2 py-1">
              {invoice.status}
            </Badge>
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          {invoice.balanceDue > 0 ? (
            <Button 
              variant={user?.role === 'customer' ? 'orange' : 'primary'} 
              className="d-flex align-items-center gap-2 shadow-sm" 
              onClick={handleOpenPayModal}
            >
              <FaFileInvoiceDollar />
              <span>
                {user?.role === 'customer' 
                  ? (invoice.amountPaid > 0 ? 'Pay Remaining Amount' : 'Pay Now') 
                  : 'Record Payment'
                }
              </span>
            </Button>
          ) : (
            <span className="text-success fw-bold me-2 fs-6 d-flex align-items-center gap-1">
              <FaCheckCircle /> Fully Paid
            </span>
          )}

          <Button variant="outline-dark" className="d-flex align-items-center gap-2 shadow-sm bg-white" onClick={handleDownloadPdf}>
            <FaDownload /> <span>Download PDF</span>
          </Button>

          <Button variant="success" className="d-flex align-items-center gap-2 shadow-sm" onClick={handlePrint}>
            <FaPrint /> <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      {/* Dealership-Grade GST Tax Invoice Area */}
      <Card className="border shadow-sm invoice-container p-4 p-md-5 bg-white text-dark mx-auto" style={{ maxWidth: '980px', borderRadius: '4px' }}>
        <div className="invoice-print-area">
          
          {/* Header Bar */}
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <div className="bg-orange text-white p-2 rounded d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                  <FaCar size={20} />
                </div>
                <div>
                  <h3 className="fw-bold text-navy mb-0 text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    {garage.garageName || 'GARAGE ERP AUTO SERVICES'}
                  </h3>
                  <small className="text-muted fw-semibold">AUTHORIZED MULTI-BRAND AUTOMOTIVE SERVICE WORKSHOP</small>
                </div>
              </div>
              <div className="text-secondary small mt-2" style={{ lineHeight: '1.4' }}>
                <div>{garage.address || '123 Garage Lane, Industrial Area, Phase II'}</div>
                <div>{garage.city || 'Mumbai'}, {garage.state || 'Maharashtra'} - {garage.pincode || '400011'}</div>
                <div>Phone: <strong>{garage.phone || '+91 98765 43210'}</strong> &bull; Email: <strong>{garage.email || 'support@garageerp.com'}</strong></div>
                <div><strong>GSTIN:</strong> <span className="font-monospace text-dark fw-bold">{garage.gstin || '29AAAAA0000A1Z5'}</span> &bull; <strong>State:</strong> {garage.state || 'Karnataka'}</div>
              </div>
            </div>

            <div className="text-end">
              <div className="badge bg-navy text-white text-uppercase px-3 py-1 mb-2 fs-6" style={{ letterSpacing: '1px' }}>
                TAX INVOICE
              </div>
              <div className="small text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                [ Original for Recipient ]
              </div>
              <div className="small text-secondary font-monospace border rounded p-2 bg-light text-start" style={{ minWidth: '220px' }}>
                <div><strong>Invoice No:</strong> <span className="text-primary fw-bold">{invoice.invoiceNumber}</span></div>
                <div><strong>Date:</strong> {formatDateIST(invoice.createdAt || invoice.invoiceDate)}</div>
                <div><strong>Place of Supply:</strong> {placeOfSupply}</div>
                <div><strong>Supply Type:</strong> {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
                <div><strong>Reverse Charge:</strong> No</div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Profiles (Dealership Grid) */}
          <Row className="g-2 mb-3">
            {/* Box A: Customer Details */}
            <Col xs={12} md={6}>
              <div className="border rounded h-100 p-2.5 bg-light-subtle">
                <div className="d-flex align-items-center gap-1.5 text-navy fw-bold text-uppercase border-bottom pb-1 mb-1.5 small">
                  <FaUser size={12} /> Billed To / Customer Details
                </div>
                <div className="small text-secondary" style={{ lineHeight: '1.45' }}>
                  <div className="fw-bold text-dark fs-6">{customer.fullName || 'Valued Customer'}</div>
                  <div><strong>Mobile:</strong> {customer.mobileNumber || 'N/A'}</div>
                  <div><strong>Email:</strong> {customer.emailAddress || 'N/A'}</div>
                  {(customer.address || customer.city) && (
                    <div><strong>Address:</strong> {customer.address ? `${customer.address}, ` : ''}{customer.city ? `${customer.city}, ` : ''}{customer.state || ''} {customer.pincode ? `- ${customer.pincode}` : ''}</div>
                  )}
                  <div><strong>Customer GSTIN:</strong> <span className="font-monospace fw-bold text-dark">{customer.gstin ? customer.gstin : 'URP (Unregistered Person)'}</span></div>
                  <div><strong>State of Supply:</strong> {customer.state || garage.state || 'Karnataka'}</div>
                </div>
              </div>
            </Col>

            {/* Box B: Vehicle & Job Card Details */}
            <Col xs={12} md={6}>
              <div className="border rounded h-100 p-2.5 bg-light-subtle">
                <div className="d-flex align-items-center gap-1.5 text-navy fw-bold text-uppercase border-bottom pb-1 mb-1.5 small">
                  <FaTools size={12} /> Vehicle & Workshop Job Card
                </div>
                <div className="small text-secondary" style={{ lineHeight: '1.45' }}>
                  <Row className="g-1">
                    <Col xs={6}><strong>Job Card No:</strong> <span className="font-monospace text-primary fw-bold">{jobCard.jobNumber || 'N/A'}</span></Col>
                    <Col xs={6}><strong>Reg No:</strong> <span className="font-monospace fw-bold text-dark">{vehicle.vehicleNumber || 'N/A'}</span></Col>
                    <Col xs={6}><strong>Make & Model:</strong> {vehicle.brand || ''} {vehicle.model || ''}</Col>
                    <Col xs={6}><strong>Fuel / Trans:</strong> {vehicle.fuelType || 'Petrol'} / {vehicle.transmission || 'Manual'}</Col>
                    <Col xs={6}><strong>Engine No:</strong> <span className="font-monospace">{vehicle.engineNumber || 'N/A'}</span></Col>
                    <Col xs={6}><strong>Chassis No:</strong> <span className="font-monospace">{vehicle.chassisNumber || 'N/A'}</span></Col>
                    <Col xs={6}><strong>Odometer:</strong> {vehicle.currentOdometerReading ? `${vehicle.currentOdometerReading.toLocaleString('en-IN')} km` : 'N/A'}</Col>
                    <Col xs={6}><strong>Service Type:</strong> {jobCard.serviceType || 'General Service'}</Col>
                    <Col xs={6}><strong>Mechanic:</strong> {jobCard.assignedMechanic?.fullName || 'Assigned Bay'}</Col>
                    <Col xs={6}><strong>Service Advisor:</strong> {jobCard.serviceRequest?.serviceAdvisor?.fullName || 'Workshop Desk'}</Col>
                    <Col xs={12}><strong>Next Service Due:</strong> <span className="text-dark fw-semibold">{nextServiceDate} or {nextOdoDue}</span></Col>
                  </Row>
                </div>
              </div>
            </Col>
          </Row>

          {/* Free Service Notification Alert */}
          {invoice.isFreeService && (
            <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3 border-success small">
              <div className="d-flex align-items-center gap-2">
                <FaCheckCircle className="text-success fs-5" />
                <div>
                  <strong>FREE SERVICE {invoice.freeServiceNumber ? `${invoice.freeServiceNumber} OF 3` : 'QUALIFIED'}</strong>: Labour charges and washing charges are 100% waived off. Spare parts consumed remain chargeable.
                </div>
              </div>
              <span className="badge bg-success text-white">Free Labour Active</span>
            </div>
          )}

          {/* TABLE 1: AUTOMOBILE SPARE PARTS */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center bg-light border border-bottom-0 px-3 py-1.5 rounded-top">
              <span className="fw-bold text-navy text-uppercase small">1. Automobile Spare Parts & Consumables</span>
              <span className="small text-muted">HSN Code 8708</span>
            </div>
            {!jobCard.partsUsed || jobCard.partsUsed.length === 0 ? (
              <div className="text-center py-2.5 bg-white border text-muted small">
                No spare parts or consumables were replaced during this service.
              </div>
            ) : (
              <Table bordered size="sm" className="align-middle mb-0 small text-dark">
                <thead className="table-light text-center" style={{ fontSize: '0.75rem' }}>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th className="text-start">Part Description</th>
                    <th>Part Number</th>
                    <th>HSN</th>
                    <th style={{ width: '45px' }}>Qty</th>
                    <th className="text-end">Rate (₹)</th>
                    <th className="text-end">Gross (₹)</th>
                    <th className="text-end">Taxable (₹)</th>
                    {isInterState ? (
                      <th className="text-end" style={{ width: '90px' }}>IGST (₹)</th>
                    ) : (
                      <>
                        <th className="text-end" style={{ width: '80px' }}>CGST (₹)</th>
                        <th className="text-end" style={{ width: '80px' }}>SGST (₹)</th>
                      </>
                    )}
                    <th className="text-end" style={{ width: '90px' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCard.partsUsed.map((p, idx) => {
                    const qty = Number(p.quantity) || 1;
                    const rate = Number(p.sellingPrice) || 0;
                    const gross = qty * rate;
                    const taxable = gross;
                    const gstRate = p.gstPercent !== undefined ? Number(p.gstPercent) : defaultGstRate;
                    const cgst = isInterState ? 0 : taxable * ((gstRate / 2) / 100);
                    const sgst = isInterState ? 0 : taxable * ((gstRate / 2) / 100);
                    const igst = isInterState ? taxable * (gstRate / 100) : 0;
                    const total = taxable + cgst + sgst + igst;

                    return (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>
                          <div className="fw-semibold text-dark">{p.part?.partName || 'Spare Part'}</div>
                          {p.part?.manufacturer && <small className="text-muted">{p.part.manufacturer}</small>}
                        </td>
                        <td className="text-center font-monospace text-secondary">{p.part?.partNumber || 'PART-N/A'}</td>
                        <td className="text-center font-monospace text-secondary">{p.part?.hsnCode || '8708'}</td>
                        <td className="text-center fw-bold">{qty}</td>
                        <td className="text-end">{formatINR(rate, false)}</td>
                        <td className="text-end">{formatINR(gross, false)}</td>
                        <td className="text-end fw-semibold">{formatINR(taxable, false)}</td>
                        {isInterState ? (
                          <td className="text-end">
                            <div>{formatINR(igst, false)}</div>
                            <small className="text-muted">({gstRate}%)</small>
                          </td>
                        ) : (
                          <>
                            <td className="text-end">
                              <div>{formatINR(cgst, false)}</div>
                              <small className="text-muted">({gstRate / 2}%)</small>
                            </td>
                            <td className="text-end">
                              <div>{formatINR(sgst, false)}</div>
                              <small className="text-muted">({gstRate / 2}%)</small>
                            </td>
                          </>
                        )}
                        <td className="text-end pe-2 fw-bold text-dark">{formatINR(total, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td colSpan={7} className="text-end text-uppercase pe-2">Subtotal Parts:</td>
                    <td className="text-end">{formatINR(taxBreakup.partsTaxable, false)}</td>
                    {isInterState ? (
                      <td className="text-end">{formatINR(taxBreakup.partsIgst, false)}</td>
                    ) : (
                      <>
                        <td className="text-end">{formatINR(taxBreakup.partsCgst, false)}</td>
                        <td className="text-end">{formatINR(taxBreakup.partsSgst, false)}</td>
                      </>
                    )}
                    <td className="text-end pe-2 text-primary">{formatINR(taxBreakup.partsTotal, false)}</td>
                  </tr>
                </tfoot>
              </Table>
            )}
          </div>

          {/* TABLE 2: LABOUR & SERVICE CHARGES */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center bg-light border border-bottom-0 px-3 py-1.5 rounded-top">
              <span className="fw-bold text-navy text-uppercase small">2. Labour & Automotive Service Charges</span>
              <span className="small text-muted">SAC Code 998729 (Maintenance & Repair Services)</span>
            </div>
            <Table bordered size="sm" className="align-middle mb-0 small text-dark">
              <thead className="table-light text-center" style={{ fontSize: '0.75rem' }}>
                <tr>
                  <th style={{ width: '35px' }}>#</th>
                  <th className="text-start">Service / Labour Description</th>
                  <th>SAC</th>
                  <th style={{ width: '45px' }}>Qty</th>
                  <th className="text-end">Rate (₹)</th>
                  <th className="text-end">Gross (₹)</th>
                  <th className="text-end">Taxable (₹)</th>
                  {isInterState ? (
                    <th className="text-end" style={{ width: '90px' }}>IGST (₹)</th>
                  ) : (
                    <>
                      <th className="text-end" style={{ width: '80px' }}>CGST (₹)</th>
                      <th className="text-end" style={{ width: '80px' }}>SGST (₹)</th>
                    </>
                  )}
                  <th className="text-end" style={{ width: '90px' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {jobCard.servicesPerformed && jobCard.servicesPerformed.length > 0 ? (
                  jobCard.servicesPerformed.map((srv, idx) => {
                    const gross = (srv.labourCharge || 0) + (srv.washingCharge || 0);
                    const isWaived = invoice.isFreeService || srv.isFreeService;
                    const taxable = isWaived ? 0 : gross;
                    const cgst = isInterState || isWaived ? 0 : taxable * ((defaultGstRate / 2) / 100);
                    const sgst = isInterState || isWaived ? 0 : taxable * ((defaultGstRate / 2) / 100);
                    const igst = !isInterState || isWaived ? 0 : taxable * (defaultGstRate / 100);
                    const total = taxable + cgst + sgst + igst;

                    return (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>
                          <div className="fw-semibold text-dark">{srv.serviceName}</div>
                          {isWaived && (
                            <span className="badge bg-success-subtle text-success border border-success px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                              Free Service Included
                            </span>
                          )}
                        </td>
                        <td className="text-center font-monospace text-secondary">998729</td>
                        <td className="text-center">1</td>
                        <td className="text-end">{isWaived ? '₹0.00' : formatINR(gross, false)}</td>
                        <td className="text-end">{isWaived ? '₹0.00' : formatINR(gross, false)}</td>
                        <td className="text-end fw-semibold">{isWaived ? '₹0.00' : formatINR(taxable, false)}</td>
                        {isInterState ? (
                          <td className="text-end">
                            <div>{isWaived ? '₹0.00' : formatINR(igst, false)}</div>
                            {!isWaived && <small className="text-muted">({defaultGstRate}%)</small>}
                          </td>
                        ) : (
                          <>
                            <td className="text-end">
                              <div>{isWaived ? '₹0.00' : formatINR(cgst, false)}</div>
                              {!isWaived && <small className="text-muted">({defaultGstRate / 2}%)</small>}
                            </td>
                            <td className="text-end">
                              <div>{isWaived ? '₹0.00' : formatINR(sgst, false)}</div>
                              {!isWaived && <small className="text-muted">({defaultGstRate / 2}%)</small>}
                            </td>
                          </>
                        )}
                        <td className="text-end pe-2 fw-bold text-dark">{isWaived ? '₹0.00' : formatINR(total, false)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="text-center">1</td>
                    <td>
                      <div className="fw-semibold text-dark">General Repairs & Inspection Labour</div>
                      {invoice.isFreeService && (
                        <span className="badge bg-success-subtle text-success border border-success px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                          Free Service Included
                        </span>
                      )}
                    </td>
                    <td className="text-center font-monospace text-secondary">998729</td>
                    <td className="text-center">1</td>
                    <td className="text-end">{invoice.isFreeService ? '₹0.00' : formatINR((invoice.totalLabour || 0) + (invoice.totalWashing || 0), false)}</td>
                    <td className="text-end">{invoice.isFreeService ? '₹0.00' : formatINR((invoice.totalLabour || 0) + (invoice.totalWashing || 0), false)}</td>
                    <td className="text-end fw-semibold">{invoice.isFreeService ? '₹0.00' : formatINR(taxBreakup.servicesTaxable, false)}</td>
                    {isInterState ? (
                      <td className="text-end">{invoice.isFreeService ? '₹0.00' : formatINR(taxBreakup.servicesIgst, false)}</td>
                    ) : (
                      <>
                        <td className="text-end">{invoice.isFreeService ? '₹0.00' : formatINR(taxBreakup.servicesCgst, false)}</td>
                        <td className="text-end">{invoice.isFreeService ? '₹0.00' : formatINR(taxBreakup.servicesSgst, false)}</td>
                      </>
                    )}
                    <td className="text-end pe-2 fw-bold text-dark">{invoice.isFreeService ? '₹0.00' : formatINR(taxBreakup.servicesTotal, false)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td colSpan={7} className="text-end text-uppercase pe-2">Subtotal Services:</td>
                  <td className="text-end">{formatINR(taxBreakup.servicesTaxable, false)}</td>
                  {isInterState ? (
                    <td className="text-end">{formatINR(taxBreakup.servicesIgst, false)}</td>
                  ) : (
                    <>
                      <td className="text-end">{formatINR(taxBreakup.servicesCgst, false)}</td>
                      <td className="text-end">{formatINR(taxBreakup.servicesSgst, false)}</td>
                    </>
                  )}
                  <td className="text-end pe-2 text-primary">{formatINR(taxBreakup.servicesTotal, false)}</td>
                </tr>
              </tfoot>
            </Table>
          </div>

          {/* COMPREHENSIVE GST SUMMARY MATRIX & TOTAL CALCULATION */}
          <Row className="g-2 mb-3">
            {/* 3-Column GST Tax Summary Matrix */}
            <Col xs={12} md={7}>
              <div className="border rounded overflow-hidden">
                <div className="bg-light px-3 py-1.5 fw-bold text-navy text-uppercase border-bottom small">
                  GST Tax Summary Matrix
                </div>
                <Table size="sm" bordered className="mb-0 small text-dark">
                  <thead className="table-light text-center" style={{ fontSize: '0.75rem' }}>
                    <tr>
                      <th className="text-start">Particulars</th>
                      <th style={{ width: '100px' }}>Parts (₹)</th>
                      <th style={{ width: '100px' }}>Services (₹)</th>
                      <th style={{ width: '110px' }} className="text-end pe-2">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Taxable Value</td>
                      <td className="text-end">{formatINR(taxBreakup.partsTaxable, false)}</td>
                      <td className="text-end">{formatINR(taxBreakup.servicesTaxable, false)}</td>
                      <td className="text-end pe-2 fw-semibold">{formatINR(taxBreakup.totalTaxable, false)}</td>
                    </tr>
                    {!isInterState ? (
                      <>
                        <tr>
                          <td>Central GST (CGST)</td>
                          <td className="text-end">{formatINR(taxBreakup.partsCgst, false)}</td>
                          <td className="text-end">{formatINR(taxBreakup.servicesCgst, false)}</td>
                          <td className="text-end pe-2">{formatINR(taxBreakup.totalCgst, false)}</td>
                        </tr>
                        <tr>
                          <td>State GST (SGST)</td>
                          <td className="text-end">{formatINR(taxBreakup.partsSgst, false)}</td>
                          <td className="text-end">{formatINR(taxBreakup.servicesSgst, false)}</td>
                          <td className="text-end pe-2">{formatINR(taxBreakup.totalSgst, false)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td>Integrated GST (IGST)</td>
                        <td className="text-end">{formatINR(taxBreakup.partsIgst, false)}</td>
                        <td className="text-end">{formatINR(taxBreakup.servicesIgst, false)}</td>
                        <td className="text-end pe-2">{formatINR(taxBreakup.totalIgst, false)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>Cess</td>
                      <td className="text-end">0.00</td>
                      <td className="text-end">0.00</td>
                      <td className="text-end pe-2">0.00</td>
                    </tr>
                    {invoice.discount > 0 && (
                      <tr className="text-danger">
                        <td>Discount Applied</td>
                        <td className="text-end">-</td>
                        <td className="text-end">-</td>
                        <td className="text-end pe-2">- {formatINR(invoice.discount, false)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td className="text-uppercase">Total Invoice Value</td>
                      <td className="text-end">{formatINR(taxBreakup.partsTotal, false)}</td>
                      <td className="text-end">{formatINR(taxBreakup.servicesTotal, false)}</td>
                      <td className="text-end pe-2 text-primary">{formatINR(invoice.grandTotal, false)}</td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </Col>

            {/* Financial Totals & Settlement Box */}
            <Col xs={12} md={5}>
              <div className="border rounded p-3 bg-light h-100 d-flex flex-column justify-content-between small">
                <div>
                  <div className="d-flex justify-content-between mb-1.5 text-secondary">
                    <span>Taxable Amount:</span>
                    <span className="fw-semibold text-dark">{formatINR(taxBreakup.totalTaxable)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1.5 text-secondary">
                    <span>Total GST Amount:</span>
                    <span className="fw-semibold text-dark">{formatINR(invoice.taxAmount)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="d-flex justify-content-between mb-1.5 text-danger">
                      <span>Discount:</span>
                      <span className="fw-semibold">- {formatINR(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-2 border-top border-bottom my-1.5 fs-6 fw-bold text-dark">
                    <span>Invoice Grand Total:</span>
                    <span className="text-primary">{formatINR(invoice.grandTotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1.5 text-success">
                    <span>Amount Paid:</span>
                    <span className="fw-bold">{formatINR(invoice.amountPaid)}</span>
                  </div>
                  <div className="d-flex justify-content-between fs-6 fw-bold text-danger border-top pt-1.5">
                    <span>Balance Due:</span>
                    <span className="fs-5">{formatINR(invoice.balanceDue)}</span>
                  </div>
                </div>

                {/* Latest Payment Reference */}
                {lastPayment && (
                  <div className="mt-2 pt-2 border-top text-muted" style={{ fontSize: '0.75rem' }}>
                    <div><strong>Last Payment:</strong> {formatINR(lastPayment.amount)} via {lastPayment.method} ({formatDateIST(lastPayment.date)})</div>
                    {lastPayment.transactionId && <div><strong>Txn Ref:</strong> <span className="font-monospace">{lastPayment.transactionId}</span></div>}
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* Amount In Words Banner */}
          <div className="border rounded p-2.5 mb-3 bg-light-subtle d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span className="text-muted small fw-bold text-uppercase me-2">Amount Chargeable (in words):</span>
              <strong className="text-navy">{amountInWords}</strong>
            </div>
            <div className="text-end">
              <span className="text-muted small fw-bold text-uppercase me-2">Net Payable:</span>
              <span className="fs-5 fw-bold text-primary">{formatINR(invoice.grandTotal)}</span>
            </div>
          </div>

          {/* Payment History (if any) */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-3">
              <div className="bg-light px-3 py-1 border border-bottom-0 rounded-top fw-bold text-navy text-uppercase small">
                Payment & Settlement Records
              </div>
              <Table size="sm" bordered className="mb-0 small text-dark">
                <thead className="table-light text-center" style={{ fontSize: '0.75rem' }}>
                  <tr>
                    <th>#</th>
                    <th>Date & Time</th>
                    <th>Payment Mode</th>
                    <th>Transaction Reference / Gateway ID</th>
                    <th className="text-end pe-2">Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="text-center">{i + 1}</td>
                      <td className="text-center">{formatDateIST(p.date)}</td>
                      <td className="text-center"><Badge bg="secondary">{p.method}</Badge></td>
                      <td className="font-monospace text-center">{p.transactionId || p.razorpayPaymentId || '-'}</td>
                      <td className="text-end pe-2 fw-bold text-success">{formatINR(p.amount, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* Terms & Conditions & Signatures Row */}
          <Row className="g-3 mt-1 pt-2 border-top">
            <Col xs={12} md={7}>
              <div className="border rounded p-2.5 bg-light h-100 text-muted small" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                <div className="fw-bold text-navy text-uppercase mb-1">Terms & Conditions:</div>
                <ol className="ps-3 mb-0">
                  <li>Goods once sold will not be taken back or exchanged unless authorized under manufacturer warranty terms.</li>
                  <li>Vehicles are driven, tested, and stored at vehicle owner's sole risk and responsibility.</li>
                  <li>Warranty on replaced spare parts is strictly subject to OEM manufacturer policy. No warranty on electrical items.</li>
                  <li>All payments are due immediately upon delivery of the vehicle.</li>
                  <li>All legal disputes are subject to local garage workshop jurisdiction.</li>
                </ol>
              </div>
            </Col>

            <Col xs={12} md={5}>
              <div className="border rounded p-2.5 h-100 d-flex flex-column justify-content-between text-center bg-light">
                <div className="text-end small text-muted">
                  For <strong>{garage.garageName || 'GARAGE ERP AUTO SERVICES'}</strong>
                </div>
                <div className="my-3 py-2 text-muted font-monospace" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
                  [ DEALERSHIP OFFICIAL STAMP ]
                </div>
                <div className="d-flex justify-content-between align-items-end pt-2 border-top small text-secondary">
                  <div>Customer's Signature</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Bottom Electronic Verification Notice */}
          <div className="text-center mt-3 pt-2 text-muted" style={{ fontSize: '0.7rem' }}>
            <p className="mb-0">This is a computer-generated Tax Invoice generated by Garage ERP under Section 31 of the CGST Act, 2017.</p>
          </div>

        </div>
      </Card>

      {/* Print Optimization Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .sidebar, .navbar, .no-print, .toast-container, button, .btn {
            display: none !important;
          }
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .invoice-container {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            padding: 15px !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .invoice-print-area {
            width: 100% !important;
          }
          .table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .table-light {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge {
            border: 1px solid #333 !important;
            color: #000 !important;
            background: transparent !important;
          }
        }
      `}</style>
      
      {/* Payment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold fs-5">Make Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePaySubmit}>
          <Modal.Body className="p-4">
            <div className="alert alert-info p-3 mb-4 rounded border-info text-dark small">
              <div>Invoice Number: <strong>{invoice.invoiceNumber}</strong></div>
              <div>Grand Total: <strong>{formatINR(invoice.grandTotal)}</strong></div>
              <div className="text-danger fw-bold mt-1">Balance Due: {formatINR(invoice.balanceDue)}</div>
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
