import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Badge, Form, Row, Col } from 'react-bootstrap';
import { FaTools, FaPlus, FaCheckCircle, FaClock, FaTimesCircle, FaBan } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MyRequests = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAppointments({ 
        status: statusFilter 
      });
      setAppointments(data.appointments);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load your service requests');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [statusFilter]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return <Badge bg="success"><FaCheckCircle className="me-1"/> {status}</Badge>;
      case 'Approved':
      case 'Confirmed': 
        return <Badge bg="primary"><FaCheckCircle className="me-1"/> Approved</Badge>;
      case 'Pending': return <Badge bg="warning" text="dark"><FaClock className="me-1"/> {status}</Badge>;
      case 'Rejected':
      case 'Cancelled': 
        return <Badge bg="danger"><FaTimesCircle className="me-1"/> {status}</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-navy fw-bold mb-0 d-flex align-items-center gap-3">
          <FaTools className="text-orange" /> My Service Requests
        </h2>
        <Link to="/request-service" className="btn btn-orange d-flex align-items-center gap-2">
          <FaPlus /> <span>New Service Request</span>
        </Link>
      </div>

      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <Row className="mb-4">
          <Col md={4} lg={3}>
            <Form.Group>
              <Form.Label className="fw-bold text-muted small text-uppercase">Filter Status</Form.Label>
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Requests</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><LoadingSpinner /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaTools size={48} className="mb-3 opacity-50" />
            <h5>No service requests found</h5>
            <p className="small">Submit a new request to get started.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>Requested Date</th>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Issue Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt._id}>
                    <td>
                      <div className="fw-bold">{new Date(apt.appointmentDate).toLocaleDateString()}</div>
                      <small className="text-muted">{apt.preferredTime}</small>
                    </td>
                    <td>
                      <div className="fw-bold">{apt.vehicle?.vehicleNumber}</div>
                      <small className="text-muted">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                    </td>
                    <td>{apt.serviceType}</td>
                    <td style={{ maxWidth: '300px', wordBreak: 'break-all' }}>
                      {apt.problemDescription}
                    </td>
                    <td>{getStatusBadge(apt.status)}</td>
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

export default MyRequests;
