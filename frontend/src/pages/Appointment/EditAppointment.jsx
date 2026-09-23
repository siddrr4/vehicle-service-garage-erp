import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { FaSave, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import * as customerService from '../../services/customerService';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const EditAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    vehicle: '',
    serviceType: '',
    appointmentDate: '',
    preferredTime: '',
    problemDescription: '',
    serviceAdvisor: '',
    status: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerData, advisorData, appointmentData] = await Promise.all([
          customerService.getCustomers(1, 1000), 
          appointmentService.getServiceAdvisors(),
          appointmentService.getAppointmentById(id)
        ]);

        setCustomers(customerData.customers || []);
        setAdvisors(advisorData || []);

        const apt = appointmentData;
        setFormData({
          customer: apt.customer?._id || '',
          vehicle: apt.vehicle?._id || '',
          serviceType: apt.serviceType,
          appointmentDate: new Date(apt.appointmentDate).toISOString().split('T')[0],
          preferredTime: apt.preferredTime,
          problemDescription: apt.problemDescription,
          serviceAdvisor: apt.serviceAdvisor?._id || '',
          status: apt.status
        });

        if (apt.customer?._id) {
          fetchVehiclesByCustomer(apt.customer._id);
        }

        setLoading(false);
      } catch (error) {
        toast.error('Failed to load appointment details');
        navigate('/appointments');
      }
    };
    fetchData();
  }, [id, navigate]);

  const fetchVehiclesByCustomer = async (customerId) => {
    if (!customerId) {
      setVehicles([]);
      return;
    }
    try {
      const { data } = await api.get(`/customers/${customerId}`);
      setVehicles(data.vehicles || []);
    } catch (error) {
      toast.error('Failed to load vehicles');
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
      setSaving(true);
      await appointmentService.updateAppointment(id, formData);
      if (formData.status === 'Approved') {
        toast.success('Appointment approved and Job Card created successfully.');
      } else {
        toast.success('Appointment updated successfully');
      }
      navigate('/appointments');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update appointment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" className="btn-sm rounded-circle" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </Button>
          <h3 className="fw-bold text-dark mb-0">Edit Appointment</h3>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-4 text-primary">
            <FaEdit size={24} />
            <h5 className="mb-0 fw-bold">Update Details</h5>
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
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
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
                  <Form.Label>Status <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr className="my-4" />
            
            <div className="d-flex justify-content-end gap-2">
              <Button variant="light" type="button" onClick={() => navigate(-1)} className="px-4">
                Cancel
              </Button>
              <Button variant="primary-custom" type="submit" disabled={saving} className="px-4 d-flex align-items-center gap-2">
                <FaSave /> {saving ? 'Saving...' : 'Update Appointment'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EditAppointment;
