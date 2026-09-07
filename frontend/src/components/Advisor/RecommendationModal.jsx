import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaLightbulb } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';

const RecommendationModal = ({ show, onHide, appointment, onSuccess }) => {
  const [recommendationText, setRecommendationText] = useState(
    appointment?.advisorRecommendation?.recommendationText || ''
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recommendationText.trim()) {
      toast.error('Please enter recommendation notes');
      return;
    }

    try {
      setSubmitting(true);
      await appointmentService.addAdvisorRecommendation(appointment._id, recommendationText);
      toast.success('Advisor recommendation saved successfully!');
      if (onSuccess) onSuccess();
      onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fw-bold d-flex align-items-center gap-2 text-dark fs-5">
          <FaLightbulb className="text-warning" /> Add Advisor Recommendation
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <p className="text-muted small mb-3">
            This recommendation will be visible to the customer in their portal (e.g., "Brake pads are worn and replacement is recommended.").
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Recommendation Notes *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              required
              value={recommendationText}
              onChange={(e) => setRecommendationText(e.target.value)}
              placeholder="e.g. Front brake pads worn down to 3mm; replacement recommended before next long trip."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="orange" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Recommendation'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RecommendationModal;
