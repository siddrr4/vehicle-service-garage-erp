import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Form, Button } from 'react-bootstrap';
import { FaUserCheck, FaUserTimes, FaClock, FaUsers, FaCalendarAlt, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (date) => {
    try {
      setLoading(true);
      const data = await attendanceService.getAdminAttendanceSummary(date);
      setSummary(data);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch attendance summary');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedDate);
  }, [selectedDate]);

  const handleAdminCheckIn = async (employeeId) => {
    try {
      setLoading(true);
      await attendanceService.checkIn(employeeId);
      toast.success('Employee checked in successfully');
      fetchSummary(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
      setLoading(false);
    }
  };

  const handleAdminCheckOut = async (employeeId) => {
    try {
      setLoading(true);
      await attendanceService.checkOut(employeeId);
      toast.success('Employee checked out successfully');
      fetchSummary(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return <Badge bg="success" className="px-3 py-2 rounded-pill">Present</Badge>;
      case 'Late':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Late</Badge>;
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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="fw-bold m-0 text-navy d-flex align-items-center gap-2 fs-2">
            <FaUserCheck /> Employee Attendance Dashboard
          </h1>
          <p className="text-muted mb-0">Monitor staff presence, late arrivals, and daily work logs</p>
        </div>

        <div className="d-flex align-items-center gap-2 bg-white p-2 rounded shadow-sm border">
          <FaCalendarAlt className="text-primary ms-2" />
          <Form.Control
            type="date"
            className="border-0 shadow-none p-1 fw-semibold text-navy"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="g-4 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Card className="border-0 shadow-sm bg-card h-100">
                <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted fw-medium mb-1">Total Employees</h6>
                    <h3 className="fw-bold mb-0 text-dark">{summary?.totalEmployees || 0}</h3>
                  </div>
                  <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                    <FaUsers size={24} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="border-0 shadow-sm bg-card h-100">
                <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted fw-medium mb-1">Today's Present</h6>
                    <h3 className="fw-bold mb-0 text-success">{summary?.presentEmployees || 0}</h3>
                  </div>
                  <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                    <FaUserCheck size={24} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="border-0 shadow-sm bg-card h-100">
                <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted fw-medium mb-1">Today's Absent</h6>
                    <h3 className="fw-bold mb-0 text-danger">{summary?.absentEmployees || 0}</h3>
                  </div>
                  <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle">
                    <FaUserTimes size={24} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="border-0 shadow-sm bg-card h-100">
                <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted fw-medium mb-1">Currently Available</h6>
                    <h3 className="fw-bold mb-0 text-primary">{summary?.currentlyAvailable || 0}</h3>
                  </div>
                  <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                    <FaTools size={24} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Attendance List Table */}
          <Card className="border-0 shadow-sm bg-card">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">
                Attendance Report & Log ({selectedDate})
              </h5>
              <span className="badge bg-light text-dark border">{summary?.attendanceList?.length || 0} Employees</span>
            </Card.Header>
            <Card.Body className="p-0">
              {summary?.attendanceList?.length === 0 ? (
                <div className="text-center p-5 text-muted">
                  <h5>No employee records available</h5>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0 custom-table">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th className="px-4 py-3 border-0">Emp ID</th>
                        <th className="px-4 py-3 border-0">Employee Name</th>
                        <th className="px-4 py-3 border-0">Role & Specialization</th>
                        <th className="px-4 py-3 border-0">Check In</th>
                        <th className="px-4 py-3 border-0">Check Out</th>
                        <th className="px-4 py-3 border-0">Working Hours</th>
                        <th className="px-4 py-3 border-0 text-end">Status</th>
                        <th className="px-4 py-3 border-0 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary?.attendanceList?.map((item, idx) => (
                        <tr key={idx} className="border-bottom">
                          <td className="px-4 py-3 fw-bold text-navy">{item.employee?.employeeId}</td>
                          <td className="px-4 py-3">
                            <div className="fw-semibold text-dark">{item.employee?.fullName}</div>
                            <small className="text-muted">{item.employee?.email}</small>
                          </td>
                          <td className="px-4 py-3">
                            <div className="fw-medium text-dark">{item.employee?.role}</div>
                            <small className="text-muted">{item.employee?.specialization}</small>
                          </td>
                          <td className="px-4 py-3 text-dark fw-medium">
                            {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                          </td>
                          <td className="px-4 py-3 text-dark fw-medium">
                            {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                          </td>
                          <td className="px-4 py-3 fw-semibold text-primary">
                            {item.workingHours ? (typeof item.workingHours === 'string' && item.workingHours.includes('h') ? item.workingHours : `${item.workingHours} hrs`) : item.checkIn && !item.checkOut ? 'In Progress' : '0 hrs'}
                          </td>
                          <td className="px-4 py-3 text-end">{getStatusBadge(item.status || item.attendanceStatus)}</td>
                          <td className="px-4 py-3 text-end">
                            {item.employee?.role === 'Mechanic' && isToday && (
                              <>
                                {!item.checkIn ? (
                                  <Button size="sm" variant="success" onClick={() => handleAdminCheckIn(item.employee._id)}>Check In</Button>
                                ) : !item.checkOut ? (
                                  <Button size="sm" variant="danger" onClick={() => handleAdminCheckOut(item.employee._id)}>Check Out</Button>
                                ) : (
                                  <Badge bg="secondary">Completed</Badge>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminAttendance;
