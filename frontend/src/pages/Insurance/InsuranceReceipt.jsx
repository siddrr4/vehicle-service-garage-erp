import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Table, Row, Col, Button, Badge } from 'react-bootstrap';
import {
  FaShieldAlt,
  FaCar,
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaArrowLeft,
  FaPrint,
  FaDownload,
  FaFileInvoiceDollar,
  FaCheck,
  FaBuilding,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import insuranceService from '../../services/insuranceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatDateIST, formatDateTimeIST } from '../../utils/dateUtils';
import { formatINR, numberToWordsINR } from '../../utils/currencyUtils';

const InsuranceReceipt = ({ receiptData: initialData, onBack }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(!initialData);
  const [data, setData] = useState(initialData || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (id) {
      const fetchReceipt = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await insuranceService.getRenewalReceipt(id);
          if (res && res.success) {
            setData(res);
          } else {
            setError(res?.message || 'Failed to load insurance receipt');
          }
        } catch (err) {
          console.error('Error fetching receipt:', err);
          setError(err.response?.data?.message || err.message || 'Receipt not found');
        } finally {
          setLoading(false);
        }
      };
      fetchReceipt();
    }
  }, [id, initialData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    toast.info("Select 'Save as PDF' in your browser print destination to download.", { autoClose: 3500 });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <LoadingSpinner />
        <p className="mt-3 text-muted fw-medium">Loading Insurance Payment Receipt...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger p-4 mx-auto shadow-sm" style={{ maxWidth: 500 }}>
          <h5>Unable to Load Receipt</h5>
          <p className="small mb-3">{error || 'The requested insurance receipt is not available.'}</p>
          <Button variant="outline-danger" onClick={() => (onBack ? onBack() : navigate(-1))}>
            <FaArrowLeft className="me-1" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { renewal, vehicle, customer, garageSettings } = data;
  const garage = garageSettings || {};

  // Financial values
  const totalAmount = Number(renewal.paidAmount || renewal.amount || 0);
  const gstRate = renewal.gstRate || 18;
  const premiumAmount = Number(renewal.premiumAmount || Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100);
  const gstAmount = Number(renewal.gstAmount || Math.round((totalAmount - premiumAmount) * 100) / 100);
  const amountInWords = numberToWordsINR(totalAmount);

  // Dates in IST
  const paymentTimeStr = renewal.paymentDateIST || (renewal.paymentDate ? formatDateTimeIST(renewal.paymentDate) : 'Recorded in IST');
  const policyStartStr = formatDateIST(renewal.newInsurance?.startDate);
  const policyExpiryStr = formatDateIST(renewal.newInsurance?.expiryDate);

  return (
    <div className="container-fluid p-0 pb-5">
      {/* Top action header (hidden on print) */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="light"
            size="sm"
            className="border text-muted shadow-sm d-flex align-items-center gap-1"
            onClick={() => (onBack ? onBack() : navigate(vehicle?._id ? `/vehicles/${vehicle._id}` : -1))}
          >
            <FaArrowLeft /> <span>Back</span>
          </Button>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold m-0 text-navy">Insurance Receipt {renewal.renewalNumber}</h4>
            <Badge bg="success" className="text-uppercase px-2.5 py-1">
              PAID / ACTIVE
            </Badge>
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          {vehicle?._id && (
            <Link to={`/vehicles/${vehicle._id}`} className="btn btn-outline-primary btn-sm shadow-sm d-flex align-items-center gap-1.5">
              <FaCar /> <span>View Vehicle Profile</span>
            </Link>
          )}

          <Button variant="outline-dark" size="sm" className="d-flex align-items-center gap-2 shadow-sm bg-white" onClick={handleDownloadPdf}>
            <FaDownload /> <span>Download Receipt</span>
          </Button>

          <Button variant="success" size="sm" className="d-flex align-items-center gap-2 shadow-sm" onClick={handlePrint}>
            <FaPrint /> <span>Print Receipt</span>
          </Button>
        </div>
      </div>

      {/* Official Receipt Card */}
      <Card
        className="border shadow-sm insurance-receipt-container p-4 p-md-5 bg-white text-dark mx-auto"
        style={{ maxWidth: '920px', borderRadius: '4px' }}
      >
        <div className="receipt-print-area">
          {/* Header Bar */}
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <div
                  className="bg-navy text-white p-2 rounded d-flex align-items-center justify-content-center"
                  style={{ width: '42px', height: '42px' }}
                >
                  <FaShieldAlt size={22} className="text-warning" />
                </div>
                <div>
                  <h3 className="fw-bold text-navy mb-0 text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    {garage.garageName || 'GARAGE ERP AUTO SERVICES'}
                  </h3>
                  <small className="text-muted fw-semibold">
                    AUTOMOTIVE DEALERSHIP &bull; INSURANCE RENEWAL FACILITATION DESK
                  </small>
                </div>
              </div>
              <div className="text-secondary small mt-2" style={{ lineHeight: '1.4' }}>
                <div>{garage.address || '123 Garage Lane, Industrial Area, Phase II'}</div>
                <div>
                  {garage.city || 'Udupi'}, {garage.state || 'Karnataka'} {garage.pincode ? `- ${garage.pincode}` : ''}
                </div>
                <div>
                  Phone: <strong>{garage.phone || '+91 98765 43210'}</strong> &bull; Email:{' '}
                  <strong>{garage.email || 'support@garageerp.com'}</strong>
                </div>
                {garage.gstin && (
                  <div>
                    <strong>Dealership GSTIN:</strong> <span className="font-monospace text-dark fw-bold">{garage.gstin}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-end">
              <div className="badge bg-success text-white text-uppercase px-3 py-1.5 mb-1 fs-6 font-monospace" style={{ letterSpacing: '1px' }}>
                <FaCheckCircle className="me-1" /> STATUS: PAID / ACTIVE
              </div>
              <div className="small text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                INSURANCE PAYMENT RECEIPT
              </div>
              <div
                className="small font-monospace border rounded p-2.5 text-start"
                style={{
                  minWidth: '240px',
                  backgroundColor: '#151A17',
                  borderColor: 'rgba(217, 168, 62, 0.28)',
                  color: '#CBD5E1',
                  lineHeight: '1.5',
                }}
              >
                <div>
                  <strong style={{ color: '#D9A83E' }}>Receipt No:</strong>{' '}
                  <span className="fw-bold" style={{ color: '#38BDF8' }}>
                    {renewal.renewalNumber}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#D9A83E' }}>Receipt Date:</strong>{' '}
                  <span style={{ color: '#F8FAFC' }}>{formatDateIST(renewal.paymentDate || renewal.createdAt)}</span>
                </div>
                <div>
                  <strong style={{ color: '#D9A83E' }}>Payment Mode:</strong>{' '}
                  <span style={{ color: '#F8FAFC' }}>{renewal.paymentMethod || 'Razorpay Gateway'}</span>
                </div>
                <div>
                  <strong style={{ color: '#D9A83E' }}>Gateway Status:</strong>{' '}
                  <span className="text-success fw-bold">Captured & Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dealership Profiles: Customer & Vehicle Grid */}
          <Row className="g-2 mb-3">
            {/* Box A: Customer Details */}
            <Col xs={12} md={6}>
              <div
                className="receipt-profile-box border rounded h-100 p-3"
                style={{
                  backgroundColor: '#151A17',
                  borderColor: 'rgba(217, 168, 62, 0.28)',
                }}
              >
                <div
                  className="d-flex align-items-center gap-1.5 fw-bold text-uppercase border-bottom pb-1.5 mb-2 small"
                  style={{ color: '#F2C75C', borderColor: 'rgba(217, 168, 62, 0.2)' }}
                >
                  <FaUser size={12} className="text-orange" /> Policyholder / Customer Details
                </div>
                <div className="small" style={{ lineHeight: '1.55', color: '#CBD5E1' }}>
                  <div className="fw-bold fs-6 mb-1" style={{ color: '#FFFFFF' }}>
                    {customer?.fullName || 'Valued Vehicle Owner'}
                  </div>
                  <div>
                    <strong style={{ color: '#D9A83E' }}>Mobile:</strong>{' '}
                    <span style={{ color: '#F8FAFC' }}>{customer?.mobileNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#D9A83E' }}>Email:</strong>{' '}
                    <span style={{ color: '#F8FAFC' }}>{customer?.emailAddress || 'N/A'}</span>
                  </div>
                  {(customer?.address || customer?.city) && (
                    <div>
                      <strong style={{ color: '#D9A83E' }}>Address:</strong>{' '}
                      <span style={{ color: '#E2E8F0' }}>
                        {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}{' '}
                        {customer.pincode ? `- ${customer.pincode}` : ''}
                      </span>
                    </div>
                  )}
                  {customer?.gstin && (
                    <div>
                      <strong style={{ color: '#D9A83E' }}>Customer GSTIN:</strong>{' '}
                      <span className="font-monospace fw-bold" style={{ color: '#F2C75C' }}>
                        {customer.gstin}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Box B: Vehicle Details */}
            <Col xs={12} md={6}>
              <div
                className="receipt-profile-box border rounded h-100 p-3"
                style={{
                  backgroundColor: '#151A17',
                  borderColor: 'rgba(217, 168, 62, 0.28)',
                }}
              >
                <div
                  className="d-flex align-items-center gap-1.5 fw-bold text-uppercase border-bottom pb-1.5 mb-2 small"
                  style={{ color: '#F2C75C', borderColor: 'rgba(217, 168, 62, 0.2)' }}
                >
                  <FaCar size={12} className="text-orange" /> Insured Vehicle Information
                </div>
                <div className="small" style={{ lineHeight: '1.55', color: '#CBD5E1' }}>
                  <Row className="g-1.5">
                    <Col xs={12} className="mb-1">
                      <strong style={{ color: '#D9A83E' }}>Registration Number:</strong>{' '}
                      <span
                        className="font-monospace fw-bold px-2 py-0.5 rounded fs-6"
                        style={{
                          backgroundColor: 'rgba(217, 168, 62, 0.15)',
                          color: '#F2C75C',
                          border: '1px solid rgba(217, 168, 62, 0.3)',
                        }}
                      >
                        {vehicle?.vehicleNumber || 'N/A'}
                      </span>
                    </Col>
                    <Col xs={6}>
                      <strong style={{ color: '#D9A83E' }}>Make & Model:</strong>{' '}
                      <span style={{ color: '#F8FAFC' }}>
                        {vehicle?.brand || ''} {vehicle?.model || ''}
                      </span>
                    </Col>
                    <Col xs={6}>
                      <strong style={{ color: '#D9A83E' }}>Fuel / Trans:</strong>{' '}
                      <span style={{ color: '#F8FAFC' }}>
                        {vehicle?.fuelType || 'Petrol'} / {vehicle?.transmission || 'Manual'}
                      </span>
                    </Col>
                    {vehicle?.manufacturingYear && (
                      <Col xs={6}>
                        <strong style={{ color: '#D9A83E' }}>Mfg Year:</strong>{' '}
                        <span style={{ color: '#F8FAFC' }}>{vehicle.manufacturingYear}</span>
                      </Col>
                    )}
                    {vehicle?.currentOdometerReading !== undefined && (
                      <Col xs={6}>
                        <strong style={{ color: '#D9A83E' }}>Odometer:</strong>{' '}
                        <span style={{ color: '#F8FAFC' }}>
                          {vehicle.currentOdometerReading.toLocaleString('en-IN')} km
                        </span>
                      </Col>
                    )}
                  </Row>
                </div>
              </div>
            </Col>
          </Row>

          {/* Policy & Coverage Terms (Gold/Dark Box) */}
          <div
            className="receipt-profile-box border rounded p-3 mb-3"
            style={{
              backgroundColor: '#151A17',
              borderColor: 'rgba(217, 168, 62, 0.28)',
            }}
          >
            <div
              className="d-flex align-items-center justify-content-between border-bottom pb-1.5 mb-2 small flex-wrap gap-2"
              style={{ color: '#F2C75C', borderColor: 'rgba(217, 168, 62, 0.2)' }}
            >
              <div className="d-flex align-items-center gap-1.5 fw-bold text-uppercase">
                <FaShieldAlt size={13} className="text-orange" /> Policy & Coverage Details
              </div>
              <span className="small text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                All policy validity stored in Indian Standard Time (IST)
              </span>
            </div>

            <Row className="g-2 pt-1 text-center text-sm-start align-items-center">
              <Col xs={12} sm={6} md={3}>
                <div className="text-muted small" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Insurance Provider
                </div>
                <div className="fw-bold mt-0.5" style={{ color: '#F8FAFC', fontSize: '0.85rem' }}>
                  {renewal.newInsurance?.provider || 'N/A'}
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div className="text-muted small" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Policy Number
                </div>
                <div className="fw-bold font-monospace mt-0.5" style={{ color: '#38BDF8', fontSize: '0.85rem' }}>
                  {renewal.newInsurance?.policyNumber || 'N/A'}
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="text-muted small" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Policy Start Date
                </div>
                <div className="fw-bold font-monospace mt-0.5" style={{ color: '#F8FAFC', fontSize: '0.85rem' }}>
                  {policyStartStr}
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="text-muted small" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Policy Expiry Date
                </div>
                <div className="fw-bold font-monospace mt-0.5" style={{ color: '#10B981', fontSize: '0.85rem' }}>
                  {policyExpiryStr}
                </div>
              </Col>
            </Row>
          </div>

          {/* Financial Breakdown Table */}
          <div className="mb-3">
            <div className="bg-light border border-bottom-0 px-3 py-1.5 rounded-top d-flex justify-content-between align-items-center">
              <span className="fw-bold text-navy text-uppercase small">
                Premium Calculation & Tax Breakup
              </span>
              <span className="small text-muted font-monospace">GST Rate: {gstRate}%</span>
            </div>
            <Table size="sm" bordered responsive className="mb-0 small align-middle">
              <thead className="table-light text-center" style={{ fontSize: '0.75rem' }}>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th className="text-start">Description</th>
                  <th style={{ width: '120px' }}>HSN / SAC</th>
                  <th style={{ width: '100px' }}>GST Rate</th>
                  <th style={{ width: '140px' }} className="text-end pe-3">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-monospace">1</td>
                  <td>
                    <strong>Motor Vehicle Insurance Policy Premium</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Insurer: {renewal.newInsurance?.provider} &bull; Policy No: {renewal.newInsurance?.policyNumber}
                    </div>
                  </td>
                  <td className="text-center font-monospace">997134</td>
                  <td className="text-center">18%</td>
                  <td className="text-end pe-3 font-monospace">{formatINR(premiumAmount, false)}</td>
                </tr>
                <tr>
                  <td className="text-center font-monospace">2</td>
                  <td>
                    <strong>Goods & Services Tax (CGST 9% + SGST 9% / IGST)</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Applicable statutory tax on general insurance services under GST Act
                    </div>
                  </td>
                  <td className="text-center font-monospace">997134</td>
                  <td className="text-center">18%</td>
                  <td className="text-end pe-3 font-monospace">{formatINR(gstAmount, false)}</td>
                </tr>
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <td colSpan={4} className="text-end fw-bold text-navy pe-3 text-uppercase">
                    Total Amount Paid (INR):
                  </td>
                  <td className="text-end pe-3 fs-6 fw-bold text-success font-monospace">
                    {formatINR(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </Table>
          </div>

          {/* Amount In Words Banner */}
          <div className="border rounded p-2.5 mb-3 bg-light-subtle d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span className="text-muted small fw-bold text-uppercase me-2">Amount in Words:</span>
              <strong className="text-navy">{amountInWords}</strong>
            </div>
            <div className="text-end">
              <span className="text-muted small fw-bold text-uppercase me-2">Payment Status:</span>
              <span className="badge bg-success px-2.5 py-1 font-monospace">PAID &bull; ACTIVE</span>
            </div>
          </div>

          {/* Payment & Gateway Verification Audit Card */}
          <div className="border rounded p-3 mb-3 bg-light text-dark small">
            <div className="fw-bold text-navy text-uppercase mb-2 border-bottom pb-1 d-flex align-items-center justify-content-between">
              <span>Razorpay Digital Payment Authentication</span>
              <Badge bg="success" className="font-monospace fw-normal">
                Instant Gateway Verification
              </Badge>
            </div>
            <Row className="g-2">
              <Col xs={12} sm={6} md={3}>
                <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>Razorpay Payment ID:</span>
                <span className="font-monospace fw-bold text-dark">{renewal.razorpayPaymentId || 'N/A'}</span>
              </Col>
              {renewal.razorpayOrderId && (
                <Col xs={12} sm={6} md={3}>
                  <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>Razorpay Order ID:</span>
                  <span className="font-monospace fw-bold text-dark">{renewal.razorpayOrderId}</span>
                </Col>
              )}
              <Col xs={12} sm={6} md={3}>
                <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>Payment Method:</span>
                <span className="fw-semibold text-dark">{renewal.paymentMethod || 'Razorpay Gateway'}</span>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>Payment Date & Time (IST):</span>
                <span className="fw-semibold text-dark font-monospace">{paymentTimeStr}</span>
              </Col>
            </Row>
          </div>

          {/* Terms & Official Stamp */}
          <Row className="g-3 mt-1 pt-2 border-top">
            <Col xs={12} md={7}>
              <div className="border rounded p-2.5 bg-light h-100 text-muted small" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                <div className="fw-bold text-navy text-uppercase mb-1">Receipt & Policy Terms:</div>
                <ol className="ps-3 mb-0">
                  <li>This receipt confirms online payment collection towards the motor insurance policy renewal.</li>
                  <li>Coverage is effective strictly from 00:00 hrs on the Policy Start Date to 23:59 hrs on the Expiry Date.</li>
                  <li>Vehicle insurance records have been officially renewed and synchronized in the garage database.</li>
                  <li>Claims and underwriting terms remain strictly subject to the respective insurance company guidelines.</li>
                  <li>This is a digital acknowledgement and does not require a physical signature.</li>
                </ol>
              </div>
            </Col>

            <Col xs={12} md={5}>
              <div className="border rounded p-2.5 h-100 d-flex flex-column justify-content-between text-center bg-light">
                <div className="text-end small text-muted">
                  For <strong>{garage.garageName || 'GARAGE ERP AUTO SERVICES'}</strong>
                </div>
                <div className="my-3 py-2 text-muted font-monospace" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
                  [ INSURANCE DESK SEAL & AUTH ]
                </div>
                <div className="d-flex justify-content-between align-items-end pt-2 border-top small text-secondary">
                  <div>Customer Copy</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Bottom Electronic Verification Notice */}
          <div className="text-center mt-3 pt-2 text-muted" style={{ fontSize: '0.7rem' }}>
            <p className="mb-0">
              This is a computer-generated Insurance Renewal Payment Receipt issued by Garage ERP. All dates and times recorded in Indian Standard Time (IST).
            </p>
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
          .insurance-receipt-container {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            padding: 15px !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .receipt-print-area {
            width: 100% !important;
          }
          .table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
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
          .receipt-profile-box {
            background-color: #f8f9fa !important;
            border: 1px solid #ccc !important;
          }
          .receipt-profile-box strong, 
          .receipt-profile-box span, 
          .receipt-profile-box div {
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InsuranceReceipt;
