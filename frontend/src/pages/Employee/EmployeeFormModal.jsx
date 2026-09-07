import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { FaUserPlus, FaUserEdit, FaSave } from 'react-icons/fa';

const EmployeeFormModal = ({ show, onHide, onSubmit, initialData = null, loading = false }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'Mechanic',
    specialization: 'General Repairs',
    experience: 1,
    availability: 'Available',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active',
  });

  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        password: '',
        role: initialData.role || 'Mechanic',
        specialization: initialData.specialization || 'General Repairs',
        experience: initialData.experience !== undefined ? initialData.experience : 1,
        availability: initialData.availability || 'Available',
        joiningDate: initialData.joiningDate ? new Date(initialData.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: initialData.status || 'Active',
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'Mechanic',
        specialization: 'General Repairs',
        experience: 1,
        availability: 'Available',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Active',
      });
    }
    setValidated(false);
  }, [initialData, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fw-bold fs-5 text-navy d-flex align-items-center gap-2">
          {initialData ? <FaUserEdit /> : <FaUserPlus />}
          <span>{initialData ? 'Edit Employee Details' : 'Add New Employee'}</span>
        </Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group controlId="fullName">
                <Form.Label className="fw-medium">Full Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="fullName"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
                <Form.Control.Feedback type="invalid">Full Name is required.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="email">
                <Form.Label className="fw-medium">Email Address <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="e.g. rahul@garage.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Form.Control.Feedback type="invalid">Please enter a valid email address.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="phone">
                <Form.Label className="fw-medium">Phone Number <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  placeholder="10 digit mobile number"
                  pattern="\d{10}"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                <Form.Control.Feedback type="invalid">Enter exactly 10 numeric digits.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="password">
                <Form.Label className="fw-medium">
                  Login Password {initialData ? <small className="text-muted">(Leave blank to keep current)</small> : <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder={initialData ? "Enter new password if changing" : "Enter account login password"}
                  value={formData.password}
                  onChange={handleChange}
                  required={!initialData}
                />
                <Form.Control.Feedback type="invalid">Password is required for new employees.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="role">
                <Form.Label className="fw-medium">Role <span className="text-danger">*</span></Form.Label>
                <Form.Select name="role" value={formData.role} onChange={handleChange} required>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Service Advisor">Service Advisor</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="specialization">
                <Form.Label className="fw-medium">Specialization <span className="text-danger">*</span></Form.Label>
                <Form.Select name="specialization" value={formData.specialization} onChange={handleChange} required>
                  <option value="General Repairs">General Repairs</option>
                  <option value="Engine Specialist">Engine Specialist</option>
                  <option value="Brake Systems">Brake Systems</option>
                  <option value="Electrical Systems">Electrical Systems</option>
                  <option value="Transmission & Gearbox">Transmission & Gearbox</option>
                  <option value="AC & Heating">AC & Heating</option>
                  <option value="Bodywork & Painting">Bodywork & Painting</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="experience">
                <Form.Label className="fw-medium">Experience (Years) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="experience"
                  min="0"
                  max="50"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                />
                <Form.Control.Feedback type="invalid">Valid experience years required.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-4">
              <Form.Group controlId="availability">
                <Form.Label className="fw-medium">Availability Status</Form.Label>
                <Form.Select name="availability" value={formData.availability} onChange={handleChange}>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Leave">Leave</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-4">
              <Form.Group controlId="joiningDate">
                <Form.Label className="fw-medium">Joining Date</Form.Label>
                <Form.Control
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-md-4">
              <Form.Group controlId="status">
                <Form.Label className="fw-medium">Status</Form.Label>
                <Form.Select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" className="btn-primary-custom d-flex align-items-center gap-2" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : <FaSave />}
            <span>{initialData ? 'Update Employee' : 'Save Employee'}</span>
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EmployeeFormModal;
