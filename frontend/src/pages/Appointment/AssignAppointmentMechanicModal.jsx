import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Badge, Alert, Card, Row, Col } from 'react-bootstrap';
import { FaWrench, FaUserCheck, FaUserTie, FaCar, FaClock, FaTools, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import employeeService from '../../services/employeeService';
import appointmentService from '../../services/appointmentService';
import { formatDateIST } from '../../utils/dateUtils';

const AssignAppointmentMechanicModal = ({ show, onHide, appointment, onSuccess }) => {
  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show && appointment) {
      const fetchMechanics = async () => {
        try {
          setLoading(true);
          // Pass includeAll=true so all active mechanics are listed with real-time attendance & workload
          const data = await employeeService.getActiveMechanics({ includeAll: true });
          setMechanics(data || []);
          setSelectedMechanic(appointment.assignedMechanic?._id || appointment.assignedMechanic || '');
          setLoading(false);
        } catch (error) {
          toast.error('Failed to load mechanics list');
          setLoading(false);
        }
      };
      fetchMechanics();
    }
  }, [show, appointment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment) return;

    try {
      setSubmitting(true);
      const res = await appointmentService.assignMechanic(
        appointment._id, 
        selectedMechanic || null
      );
      toast.success(res.message || 'Mechanic assigned successfully');
      setSubmitting(false);
      if (onSuccess) onSuccess();
      onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mechanic');
      setSubmitting(false);
    }
  };

  const currentMechanicObj = mechanics.find(m => m._id === selectedMechanic);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" /> Available</Badge>;
      case 'Busy':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><FaTools className="me-1" /> Busy</Badge>;
      case 'Leave':
        return <Badge bg="danger" className="px-2 py-1">On Leave</Badge>;
      case 'Absent':
        return <Badge bg="danger" className="px-2 py-1">Absent</Badge>;
      case 'Checked Out':
        return <Badge bg="secondary" className="px-2 py-1">Checked Out</Badge>;
      default:
        return <Badge bg="info" className="px-2 py-1">{status || 'Active'}</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="bg-light border-bottom">
        <Modal.Title className="fs-5 fw-bold text-navy d-flex align-items-center gap-2">
          <div className="bg-orange bg-opacity-10 p-2 rounded-circle text-orange d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
            <FaWrench size={16} />
          </div>
          <span>Assign Mechanic to Appointment</span>
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {/* Appointment Context Banner */}
          {appointment && (
            <Card className="border shadow-none bg-light bg-opacity-50 mb-4">
              <Card.Body className="p-3">
                <Row className="g-3 align-items-center">
                  <Col md={6}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <FaUserTie className="text-primary" />
                      <span className="fw-bold text-dark">{appointment.customer?.fullName || 'Customer'}</span>
                      {appointment.customer?.mobileNumber && (
                        <span className="text-muted small">({appointment.customer.mobileNumber})</span>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2 text-secondary small">
                      <FaCar className="text-success" />
                      <span className="fw-semibold text-dark">{appointment.vehicle?.vehicleNumber || 'Vehicle'}</span>
                      {appointment.vehicle?.brand && (
                        <span>• {appointment.vehicle.brand} {appointment.vehicle?.model}</span>
                      )}
                    </div>
                  </Col>

                  <Col md={6} className="text-md-end">
                    <div className="d-flex align-items-center justify-content-md-end gap-2 mb-1">
                      <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1">
                        {appointment.serviceType}
                      </span>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1">
                        {appointment.status}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-md-end gap-1 text-muted small">
                      <FaClock size={12} />
                      <span>{formatDateIST(appointment.appointmentDate)} &bull; {appointment.preferredTime}</span>
                    </div>
                  </Col>

                  {appointment.problemDescription && (
                    <Col xs={12} className="pt-2 border-top">
                      <div className="small text-muted mb-0">
                        <strong className="text-secondary">Note / Problem:</strong> {appointment.problemDescription}
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Mechanic Selector */}
          <Form.Group controlId="selectMechanic" className="mb-3">
            <Form.Label className="fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
              <span>Select Workshop Mechanic</span>
              {currentMechanicObj && (
                <span className="small text-muted">Selected: <strong>{currentMechanicObj.fullName}</strong></span>
              )}
            </Form.Label>

            {loading ? (
              <div className="text-center py-4 bg-light rounded">
                <Spinner animation="border" size="sm" className="text-primary me-2" />
                <span className="text-muted small">Loading active mechanics...</span>
              </div>
            ) : (
              <Form.Select
                size="lg"
                className="fs-6"
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
              >
                <option value="">-- Unassigned (No Mechanic Assigned) --</option>
                {mechanics.map((m) => {
                  const statusText = m.displayStatus || m.availability || 'Active';
                  const activeJobsText = m.activeJobsCount > 0 ? ` [${m.activeJobsCount} Active Job(s)]` : '';
                  return (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.employeeId || 'EMP'}) &bull; {m.specialization || 'General Technician'} &bull; {statusText}{activeJobsText}
                    </option>
                  );
                })}
              </Form.Select>
            )}
            <Form.Text className="text-muted">
              Select a qualified mechanic to handle this service. Assigning will automatically alert the technician.
            </Form.Text>
          </Form.Group>

          {/* Detailed preview card for selected mechanic */}
          {currentMechanicObj && (
            <Card className="border border-primary border-opacity-25 bg-primary bg-opacity-10 mb-2">
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold fs-5 shadow-sm"
                      style={{ width: 44, height: 44 }}
                    >
                      {currentMechanicObj.fullName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="fw-bold text-dark fs-6">{currentMechanicObj.fullName}</div>
                      <div className="text-muted small">
                        ID: {currentMechanicObj.employeeId || 'N/A'} &bull; Specialization: <strong>{currentMechanicObj.specialization || 'General Technician'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(currentMechanicObj.displayStatus || currentMechanicObj.availability)}
                    {currentMechanicObj.activeJobsCount > 0 && (
                      <Badge bg="secondary" className="px-2 py-1">
                        {currentMechanicObj.activeJobsCount} Active {currentMechanicObj.activeJobsCount === 1 ? 'Job' : 'Jobs'}
                      </Badge>
                    )}
                  </div>
                </div>

                {(currentMechanicObj.displayStatus === 'Leave' || currentMechanicObj.displayStatus === 'Absent') && (
                  <Alert variant="warning" className="p-2 mt-3 mb-0 small d-flex align-items-center gap-2">
                    <FaExclamationTriangle />
                    <span>Notice: This mechanic is currently marked on leave/absent today. You may still assign them for future scheduling.</span>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light border-top">
          <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            className="btn-primary-custom d-flex align-items-center gap-2" 
            disabled={submitting || loading}
          >
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaUserCheck />
                <span>Save Assignment</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AssignAppointmentMechanicModal;
