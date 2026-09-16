import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import {
  FaShieldAlt,
  FaCar,
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaArrowLeft,
  FaPrint,
  FaUndo,
  FaBuilding,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import insuranceService from '../../services/insuranceService';
import PageHeader from '../../components/UI/PageHeader';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatDateIST, getIndiaDateStr } from '../../utils/dateUtils';

const COMMON_PROVIDERS = [
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General Insurance',
  'Tata AIG General Insurance',
  'The New India Assurance Co.',
  'United India Insurance',
  'National Insurance Company',
  'Reliance General Insurance',
  'Go Digit General Insurance',
  'Acko General Insurance',
];

const InsuranceRenewal = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [provider, setProvider] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [durationYears, setDurationYears] = useState('1');
  const [amount, setAmount] = useState('');

  // Processing & Payment State
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [completedTransaction, setCompletedTransaction] = useState(null);

  // Load Vehicle & Insurance Details
  const fetchInsuranceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await insuranceService.getVehicleInsurance(vehicleId);

      if (res && res.success) {
        setData(res);

        // Pre-fill initial suggested values
        const veh = res.vehicle;
        const currentProvider = veh.insuranceProvider || '';
        if (COMMON_PROVIDERS.includes(currentProvider)) {
          setProvider(currentProvider);
        } else if (currentProvider) {
          setProvider('Other');
          setCustomProvider(currentProvider);
        } else {
          setProvider(COMMON_PROVIDERS[0]);
        }

        // Suggest a new policy number sequence based on existing or vehicle number
        const cleanReg = (veh.vehicleNumber || 'POL').replace(/\s+/g, '').toUpperCase();
        setPolicyNumber(`POL-${cleanReg}-${new Date().getFullYear()}`);

        // Default start date:
        // If expired or not set, default to today; if future expiry, default to next day after expiry
        const todayStr = getIndiaDateStr();
        let initialStart = todayStr;

        if (veh.insuranceExpiryDate) {
          const expDate = new Date(veh.insuranceExpiryDate);
          if (expDate > new Date()) {
            const nextDay = new Date(expDate);
            nextDay.setDate(nextDay.getDate() + 1);
            initialStart = nextDay.toISOString().split('T')[0];
          }
        }
        setStartDate(initialStart);

        // Default expiry date: 1 year from start date
        const sDateObj = new Date(initialStart);
        const eDateObj = new Date(sDateObj);
        eDateObj.setFullYear(eDateObj.getFullYear() + 1);
        setExpiryDate(eDateObj.toISOString().split('T')[0]);

        // Start renewal amount empty - user enters actual quoted amount
        setAmount('');
      } else {
        setError(res?.message || 'Failed to fetch vehicle insurance details');
      }
    } catch (err) {
      console.error('Error loading insurance workbench:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId) {
      fetchInsuranceDetails();
    }
  }, [vehicleId]);

  // Adjust expiry date when duration or start date changes
  const handleDurationChange = (years, customStart = startDate) => {
    setDurationYears(years);
    if (!customStart) return;
    const s = new Date(customStart);
    if (isNaN(s.getTime())) return;
    const e = new Date(s);
    e.setFullYear(e.getFullYear() + parseInt(years, 10));
    setExpiryDate(e.toISOString().split('T')[0]);
  };

  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    handleDurationChange(durationYears, newStart);
  };

  // Form Validation
  const validateForm = () => {
    const selectedProvider = provider === 'Other' ? customProvider.trim() : provider.trim();
    if (!selectedProvider) {
      toast.error('Insurance provider name is required');
      return false;
    }
    if (!policyNumber.trim()) {
      toast.error('New policy number is required');
      return false;
    }
    if (!startDate) {
      toast.error('Insurance start date is required');
      return false;
    }
    if (!expiryDate) {
      toast.error('Insurance expiry date is required');
      return false;
    }

    const s = new Date(startDate);
    const e = new Date(expiryDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      toast.error('Invalid date format');
      return false;
    }
    if (e <= s) {
      toast.error('Insurance expiry date must be strictly after the start date');
      return false;
    }

    if (!amount || amount.toString().trim() === '') {
      toast.error('Please enter a valid renewal premium amount.');
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid renewal premium amount.');
      return false;
    }

    return true;
  };

  // Pay Now Action
  const handlePayNow = async () => {
    if (!validateForm()) return;

    const selectedProvider = provider === 'Other' ? customProvider.trim() : provider.trim();
    const finalAmount = parseFloat(amount);

    try {
      setProcessingPayment(true);
      setPaymentError(null);

      // Step 1: Create backend order in Razorpay Test Mode
      const orderRes = await insuranceService.createRenewalOrder({
        vehicleId,
        provider: selectedProvider,
        policyNumber: policyNumber.trim(),
        startDate,
        expiryDate,
        amount: finalAmount,
      });

      if (!orderRes || !orderRes.orderId) {
        throw new Error(orderRes?.message || 'Failed to initiate renewal order');
      }

      const { orderId, razorpayKeyId, renewalId } = orderRes;

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Step 2: Open Razorpay Test Mode Checkout
      const options = {
        key: razorpayKeyId,
        amount: Math.round(finalAmount * 100),
        currency: 'INR',
        name: 'Automotive Garage ERP',
        description: `Insurance Policy Renewal: ${data?.vehicle?.vehicleNumber}`,
        order_id: orderId,
        prefill: {
          name: data?.customer?.fullName || '',
          contact: data?.customer?.mobileNumber || '',
          email: data?.customer?.emailAddress || '',
        },
        theme: {
          color: '#1E293B',
        },
        handler: async (response) => {
          try {
            setProcessingPayment(true);
            // Step 3: Verify Payment on Backend
            const verifyRes = await insuranceService.verifyRenewalPayment({
              renewalId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            });

            if (verifyRes && verifyRes.success) {
              toast.success('Insurance renewed and payment completed successfully!');
              setCompletedTransaction({
                renewal: verifyRes.renewal,
                vehicle: verifyRes.vehicle,
                paymentId: response.razorpay_payment_id,
                amount: finalAmount,
                provider: selectedProvider,
                policyNumber: policyNumber.trim(),
                startDate,
                expiryDate,
                date: new Date().toLocaleString(),
              });
            } else {
              throw new Error(verifyRes?.message || 'Payment verification failed on server');
            }
          } catch (vErr) {
            console.error('Payment verification error:', vErr);
            const errMsg = vErr.response?.data?.message || vErr.message || 'Payment verification failed';
            setPaymentError(errMsg);
            toast.error(errMsg);
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: async () => {
            setProcessingPayment(false);
            const dismissReason = 'Checkout window dismissed by user';
            setPaymentError(dismissReason);
            toast.warn(dismissReason);
            try {
              await insuranceService.recordRenewalFailure({
                renewalId,
                reason: dismissReason,
              });
            } catch (ignore) {}
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', async (failedResponse) => {
        setProcessingPayment(false);
        const failReason = failedResponse.error?.description || 'Payment rejected by gateway';
        setPaymentError(failReason);
        toast.error(`Payment Failed: ${failReason}`);
        try {
          await insuranceService.recordRenewalFailure({
            renewalId,
            reason: failReason,
          });
        } catch (ignore) {}
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Order creation error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to process payment';
      setPaymentError(msg);
      toast.error(msg);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <LoadingSpinner />
        <p className="mt-3 text-muted fw-medium">Loading vehicle insurance details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5">
        <Alert variant="danger" className="p-4 shadow-sm rounded-3">
          <h5 className="fw-bold d-flex align-items-center gap-2">
            <FaExclamationTriangle /> Unable to Load Vehicle Information
          </h5>
          <p className="mb-3">{error || 'The requested vehicle could not be loaded.'}</p>
          <Button variant="outline-danger" onClick={() => navigate(-1)} className="d-inline-flex align-items-center gap-2">
            <FaArrowLeft /> Go Back
          </Button>
        </Alert>
      </div>
    );
  }

  const { vehicle, customer, currentStatus, daysRemaining } = data;

  // Render Confirmation Receipt View if successfully completed
  if (completedTransaction) {
    return (
      <div className="container py-5 d-flex justify-content-center">
        <Card className="border-0 shadow-sm p-4 p-md-5 bg-white text-center" style={{ maxWidth: '640px', width: '100%' }}>
          <div className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 84, height: 84 }}>
            <FaCheckCircle size={48} />
          </div>

          <h2 className="fw-bold text-navy mb-1">Insurance Renewed Successfully</h2>
          <p className="text-muted small mb-4">
            Payment verified and vehicle insurance policy updated in garage records.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="bg-light p-4 rounded-3 text-start mb-4 border text-dark">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <span className="text-secondary small fw-semibold text-uppercase">Receipt Reference</span>
              <span className="badge bg-navy px-3 py-1 font-monospace">
                {completedTransaction.renewal?.renewalNumber || 'INS-COMPLETED'}
              </span>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-sm-6">
                <small className="text-muted d-block">Vehicle</small>
                <strong className="text-navy">{vehicle.vehicleNumber}</strong>
                <div className="small text-muted">{vehicle.brand} {vehicle.model}</div>
              </div>
              <div className="col-sm-6">
                <small className="text-muted d-block">Customer</small>
                <strong className="text-dark">{customer?.fullName}</strong>
                <div className="small text-muted">{customer?.mobileNumber}</div>
              </div>
            </div>

            <div className="border-top pt-2 mb-2">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary small">Insurance Provider</span>
                <strong className="text-dark small">{completedTransaction.provider}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary small">New Policy Number</span>
                <span className="font-monospace fw-bold text-dark small">{completedTransaction.policyNumber}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary small">Coverage Period</span>
                <span className="small text-dark">
                  {formatDateIST(completedTransaction.startDate)} to {formatDateIST(completedTransaction.expiryDate)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary small">Razorpay Payment ID</span>
                <span className="font-monospace text-muted small">{completedTransaction.paymentId}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary small">Transaction Timestamp</span>
                <span className="text-muted small">{completedTransaction.date}</span>
              </div>
            </div>

            <div className="border-top pt-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-navy">Amount Paid (INR)</span>
              <span className="fs-5 fw-bold text-success">₹{completedTransaction.amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="d-grid gap-2">
            <Button
              variant="orange"
              className="py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm text-white border-0"
              onClick={() => navigate(`/vehicles/${vehicle._id}`)}
            >
              <FaCar /> View Vehicle Profile
            </Button>
            <Button
              variant="light"
              className="border py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2"
              onClick={() => window.print()}
            >
              <FaPrint /> Print Renewal Certificate
            </Button>
            <Link
              to="/notifications"
              className="btn btn-link text-secondary mt-2 small d-flex align-items-center justify-content-center gap-1 text-decoration-none"
            >
              <FaArrowLeft size={12} /> Back to Notifications
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Vehicle Insurance Renewal & Online Payment"
        subtitle={`Renew policy and process secure test payment for ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model})`}
        breadcrumbs={[
          { label: 'Dashboard', path: user?.role === 'customer' ? '/customer-dashboard' : '/admin-dashboard' },
          { label: 'Vehicles', path: user?.role === 'customer' ? '/my-vehicles' : '/vehicles' },
          { label: vehicle.vehicleNumber, path: `/vehicles/${vehicle._id}` },
          { label: 'Insurance Renewal' },
        ]}
        actions={
          <Button
            variant="outline-secondary"
            onClick={() => navigate(-1)}
            className="d-flex align-items-center gap-2 shadow-sm"
          >
            <FaArrowLeft /> <span>Back</span>
          </Button>
        }
      />

      <Row className="g-4 mb-4">
        {/* ── LEFT COLUMN: Vehicle & Customer Database Details ── */}
        <Col lg={5}>
          {/* Card 1: Registered Vehicle Data */}
          <Card className="border-0 shadow-sm rounded-3 mb-4 bg-card">
            <Card.Header className="bg-transparent border-bottom pt-3 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaCar className="text-orange" size={18} />
                <h6 className="fw-bold mb-0 text-navy">Vehicle Information</h6>
              </div>
              <span className="badge bg-navy px-3 py-1.5 font-monospace fs-6">
                {vehicle.vehicleNumber}
              </span>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="row g-3">
                <div className="col-6">
                  <div className="small text-muted">Make & Model</div>
                  <strong className="text-dark">{vehicle.brand} {vehicle.model}</strong>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Manufacturing Year</div>
                  <strong className="text-dark">{vehicle.manufacturingYear || 'N/A'}</strong>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Fuel & Transmission</div>
                  <span className="text-dark fw-medium">{vehicle.fuelType} ({vehicle.transmission || 'Manual'})</span>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Odometer Reading</div>
                  <span className="text-dark fw-medium">{vehicle.currentOdometerReading?.toLocaleString() || 0} km</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Card 2: Registered Customer Information */}
          <Card className="border-0 shadow-sm rounded-3 mb-4 bg-card">
            <Card.Header className="bg-transparent border-bottom pt-3 pb-3 px-4 d-flex align-items-center gap-2">
              <FaUser className="text-primary" size={16} />
              <h6 className="fw-bold mb-0 text-navy">Registered Owner Profile</h6>
            </Card.Header>
            <Card.Body className="p-4">
              {customer ? (
                <div>
                  <h6 className="fw-bold text-dark mb-1">{customer.fullName}</h6>
                  <div className="small text-muted mb-2 d-flex align-items-center gap-2">
                    <FaPhone size={12} className="text-secondary" /> {customer.mobileNumber}
                  </div>
                  {customer.emailAddress && (
                    <div className="small text-muted mb-2">✉ {customer.emailAddress}</div>
                  )}
                  {customer.city && (
                    <div className="small text-muted">
                      📍 {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted small">No customer linked to this vehicle.</div>
              )}
            </Card.Body>
          </Card>

          {/* Card 3: Current Policy & Status */}
          <Card className={`border-0 shadow-sm rounded-3 mb-4 border-start border-4 ${currentStatus === 'Expired' ? 'border-danger' : currentStatus === 'Expiring Soon' ? 'border-warning' : 'border-success'}`}>
            <Card.Header className="bg-transparent border-bottom pt-3 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaShieldAlt className={currentStatus === 'Expired' ? 'text-danger' : currentStatus === 'Expiring Soon' ? 'text-warning' : 'text-success'} size={18} />
                <h6 className="fw-bold mb-0 text-navy">Current Policy Status</h6>
              </div>
              <span className={`badge px-3 py-1.5 fw-bold ${currentStatus === 'Expired' ? 'bg-danger' : currentStatus === 'Expiring Soon' ? 'bg-warning text-dark' : 'bg-success'}`}>
                {currentStatus.toUpperCase()}
              </span>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted small">Current Provider:</span>
                <span className="fw-semibold text-dark small">{vehicle.insuranceProvider || 'Not Specified'}</span>
              </div>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted small">Current Policy Number:</span>
                <span className="font-monospace fw-semibold text-dark small">{vehicle.insuranceNumber || 'N/A'}</span>
              </div>
              <div className="mb-2 d-flex justify-content-between">
                <span className="text-muted small">Current Expiry Date:</span>
                <span className="fw-semibold text-dark small">
                  {vehicle.insuranceExpiryDate ? formatDateIST(vehicle.insuranceExpiryDate) : 'Not Registered'}
                </span>
              </div>

              {daysRemaining !== null && (
                <div className={`alert p-2.5 rounded-3 mt-3 mb-0 small ${daysRemaining < 0 ? 'alert-danger' : daysRemaining <= 30 ? 'alert-warning' : 'alert-success'}`}>
                  {daysRemaining < 0 ? (
                    <span><FaExclamationTriangle className="me-1" /> Expired <strong>{Math.abs(daysRemaining)} days ago</strong>. Renewal required immediately to maintain legal compliance.</span>
                  ) : daysRemaining <= 30 ? (
                    <span><FaExclamationTriangle className="me-1" /> Expires in <strong>{daysRemaining} days</strong>. Early renewal recommended.</span>
                  ) : (
                    <span><FaCheckCircle className="me-1" /> Active policy. Remaining validity: <strong>{daysRemaining} days</strong>.</span>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ── RIGHT COLUMN: Renewal Form & Payment Section ── */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-3 mb-4 bg-card">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaFileInvoiceDollar className="text-orange" size={20} />
                <h5 className="fw-bold mb-0 text-navy">New Policy Terms & Quotation</h5>
              </div>
              <span className="text-muted small">Step 1 of 2: Details</span>
            </Card.Header>
            <Card.Body className="p-4">
              {paymentError && (
                <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4 p-3 rounded-3" dismissible onClose={() => setPaymentError(null)}>
                  <FaExclamationTriangle className="flex-shrink-0" />
                  <div>
                    <strong>Payment Processing Notice:</strong> {paymentError}
                    <div className="small text-muted mt-1">
                      No changes were made to vehicle insurance records. You can adjust details and try again.
                    </div>
                  </div>
                </Alert>
              )}

              <Form>
                {/* Provider Selection */}
                <Row className="g-3 mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        <FaBuilding className="me-1 text-secondary" /> Insurance Provider <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="form-select py-2"
                        disabled={processingPayment}
                      >
                        {COMMON_PROVIDERS.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                        <option value="Other">Other / Custom Underwriter...</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {provider === 'Other' && (
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="form-label fw-semibold text-dark">
                          Custom Insurance Provider Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter insurer or underwriter name"
                          value={customProvider}
                          onChange={(e) => setCustomProvider(e.target.value)}
                          disabled={processingPayment}
                          required
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                {/* Policy Number */}
                <Row className="g-3 mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        New Policy / Certificate Number <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. POL-KA20EH0625-2026"
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value.toUpperCase())}
                        disabled={processingPayment}
                        className="font-monospace"
                        required
                      />
                      <Form.Text className="text-muted">
                        Official policy reference number issued by the insurer.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Policy Dates & Validity */}
                <Row className="g-3 mb-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        <FaCalendarAlt className="me-1 text-secondary" /> Policy Start Date <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        disabled={processingPayment}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        Tenure / Validity
                      </Form.Label>
                      <Form.Select
                        value={durationYears}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        disabled={processingPayment}
                      >
                        <option value="1">1 Year (Standard)</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years (Multi-Year)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        <FaCalendarAlt className="me-1 text-secondary" /> Policy Expiry Date <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        disabled={processingPayment}
                        min={startDate}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Amount */}
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="form-label fw-semibold text-dark">
                        Renewal Premium Amount <span className="text-danger">*</span>
                      </Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold text-secondary">₹</span>
                        <Form.Control
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={processingPayment}
                          min="1"
                          step="any"
                          className="fw-bold fs-5 text-dark"
                          required
                        />
                      </div>
                      <Form.Text className="text-muted">
                        Enter quoted renewal amount from insurer. Must be greater than ₹0.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* ── Payment Summary Card ── */}
                <div className="p-4 bg-light rounded-3 border mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary small">Policy Tenure</span>
                    <span className="fw-semibold text-dark small">{durationYears} Year(s)</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary small">Insurance Provider</span>
                    <span className="fw-semibold text-dark small">
                      {provider === 'Other' ? customProvider || 'Custom' : provider}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary small">Gateway Integration</span>
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1">
                      Razorpay Test Mode (Instant Verification)
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center pt-1">
                    <div>
                      <h5 className="fw-bold mb-0 text-navy">Total Payable Premium</h5>
                      <small className="text-muted">Includes all taxes and policy issuance fees</small>
                    </div>
                    <div className="text-end">
                      <span className="fs-3 fw-bold text-orange">
                        {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
                          ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '₹0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(-1)}
                    disabled={processingPayment}
                    className="w-100 w-sm-auto px-4 py-2.5"
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="orange"
                    onClick={handlePayNow}
                    disabled={processingPayment || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
                    className="w-100 w-sm-auto px-5 py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 text-white border-0"
                  >
                    {processingPayment ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <FaLock size={14} />
                        <span>
                          Pay Now {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 ? `(₹${parseFloat(amount).toLocaleString('en-IN')})` : ''}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InsuranceRenewal;
