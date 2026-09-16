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
import PageHeader from '../../components/UI/PageHeader';
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { formatWorkingHoursDisplay, formatDateIST } from '../../utils/dateUtils';

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

  const totalAssignedToday = jobCards.length;
  const inProgressJobs = jobCards.filter((j) => j.status === 'In Progress').length;
  const completedJobs = jobCards.filter((j) => j.status === 'Completed').length;
  const currentAttendance = attendanceInfo?.attendance;
  const attendanceStatusText = currentAttendance ? (currentAttendance.status || currentAttendance.attendanceStatus) : 'Not Checked In';
  const workingHoursDisplay = formatWorkingHoursDisplay(
    currentAttendance?.workingHours,
    Boolean(attendanceInfo?.checkedIn),
    Boolean(attendanceInfo?.checkedOut),
    currentAttendance ? true : false
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title={`Technician Workbench &bull; ${user?.firstName || 'Mechanic'}`}
        subtitle="Manage assigned vehicle repair cards, update diagnostic progress and log status"
        breadcrumbs={[
          { label: 'Workbench', path: '/mechanic-dashboard' },
          { label: 'Assigned Jobs' }
        ]}
      />

      {/* 5 Overview KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={4} xl className="col-xl">
          <StatCard
            title="Total Assigned"
            value={totalAssignedToday}
            icon={<FaWrench />}
            color="primary"
            trend="Active repair jobs"
            trendColor="text-primary"
          />
        </Col>

        <Col xs={12} sm={6} lg={4} xl className="col-xl">
          <StatCard
            title="In Progress"
            value={inProgressJobs}
            icon={<FaTools />}
            color="orange"
            trend="Currently in service bay"
            trendColor="text-warning"
          />
        </Col>

        <Col xs={12} sm={6} lg={4} xl className="col-xl">
          <StatCard
            title="Completed"
            value={completedJobs}
            icon={<FaCheckCircle />}
            color="success"
            trend="Ready for billing"
            trendColor="text-success"
          />
        </Col>

        <Col xs={12} sm={6} lg={4} xl className="col-xl">
          <StatCard
            title="Today's Attendance"
            value={attendanceStatusText}
            icon={<FaUserClock />}
            color={attendanceInfo?.checkedIn ? 'success' : 'danger'}
            trend={attendanceInfo?.checkedIn ? 'Logged In' : 'Not Checked In'}
            trendColor={attendanceInfo?.checkedIn ? 'text-success' : 'text-danger'}
          />
        </Col>

        <Col xs={12} sm={6} lg={4} xl className="col-xl">
          <StatCard
            title="Working Hours"
            value={workingHoursDisplay}
            icon={<FaClock />}
            color="info"
            trend="Recorded time today"
            trendColor="text-info"
          />
        </Col>
      </Row>

      {/* Assigned Job Cards Section */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0 text-navy">Assigned Vehicle Job Cards ({jobCards.length})</h5>
      </div>

      {jobCards.length === 0 ? (
        <EmptyState
          icon={<FaWrench size={42} className="text-muted opacity-50" />}
          title="No jobs currently assigned"
          message="You have no active repair work orders assigned to your bay right now."
        />
      ) : (
        <Row className="g-4 mb-4">
          {jobCards.map((job) => (
            <Col xs={12} lg={6} xl={4} key={job._id}>
              <Card className="h-100 border-0 shadow-sm bg-card">
                <Card.Header className="bg-transparent border-bottom pt-3 pb-3 px-4 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-navy fs-6">{job.jobNumber}</span>
                  <StatusBadge status={job.status} />
                </Card.Header>

                <Card.Body className="p-4 d-flex flex-column justify-content-between">
                  <div>
                    {/* Vehicle Info */}
                    <div className="mb-3">
                      <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '0.7rem' }}>Vehicle</small>
                      <div className="fw-bold text-navy fs-6">{job.vehicle?.brand} {job.vehicle?.model}</div>
                      <span className="badge bg-light text-dark border mt-1">
                        {job.vehicle?.vehicleNumber}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-3">
                      <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '0.7rem' }}>Customer</small>
                      <div className="fw-semibold text-dark">{job.customer?.fullName || 'Walk-in'}</div>
                      <small className="text-muted">{job.customer?.mobileNumber}</small>
                    </div>

                    {/* Complaint / Work description */}
                    <div className="p-2.5 bg-light rounded border mb-3">
                      <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '0.675rem' }}>Reported Complaint</small>
                      <p className="small mb-0 text-dark" style={{ minHeight: '38px' }}>
                        {job.complaint || job.workDescription || 'Standard periodic service maintenance'}
                      </p>
                    </div>

                    {/* Parts Requisition Count */}
                    <div className="d-flex justify-content-between align-items-center small text-muted mb-3">
                      <span>Parts Requisition:</span>
                      <span className="fw-bold text-navy">{job.partsUsed?.length || 0} parts requested</span>
                    </div>
                  </div>

                  <div className="d-flex gap-2 pt-2 border-top">
                    <Button 
                      variant="orange" 
                      size="sm" 
                      className="flex-grow-1"
                      onClick={() => openUpdateModal(job)}
                    >
                      <FaEdit className="me-1" /> Update Status
                    </Button>
                    <Link 
                      to={`/job-cards/${job._id}`} 
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                    >
                      <FaEye />
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Update Job Status Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-navy h5">Update Job Status &bull; {selectedJob?.jobNumber}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Service Work Status</Form.Label>
              <Form.Select 
                value={updateStatus} 
                onChange={(e) => setUpdateStatus(e.target.value)}
              >
                {selectedJob && getStatusOptions(selectedJob.status).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Work Completed / Progress Summary</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Details of services executed, parts checked, fluids replaced..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Internal Mechanic Diagnostic Notes</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                placeholder="Additional notes for Service Advisor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="orange" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Updates'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MechanicDashboard;
