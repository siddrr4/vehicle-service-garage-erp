import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { FaSave, FaArrowLeft, FaCalendarPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import * as customerService from '../../services/customerService';
import api from '../../services/api';

const BookAppointment = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    vehicle: '',
    serviceType: 'General Service',
    appointmentDate: '',
    preferredTime: '09:00 AM',
    problemDescription: '',
    serviceAdvisor: '',
    status: 'Pending'
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetchCustomersAndAdvisors();
  }, []);

  useEffect(() => {
    if (formData.appointmentDate) {
      fetchSlots(formData.appointmentDate);
    }
  }, [formData.appointmentDate]);

  const fetchSlots = async (date) => {
    try {
      setLoadingSlots(true);
      const res = await appointmentService.getAvailableSlots(date);
      setAvailableSlots(res.slots || []);
      const firstAvail = (res.slots || []).find(s => s.status === 'Available');
      if (firstAvail) {
        setFormData(prev => ({ ...prev, preferredTime: firstAvail.time }));
      }
      setLoadingSlots(false);
    } catch (error) {
      setLoadingSlots(false);
    }
  };

  const fetchCustomersAndAdvisors = async () => {
    try {
      const [customerData, advisorData] = await Promise.all([
        customerService.getCustomers(1, 1000), // Get all customers
        appointmentService.getServiceAdvisors()
      ]);
      setCustomers(customerData.customers || []);
      setAdvisors(advisorData || []);
    } catch (error) {
      toast.error('Failed to load form data');
    }
  };

  const fetchVehiclesByCustomer = async (customerId) => {
    if (!customerId) {
      setVehicles([]);
      return;
    }
    try {
      const { data } = await api.get(`/customers/${customerId}`);
      setVehicles(data.vehicles || []);
    } catch (error) {
      toast.error('Failed to load vehicles for this customer');
    }
  };

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setFormData({ ...formData, customer: customerId, vehicle: '' });
    fetchVehiclesByCustomer(customerId);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await appointmentService.createAppointment(formData);
      toast.success('Appointment booked successfully');
      navigate('/appointments');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" className="btn-sm rounded-circle" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </Button>
          <h3 className="fw-bold text-dark mb-0">Book Appointment</h3>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-4 text-primary">
            <FaCalendarPlus size={24} />
            <h5 className="mb-0 fw-bold">Appointment Details</h5>
          </div>

          <Form onSubmit={handleSubmit}>
            <Row className="g-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Customer <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="customer" 
                    value={formData.customer} 
                    onChange={handleCustomerChange}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.fullName} - {c.mobileNumber}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Vehicle <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="vehicle" 
                    value={formData.vehicle} 
                    onChange={handleChange}
                    required
                    disabled={!formData.customer}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.brand} {v.model})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Service Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="serviceType" 
                    value={formData.serviceType} 
                    onChange={handleChange}
                    required
                  >
                    <option value="General Service">General Service</option>
                    <option value="Washing & Cleaning">Washing & Cleaning</option>
                    <option value="Repair">Repair</option>
                    <option value="Body Shop">Body Shop</option>
                    <option value="Inspection">Inspection</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date" 
                    name="appointmentDate" 
                    value={formData.appointmentDate} 
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Time <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="preferredTime" 
                    value={formData.preferredTime} 
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Time Slot</option>
                    {availableSlots.map(slot => (
                      <option 
                        key={slot.time} 
                        value={slot.time}
                        disabled={slot.status === 'FULL'}
                      >
                        {slot.time} {slot.status === 'FULL' ? '(FULL)' : `(${slot.available} avail)`}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Problem Description <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3}
                    name="problemDescription" 
                    value={formData.problemDescription} 
                    onChange={handleChange}
                    placeholder="Describe the issues or services required..."
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Assign Service Advisor</Form.Label>
                  <Form.Select 
                    name="serviceAdvisor" 
                    value={formData.serviceAdvisor} 
                    onChange={handleChange}
                  >
                    <option value="">Select Advisor (Optional)</option>
                    {advisors.map(a => (
                      <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr className="my-4" />
            
            <div className="d-flex justify-content-end gap-2">
              <Button variant="light" type="button" onClick={() => navigate(-1)} className="px-4">
                Cancel
              </Button>
              <Button variant="primary-custom" type="submit" disabled={loading} className="px-4 d-flex align-items-center gap-2">
                <FaSave /> {loading ? 'Saving...' : 'Book Appointment'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default BookAppointment;
