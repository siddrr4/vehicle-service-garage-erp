import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { FaUserCheck, FaWrench } from 'react-icons/fa';
import { toast } from 'react-toastify';
import employeeService from '../../services/employeeService';
import jobCardService from '../../services/jobCardService';

const AssignMechanicModal = ({ show, onHide, jobCard, onSuccess }) => {
  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      const fetchMechanics = async () => {
        try {
          setLoading(true);
          const data = await employeeService.getActiveMechanics();
          setMechanics(data);
          setSelectedMechanic(jobCard?.assignedMechanic?._id || jobCard?.assignedMechanic || '');
          setLoading(false);
        } catch (error) {
          toast.error('Failed to load mechanics list');
          setLoading(false);
        }
      };
      fetchMechanics();
    }
  }, [show, jobCard]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobCard) return;

    try {
      setSubmitting(true);
      await jobCardService.updateJobCard(jobCard._id, {
        assignedMechanic: selectedMechanic || null,
      });
      toast.success('Mechanic assigned successfully');
      setSubmitting(false);
      onSuccess();
      onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mechanic');
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fs-5 fw-bold text-navy d-flex align-items-center gap-2">
          <FaWrench /> Assign Mechanic to {jobCard?.jobNumber}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <div className="mb-3">
            <label className="form-label text-muted small fw-medium mb-1">Customer / Vehicle</label>
            <div className="fw-semibold text-dark">
              {jobCard?.customer?.fullName} &bull; {jobCard?.vehicle?.brand} {jobCard?.vehicle?.model} ({jobCard?.vehicle?.vehicleNumber})
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted small fw-medium mb-1">Complaint</label>
            <div className="p-2 bg-light rounded text-secondary small">{jobCard?.complaint}</div>
          </div>

          <Form.Group controlId="selectMechanic" className="mt-3">
            <Form.Label className="fw-medium">Select Mechanic</Form.Label>
            {loading ? (
              <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
            ) : (
              <Form.Select
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
              >
                <option value="">-- Unassigned --</option>
                {mechanics.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.employeeId}) - Specialization: {m.specialization || 'General Repairs'} ({m.availability})
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" size="sm" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" className="btn-primary-custom d-flex align-items-center gap-2" disabled={submitting || loading}>
            {submitting ? <Spinner animation="border" size="sm" /> : <FaUserCheck />}
            <span>Save Assignment</span>
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AssignMechanicModal;
