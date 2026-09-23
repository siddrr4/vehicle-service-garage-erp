import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { FaSave, FaArrowLeft, FaCalendarPlus, FaClock, FaCheckCircle, FaExclamationTriangle, FaWalking } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import * as customerService from '../../services/customerService';
import api from '../../services/api';
import PageHeader from '../../components/UI/PageHeader';
import { getIndiaDateStr } from '../../utils/dateUtils';

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
    appointmentDate: getIndiaDateStr(),
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

  const fetchSlots = async (rawDate) => {
    try {
      setLoadingSlots(true);
      let date = rawDate;
      if (typeof rawDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const [m, d, y] = rawDate.split('/');
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const res = await appointmentService.getAvailableSlots(date);
      const slots = res.slots || [];
      setAvailableSlots(slots);
      
      const firstAvail = slots.find(s => s.available > 0);
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
        customerService.getCustomers(1, 1000),
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

  const allSlotsFull = availableSlots.length > 0 && availableSlots.every(s => s.available <= 0);

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Book Service Appointment"
        subtitle="Schedule a vehicle repair slot with real-time mechanic capacity verification"
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Appointments', path: '/appointments' },
          { label: 'Book Appointment' }
        ]}
        actions={
          <Button variant="outline-secondary" onClick={() => navigate(-1)} className="d-flex align-items-center gap-2">
            <FaArrowLeft /> Back to List
          </Button>
        }
      />

      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex align-items-center gap-2">
          <FaCalendarPlus className="text-orange" size={18} />
          <h5 className="fw-bold mb-0 text-navy">Service Appointment Details</h5>
        </Card.Header>

        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Row className="g-4">
              {/* Customer Selection */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Customer <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="customer" 
                    value={formData.customer} 
                    onChange={handleCustomerChange}
                    required
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.fullName} &bull; {c.mobileNumber}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Vehicle Selection */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Vehicle <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="vehicle" 
                    value={formData.vehicle} 
                    onChange={handleChange}
                    required
                    disabled={!formData.customer}
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.brand} {v.model})</option>
                    ))}
                  </Form.Select>
                  {!formData.customer && (
                    <Form.Text className="text-muted">Select a customer first to view linked vehicles.</Form.Text>
                  )}
                </Form.Group>
              </Col>

              {/* Service Type */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Service Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="serviceType" 
                    value={formData.serviceType} 
                    onChange={handleChange}
                    required
                  >
                    <option value="General Service">General Service</option>
                    <option value="Periodic Maintenance">Periodic Maintenance</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="AC Service">AC Service</option>
                    <option value="Wheel Alignment">Wheel Alignment</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Washing & Cleaning">Washing & Cleaning</option>
                    <option value="Repair">Custom Repair</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Appointment Date */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Appointment Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date" 
                    name="appointmentDate" 
                    value={formData.appointmentDate} 
                    onChange={handleChange}
                    required
                    min={getIndiaDateStr()}
                  />
                </Form.Group>
              </Col>

              {/* Real-time Mechanic Capacity & Slots Visualization */}
              <Col md={12}>
                <div className="p-3 bg-light rounded border">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-navy small text-uppercase">
                      <FaClock className="me-1 text-primary" /> Live Bay Capacity & Time Slots ({formData.appointmentDate})
                    </span>
                    {loadingSlots && <span className="text-muted small">Checking live bay capacity...</span>}
                  </div>

                  {allSlotsFull && (
                    <div className="alert alert-warning py-2 mb-3 small d-flex align-items-center justify-content-between">
                      <span><FaExclamationTriangle className="me-1" /> All workshop bays are fully booked for this date.</span>
                      <Link to="/waiting-queue" className="btn btn-sm btn-orange ms-2">
                        <FaWalking className="me-1" /> Join Waiting Queue
                      </Link>
                    </div>
                  )}

                  <Row className="g-2">
                    {availableSlots.map((slot) => {
                      const isSelected = formData.preferredTime === slot.time;
                      const isFull = slot.available <= 0;
                      const hasNoCapacity = slot.capacity === 0;

                      return (
                        <Col xs={6} sm={4} md={3} lg={2} key={slot.time}>
                          <div 
                            className={`p-2.5 rounded text-center border cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-orange bg-orange text-white shadow-sm' 
                                : isFull 
                                  ? 'bg-secondary bg-opacity-10 border-light text-muted opacity-75' 
                                  : 'bg-white border text-navy hover-elevate'
                            }`}
                            style={{ cursor: isFull ? 'not-allowed' : 'pointer' }}
                            onClick={() => {
                              if (!isFull) {
                                setFormData(prev => ({ ...prev, preferredTime: slot.time }));
                              }
                            }}
                          >
                            <div className="fw-bold small">{slot.time}</div>
                            <div className="d-flex justify-content-center gap-1 mt-1">
                              {hasNoCapacity ? (
                                <span className={`badge ${isSelected ? 'bg-light text-dark' : 'badge-status-neutral'}`} style={{ fontSize: '0.65rem' }}>
                                  No Capacity
                                </span>
                              ) : isFull ? (
                                <span className={`badge ${isSelected ? 'bg-light text-dark' : 'badge-status-cancelled'}`} style={{ fontSize: '0.65rem' }}>
                                  FULL
                                </span>
                              ) : (
                                <span className={`badge ${isSelected ? 'bg-light text-dark' : 'badge-status-completed'}`} style={{ fontSize: '0.65rem' }}>
                                  {slot.available} Available
                                </span>
                              )}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </Col>

              {/* Problem Description */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="form-label">Customer Complaints / Notes <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3}
                    name="problemDescription" 
                    value={formData.problemDescription} 
                    onChange={handleChange}
                    placeholder="Describe vehicle issues, strange noises, requested inspections..."
                    required
                  />
                </Form.Group>
              </Col>

              {/* Assign Service Advisor */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Assign Service Advisor</Form.Label>
                  <Form.Select 
                    name="serviceAdvisor" 
                    value={formData.serviceAdvisor} 
                    onChange={handleChange}
                  >
                    <option value="">Select Advisor (Optional)...</option>
                    {advisors.map(a => (
                      <option key={a._id} value={a._id}>{a.firstName} {a.lastName} ({a.role})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              {/* Initial Status */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Initial Status</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending (Awaiting Confirmation)</option>
                    <option value="Confirmed">Confirmed (Bay Reserved)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 pt-4 border-top mt-4">
              <Button variant="light" type="button" onClick={() => navigate(-1)} className="px-4 border">
                Cancel
              </Button>
              <Button variant="orange" type="submit" disabled={loading || allSlotsFull} className="px-4 d-flex align-items-center gap-2">
                <FaSave /> {loading ? 'Saving...' : 'Confirm Appointment'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default BookAppointment;
