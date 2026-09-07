import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Badge, Modal, Button, Form, Spinner } from 'react-bootstrap';
import { 
  FaWrench, FaTools, FaCheckCircle, FaClock, 
  FaExclamationTriangle, FaEdit, FaCar, FaUser, FaUserClock, FaEye 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import jobCardService from '../../services/jobCardService';
import attendanceService from '../../services/attendanceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MechanicDashboard = () => {
  const { user } = useContext(AuthContext);
  const [jobCards, setJobCards] = useState([]);
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State for Status & Notes Update
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('In Progress');
  const [workDescription, setWorkDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const jobsData = await jobCardService.getMechanicJobCards();
      const attendanceData = await attendanceService.getTodayAttendance();
      setJobCards(jobsData || []);
      setAttendanceInfo(attendanceData || null);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusOptions = (currentStatus) => {
    const mapping = {
      'Pending': [
        { value: 'Pending', label: 'Open' },
        { value: 'Assigned', label: 'Assigned' }
      ],
      'Assigned': [
        { value: 'Assigned', label: 'Assigned' },
        { value: 'In Progress', label: 'In Progress' }
      ],
      'In Progress': [
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Waiting for Parts', label: 'Waiting for Parts' },
        { value: 'Completed', label: 'Completed' }
      ],
      'Waiting for Parts': [
        { value: 'Waiting for Parts', label: 'Waiting for Parts' },
        { value: 'In Progress', label: 'In Progress' }
      ],
      'Completed': [
        { value: 'Completed', label: 'Completed' }
      ]
    };
    return mapping[currentStatus] || [
      { value: currentStatus, label: currentStatus }
    ];
  };

  const openUpdateModal = (job) => {
    setSelectedJob(job);
    setUpdateStatus(job.status || 'In Progress');
    setWorkDescription(job.workDescription || '');
    setNotes(job.notes || '');
    setShowModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      setSubmitting(true);
      await jobCardService.updateMechanicStatus(selectedJob._id, {
        status: updateStatus,
        workDescription,
        notes,
      });
      toast.success(`Job ${selectedJob.jobNumber} updated successfully`);
      setSubmitting(false);
      setShowModal(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update job status');
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge bg="success" className="px-3 py-2 rounded-pill"><FaCheckCircle className="me-1" /> {status}</Badge>;
      case 'In Progress':
        return <Badge bg="info" text="dark" className="px-3 py-2 rounded-pill"><FaTools className="me-1" /> {status}</Badge>;
      case 'Waiting for Parts':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill"><FaExclamationTriangle className="me-1" /> {status}</Badge>;
      case 'Pending':
      case 'Open':
        return <Badge bg="primary" className="px-3 py-2 rounded-pill"><FaClock className="me-1" /> Open</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  const totalAssignedToday = jobCards.length;
  const inProgressJobs = jobCards.filter((j) => j.status === 'In Progress').length;
  const completedJobs = jobCards.filter((j) => j.status === 'Completed').length;
  const currentAttendance = attendanceInfo?.attendance;
  const attendanceStatusText = currentAttendance ? (currentAttendance.status || currentAttendance.attendanceStatus) : 'Not Checked In';
  const workingHoursDisplay = currentAttendance?.workingHours 
    ? (typeof currentAttendance.workingHours === 'string' && currentAttendance.workingHours.includes('h') ? currentAttendance.workingHours : `${currentAttendance.workingHours} hrs`)
    : attendanceInfo?.checkedIn ? 'In Progress' : '0 hrs';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
          <FaWrench /> Mechanic Workbench & Dashboard
        </h2>
        <p className="text-muted mb-0">Welcome {user?.firstName}! Overview of your daily attendance and assigned repair jobs.</p>
      </div>

      {/* Required 5 Dashboard Cards */}
      <Row className="g-4 mb-4">
        <Col xs={12} sm={6} lg={4} xl={2.4} style={{ width: '20%' }} className="card-col-responsive">
          <Card className="h-100 bg-card border-0 shadow-sm">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Assigned Jobs</h6>
                <h3 className="fw-bold mb-0 text-dark">{totalAssignedToday}</h3>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                <FaWrench size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2.4} style={{ width: '20%' }} className="card-col-responsive">
          <Card className="h-100 bg-card border-0 shadow-sm">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">In Progress</h6>
                <h3 className="fw-bold mb-0 text-info">{inProgressJobs}</h3>
              </div>
              <div className="p-3 bg-info bg-opacity-10 text-info rounded-circle">
                <FaTools size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2.4} style={{ width: '20%' }} className="card-col-responsive">
          <Card className="h-100 bg-card border-0 shadow-sm">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Completed</h6>
                <h3 className="fw-bold mb-0 text-success">{completedJobs}</h3>
              </div>
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                <FaCheckCircle size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2.4} style={{ width: '20%' }} className="card-col-responsive">
          <Card className="h-100 bg-card border-0 shadow-sm">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Today's Attendance</h6>
                <h6 className={`fw-bold mb-0 ${attendanceInfo?.checkedIn ? 'text-success' : 'text-danger'}`}>
                  {attendanceStatusText}
                </h6>
              </div>
              <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle">
                <FaUserClock size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2.4} style={{ width: '20%' }} className="card-col-responsive">
          <Card className="h-100 bg-card border-0 shadow-sm">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Working Hours</h6>
                <h3 className="fw-bold mb-0 text-primary">{workingHoursDisplay}</h3>
              </div>
              <div className="p-3 bg-purple bg-opacity-10 text-purple rounded-circle" style={{ color: '#6f42c1' }}>
                <FaClock size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assigned Job Cards */}
      <h4 className="fw-bold text-navy mb-3">Assigned Repair Jobs ({jobCards.length})</h4>

      {jobCards.length === 0 ? (
        <div className="bg-card rounded shadow-sm p-5 text-center text-muted">
          <FaWrench size={48} className="mb-3 opacity-50 text-navy" />
          <h5>No Jobs Currently Assigned</h5>
          <p>You have no active repair jobs assigned to your account right now.</p>
        </div>
      ) : (
        <Row className="g-4">
          {jobCards.map((job) => (
            <Col xs={12} lg={6} xl={4} key={job._id}>
              <Card className="h-100 border-0 shadow-sm custom-card">
                <Card.Header className="bg-white border-bottom pt-3 pb-2 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-navy fs-5">{job.jobNumber}</span>
                  {getStatusBadge(job.status)}
                </Card.Header>

                <Card.Body className="p-4">
                  <div className="mb-3">
                    <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                      <FaCar /> Vehicle
                    </div>
                    <div className="fw-semibold text-dark">
                      {job.vehicle?.brand} {job.vehicle?.model}
                    </div>
                    <Badge bg="light" text="dark" className="border mt-1 fw-mono">
                      {job.vehicle?.vehicleNumber}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                      <FaUser /> Customer
                    </div>
                    <div className="fw-medium text-dark">{job.customer?.fullName}</div>
                    <small className="text-muted">{job.customer?.mobileNumber}</small>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block fw-medium">Complaint / Issue:</small>
                    <div className="p-2 bg-light rounded text-secondary small mt-1" style={{ minHeight: '50px' }}>
                      {job.complaint}
                    </div>
                  </div>

                  {job.workDescription && (
                    <div className="mb-3">
                      <small className="text-muted d-block fw-medium">Work Notes / Progress Details:</small>
                      <div className="p-2 bg-info bg-opacity-10 rounded text-dark small mt-1">
                        {job.workDescription}
                      </div>
                    </div>
                  )}

                  {job.notes && (
                    <div className="mb-3">
                      <small className="text-muted d-block fw-medium">Remarks / Notes:</small>
                      <div className="p-2 bg-light rounded text-dark small mt-1">
                        {job.notes}
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                    <div>
                      Priority: <strong className={job.priority === 'High' ? 'text-danger' : 'text-warning'}>{job.priority}</strong>
                    </div>
                    <div>
                      Est. Delivery: <strong>{job.estimatedDeliveryDate ? new Date(job.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                  </div>
                </Card.Body>

                <Card.Footer className="bg-light border-0 p-3 d-flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-grow-1 btn-primary-custom d-flex align-items-center justify-content-center gap-2"
                    onClick={() => openUpdateModal(job)}
                  >
                    <FaEdit /> <span>Update Status</span>
                  </Button>
                  <Link
                    to={`/job-cards/${job._id}`}
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                    title="View Job Card Details"
                  >
                    <FaEye /> <span>Details</span>
                  </Link>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Update Job Status & Notes Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy d-flex align-items-center gap-2">
            <FaTools /> Update Job: {selectedJob?.jobNumber}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body className="p-4">
            <div className="mb-3">
              <label className="form-label text-muted small fw-medium mb-1">Customer & Vehicle</label>
              <div className="fw-semibold text-dark">
                {selectedJob?.customer?.fullName} &bull; {selectedJob?.vehicle?.brand} {selectedJob?.vehicle?.model} ({selectedJob?.vehicle?.vehicleNumber})
              </div>
            </div>

            <Form.Group controlId="updateStatus" className="mb-3">
              <Form.Label className="fw-medium">Job Status</Form.Label>
              <Form.Select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                {getStatusOptions(selectedJob?.status).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="workDescription" className="mb-3">
              <Form.Label className="fw-medium">Work Notes / Progress Details</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe work completed, tests performed, or parts required..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="additionalNotes" className="mb-3">
              <Form.Label className="fw-medium">Completion Remarks / Internal Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Remarks upon completion or notes for advisor/admin..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="btn-primary-custom d-flex align-items-center gap-2" disabled={submitting}>
              {submitting ? <Spinner animation="border" size="sm" /> : <FaCheckCircle />}
              <span>Save Progress</span>
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MechanicDashboard;
