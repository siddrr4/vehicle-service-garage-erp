import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { FaUserClock, FaSignInAlt, FaSignOutAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import attendanceService from '../../services/attendanceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatTimeIST, formatDateIST, formatWorkingHoursDisplay } from '../../utils/dateUtils';

const MechanicAttendance = () => {
  const { user } = useContext(AuthContext);
  const [todayData, setTodayData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendanceInfo = async () => {
    try {
      setLoading(true);
      const todayRes = await attendanceService.getTodayAttendance();
      const historyRes = await attendanceService.getMechanicAttendanceHistory();
      setTodayData(todayRes);
      setHistory(historyRes || []);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load attendance records');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceInfo();
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceService.checkIn();
      toast.success('Successfully checked in for today!');
      setActionLoading(false);
      fetchAttendanceInfo();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceService.checkOut();
      const formattedHours = res.workingHours && typeof res.workingHours === 'string' && res.workingHours.includes('h') ? res.workingHours : `${res.workingHours} hrs`;
      toast.success(`Checked out successfully! Total working hours: ${formattedHours}`);
      setActionLoading(false);
      fetchAttendanceInfo();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return <Badge bg="success" className="px-3 py-2 rounded-pill"><FaCheckCircle className="me-1" /> Present</Badge>;
      case 'Late':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill"><FaExclamationTriangle className="me-1" /> Late</Badge>;
      case 'Half Day':
        return <Badge style={{ backgroundColor: '#fd7e14', color: '#fff' }} className="px-3 py-2 rounded-pill">Half Day</Badge>;
      case 'Early Exit':
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">Early Exit</Badge>;
      case 'Absent':
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">Absent</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  if (loading) return <LoadingSpinner />;

  const isCheckedIn = todayData?.checkedIn;
  const isCheckedOut = todayData?.checkedOut;
  const currentRecord = todayData?.attendance;

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
          <FaUserClock /> Attendance Management
        </h2>
        <p className="text-muted mb-0">Record your daily check-in, check-out, and view your work history</p>
      </div>

      {/* Action Card */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Body className="p-4 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-dark m-0">Today's Attendance Status</h5>
                  {currentRecord ? getStatusBadge(currentRecord.status || currentRecord.attendanceStatus) : <Badge bg="secondary">Not Checked In</Badge>}
                </div>
                <p className="text-muted small mb-4">
                  {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="d-flex gap-3 mt-3">
                <Button
                  variant="success"
                  className="w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  onClick={handleCheckIn}
                  disabled={isCheckedIn || actionLoading}
                >
                  {actionLoading ? <Spinner animation="border" size="sm" /> : <FaSignInAlt size={18} />}
                  <span>{isCheckedIn ? 'Checked In' : 'Check In'}</span>
                </Button>

                <Button
                  variant="danger"
                  className="w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  onClick={handleCheckOut}
                  disabled={!isCheckedIn || isCheckedOut || actionLoading}
                >
                  {actionLoading ? <Spinner animation="border" size="sm" /> : <FaSignOutAlt size={18} />}
                  <span>{isCheckedOut ? 'Checked Out' : 'Check Out'}</span>
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Stats Summary Card */}
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold text-dark mb-4">Today's Working Summary</h5>
              <Row className="g-3">
                <Col xs={6}>
                  <div className="p-3 bg-light rounded border">
                    <small className="text-muted d-block fw-medium mb-1">Check In Time</small>
                    <h6 className="fw-bold text-dark m-0">
                      {currentRecord?.checkIn ? formatTimeIST(currentRecord.checkIn) : '--:--'}
                    </h6>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="p-3 bg-light rounded border">
                    <small className="text-muted d-block fw-medium mb-1">Check Out Time</small>
                    <h6 className="fw-bold text-dark m-0">
                      {currentRecord?.checkOut ? formatTimeIST(currentRecord.checkOut) : '--:--'}
                    </h6>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="p-3 bg-primary bg-opacity-10 rounded border border-primary border-opacity-25 d-flex align-items-center justify-content-between">
                    <div>
                      <small className="text-primary fw-semibold d-block mb-1">Total Calculated Hours</small>
                      <h4 className="fw-bold text-primary m-0">
                        {formatWorkingHoursDisplay(currentRecord?.workingHours, Boolean(isCheckedIn), Boolean(isCheckedOut))}
                      </h4>
                    </div>
                    <div className="p-3 bg-primary text-white rounded-circle">
                      <FaClock size={20} />
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Attendance History Table */}
      <Card className="border-0 shadow-sm bg-card">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <FaCalendarAlt /> Attendance History
          </h5>
          <span className="badge bg-light text-dark border">Recent Records</span>
        </Card.Header>
        <Card.Body className="p-0">
          {history.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <FaUserClock size={40} className="mb-2 opacity-50" />
              <h6>No attendance history found</h6>
              <p className="small mb-0">Check in today to start recording your attendance.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 custom-table">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="px-4 py-3 border-0">Date</th>
                    <th className="px-4 py-3 border-0">Check In</th>
                    <th className="px-4 py-3 border-0">Check Out</th>
                    <th className="px-4 py-3 border-0">Total Hours</th>
                    <th className="px-4 py-3 border-0 text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id} className="border-bottom">
                      <td className="px-4 py-3 fw-bold text-navy">{formatDateIST(item.date)}</td>
                      <td className="px-4 py-3 text-dark fw-medium">
                        {item.checkIn ? formatTimeIST(item.checkIn) : '-'}
                      </td>
                      <td className="px-4 py-3 text-dark fw-medium">
                        {item.checkOut ? formatTimeIST(item.checkOut) : '-'}
                      </td>
                      <td className="px-4 py-3 fw-semibold text-primary">
                        {formatWorkingHoursDisplay(item.workingHours, Boolean(item.checkIn), Boolean(item.checkOut))}
                      </td>
                      <td className="px-4 py-3 text-end">{getStatusBadge(item.status || item.attendanceStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default MechanicAttendance;
