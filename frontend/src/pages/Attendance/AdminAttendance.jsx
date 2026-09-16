import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Form, Button, Dropdown, Alert } from 'react-bootstrap';
import { FaUserCheck, FaUserTimes, FaClock, FaUsers, FaCalendarAlt, FaTools, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import { getIndiaDateStr, formatTimeIST, formatWorkingHoursDisplay } from '../../utils/dateUtils';

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(getIndiaDateStr());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

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

  const handleMarkStatus = async (employeeId, status) => {
    try {
      setMarkingId(employeeId);
      await attendanceService.markAttendance({
        employeeId,
        date: selectedDate,
        status,
        remarks: `Explicitly marked as ${status} by Admin`,
      });
      toast.success(`Attendance updated to ${status}`);
      await fetchSummary(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update attendance status');
    } finally {
      setMarkingId(null);
    }
  };

  const getStatusBadge = (status, isExplicit) => {
    switch (status) {
      case 'Present':
        return (
          <Badge bg="success" className="px-3 py-2 rounded-pill">
            {isExplicit === false ? 'Present (Default)' : 'Present'}
          </Badge>
        );
      case 'Late':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Late</Badge>;
      case 'Half Day':
        return <Badge style={{ backgroundColor: '#fd7e14', color: '#fff' }} className="px-3 py-2 rounded-pill">Half Day</Badge>;
      case 'Leave':
        return <Badge bg="info" className="px-3 py-2 rounded-pill">Leave (Approved)</Badge>;
      case 'Early Exit':
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">Early Exit</Badge>;
      case 'Absent':
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">Absent (LOP)</Badge>;
      case 'Upcoming':
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">Unprocessed (Future)</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  const todayStr = getIndiaDateStr();
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <PageHeader
        title="Employee Attendance Console"
        subtitle="Live workshop presence tracking, check-in audit logs, and exception marking (Leave/Absent/Half Day)"
        breadcrumbs={[
          { label: 'Staff', to: '/employees' },
          { label: 'Attendance' }
        ]}
        actions={
          <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-3 shadow-sm border">
            <FaCalendarAlt className="text-orange" />
            <Form.Control
              type="date"
              className="border-0 shadow-none p-0 fw-semibold text-navy"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        }
      />

      {isFuture && (
        <Alert variant="info" className="d-flex align-items-center gap-2 py-2.5 rounded-3 mb-4 border-0 shadow-sm bg-info bg-opacity-10 text-dark">
          <FaInfoCircle size={18} className="text-primary flex-shrink-0" />
          <div>
            <strong>Future Date ({selectedDate}):</strong> Future working days remain unprocessed until they occur. Attendance is not marked absent in advance and produces zero LOP.
          </div>
        </Alert>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Total Staff</span>
                    <h3 className="fw-bold mb-0 text-navy mt-1">{summary?.totalEmployees || 0}</h3>
                  </div>
                  <div className="p-3 bg-light text-navy rounded-circle border">
                    <FaUsers size={20} />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>{isFuture ? 'Unprocessed' : 'Present'}</span>
                    <h3 className="fw-bold mb-0 text-success mt-1">
                      {isFuture ? summary?.unprocessedEmployees || 0 : summary?.presentEmployees || 0}
                    </h3>
                  </div>
                  <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle border border-success border-opacity-25">
                    <FaUserCheck size={20} />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Explicit Absent (LOP)</span>
                    <h3 className="fw-bold mb-0 text-danger mt-1">{summary?.absentEmployees || 0}</h3>
                  </div>
                  <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle border border-danger border-opacity-25">
                    <FaUserTimes size={20} />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Leave / Half Day</span>
                    <h3 className="fw-bold mb-0 text-warning mt-1">
                      {(summary?.leaveEmployees || 0) + (summary?.halfDayEmployees || 0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle border border-warning border-opacity-25">
                    <FaTools size={20} />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Attendance List Table */}
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
            <div className="card-header bg-white border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0 text-navy">
                  Attendance Report & Log ({selectedDate})
                </h5>
                <small className="text-muted">
                  {isFuture
                    ? 'Future dates are shown as Unprocessed'
                    : 'Past/Today dates without explicit records are considered Present by default'}
                </small>
              </div>
              <span className="badge bg-light text-dark border px-3 py-2">{summary?.attendanceList?.length || 0} Employees</span>
            </div>
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
                        <th className="px-4 py-3 border-0 text-center">Status</th>
                        <th className="px-4 py-3 border-0 text-end">Explicit Action</th>
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
                            {item.checkIn ? formatTimeIST(item.checkIn) : item.isExplicit === false ? 'Not Recorded' : '--:--'}
                          </td>
                          <td className="px-4 py-3 text-dark fw-medium">
                            {item.checkOut ? formatTimeIST(item.checkOut) : item.isExplicit === false ? 'Not Recorded' : '--:--'}
                          </td>
                          <td className="px-4 py-3 fw-semibold text-primary">
                            {formatWorkingHoursDisplay(item.workingHours, Boolean(item.checkIn), Boolean(item.checkOut), item.isExplicit)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(item.status || item.attendanceStatus, item.isExplicit)}
                          </td>
                          <td className="px-4 py-3 text-end">
                            {isFuture ? (
                              <span className="small text-muted">No action (Future)</span>
                            ) : (
                              <Dropdown align="end" className="d-inline-block">
                                <Dropdown.Toggle
                                  size="sm"
                                  variant="outline-secondary"
                                  id={`dropdown-att-${item.employee?._id}`}
                                  disabled={markingId === item.employee?._id}
                                >
                                  {markingId === item.employee?._id ? 'Saving...' : 'Set Status'}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => handleMarkStatus(item.employee._id, 'Present')}>
                                    <span className="text-success fw-semibold">&bull; Mark Present</span>
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleMarkStatus(item.employee._id, 'Absent')}>
                                    <span className="text-danger fw-semibold">&bull; Mark Absent (LOP)</span>
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleMarkStatus(item.employee._id, 'Leave')}>
                                    <span className="text-info fw-semibold">&bull; Mark Leave (Approved)</span>
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleMarkStatus(item.employee._id, 'Half Day')}>
                                    <span className="text-warning fw-semibold">&bull; Mark Half Day</span>
                                  </Dropdown.Item>
                                  {isToday && item.employee?.role === 'Mechanic' && (
                                    <>
                                      <Dropdown.Divider />
                                      {!item.checkIn ? (
                                        <Dropdown.Item onClick={() => handleAdminCheckIn(item.employee._id)}>
                                          Check In Mechanic
                                        </Dropdown.Item>
                                      ) : !item.checkOut ? (
                                        <Dropdown.Item onClick={() => handleAdminCheckOut(item.employee._id)}>
                                          Check Out Mechanic
                                        </Dropdown.Item>
                                      ) : null}
                                    </>
                                  )}
                                </Dropdown.Menu>
                              </Dropdown>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAttendance;
