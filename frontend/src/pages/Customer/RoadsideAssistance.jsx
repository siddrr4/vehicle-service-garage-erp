import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert, Badge, Table, Modal } from 'react-bootstrap';
import { 
  FaAmbulance, FaMapMarkerAlt, FaCar, FaPhoneAlt, FaTools, 
  FaExclamationTriangle, FaCheckCircle, FaClock, FaWrench, FaHistory, FaTruck, FaFileInvoice 
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import roadsideService from '../../services/roadsideService';
import RoadsideMap from '../../components/Map/RoadsideMap';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import { DEFAULT_GARAGE_LOCATION, calculateDistanceKm } from '../../utils/geoUtils';
import { toast } from 'react-toastify';

const RoadsideAssistance = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [garageConfig, setGarageConfig] = useState(DEFAULT_GARAGE_LOCATION);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedDetailReq, setSelectedDetailReq] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    breakdownType: 'Engine Failure',
    contactPhone: user?.mobileNumber || user?.phone || '',
    problemDescription: '',
    address: '',
    landmark: '',
    latitude: '',
    longitude: '',
    distanceKm: null,
    isWithinRadius: true
  });

  // Fetch Garage Config and User Vehicles
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Configurable Garage Location
        try {
          const cfg = await roadsideService.getConfig();
          if (cfg && cfg.latitude && cfg.longitude) {
            setGarageConfig(cfg);
          }
        } catch (cfgErr) {
          console.warn('Using default garage location:', cfgErr.message);
        }

        // 2. Fetch Customer's Existing Registered Vehicles
        const { data: vehicleData } = await api.get('/vehicles/my-vehicles');
        setVehicles(vehicleData || []);
        if (vehicleData && vehicleData.length > 0) {
          setFormData(prev => ({
            ...prev,
            vehicleId: vehicleData[0]._id,
            contactPhone: user?.mobileNumber || user?.phone || prev.contactPhone
          }));
        }

        // 3. Fetch Customer's Existing Roadside Requests
        fetchMyRoadsideRequests();

        setLoading(false);
      } catch (error) {
        toast.error('Failed to load registered vehicles or roadside settings.');
        setLoading(false);
      }
    };

    initData();
  }, [user]);

  const fetchMyRoadsideRequests = async () => {
    try {
      setLoadingRequests(true);
      const reqs = await roadsideService.getMyRequests();
      setMyRequests(reqs || []);
      setLoadingRequests(false);
    } catch (err) {
      console.warn('Failed to load roadside history:', err.message);
      setLoadingRequests(false);
    }
  };

  // Reverse Geocoding via OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name
          }));
        }
      }
    } catch (err) {
      console.warn('Reverse geocode lookup skipped:', err.message);
    }
  };

  // Callback when location is selected/moved on Leaflet Map
  const handleLocationSelect = ({ latitude, longitude, distanceKm, isWithinRadius }) => {
    setFormData(prev => ({
      ...prev,
      latitude,
      longitude,
      distanceKm,
      isWithinRadius
    }));

    // Trigger address resolution
    reverseGeocode(latitude, longitude);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Roadside Assistance Request
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vehicleId) {
      toast.error('Please select a registered vehicle.');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please place your breakdown location on the map or click "Use My Current Location".');
      return;
    }

    // Frontend Check for 20 km Radius
    if (!formData.isWithinRadius || formData.distanceKm > (garageConfig.serviceRadiusKm || 20)) {
      toast.error(
        `Selected breakdown location is ${formData.distanceKm} km away. Roadside assistance is only available within our ${garageConfig.serviceRadiusKm || 20} km service radius.`
      );
      return;
    }

    if (!formData.problemDescription.trim()) {
      toast.error('Please provide a brief description of the breakdown.');
      return;
    }

    if (!formData.contactPhone.trim()) {
      toast.error('Please provide a contact phone number so our roadside team can reach you.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        vehicleId: formData.vehicleId,
        breakdownType: formData.breakdownType,
        problemDescription: formData.problemDescription,
        contactPhone: formData.contactPhone,
        address: formData.address,
        landmark: formData.landmark,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      const result = await roadsideService.createRequest(payload);

      toast.success(`Emergency roadside request ${result.requestNumber || ''} created successfully! Our dispatch team is alerted.`);
      
      // Reset description while preserving contact
      setFormData(prev => ({
        ...prev,
        problemDescription: ''
      }));

      // Refresh requests list
      fetchMyRoadsideRequests();
      setSubmitting(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to submit roadside assistance request.';
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge bg="warning" text="dark"><FaClock className="me-1" /> Pending Dispatch</Badge>;
      case 'Dispatched':
        return <Badge bg="info"><FaAmbulance className="me-1" /> Team Dispatched</Badge>;
      case 'Assigned':
        return <Badge bg="primary"><FaWrench className="me-1" /> Mechanic Assigned</Badge>;
      case 'In Progress':
        return <Badge bg="primary"><FaTools className="me-1" /> Inspecting / In Progress</Badge>;
      case 'Resolved - On-Site Repair':
        return <Badge bg="success"><FaCheckCircle className="me-1" /> Resolved – On-Site Repair</Badge>;
      case 'Pickup Dispatched':
        return <Badge bg="warning" text="dark"><FaTruck className="me-1" /> Towing Dispatched</Badge>;
      case 'Vehicle Picked Up':
        return <Badge bg="info"><FaTruck className="me-1" /> In Transit to Showroom</Badge>;
      case 'Arrived at Showroom':
        return <Badge bg="success">🏢 Arrived at Showroom</Badge>;
      case 'Completed':
        return <Badge bg="success"><FaCheckCircle className="me-1" /> Resolved</Badge>;
      case 'Cancelled':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (loading) return <LoadingSpinner />;

  const isLocationSelected = Boolean(formData.latitude && formData.longitude);
  const isWithinRadius = formData.isWithinRadius && (formData.distanceKm <= (garageConfig.serviceRadiusKm || 20));

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="24/7 Roadside Assistance & Breakdown Support"
        subtitle={`Immediate on-site vehicle repair, battery jumpstart, and towing dispatch within a ${garageConfig.serviceRadiusKm || 20} km radius of our Udupi showroom & workshop.`}
        breadcrumbs={[
          { label: 'Customer Portal', path: '/customer-dashboard' },
          { label: 'Roadside Assistance' }
        ]}
      />

      {/* Emergency Hotline Header Card */}
      <Card className="border-0 shadow-sm bg-card mb-4" style={{ borderLeft: '4px solid #D9A83E' }}>
        <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center text-white"
              style={{ width: '48px', height: '48px', background: '#D9A83E', fontSize: '20px' }}
            >
              <FaAmbulance />
            </div>
            <div>
              <h5 className="fw-bold text-navy mb-1">Emergency Breakdown Dispatch – Udupi Workshop</h5>
              <p className="text-muted mb-0 small">
                Base Location: <strong>{garageConfig.address || 'Udupi Showroom, Karnataka'}</strong> &bull; Coverage: <strong>{garageConfig.serviceRadiusKm || 20} km radius</strong>
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-md-end">
              <span className="text-muted small d-block">Direct Helpline</span>
              <a href={`tel:${garageConfig.phone || '+919876543210'}`} className="fw-bold text-orange text-decoration-none fs-5 d-flex align-items-center gap-2">
                <FaPhoneAlt size={16} /> <span>{garageConfig.phone || '+91 98765 43210'}</span>
              </a>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        {/* Left Column: Interactive Leaflet Map */}
        <Col xs={12} lg={7} xl={8}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <FaMapMarkerAlt className="text-orange" />
                <h5 className="fw-bold mb-0 text-navy">Interactive Breakdown Location Map</h5>
              </div>
              <span className="badge bg-dark border text-warning px-3 py-1.5" style={{ fontSize: '0.75rem' }}>
                OpenStreetMap Leaflet Engine
              </span>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <p className="text-muted small mb-3">
                Click anywhere on the map or use <strong>"Use My Current Location"</strong> to set your breakdown spot. Drag the marker to adjust. The yellow circle indicates our <strong>{garageConfig.serviceRadiusKm || 20} km service zone</strong>.
              </p>

              {/* Leaflet Map Component */}
              <RoadsideMap
                garageLocation={garageConfig}
                selectedLocation={{
                  latitude: formData.latitude,
                  longitude: formData.longitude
                }}
                onLocationSelect={handleLocationSelect}
                height="450px"
              />

              {/* Map Instructions / Legend */}
              <div className="d-flex flex-wrap gap-3 mt-3 pt-2 text-muted small" style={{ fontSize: '0.8rem' }}>
                <div className="d-flex align-items-center gap-1.5">
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#D9A83E', borderRadius: '50%' }}></span>
                  <span>Udupi Workshop Base</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#EF4444', borderRadius: '50%' }}></span>
                  <span>Your Breakdown Spot</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#10B981' }}></span>
                  <span>Within 20 km (Allowed)</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#EF4444' }}></span>
                  <span>Beyond 20 km (Unavailable)</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Breakdown Form & Details */}
        <Col xs={12} lg={5} xl={4}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex align-items-center gap-2">
              <FaTools className="text-orange" />
              <h5 className="fw-bold mb-0 text-navy">Request Roadside Team</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {vehicles.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  <h6 className="fw-bold">No Vehicles Registered</h6>
                  <p className="small mb-3">You need at least one registered vehicle in your account to request roadside assistance.</p>
                  <Link to="/my-vehicles" className="btn btn-sm btn-orange">Add Vehicle First</Link>
                </Alert>
              ) : (
                <Form onSubmit={handleSubmit}>
                  {/* Vehicle Selector */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Select Vehicle <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleInputChange}
                      required
                    >
                      {vehicles.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.vehicleNumber} — {v.brand} {v.model} ({v.fuelType || 'Petrol'})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {/* Breakdown Type */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Breakdown Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      name="breakdownType"
                      value={formData.breakdownType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Engine Failure">Engine Stalled / Won't Start</option>
                      <option value="Flat Tyre">Flat Tyre / Puncture</option>
                      <option value="Battery Jumpstart">Battery Dead / Jumpstart</option>
                      <option value="Accident / Towing">Accident / Towing Required</option>
                      <option value="Brake Issue">Brake Failure / Fluid Leak</option>
                      <option value="Electrical Problem">Electrical Issue / Smoke</option>
                      <option value="Fuel Outage">Out of Fuel / Empty Tank</option>
                      <option value="Other Breakdown">Other Emergency Breakdown</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Contact Phone */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Emergency Contact Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="e.g. +91 98765 43210"
                      required
                    />
                  </Form.Group>

                  {/* Distance & Validation Status Box */}
                  <div className="p-3 rounded mb-3" style={{ background: 'rgba(217, 168, 62, 0.08)', border: '1px solid rgba(217, 168, 62, 0.25)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-bold">Distance from Garage:</span>
                      {isLocationSelected ? (
                        <span className={`fw-bold fs-6 ${isWithinRadius ? 'text-success' : 'text-danger'}`}>
                          {formData.distanceKm} km
                        </span>
                      ) : (
                        <span className="text-muted small">Select location on map</span>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted fw-bold">Service Boundary:</span>
                      <span className="small text-navy fw-semibold">Max {garageConfig.serviceRadiusKm || 20} km</span>
                    </div>

                    {isLocationSelected && !isWithinRadius && (
                      <div className="mt-2 text-danger small fw-semibold d-flex align-items-center gap-1">
                        <FaExclamationTriangle /> Location exceeds 20 km roadside coverage.
                      </div>
                    )}
                  </div>

                  {/* Address / Landmark */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Breakdown Address / Location
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street, area or auto-filled from map"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Nearest Landmark (Optional)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleInputChange}
                      placeholder="e.g. Near Tiger Circle, Manipal"
                    />
                  </Form.Group>

                  {/* Problem Description */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold small text-muted text-uppercase">
                      Describe the Issue <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="problemDescription"
                      value={formData.problemDescription}
                      onChange={handleInputChange}
                      placeholder="Please describe symptoms, warning lights, or breakdown situation..."
                      required
                    />
                  </Form.Group>

                  {/* Submit Button */}
                  <div className="d-grid gap-2">
                    <Button
                      type="submit"
                      variant="orange"
                      size="lg"
                      className="btn btn-orange fw-bold py-2.5 shadow-sm"
                      disabled={submitting || !isLocationSelected || !isWithinRadius}
                    >
                      {submitting ? (
                        <span>Submitting Request...</span>
                      ) : !isLocationSelected ? (
                        <span>Select Location on Map First</span>
                      ) : !isWithinRadius ? (
                        <span>Location Outside 20 km Radius</span>
                      ) : (
                        <span className="d-flex align-items-center justify-content-center gap-2">
                          <FaAmbulance /> Request Roadside Assistance
                        </span>
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active & Recent Roadside Requests History */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaHistory className="text-orange" />
            <h5 className="fw-bold mb-0 text-navy">My Roadside Breakdown Requests</h5>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchMyRoadsideRequests}
            disabled={loadingRequests}
          >
            {loadingRequests ? 'Refreshing...' : 'Refresh'}
          </button>
        </Card.Header>
        <Card.Body className="p-0">
          {myRequests.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaAmbulance size={36} className="mb-2 opacity-50" />
              <h6>No roadside assistance requests yet</h6>
              <p className="small mb-0">Whenever you request roadside support, real-time dispatch updates will show here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">Request No</th>
                    <th>Date & Time</th>
                    <th>Vehicle</th>
                    <th>Issue & Diagnosis</th>
                    <th>Distance</th>
                    <th>Assigned Staff</th>
                    <th>Status / Stage</th>
                    <th className="text-end px-4">Actions & Details</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((req) => (
                    <tr key={req._id}>
                      <td className="px-4 fw-bold text-navy">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-bold text-navy"
                          onClick={() => { setSelectedDetailReq(req); setShowDetailModal(true); }}
                        >
                          {req.requestNumber}
                        </button>
                      </td>
                      <td>
                        <div>{new Date(req.createdAt).toLocaleDateString()}</div>
                        <small className="text-muted">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>
                      <td>
                        <div className="fw-bold">{req.vehicle?.vehicleNumber || 'Vehicle'}</div>
                        <small className="text-muted">{req.vehicle?.brand} {req.vehicle?.model}</small>
                      </td>
                      <td>
                        <div>{req.breakdownType}</div>
                        {req.diagnosisOutcome && req.diagnosisOutcome !== 'Pending Diagnosis' && (
                          <small className={`badge ${req.diagnosisOutcome === 'On-Site Repair' ? 'bg-success' : 'bg-warning text-dark'} mt-1`}>
                            {req.diagnosisOutcome}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="fw-semibold text-warning">{req.location?.distanceKm || '--'} km</span>
                      </td>
                      <td>
                        {req.assignedMechanic ? (
                          <div>
                            <span className="fw-medium text-navy">{req.assignedMechanic.fullName}</span>
                            <small className="text-muted d-block">{req.assignedMechanic.mobileNumber || ''}</small>
                          </div>
                        ) : (
                          <span className="text-muted small">Pending Assignment</span>
                        )}
                      </td>
                      <td>
                        <div>{getStatusBadge(req.status)}</div>
                        {req.pickupDetails?.pickupVehicleNumber && req.status.includes('Pickup') && (
                          <small className="text-muted d-block mt-0.5">
                            Tow: {req.pickupDetails.pickupVehicleNumber}
                          </small>
                        )}
                      </td>
                      <td className="text-end px-4">
                        <div className="d-flex justify-content-end gap-2 align-items-center">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="py-1 px-2.5"
                            onClick={() => { setSelectedDetailReq(req); setShowDetailModal(true); }}
                          >
                            Details
                          </Button>

                          {/* Direct Job Card link if vehicle reached showroom */}
                          {req.jobCard && (
                            <Link 
                              to={`/job-cards/${req.jobCard._id || req.jobCard}`} 
                              className="btn btn-sm btn-primary py-1 px-2.5 d-flex align-items-center gap-1 shadow-sm"
                            >
                              <FaWrench size={12} /> <span>Job Card #{req.jobCard.jobNumber || ''}</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Customer Breakdown & Diagnosis Details Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-6">
            Roadside Assistance Request: {selectedDetailReq?.requestNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDetailReq && (
            <div className="d-flex flex-column gap-3">
              <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold text-navy mb-1">{selectedDetailReq.vehicle?.vehicleNumber} &bull; {selectedDetailReq.vehicle?.brand} {selectedDetailReq.vehicle?.model}</h6>
                  <div className="text-muted small">Breakdown Issue: <strong>{selectedDetailReq.breakdownType}</strong></div>
                </div>
                <div>{getStatusBadge(selectedDetailReq.status)}</div>
              </div>

              {/* Breakdown spot */}
              <div className="p-3 border rounded">
                <div className="fw-bold small text-muted text-uppercase mb-1">Breakdown Location</div>
                <div>{selectedDetailReq.location?.address || 'Location Coordinates'}</div>
                <div className="text-warning small fw-semibold mt-1">Distance to Udupi Garage: {selectedDetailReq.location?.distanceKm} km</div>
              </div>

              {/* On-Site Repair Summary */}
              {selectedDetailReq.onSiteRepairDetails && selectedDetailReq.onSiteRepairDetails.workPerformed && (
                <div className="p-3 border rounded" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="fw-bold text-success mb-2 d-flex align-items-center gap-1">
                    <FaCheckCircle /> On-Site Repair & Service Receipt
                  </div>
                  <div className="mb-2"><strong>Diagnosis:</strong> {selectedDetailReq.diagnosisDetails?.diagnosisText || 'Resolved on-site'}</div>
                  <div className="mb-2"><strong>Work Performed:</strong> {selectedDetailReq.onSiteRepairDetails.workPerformed}</div>
                  
                  {selectedDetailReq.onSiteRepairDetails.partsUsed?.length > 0 && (
                    <div className="mb-2">
                      <strong>Parts / Consumables Replaced:</strong>
                      <ul className="mb-1 mt-1 small">
                        {selectedDetailReq.onSiteRepairDetails.partsUsed.map((p, idx) => (
                          <li key={idx}>{p.partName} &times; {p.quantity} (₹{p.cost})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="d-flex gap-4 small mt-2 pt-2 border-top">
                    <div>Parts Cost: <strong>₹{selectedDetailReq.onSiteRepairDetails.partsCost || 0}</strong></div>
                    <div>Labour / Call-out: <strong>₹{selectedDetailReq.onSiteRepairDetails.labourCost || 0}</strong></div>
                    <div>Total Amount: <strong className="text-success fs-6">₹{selectedDetailReq.onSiteRepairDetails.totalCost || 0}</strong></div>
                  </div>

                  {selectedDetailReq.onSiteRepairDetails.customerConfirmation?.confirmed && (
                    <div className="small text-muted mt-2">
                      ✔ Customer Confirmed by {selectedDetailReq.onSiteRepairDetails.customerConfirmation.customerName} on {new Date(selectedDetailReq.onSiteRepairDetails.customerConfirmation.confirmedAt || selectedDetailReq.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {/* Vehicle Pickup Summary */}
              {selectedDetailReq.pickupDetails && selectedDetailReq.pickupDetails.pickupVehicleNumber && (
                <div className="p-3 border rounded" style={{ background: 'rgba(217, 168, 62, 0.06)' }}>
                  <div className="fw-bold text-navy mb-2 d-flex align-items-center gap-1">
                    <FaTruck /> Showroom Pickup & Towing Details
                  </div>
                  <div className="mb-1"><strong>Towing Recovery Vehicle:</strong> {selectedDetailReq.pickupDetails.pickupVehicleNumber}</div>
                  <div className="mb-1"><strong>Driver:</strong> {selectedDetailReq.pickupDetails.driverName} ({selectedDetailReq.pickupDetails.driverPhone})</div>
                  {selectedDetailReq.pickupDetails.conditionNotes && (
                    <div className="mb-1"><strong>Condition Remarks:</strong> {selectedDetailReq.pickupDetails.conditionNotes}</div>
                  )}
                  {selectedDetailReq.pickupDetails.pickedUpAt && (
                    <div className="small text-muted">Picked Up: {new Date(selectedDetailReq.pickupDetails.pickedUpAt).toLocaleString()}</div>
                  )}
                  {selectedDetailReq.pickupDetails.arrivedAtShowroomAt && (
                    <div className="small text-success fw-bold">Arrived at Showroom: {new Date(selectedDetailReq.pickupDetails.arrivedAtShowroomAt).toLocaleString()}</div>
                  )}
                </div>
              )}

              {/* Job Card link */}
              {selectedDetailReq.jobCard && (
                <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold text-navy">Workshop Job Card #{selectedDetailReq.jobCard.jobNumber || 'Active'}</div>
                    <small className="text-muted">Track workshop repairs, technician updates, advisor recommendations, and invoices.</small>
                  </div>
                  <Link to={`/job-cards/${selectedDetailReq.jobCard._id || selectedDetailReq.jobCard}`} className="btn btn-sm btn-primary">
                    Open Job Card
                  </Link>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RoadsideAssistance;
