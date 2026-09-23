import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Row, Col, Table, Badge, Form } from 'react-bootstrap';
import { 
  FaReceipt, FaPrint, FaCalendarAlt, FaCheckCircle, 
  FaClock, FaMoneyBillWave, FaCoins, FaInfoCircle 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import payrollService from '../../services/payrollService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MyPayslips = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchMyPayslips = async (yr = selectedYear) => {
    try {
      setLoading(true);
      const data = await payrollService.getMyPayslips({ year: yr });
      setPayslips(Array.isArray(data) ? data : data.payrolls || data.payslips || []);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load your payslips');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPayslips(selectedYear);
  }, [selectedYear]);

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const totalEarned = payslips
    .filter((p) => p.paymentStatus === 'Paid')
    .reduce((sum, p) => sum + (p.netSalary || 0), 0);

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
            <FaReceipt /> My Salary Payslips
          </h2>
          <p className="text-muted mb-0">View and download your monthly salary slips and disbursement records</p>
        </div>

        {/* Year Filter */}
        <div className="d-flex align-items-center gap-2">
          <FaCalendarAlt className="text-muted" />
          <Form.Label className="m-0 fw-bold small text-navy">Year:</Form.Label>
          <Form.Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-auto fw-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Form.Select>
        </div>
      </div>

      {/* Quick Summary Card */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                <FaCoins size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Total Paid ({selectedYear})</div>
                <h4 className="fw-bold text-success mb-0">₹{totalEarned.toLocaleString('en-IN')}</h4>
              </div>
            </div>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                <FaReceipt size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Generated Payslips</div>
                <h4 className="fw-bold text-navy mb-0">{payslips.length}</h4>
              </div>
            </div>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-info bg-opacity-10 text-info rounded-circle">
                <FaInfoCircle size={22} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Disbursement Cycle</div>
                <h6 className="fw-bold text-dark mb-0">Monthly by 5th</h6>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Payslips Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : payslips.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaReceipt size={40} className="mb-3 text-secondary opacity-50" />
            <h5>No Payslips Available for {selectedYear}</h5>
            <p>Your monthly salary slip will be available here once processed by garage management.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th className="ps-4">Month / Period</th>
                  <th title="Applicable working days elapsed out of total calendar working days">Working Days</th>
                  <th className="text-center text-success">Present</th>
                  <th className="text-center text-info">Leave</th>
                  <th className="text-center" style={{ color: '#fd7e14' }}>Half Day</th>
                  <th className="text-center text-danger">Absent / LOP</th>
                  <th>Gross Earnings</th>
                  <th>Total Deductions</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p._id}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{months[p.month]} {p.year}</div>
                      {p.calculatedUpTo && (
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          Up to: {p.calculatedUpTo}
                        </div>
                      )}
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
                    <td className="text-center text-success fw-semibold">{p.presentDays}</td>
                    <td className="text-center text-info fw-semibold">{p.leaveDays || 0}</td>
                    <td className="text-center fw-semibold" style={{ color: '#fd7e14' }}>{p.halfDays || 0}</td>
                    <td className="text-center text-danger fw-semibold">{p.absentDays || 0}</td>
                    <td className="fw-medium text-dark">₹{p.grossEarnings?.toLocaleString('en-IN')}</td>
                    <td className="text-danger">-₹{p.totalDeductions?.toLocaleString('en-IN')}</td>
                    <td className="fw-bold text-navy fs-6">₹{p.netSalary?.toLocaleString('en-IN')}</td>
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
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="d-flex align-items-center gap-1 ms-auto"
                        onClick={() => navigate(`/payslips/${p._id}`)}
                      >
                        <FaPrint size={12} /> <span>View Payslip</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayslips;
