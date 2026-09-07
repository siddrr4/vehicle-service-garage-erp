import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { FaArrowLeft, FaEdit, FaCalendarAlt, FaUser, FaCar, FaClock, FaWrench, FaTools, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const data = await appointmentService.getAppointmentById(id);
        setAppointment(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load appointment details');
        navigate('/appointments');
      }
    };
    fetchAppointment();
  }, [id, navigate]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill"><FaCheckCircle className="me-1"/> {status}</Badge>;
      case 'Confirmed': return <Badge bg="primary" className="px-3 py-2 fs-6 rounded-pill"><FaCheckCircle className="me-1"/> {status}</Badge>;
      case 'Pending': return <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 rounded-pill"><FaClock className="me-1"/> {status}</Badge>;
      case 'In Progress': return <Badge bg="info" className="px-3 py-2 fs-6 rounded-pill"><FaTools className="me-1"/> {status}</Badge>;
      case 'Cancelled': return <Badge bg="danger" className="px-3 py-2 fs-6 rounded-pill"><FaTimesCircle className="me-1"/> {status}</Badge>;
      default: return <Badge bg="secondary" className="px-3 py-2 fs-6 rounded-pill">{status}</Badge>;
    }
  };

  if (loading || !appointment) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" className="btn-sm rounded-circle" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </Button>
          <h3 className="fw-bold text-dark mb-0">Appointment Details</h3>
        </div>
        <Link to={`/appointments/edit/${appointment._id}`} className="btn btn-primary-custom d-flex align-items-center gap-2">
          <FaEdit /> <span>Edit</span>
        </Link>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-primary" /> Service Request
              </h5>
              {getStatusBadge(appointment.status)}
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-4">
                <h6 className="text-muted fw-bold text-uppercase small mb-3">Service Information</h6>
                <Row className="g-3">
                  <Col sm={6}>
                    <p className="text-muted mb-1 small">Service Type</p>
                    <p className="fw-bold text-dark mb-0 fs-5">{appointment.serviceType}</p>
                  </Col>
                  <Col sm={6}>
                    <p className="text-muted mb-1 small">Appointment Date & Time</p>
                    <p className="fw-bold text-dark mb-0 fs-5">
                      {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.preferredTime}
                    </p>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-muted fw-bold text-uppercase small mb-3">Problem Description</h6>
                <div className="bg-light p-3 rounded border border-light">
                  <p className="mb-0 text-dark">{appointment.problemDescription}</p>
                </div>
              </div>

              <div>
                <h6 className="text-muted fw-bold text-uppercase small mb-3">Assigned To</h6>
                {appointment.serviceAdvisor ? (
                  <div className="d-flex align-items-center gap-3 p-3 bg-light rounded border border-light">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      {appointment.serviceAdvisor.firstName.charAt(0)}{appointment.serviceAdvisor.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="fw-bold text-dark mb-0">{appointment.serviceAdvisor.firstName} {appointment.serviceAdvisor.lastName}</p>
                      <p className="text-muted small mb-0">Service Advisor</p>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2 text-warning p-3 bg-light rounded border border-warning border-opacity-25">
                    <FaExclamationCircle />
                    <span className="fw-medium">No service advisor assigned yet.</span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <div className="d-flex flex-column gap-4">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-bottom pt-4 pb-3 px-4">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <FaUser className="text-info" /> Customer Details
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <div className="d-flex flex-column gap-3">
                  <div>
                    <p className="text-muted mb-1 small">Name</p>
                    <p className="fw-bold text-dark mb-0">{appointment.customer?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1 small">Mobile Number</p>
                    <p className="fw-bold text-dark mb-0">{appointment.customer?.mobileNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1 small">Email Address</p>
                    <p className="fw-bold text-dark mb-0">{appointment.customer?.emailAddress || 'N/A'}</p>
                  </div>
                  <div className="mt-2 pt-3 border-top">
                    <Link to={`/customers/${appointment.customer?._id}`} className="text-primary text-decoration-none fw-medium small d-flex align-items-center gap-1">
                      View full profile <FaArrowLeft className="ms-1" style={{transform: 'rotate(180deg)'}}/>
                    </Link>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-bottom pt-4 pb-3 px-4">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <FaCar className="text-success" /> Vehicle Details
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <div className="d-flex flex-column gap-3">
                  <div>
                    <p className="text-muted mb-1 small">Vehicle Number</p>
                    <p className="fw-bold text-dark mb-0 fs-5 border border-2 border-dark rounded px-2 py-1 d-inline-block bg-light">
                      {appointment.vehicle?.vehicleNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted mb-1 small">Brand & Model</p>
                    <p className="fw-bold text-dark mb-0">{appointment.vehicle?.brand} {appointment.vehicle?.model}</p>
                  </div>
                  <div className="mt-2 pt-3 border-top">
                    <Link to={`/vehicles/${appointment.vehicle?._id}`} className="text-primary text-decoration-none fw-medium small d-flex align-items-center gap-1">
                      View vehicle details <FaArrowLeft className="ms-1" style={{transform: 'rotate(180deg)'}}/>
                    </Link>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AppointmentDetails;
