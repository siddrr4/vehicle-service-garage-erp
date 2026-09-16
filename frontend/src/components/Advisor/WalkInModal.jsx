import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button, Form, Row, Col, Alert, Badge } from 'react-bootstrap';
import { FaUserPlus, FaSearch, FaCar, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';
import appointmentService from '../../services/appointmentService';
import waitlistService from '../../services/waitlistService';
import * as customerService from '../../services/customerService';
import { getIndiaDateStr } from '../../utils/dateUtils';

const WalkInModal = ({ show, onHide, onSuccess }) => {
  const todayStr = getIndiaDateStr();

  const [step, setStep] = useState('customer'); // customer, vehicle, booking, noCapacity
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // New Customer Form
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    fullName: '',
    mobileNumber: '',
    emailAddress: '',
    address: 'N/A',
    city: 'N/A',
    state: 'N/A',
    pincode: 'N/A'
  });

  // Vehicle selection / creation
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({
    vehicleNumber: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    fuelType: 'Petrol'
  });

  // Booking fields
  const [serviceType, setServiceType] = useState('General Service');
  const [problemDescription, setProblemDescription] = useState('Walk-in Service Request');
  const [preferredDate, setPreferredDate] = useState(todayStr);
  const [preferredTime, setPreferredTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nextSlotInfo, setNextSlotInfo] = useState(null);

  useEffect(() => {
    if (show) {
      resetForm();
      fetchTodaySlots(todayStr);
    }
  }, [show]);

  useEffect(() => {
    if (preferredDate) {
      fetchTodaySlots(preferredDate);
    }
  }, [preferredDate]);

  const resetForm = () => {
    setStep('customer');
    setSearchTerm('');
    setSearchResults([]);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerData({
      fullName: '',
      mobileNumber: '',
      emailAddress: '',
      address: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A'
    });
    setCustomerVehicles([]);
    setSelectedVehicle('');
    setIsNewVehicle(false);
    setNewVehicleData({
      vehicleNumber: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      fuelType: 'Petrol'
    });
    setServiceType('General Service');
    setProblemDescription('Walk-in Service Request');
    setPreferredDate(todayStr);
    setPreferredTime('');
  };

  const fetchTodaySlots = async (date) => {
    try {
      setLoadingSlots(true);
      const data = await appointmentService.getAvailableSlots(date);
      setAvailableSlots(data.slots || []);
      const firstAvail = (data.slots || []).find(s => s.status === 'Available');
      if (firstAvail) {
        setPreferredTime(firstAvail.time);
      } else {
        setPreferredTime('');
      }
      setLoadingSlots(false);
    } catch (error) {
      setLoadingSlots(false);
    }
  };

  const handleSearchCustomer = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    try {
      setLoading(true);
      const data = await customerService.getCustomers(1, 10, searchTerm);
      setSearchResults(data.customers || []);
      setLoading(false);
    } catch (error) {
      toast.error('Search failed');
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    try {
      setLoading(true);
      const { data } = await api.get(`/customers/${customer._id}`);
      setCustomerVehicles(data.vehicles || []);
      if (data.vehicles && data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0]._id);
      } else {
        setIsNewVehicle(true);
      }
      setStep('vehicle');
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load customer vehicles');
      setLoading(false);
    }
  };

  const handleRegisterNewCustomer = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const created = await customerService.createCustomer(newCustomerData);
      toast.success('Customer registered successfully');
      setSelectedCustomer(created);
      setCustomerVehicles([]);
      setIsNewVehicle(true);
      setStep('vehicle');
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register customer');
      setLoading(false);
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (isNewVehicle) {
      try {
        setLoading(true);
        const { data } = await api.post('/vehicles', {
          ...newVehicleData,
          customerId: selectedCustomer._id
        });
        setSelectedVehicle(data._id);
        setStep('booking');
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to register vehicle');
        setLoading(false);
      }
    } else {
      if (!selectedVehicle) {
        toast.error('Please select a vehicle');
        return;
      }
      setStep('booking');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    // Check capacity for selected time
    const selectedSlotObj = availableSlots.find(s => s.time === preferredTime);
    if (!selectedSlotObj || selectedSlotObj.available <= 0) {
      setStep('noCapacity');
      fetchNextAvailableSlot();
      return;
    }

    try {
      setLoading(true);
      await appointmentService.createAppointment({
        customer: selectedCustomer._id,
        vehicle: selectedVehicle,
        serviceType,
        appointmentDate: preferredDate,
        preferredTime,
        problemDescription,
        bookingType: 'Walk-in',
        status: 'Checked-In'
      });

      toast.success('Walk-in service checked in successfully! Job Card created.');
      if (onSuccess) onSuccess();
      onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create walk-in booking');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlist = async () => {
    try {
      setLoading(true);
      await waitlistService.addToWaitlist({
        customer: selectedCustomer._id,
        vehicle: selectedVehicle,
        serviceType,
        problemDescription,
        priority: 'Medium'
      });
      toast.info('Added to Waiting Queue');
      if (onSuccess) onSuccess();
      onHide();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to waitlist');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextAvailableSlot = async () => {
    try {
      setLoadingSlots(true);
      const data = await appointmentService.getNextAvailableSlot();
      setNextSlotInfo(data);
    } catch (err) {
      console.error(err);
      setNextSlotInfo(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleNextSlot = () => {
    const nextAvail = availableSlots.find(s => s.status === 'Available');
    if (nextAvail) {
      setPreferredTime(nextAvail.time);
      setStep('booking');
    } else {
      toast.info('No remaining slots available today. Please choose a future date.');
    }
  };

  const handleNextDate = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = getIndiaDateStr(tmr);
    setPreferredDate(tmrStr);
    setStep('booking');
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="fw-bold d-flex align-items-center gap-2 fs-5">
          <FaCar /> New Walk-in Service Registration
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="alert alert-info py-2 px-3 mb-3 d-flex justify-content-between align-items-center">
          <span className="small text-navy fw-semibold">Want complete 9-point vehicle inspection & dynamic service selection?</span>
          <Link to="/walk-in" onClick={onHide} className="btn btn-sm btn-primary py-1 px-3 text-nowrap">
            Open Walk-in Desk &rarr;
          </Link>
        </div>

        {/* Step 1: Customer Selection or Registration */}
        {step === 'customer' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">Step 1: Select or Register Customer</h6>
              <Button 
                variant={isNewCustomer ? "outline-secondary" : "outline-primary"} 
                size="sm" 
                onClick={() => setIsNewCustomer(!isNewCustomer)}
              >
                {isNewCustomer ? 'Search Existing Customer' : '+ Register New Customer'}
              </Button>
            </div>

            {!isNewCustomer ? (
              <div>
                <Form onSubmit={handleSearchCustomer} className="mb-3">
                  <Form.Group className="d-flex gap-2">
                    <Form.Control 
                      type="text" 
                      placeholder="Search customer by name or phone number..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      required 
                    />
                    <Button variant="primary-custom" type="submit" disabled={loading}>
                      <FaSearch /> Search
                    </Button>
                  </Form.Group>
                </Form>

                {searchResults.length > 0 && (
                  <div className="list-group mb-3 max-vh-50 overflow-auto">
                    {searchResults.map(c => (
                      <button 
                        key={c._id} 
                        type="button" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div>
                          <div className="fw-bold text-dark">{c.fullName}</div>
                          <small className="text-muted">📱 {c.mobileNumber} | ✉️ {c.emailAddress}</small>
                        </div>
                        <Badge bg="primary">Select</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Form onSubmit={handleRegisterNewCustomer}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Full Name *</Form.Label>
                    <Form.Control 
                      type="text" 
                      required 
                      value={newCustomerData.fullName} 
                      onChange={e => setNewCustomerData({ ...newCustomerData, fullName: e.target.value })} 
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Mobile Number *</Form.Label>
                    <Form.Control 
                      type="text" 
                      required 
                      maxLength="10"
                      value={newCustomerData.mobileNumber} 
                      onChange={e => setNewCustomerData({ ...newCustomerData, mobileNumber: e.target.value })} 
                    />
                  </Col>
                  <Col md={12}>
                    <Form.Label className="fw-semibold">Email Address *</Form.Label>
                    <Form.Control 
                      type="email" 
                      required 
                      value={newCustomerData.emailAddress} 
                      onChange={e => setNewCustomerData({ ...newCustomerData, emailAddress: e.target.value })} 
                    />
                  </Col>
                </Row>
                <div className="d-flex justify-content-end mt-4">
                  <Button variant="orange" type="submit" disabled={loading}>
                    Register & Continue
                  </Button>
                </div>
              </Form>
            )}
          </div>
        )}

        {/* Step 2: Vehicle Selection / Registration */}
        {step === 'vehicle' && selectedCustomer && (
          <div>
            <div className="p-3 bg-light rounded mb-4 d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-bold">Customer</small>
                <div className="fw-bold text-dark">{selectedCustomer.fullName} ({selectedCustomer.mobileNumber})</div>
              </div>
              <Button variant="link" size="sm" onClick={() => { setStep('customer'); setSelectedCustomer(null); }}>Change</Button>
            </div>

            <h6 className="fw-bold mb-3 text-dark">Step 2: Select or Register Vehicle</h6>

            <Form onSubmit={handleVehicleSubmit}>
              {!isNewVehicle && customerVehicles.length > 0 ? (
                <div className="mb-4">
                  <Form.Label className="fw-semibold">Select Customer Vehicle</Form.Label>
                  <Form.Select 
                    value={selectedVehicle} 
                    onChange={e => setSelectedVehicle(e.target.value)} 
                    required
                  >
                    {customerVehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleNumber} — {v.brand} {v.model}
                      </option>
                    ))}
                  </Form.Select>
                  <div className="mt-2 text-end">
                    <Button variant="link" size="sm" onClick={() => setIsNewVehicle(true)}>
                      + Add New Vehicle for this customer
                    </Button>
                  </div>
                </div>
              ) : (
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Vehicle Registration Number *</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. KA-01-AB-1234" 
                      required 
                      value={newVehicleData.vehicleNumber} 
                      onChange={e => setNewVehicleData({ ...newVehicleData, vehicleNumber: e.target.value.toUpperCase() })} 
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Brand *</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. Maruti Suzuki" 
                      required 
                      value={newVehicleData.brand} 
                      onChange={e => setNewVehicleData({ ...newVehicleData, brand: e.target.value })} 
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Model *</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. Swift" 
                      required 
                      value={newVehicleData.model} 
                      onChange={e => setNewVehicleData({ ...newVehicleData, model: e.target.value })} 
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-semibold">Fuel Type</Form.Label>
                    <Form.Select 
                      value={newVehicleData.fuelType} 
                      onChange={e => setNewVehicleData({ ...newVehicleData, fuelType: e.target.value })}
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric</option>
                    </Form.Select>
                  </Col>
                </Row>
              )}

              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={() => setStep('customer')}>Back</Button>
                <Button variant="primary-custom" type="submit" disabled={loading}>
                  Continue to Booking
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* Step 3: Booking Details & Slot Capacity */}
        {step === 'booking' && (
          <Form onSubmit={handleBookingSubmit}>
            <h6 className="fw-bold mb-3 text-dark">Step 3: Service & Today's Slot Capacity</h6>

            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Label className="fw-semibold">Service Type *</Form.Label>
                <Form.Select 
                  value={serviceType} 
                  onChange={e => setServiceType(e.target.value)} 
                  required
                >
                  <option value="General Service">General Service</option>
                  <option value="Washing & Cleaning">Washing & Cleaning</option>
                  <option value="Repair">Repair</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Body Shop">Body Shop</option>
                </Form.Select>
              </Col>
              
              <Col md={6}>
                <Form.Label className="fw-semibold">Service Date *</Form.Label>
                <Form.Control 
                  type="date" 
                  value={preferredDate} 
                  onChange={e => setPreferredDate(e.target.value)} 
                  min={todayStr} 
                  required 
                />
              </Col>

              <Col md={12}>
                <Form.Label className="fw-semibold">Select Time Slot (Actual Live Capacity) *</Form.Label>
                {loadingSlots ? (
                  <div className="p-3 text-muted">Calculating real mechanic availability...</div>
                ) : (
                  <Row className="g-2">
                    {availableSlots.map(slot => (
                      <Col key={slot.time} xs={6} md={4}>
                        <div 
                          className={`p-3 border rounded text-center cursor-pointer ${
                            preferredTime === slot.time ? 'border-primary bg-primary bg-opacity-10 fw-bold' : ''
                          } ${slot.available <= 0 ? 'bg-light text-muted opacity-75' : ''}`}
                          style={{ cursor: slot.available <= 0 ? 'not-allowed' : 'pointer' }}
                          onClick={() => {
                            if (slot.available > 0) setPreferredTime(slot.time);
                          }}
                        >
                          <div className="small fw-bold">{slot.time}</div>
                          {slot.status === 'No Capacity' || slot.capacity === 0 ? (
                            <Badge bg="secondary" className="mt-1">No Capacity</Badge>
                          ) : slot.available === 0 ? (
                            <Badge bg="danger" className="mt-1">FULL</Badge>
                          ) : (
                            <Badge bg="success" className="mt-1">{slot.available} slot(s) left</Badge>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Col>

              <Col md={12}>
                <Form.Label className="fw-semibold">Complaint / Problem Description *</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={problemDescription} 
                  onChange={e => setProblemDescription(e.target.value)} 
                  required 
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="light" onClick={() => setStep('vehicle')}>Back</Button>
              <Button 
                variant="orange" 
                type="submit" 
                disabled={loading || !preferredTime}
              >
                Confirm Walk-in Check-In
              </Button>
            </div>
          </Form>
        )}

        {/* Step 4: No Capacity Available Handling */}
        {step === 'noCapacity' && (
          <div className="text-center py-4">
            <FaExclamationTriangle className="text-warning mb-3" size={48} />
            <h5 className="fw-bold text-dark mb-2">No service capacity is currently available</h5>
            <p className="text-muted mb-4">
              All checked-in mechanics for the selected slot are currently busy or capacity limit has been reached.
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
              <Button variant="outline-warning" onClick={handleWaitlist} disabled={loading}>
                Add to Waiting Queue
              </Button>
            </div>
            
            {nextSlotInfo && (
              <div className="mt-4 p-3 bg-light rounded text-start mx-auto" style={{ maxWidth: '400px' }}>
                <div className="fw-bold text-success mb-2"><FaCheckCircle /> Next Available Slot Found!</div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Date:</span>
                  <span className="fw-bold">{nextSlotInfo.date}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Time:</span>
                  <span className="fw-bold">{nextSlotInfo.time}</span>
                </div>
                <Button 
                  variant="primary" 
                  className="w-100" 
                  onClick={() => {
                    setPreferredDate(nextSlotInfo.date);
                    setPreferredTime(nextSlotInfo.time);
                    setStep('booking');
                  }}
                >
                  Book This Slot
                </Button>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-top">
              <Button variant="link" onClick={() => setStep('booking')} className="text-muted">
                Go back to slot selection
              </Button>
            </div>
          </div>
        )}

      </Modal.Body>
    </Modal>
  );
};

export default WalkInModal;
