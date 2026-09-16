import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Badge, Card, Row, Col, Table, Form } from 'react-bootstrap';
import { 
  FaReceipt, FaSearch, FaFilter, FaCalendarAlt, 
  FaMoneyCheckAlt, FaCheckCircle, FaClock, FaPrint, 
  FaExclamationTriangle, FaUserTie, FaFileInvoiceDollar, FaSyncAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import payrollService from '../../services/payrollService';
import employeeService from '../../services/employeeService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import { getIndiaDateParts, getIndiaDateStr, formatDateIST } from '../../utils/dateUtils';

const PayrollList = () => {
  const navigate = useNavigate();
  const todayParts = getIndiaDateParts();
  const [month, setMonth] = useState(todayParts.month); // 1-12
  const [year, setYear] = useState(todayParts.year);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    totalGross: 0,
    totalNet: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generate confirmation modal
  const [showGenModal, setShowGenModal] = useState(false);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: getIndiaDateStr(),
    paymentMethod: 'Bank Transfer',
    transactionReference: '',
    paymentRemarks: '',
  });
  const [paying, setPaying] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [year - 2, year - 1, year, year + 1];

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getPayrolls({
        month,
        year,
        paymentStatus: statusFilter,
        limit: 100,
      });

      const list = data.payrolls || [];
      setPayrolls(list);

      // Compute statistics for this period
      const computedStats = list.reduce(
        (acc, p) => {
          acc.totalGross += p.grossEarnings || 0;
          acc.totalNet += p.netSalary || 0;
          if (p.paymentStatus === 'Paid') {
            acc.totalPaid += p.netSalary || 0;
            acc.paidCount += 1;
          } else {
            acc.totalPending += p.netSalary || 0;
            acc.pendingCount += 1;
          }
          return acc;
        },
        { totalGross: 0, totalNet: 0, totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 }
      );
      setStats(computedStats);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch payroll records');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [month, year, statusFilter]);

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      const res = await payrollService.generateMonthlyPayroll({ month, year });
      toast.success(res.message || 'Payroll generated successfully');
      setShowGenModal(false);
      setGenerating(false);
      fetchPayrolls();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
      setGenerating(false);
    }
  };

  const handleOpenPayModal = (payroll) => {
    setSelectedPayroll(payroll);
    setPaymentForm({
      paymentDate: getIndiaDateStr(),
      paymentMethod: 'Bank Transfer',
      transactionReference: '',
      paymentRemarks: '',
    });
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    try {
      setPaying(true);
      await payrollService.updatePaymentStatus(selectedPayroll._id, {
        paymentStatus: 'Paid',
        ...paymentForm,
      });
      toast.success(`Salary marked as paid for ${selectedPayroll.employee?.fullName}`);
      setShowPayModal(false);
      setPaying(false);
      fetchPayrolls();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
      setPaying(false);
    }
  };

  const selectedMonthLabel = months.find((m) => m.value === Number(month))?.label;

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <PageHeader
        title="Monthly Payroll & Salary Disbursement"
        subtitle={`Generate, verify, and settle monthly employee salaries with live attendance logs for ${selectedMonthLabel} ${year}`}
        breadcrumbs={[
          { label: 'Finance', to: '/payroll' },
          { label: 'Payroll' }
        ]}
        actions={
          <button
            className="btn btn-orange d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowGenModal(true)}
          >
            <FaSyncAlt /> <span>Generate Payroll for {selectedMonthLabel}</span>
          </button>
        }
      />

      {/* Overview Cards */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-light text-navy rounded-circle border">
                <FaFileInvoiceDollar size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Total Net Payroll</div>
                <h4 className="fw-bold text-navy mb-0">₹{stats.totalNet.toLocaleString('en-IN')}</h4>
                <div className="text-muted small mt-1">Gross: ₹{stats.totalGross.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        </Col>

        <Col md={3} sm={6}>
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle border border-success border-opacity-25">
                <FaCheckCircle size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Disbursed (Paid)</div>
                <h4 className="fw-bold text-success mb-0">₹{stats.totalPaid.toLocaleString('en-IN')}</h4>
                <div className="text-muted small mt-1">{stats.paidCount} Employees Paid</div>
              </div>
            </div>
          </div>
        </Col>

        <Col md={3} sm={6}>
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle border border-warning border-opacity-25">
                <FaClock size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Pending Payouts</div>
                <h4 className="fw-bold text-danger mb-0">₹{stats.totalPending.toLocaleString('en-IN')}</h4>
                <div className="text-muted small mt-1">{stats.pendingCount} Pending</div>
              </div>
            </div>
          </div>
        </Col>

        <Col md={3} sm={6}>
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle border border-primary border-opacity-25">
                <FaUserTie size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Staff Processed</div>
                <h4 className="fw-bold text-dark mb-0">{payrolls.length}</h4>
                <div className="text-muted small mt-1">{selectedMonthLabel} {year}</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Period Selection & Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-3 p-4 mb-4">
        <Row className="g-3 align-items-center">
          <Col md={4}>
            <div className="d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-muted" />
              <Form.Label className="m-0 fw-bold small text-navy">Period:</Form.Label>
              <Form.Select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-auto fw-medium"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Form.Select>
              <Form.Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-auto fw-medium"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </div>
          </Col>

          <Col md={4}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="fw-medium"
            >
              <option value="">All Payment Statuses</option>
              <option value="Pending">Pending Only</option>
              <option value="Paid">Paid Only</option>
            </Form.Select>
          </Col>

          <Col md={4} className="text-md-end">
            <span className="small text-muted">
              Viewing payroll for <strong>{selectedMonthLabel} {year}</strong>
            </span>
          </Col>
        </Row>
      </div>

      {/* Information banner if viewing current month */}
      {month === (new Date().getMonth() + 1) && year === new Date().getFullYear() && (
        <div className="alert alert-info py-2.5 px-3 mb-4 d-flex align-items-center gap-2 small rounded-3 shadow-sm border bg-info bg-opacity-10 text-dark">
          <FaInfoCircle className="text-primary fs-6 flex-shrink-0" />
          <div>
            <strong>Payroll calculated up to: {payrolls[0]?.calculatedUpTo || `${selectedMonthLabel} ${new Date().getDate()}, ${year}`}</strong>
            <span className="ms-2 text-muted">
              (Past dates are treated as Present by default unless explicitly marked Absent/Leave/Half Day. Future working days produce zero LOP/deductions.)
            </span>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : payrolls.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaReceipt size={40} className="mb-3 text-secondary opacity-50" />
            <h5>No Payroll Records for {selectedMonthLabel} {year}</h5>
            <p>Click "Generate Payroll for {selectedMonthLabel}" to calculate salary based on attendance.</p>
            <Button
              variant="outline-primary"
              onClick={() => setShowGenModal(true)}
              className="mt-2"
            >
              Generate Payroll Now
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th className="ps-4">Employee</th>
                  <th title="Applicable working days elapsed out of total calendar working days">Working Days</th>
                  <th className="text-center text-success">Present</th>
                  <th className="text-center text-info">Leave</th>
                  <th className="text-center" style={{ color: '#fd7e14' }}>Half Day</th>
                  <th className="text-center text-danger">Absent / LOP</th>
                  <th>Gross Earnings</th>
                  <th>Total Deductions</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p._id}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">
                        {p.employee?.fullName || 'Employee'}
                      </div>
                      <div className="small text-muted d-flex align-items-center gap-2">
                        <span className="badge bg-light text-secondary border font-monospace">
                          {p.employee?.employeeId || 'N/A'}
                        </span>
                        <span>• {p.employee?.role || 'Staff'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-navy">
                          {p.workingDaysConsidered !== undefined && p.workingDaysConsidered > 0 ? p.workingDaysConsidered : p.workingDays} days
                        </span>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          of {p.totalWorkingDays || 26} total
                          {p.futureWorkingDays > 0 ? ` (${p.futureWorkingDays} future)` : ''}
                        </small>
                      </div>
                    </td>
                    <td className="text-center fw-bold text-success">
                      {p.presentDays}
                    </td>
                    <td className="text-center fw-semibold text-info">
                      {p.leaveDays || 0}
                    </td>
                    <td className="text-center fw-semibold" style={{ color: '#fd7e14' }}>
                      {p.halfDays || 0}
                    </td>
                    <td className="text-center fw-bold text-danger">
                      {p.absentDays || 0}
                    </td>
                    <td className="fw-semibold text-dark">
                      ₹{p.grossEarnings?.toLocaleString('en-IN')}
                    </td>
                    <td className="text-danger">
                      -₹{p.totalDeductions?.toLocaleString('en-IN')}
                    </td>
                    <td className="fw-bold text-navy fs-6">
                      ₹{p.netSalary?.toLocaleString('en-IN')}
                    </td>
                    <td>
                      {p.paymentStatus === 'Paid' ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">
                          <FaCheckCircle className="me-1" /> Paid
                        </span>
                      ) : (
                        <span className="badge bg-warning bg-opacity-10 text-warning text-dark border border-warning border-opacity-25 px-2 py-1 rounded-pill">
                          <FaClock className="me-1" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="d-flex align-items-center gap-1"
                          onClick={() => navigate(`/payslips/${p._id}`)}
                          title="View & Print Payslip"
                        >
                          <FaPrint size={12} /> <span>Payslip</span>
                        </Button>
                        {p.paymentStatus !== 'Paid' && (
                          <Button
                            variant="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={() => handleOpenPayModal(p)}
                            title="Record Payment"
                          >
                            <FaMoneyCheckAlt size={12} /> <span>Pay</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Generate Payroll Confirmation Modal */}
      <Modal show={showGenModal} onHide={() => setShowGenModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-navy h5 mb-0">
            Generate Payroll: {selectedMonthLabel} {year}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="d-flex gap-3 align-items-start mb-3">
            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
              <FaSyncAlt size={24} />
            </div>
            <div>
              <h6 className="fw-bold mb-1">Compute Salaries from Attendance</h6>
              <p className="text-muted small mb-0">
                This action will automatically read the real attendance records for all active garage employees for{' '}
                <strong>{selectedMonthLabel} {year}</strong>, apply their configured salary structures, and calculate working days,
                attendance deductions, allowances, and net salaries.
              </p>
            </div>
          </div>

          <div className="alert alert-info small mb-0">
            <strong>Historical Integrity Note:</strong> Any payroll records that have already been marked as <strong>Paid</strong> will be safely preserved and never overwritten.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenModal(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGeneratePayroll}
            disabled={generating}
            className="btn-primary-custom"
          >
            {generating ? 'Processing Attendance & Salaries...' : 'Confirm & Generate'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Record Payment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-navy h5 mb-0">
            Disburse Salary: {selectedPayroll?.employee?.fullName}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleProcessPayment}>
          <Modal.Body className="p-4">
            <div className="bg-light p-3 rounded border mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Period:</span>
                <span className="fw-semibold small">{selectedMonthLabel} {year}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Employee ID:</span>
                <span className="fw-semibold small font-monospace">{selectedPayroll?.employee?.employeeId}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Role:</span>
                <span className="fw-semibold small">{selectedPayroll?.employee?.role}</span>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark">Net Payable Amount:</span>
                <span className="fs-5 fw-bold text-success">₹{selectedPayroll?.netSalary?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-medium">Payment Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-medium">Payment Method <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-medium">Transaction Reference / UTR / Cheque No</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. UTR1928374619 or Cheque #004512"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-medium">Remarks</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Optional notes or bank acknowledgement"
                    value={paymentForm.paymentRemarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentRemarks: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayModal(false)} disabled={paying}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={paying}>
              {paying ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollList;
