import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { 
  FaPrint, FaArrowLeft, FaCar, FaUserTie, 
  FaCalendarAlt, FaCheckCircle, FaClock, FaBuilding, FaMoneyBillWave 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import payrollService from '../../services/payrollService';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatDateIST } from '../../utils/dateUtils';
import './Payslip.css';

// Helper function to convert Indian number into words
const numberToWordsIndian = (num) => {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let output = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore > 0) output += inWords(crore) + 'Crore ';
  if (lakh > 0) output += inWords(lakh) + 'Lakh ';
  if (thousand > 0) output += inWords(thousand) + 'Thousand ';
  if (n > 0) output += inWords(n);

  return output.trim() + ' Rupees Only';
};

const PayslipView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [payroll, setPayroll] = useState(null);
  const [garage, setGarage] = useState(null);
  const [loading, setLoading] = useState(true);

  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const data = await payrollService.getPayrollById(id);
        setPayroll(data.payroll);
        setGarage(data.garage || {});
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load payslip');
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner />;
  if (!payroll) {
    return (
      <div className="text-center py-5">
        <h5>Payslip not found</h5>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-2">
          Go Back
        </Button>
      </div>
    );
  }

  const monthName = months[payroll.month] || `Month ${payroll.month}`;
  const netInWords = numberToWordsIndian(payroll.netSalary);

  const backDestination = user?.role === 'mechanic' ? '/my-payslips' : (user?.role === 'customer' ? '/notifications' : '/payroll');

  return (
    <div className="container-fluid p-0 mb-5">
      {/* Top Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <Button
          variant="outline-secondary"
          onClick={() => navigate(backDestination)}
          className="d-flex align-items-center gap-2"
        >
          <FaArrowLeft /> <span>Back</span>
        </Button>
        <div className="d-flex gap-2">
          <Button
            variant="success"
            onClick={handlePrint}
            className="d-flex align-items-center gap-2 shadow-sm"
          >
            <FaPrint /> <span>Print / Save PDF</span>
          </Button>
        </div>
      </div>

      {/* Printable Payslip Card */}
      <div className="payslip-container p-4 p-md-5">
        {/* Garage Header */}
        <div className="border-bottom pb-4 mb-4">
          <Row className="align-items-center">
            <Col xs={12} md={7}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="p-2 bg-primary bg-opacity-10 text-primary rounded">
                  <FaCar size={28} />
                </div>
                <div>
                  <h3 className="fw-bold text-navy mb-0">
                    {garage?.garageName || 'GARAGE ERP AUTO SERVICES'}
                  </h3>
                  <div className="text-muted small">
                    {garage?.address ? `${garage.address}, ` : ''}
                    {garage?.city ? `${garage.city}, ` : ''}
                    {garage?.state ? `${garage.state} ` : ''}
                    {garage?.pincode ? `- ${garage.pincode}` : ''}
                  </div>
                </div>
              </div>
              <div className="small text-muted">
                {garage?.phone && <span>Phone: {garage.phone} &bull; </span>}
                {garage?.email && <span>Email: {garage.email}</span>}
                {garage?.gstin && <div><strong>GSTIN:</strong> {garage.gstin}</div>}
              </div>
            </Col>
            <Col xs={12} md={5} className="text-md-end mt-3 mt-md-0">
              <span className="badge bg-light text-navy border font-monospace px-3 py-2 fs-6 mb-2 d-inline-block">
                PAYSLIP: #{String(payroll._id || '').slice(-8).toUpperCase()}
              </span>
              <h5 className="fw-bold text-dark mb-0">SALARY SLIP FOR {monthName.toUpperCase()} {payroll.year}</h5>
              <div className="small text-muted">
                Generated On: {formatDateIST(payroll.createdAt)}
              </div>
            </Col>
          </Row>
        </div>

        {/* Employee & Attendance Grid */}
        <Row className="g-3 mb-4">
          {/* Employee Details Box */}
          <Col md={7}>
            <div className="payslip-box h-100">
              <div className="fw-bold text-navy text-uppercase small mb-2 d-flex align-items-center gap-2">
                <FaUserTie /> Employee Information
              </div>
              <Row className="g-2 small">
                <Col xs={5} className="text-muted">Employee Name:</Col>
                <Col xs={7} className="fw-bold text-dark">{payroll.employee?.fullName}</Col>

                <Col xs={5} className="text-muted">Employee ID:</Col>
                <Col xs={7} className="fw-bold font-monospace">{payroll.employee?.employeeId}</Col>

                <Col xs={5} className="text-muted">Designation / Role:</Col>
                <Col xs={7} className="fw-semibold">{payroll.employee?.role}</Col>

                <Col xs={5} className="text-muted">Specialization:</Col>
                <Col xs={7}>{payroll.employee?.specialization || 'General Services'}</Col>

                <Col xs={5} className="text-muted">Salary Model:</Col>
                <Col xs={7}><Badge bg="info" className="px-2 py-0.5">{payroll.salaryType}</Badge></Col>

                {payroll.salaryType === 'Monthly' && payroll.monthlyBasicSalary > 0 && (
                  <>
                    <Col xs={5} className="text-muted">Monthly Base Rate:</Col>
                    <Col xs={7} className="fw-semibold">₹{payroll.monthlyBasicSalary.toLocaleString('en-IN')}</Col>
                  </>
                )}
              </Row>
            </div>
          </Col>

          {/* Attendance Summary Box */}
          <Col md={5}>
            <div className="payslip-box h-100">
              <div className="fw-bold text-navy text-uppercase small mb-2 d-flex align-items-center gap-2">
                <FaCalendarAlt /> Attendance Summary
              </div>
              <Row className="g-2 small">
                <Col xs={7} className="text-muted">Calendar Working Days:</Col>
                <Col xs={5} className="fw-bold text-end">{payroll.totalWorkingDays || 26} days</Col>

                <Col xs={7} className="text-muted">Working Days Considered:</Col>
                <Col xs={5} className="fw-bold text-navy text-end">
                  {payroll.workingDaysConsidered !== undefined && payroll.workingDaysConsidered > 0 ? payroll.workingDaysConsidered : payroll.workingDays} days
                </Col>

                <Col xs={7} className="text-muted">Days Present / Worked:</Col>
                <Col xs={5} className="fw-bold text-success text-end">{payroll.presentDays} days</Col>

                <Col xs={7} className="text-muted">Approved Leaves:</Col>
                <Col xs={5} className="fw-semibold text-info text-end">{payroll.leaveDays || 0} days</Col>

                <Col xs={7} className="text-muted">Half Days:</Col>
                <Col xs={5} className="fw-semibold text-end" style={{ color: '#fd7e14' }}>{payroll.halfDays || 0} days</Col>

                <Col xs={7} className="text-muted">Days Absent (Loss of Pay):</Col>
                <Col xs={5} className="fw-bold text-danger text-end">{payroll.absentDays || 0} days</Col>

                {payroll.futureWorkingDays > 0 && (
                  <>
                    <Col xs={7} className="text-muted">Future Days (Unprocessed):</Col>
                    <Col xs={5} className="text-muted text-end">{payroll.futureWorkingDays} days</Col>
                  </>
                )}

                {payroll.calculatedUpTo && (
                  <>
                    <Col xs={7} className="text-muted">Calculated Up To:</Col>
                    <Col xs={5} className="fw-semibold text-primary text-end">{payroll.calculatedUpTo}</Col>
                  </>
                )}

                <Col xs={7} className="text-muted">Per-Day Rate (Calc):</Col>
                <Col xs={5} className="fw-semibold text-end">₹{payroll.perDaySalary?.toLocaleString('en-IN')}</Col>
              </Row>
            </div>
          </Col>
        </Row>

        {/* Earnings & Deductions Tables */}
        <Row className="g-4 mb-4">
          {/* Earnings */}
          <Col md={6}>
            <div className="border rounded overflow-hidden">
              <Table className="payslip-table mb-0">
                <thead>
                  <tr>
                    <th>Earnings</th>
                    <th className="text-end">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Basic Pay {payroll.salaryType === 'Daily' 
                        ? `(${payroll.presentDays} days)` 
                        : (payroll.workingDaysConsidered < payroll.totalWorkingDays && payroll.workingDaysConsidered > 0 
                            ? `(${payroll.workingDaysConsidered}/${payroll.totalWorkingDays} days)` 
                            : '')}
                    </td>
                    <td className="text-end fw-semibold">
                      ₹{(payroll.salaryType === 'Daily' ? payroll.basicSalary * payroll.presentDays : payroll.basicSalary).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {payroll.allowancesBreakdown && payroll.allowancesBreakdown.length > 0 ? (
                    payroll.allowancesBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td className="text-end text-success">+₹{item.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-muted small">Standard Allowances</td>
                      <td className="text-end text-muted">₹0</td>
                    </tr>
                  )}
                  <tr className="table-light fw-bold border-top">
                    <td>Total Gross Earnings</td>
                    <td className="text-end text-navy fs-6">₹{payroll.grossEarnings?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Col>

          {/* Deductions */}
          <Col md={6}>
            <div className="border rounded overflow-hidden">
              <Table className="payslip-table mb-0">
                <thead>
                  <tr>
                    <th>Deductions</th>
                    <th className="text-end">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Attendance Deduction
                      {payroll.absentDays > 0 && (
                        <div className="small text-muted">({payroll.absentDays} absent days × ₹{payroll.perDaySalary})</div>
                      )}
                    </td>
                    <td className="text-end text-danger fw-semibold">
                      ₹{payroll.attendanceDeduction?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {payroll.deductionsBreakdown && payroll.deductionsBreakdown.length > 0 ? (
                    payroll.deductionsBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td className="text-end text-danger">-₹{item.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-muted small">Statutory Deductions</td>
                      <td className="text-end text-muted">₹0</td>
                    </tr>
                  )}
                  <tr className="table-light fw-bold border-top">
                    <td>Total Deductions</td>
                    <td className="text-end text-danger fs-6">₹{payroll.totalDeductions?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Col>
        </Row>

        {/* Net Salary Highlight Box */}
        <div className="payslip-net-box mb-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="text-uppercase small tracking-wider opacity-75">Net Payable Salary</div>
              <h2 className="fw-bold mb-1">₹{payroll.netSalary?.toLocaleString('en-IN')}</h2>
              <div className="small opacity-90 fst-italic">Amount in words: {netInWords}</div>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <div className="small opacity-75 mb-1">Payment Status</div>
              {payroll.paymentStatus === 'Paid' ? (
                <span className="payslip-badge-paid">
                  <FaCheckCircle className="me-1" /> PAID
                </span>
              ) : (
                <span className="payslip-badge-pending">
                  <FaClock className="me-1" /> PENDING
                </span>
              )}
            </Col>
          </Row>
        </div>

        {/* Payment Transaction Details */}
        {payroll.paymentStatus === 'Paid' && (
          <div className="bg-light p-3 rounded border mb-4 small">
            <div className="fw-bold text-navy mb-2">Disbursement Details</div>
            <Row className="g-2">
              <Col md={3}>
                <span className="text-muted">Payment Mode:</span>{' '}
                <strong>{payroll.paymentMethod || 'Bank Transfer'}</strong>
              </Col>
              <Col md={3}>
                <span className="text-muted">Payment Date:</span>{' '}
                <strong>{payroll.paymentDate ? formatDateIST(payroll.paymentDate) : 'N/A'}</strong>
              </Col>
              <Col md={6}>
                <span className="text-muted">Txn Reference / UTR:</span>{' '}
                <span className="font-monospace fw-semibold">{payroll.transactionReference || 'N/A'}</span>
              </Col>
              {payroll.paymentRemarks && (
                <Col xs={12}>
                  <span className="text-muted">Remarks:</span> {payroll.paymentRemarks}
                </Col>
              )}
            </Row>
          </div>
        )}

        {/* Signatures */}
        <div className="pt-4 mt-4 border-top">
          <Row className="text-center">
            <Col xs={6}>
              <div style={{ height: '60px' }}></div>
              <div className="border-top pt-2 mx-auto" style={{ maxWidth: '200px' }}>
                <div className="fw-bold small text-dark">Employee Signature</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{payroll.employee?.fullName}</div>
              </div>
            </Col>
            <Col xs={6}>
              <div style={{ height: '60px' }}></div>
              <div className="border-top pt-2 mx-auto" style={{ maxWidth: '200px' }}>
                <div className="fw-bold small text-dark">Authorized Signatory</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>For {garage?.garageName || 'Garage ERP'}</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Footer Note */}
        <div className="text-center text-muted small mt-4 pt-3 border-top" style={{ fontSize: '0.75rem' }}>
          This is a computer-generated salary slip and does not require physical stamp when verified digitally.
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
