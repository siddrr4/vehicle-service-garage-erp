import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Form, Modal, Row, Col, Card } from 'react-bootstrap';
import { 
  FaAmbulance, FaMapMarkerAlt, FaCheck, FaTimes, FaUserTie, 
  FaPhoneAlt, FaTools, FaWrench, FaSyncAlt, FaTruck, FaPlus, FaTrash, FaCheckCircle, FaFileInvoiceDollar
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import roadsideService from '../../services/roadsideService';
import api from '../../services/api';
import RoadsideMap from '../../components/Map/RoadsideMap';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import { DEFAULT_GARAGE_LOCATION } from '../../utils/geoUtils';
import { Link } from 'react-router-dom';

const AdminRoadsideRequests = () => {
  const [requests, setRequests] = useState([]);
  const [garageConfig, setGarageConfig] = useState(DEFAULT_GARAGE_LOCATION);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [mechanics, setMechanics] = useState([]);

  // General Dispatch / Assign Modal
  const [selectedReq, setSelectedReq] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [assignedMechanicId, setAssignedMechanicId] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('Dispatched');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Outcome 1: On-Site Repair Modal
  const [showOnSiteModal, setShowOnSiteModal] = useState(false);
  const [onSiteData, setOnSiteData] = useState({
    diagnosisText: '',
    workPerformed: '',
    partsUsed: [{ partName: '', quantity: 1, cost: 0 }],
    labourCost: 350,
    customerConfirmed: true,
    customerFeedback: ''
  });

  // Outcome 2: Vehicle Pickup to Showroom Modal
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupData, setPickupData] = useState({
    diagnosisText: '',
    pickupVehicleNumber: '',
    driverName: '',
    driverPhone: '',
    conditionNotes: ''
  });

  // Show Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Selected Map Focus
  const [focusLocation, setFocusLocation] = useState(null);

  const fetchConfig = async () => {
    try {
      const cfg = await roadsideService.getConfig();
      if (cfg) setGarageConfig(cfg);
    } catch (e) {
      console.warn('Failed to load garage config:', e.message);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await roadsideService.getAllRequests({
        status: statusFilter
      });
      setRequests(data.requests || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load roadside assistance requests');
      setLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const { data } = await api.get('/employees');
      const mechs = (data.employees || data || []).filter(
        e => e.role && e.role.toLowerCase() === 'mechanic'
      );
      setMechanics(mechs);
    } catch (err) {
      console.warn('Failed to load mechanics:', err.message);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchMechanics();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // General Dispatch Modal open
  const handleOpenDispatch = (req) => {
    setSelectedReq(req);
    setAssignedMechanicId(req.assignedMechanic?._id || req.assignedMechanic || '');
    setDispatchStatus(req.status === 'Pending' ? 'Dispatched' : req.status);
    setDispatchNotes(req.notes || '');
    setShowDispatchModal(true);
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      setUpdating(true);
      await roadsideService.updateStatus(selectedReq._id, {
        status: dispatchStatus,
        mechanicId: assignedMechanicId || null,
        notes: dispatchNotes
      });

      toast.success(`Request ${selectedReq.requestNumber} status updated to ${dispatchStatus}.`);
      setShowDispatchModal(false);
      setUpdating(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update roadside request');
      setUpdating(false);
    }
  };

  // Outcome 1: Open On-Site Repair Modal
  const handleOpenOnSiteModal = (req) => {
    setSelectedReq(req);
    setOnSiteData({
      diagnosisText: req.diagnosisDetails?.diagnosisText || `${req.breakdownType} inspected at breakdown site.`,
      workPerformed: '',
      partsUsed: [{ partName: '', quantity: 1, cost: 0 }],
      labourCost: 350,
      customerConfirmed: true,
      customerFeedback: 'Vehicle tested and confirmed running smoothly.'
    });
    setShowOnSiteModal(true);
  };

  const handleAddPartRow = () => {
    setOnSiteData(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, { partName: '', quantity: 1, cost: 0 }]
    }));
  };

  const handleRemovePartRow = (index) => {
    setOnSiteData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index)
    }));
  };

  const handlePartChange = (index, field, value) => {
    setOnSiteData(prev => {
      const updated = [...prev.partsUsed];
      updated[index][field] = value;
      return { ...prev, partsUsed: updated };
    });
  };

  const handleSaveOnSiteRepair = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (!onSiteData.workPerformed.trim()) {
      toast.error('Please describe the work performed on-site.');
      return;
    }

    try {
      setUpdating(true);
      const validParts = onSiteData.partsUsed.filter(p => p.partName && p.partName.trim() !== '');

      const payload = {
        diagnosisText: onSiteData.diagnosisText,
        workPerformed: onSiteData.workPerformed,
        partsUsed: validParts.map(p => ({
          partName: p.partName.trim(),
          quantity: Number(p.quantity) || 1,
          cost: Number(p.cost) || 0
        })),
        labourCost: Number(onSiteData.labourCost) || 0,
        customerConfirmation: {
          confirmed: onSiteData.customerConfirmed,
          customerName: selectedReq.customer?.fullName || 'Customer',
          feedback: onSiteData.customerFeedback
        }
      };

      await roadsideService.recordOnSiteRepair(selectedReq._id, payload);
      toast.success(`Request ${selectedReq.requestNumber} marked as Resolved – On-Site Repair!`);
      setShowOnSiteModal(false);
      setUpdating(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record on-site repair');
      setUpdating(false);
    }
  };

  // Outcome 2: Open Vehicle Pickup Modal
  const handleOpenPickupModal = (req) => {
    setSelectedReq(req);
    setPickupData({
      diagnosisText: req.diagnosisDetails?.diagnosisText || `Major ${req.breakdownType} cannot be safely repaired on-location. Requires workshop hoist and diagnostic equipment.`,
      pickupVehicleNumber: 'KA 20 TR 8844',
      driverName: 'Ramesh Gowda',
      driverPhone: '+91 98450 11223',
      conditionNotes: 'Intact exterior, normal tow loading.'
    });
    setShowPickupModal(true);
  };

  const handleSavePickupDispatch = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      setUpdating(true);
      await roadsideService.dispatchVehiclePickup(selectedReq._id, pickupData);
      toast.success(`Pickup dispatched for ${selectedReq.requestNumber}. Tow vehicle en-route.`);
      setShowPickupModal(false);
      setUpdating(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to dispatch vehicle pickup');
      setUpdating(false);
    }
  };

  // Stage updates for Pickup: 'Vehicle Picked Up' and 'Arrived at Showroom'
  const handleUpdatePickupStage = async (req, stage) => {
    try {
      setUpdating(true);
      const res = await roadsideService.updatePickupStatus(req._id, {
        stage,
        conditionNotes: req.pickupDetails?.conditionNotes || ''
      });

      if (stage === 'Arrived at Showroom') {
        const jcNumber = res.jobCard?.jobNumber || 'Created';
        toast.success(`Vehicle safely arrived at showroom! Connected to Job Card #${jcNumber}.`, { autoClose: 6000 });
      } else {
        toast.success(`Vehicle pickup stage updated to: ${stage}`);
      }
      setUpdating(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pickup status');
      setUpdating(false);
    }
  };

  const handleFocusOnMap = (req) => {
    if (req.location?.latitude && req.location?.longitude) {
      setFocusLocation({
        latitude: req.location.latitude,
        longitude: req.location.longitude
      });
    }
  };

  const handleOpenDetails = (req) => {
    setSelectedReq(req);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge bg="warning" text="dark">Pending Dispatch</Badge>;
      case 'Dispatched':
        return <Badge bg="info">Team Dispatched</Badge>;
      case 'Assigned':
        return <Badge bg="primary">Mechanic Assigned</Badge>;
      case 'In Progress':
        return <Badge bg="primary">In Progress</Badge>;
      case 'Resolved - On-Site Repair':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" /> Resolved – On-Site</Badge>;
      case 'Pickup Dispatched':
        return <Badge bg="warning" text="dark"><FaTruck className="me-1" /> Pickup Dispatched</Badge>;
      case 'Vehicle Picked Up':
        return <Badge bg="info" className="px-2 py-1"><FaTruck className="me-1" /> Vehicle In Transit</Badge>;
      case 'Arrived at Showroom':
        return <Badge bg="success" className="px-2 py-1">🏢 Arrived at Showroom</Badge>;
      case 'Completed':
        return <Badge bg="success">Resolved</Badge>;
      case 'Cancelled':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Live parts total calculation for On-Site Modal
  const calculatedPartsTotal = (onSiteData.partsUsed || []).reduce(
    (sum, p) => sum + ((Number(p.cost) || 0) * (Number(p.quantity) || 1)),
    0
  );
  const calculatedGrandTotal = calculatedPartsTotal + (Number(onSiteData.labourCost) || 0);

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Roadside Assistance & Breakdown Diagnosis Workflow"
        subtitle={`Live monitoring of breakdown assistance calls within ${garageConfig.serviceRadiusKm || 20} km radius from Udupi garage. Supports On-Site Repair or Showroom Pickup with automatic Job Card connection.`}
        breadcrumbs={[
          { label: 'Workshop', path: '/admin-dashboard' },
          { label: 'Roadside Assistance' }
        ]}
        actions={
          <Button variant="outline-secondary" onClick={fetchRequests} className="d-flex align-items-center gap-2">
            <FaSyncAlt /> <span>Refresh</span>
          </Button>
        }
      />

      {/* Overview Map */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FaMapMarkerAlt className="text-orange" />
            <h5 className="fw-bold mb-0 text-navy">Live Roadside Emergency Overview (20 km Zone)</h5>
          </div>
          <span className="text-muted small">
            Base: <strong>{garageConfig.garageName}</strong> ({garageConfig.latitude}, {garageConfig.longitude})
          </span>
        </Card.Header>
        <Card.Body className="p-3">
          <RoadsideMap
            garageLocation={garageConfig}
            selectedLocation={focusLocation}
            otherMarkers={requests}
            readOnly={true}
            height="360px"
          />
        </Card.Body>
      </Card>

      {/* Filter and Table Card */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <FaAmbulance className="text-orange" />
            <h5 className="fw-bold mb-0 text-navy">Active Assistance Calls & Breakdown Diagnoses</h5>
          </div>
          <div style={{ minWidth: '220px' }}>
            <Form.Select 
              size="sm" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Dispatch</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved - On-Site Repair">Resolved – On-Site Repair</option>
              <option value="Pickup Dispatched">Pickup Dispatched</option>
              <option value="Vehicle Picked Up">Vehicle Picked Up</option>
              <option value="Arrived at Showroom">Arrived at Showroom</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><LoadingSpinner /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaAmbulance size={40} className="mb-2 opacity-50" />
              <h5>No roadside requests found</h5>
              <p className="small">Customer emergency breakdown requests within 20 km will appear here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">Request #</th>
                    <th>Date / Time</th>
                    <th>Customer & Vehicle</th>
                    <th>Breakdown Issue</th>
                    <th>Distance & Location</th>
                    <th>Status / Stage</th>
                    <th>Assigned Staff</th>
                    <th className="text-end px-4">Diagnosis & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req._id}>
                      <td className="px-4 fw-bold text-navy">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-bold text-navy"
                          onClick={() => handleOpenDetails(req)}
                          title="View Full Breakdown Details"
                        >
                          {req.requestNumber}
                        </button>
                      </td>
                      <td>
                        <div>{new Date(req.createdAt).toLocaleDateString()}</div>
                        <small className="text-muted">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>
                      <td>
                        <div className="fw-bold">{req.customer?.fullName}</div>
                        <small className="text-muted d-block">{req.vehicle?.vehicleNumber} ({req.vehicle?.brand} {req.vehicle?.model})</small>
                        <small className="text-info">{req.contactPhone || req.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{req.breakdownType}</span>
                        {req.diagnosisOutcome && req.diagnosisOutcome !== 'Pending Diagnosis' && (
                          <div className="mt-1">
                            <small className="badge bg-secondary">{req.diagnosisOutcome}</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold text-warning">{req.location?.distanceKm || '--'} km</div>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-start text-decoration-none text-info text-truncate d-block"
                          style={{ maxWidth: '180px' }}
                          onClick={() => handleFocusOnMap(req)}
                          title={req.location?.address}
                        >
                          <FaMapMarkerAlt className="me-1" />
                          <small>{req.location?.address || `${req.location?.latitude?.toFixed(4)}, ${req.location?.longitude?.toFixed(4)}`}</small>
                        </button>
                      </td>
                      <td>
                        <div>{getStatusBadge(req.status)}</div>
                        {req.jobCard && (
                          <div className="mt-1">
                            <Link to={`/job-cards/${req.jobCard._id || req.jobCard}`} className="badge bg-success text-decoration-none">
                              Job Card #{req.jobCard.jobNumber || 'Linked'}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td>
                        {req.assignedMechanic ? (
                          <div>
                            <span className="fw-medium text-navy">{req.assignedMechanic.fullName}</span>
                            <small className="text-muted d-block">{req.assignedMechanic.specialization || 'Mechanic'}</small>
                          </div>
                        ) : (
                          <span className="text-muted small">Unassigned</span>
                        )}
                      </td>
                      <td className="text-end px-4">
                        <div className="d-flex justify-content-end align-items-center flex-wrap gap-1.5">
                          {/* Active / Dispatchable Stages */}
                          {['Pending', 'Dispatched', 'Assigned', 'In Progress'].includes(req.status) && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleOpenOnSiteModal(req)}
                                title="Problem can be repaired on-site"
                                className="d-flex align-items-center gap-1 py-1 px-2"
                              >
                                <FaTools size={12} /> <span>On-Site Fix</span>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleOpenPickupModal(req)}
                                title="Vehicle cannot be fixed on-site. Dispatch pickup to showroom"
                                className="d-flex align-items-center gap-1 py-1 px-2"
                              >
                                <FaTruck size={12} /> <span>Pickup</span>
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handleOpenDispatch(req)}
                                className="py-1 px-2"
                              >
                                Dispatch/Assign
                              </Button>
                            </>
                          )}

                          {/* Pickup Dispatched -> Mark Picked Up */}
                          {req.status === 'Pickup Dispatched' && (
                            <Button
                              variant="info"
                              size="sm"
                              className="d-flex align-items-center gap-1 text-white py-1 px-2.5"
                              onClick={() => handleUpdatePickupStage(req, 'Vehicle Picked Up')}
                              disabled={updating}
                            >
                              <FaTruck size={12} /> <span>Mark Picked Up</span>
                            </Button>
                          )}

                          {/* Vehicle Picked Up -> Mark Arrived at Showroom */}
                          {req.status === 'Vehicle Picked Up' && (
                            <Button
                              variant="success"
                              size="sm"
                              className="d-flex align-items-center gap-1 py-1 px-2.5 shadow-sm fw-semibold"
                              onClick={() => handleUpdatePickupStage(req, 'Arrived at Showroom')}
                              disabled={updating}
                              title="Vehicle arrived at showroom; automatically creates Job Card"
                            >
                              <span>🏢 Arrived at Showroom</span>
                            </Button>
                          )}

                          {/* Arrived at Showroom -> Direct Job Card Link */}
                          {req.status === 'Arrived at Showroom' && req.jobCard && (
                            <Link
                              to={`/job-cards/${req.jobCard._id || req.jobCard}`}
                              className="btn btn-sm btn-primary py-1 px-2.5 d-flex align-items-center gap-1"
                            >
                              <FaWrench size={12} /> <span>Open Job Card</span>
                            </Link>
                          )}

                          {/* Resolved On-Site -> View Receipt / Summary */}
                          {req.status === 'Resolved - On-Site Repair' && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleOpenDetails(req)}
                              className="py-1 px-2"
                            >
                              View Fix Receipt
                            </Button>
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

      {/* MODAL 1: Outcome 1 – On-Site Repair Diagnosis & Work Recording */}
      <Modal show={showOnSiteModal} onHide={() => setShowOnSiteModal(false)} size="lg" centered>
        <Form onSubmit={handleSaveOnSiteRepair}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
              <FaTools className="text-success" />
              <span>Record On-Site Repair: {selectedReq?.requestNumber}</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="p-3 bg-light rounded border mb-3 small">
              <Row>
                <Col md={6}>
                  <div><strong>Customer:</strong> {selectedReq?.customer?.fullName} ({selectedReq?.contactPhone})</div>
                  <div><strong>Vehicle:</strong> {selectedReq?.vehicle?.vehicleNumber} ({selectedReq?.vehicle?.brand} {selectedReq?.vehicle?.model})</div>
                </Col>
                <Col md={6}>
                  <div><strong>Reported Issue:</strong> {selectedReq?.breakdownType}</div>
                  <div><strong>Location:</strong> {selectedReq?.location?.address || 'Breakdown Coordinates'} ({selectedReq?.location?.distanceKm} km from garage)</div>
                </Col>
              </Row>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                Breakdown Diagnosis <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={onSiteData.diagnosisText}
                onChange={(e) => setOnSiteData(prev => ({ ...prev, diagnosisText: e.target.value }))}
                placeholder="e.g. Discharged battery, loose terminal connection, flat tyre punctured by nail"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                Work Performed On-Site <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={onSiteData.workPerformed}
                onChange={(e) => setOnSiteData(prev => ({ ...prev, workPerformed: e.target.value }))}
                placeholder="Detail the exact repair steps completed on-site (e.g. Cleaned terminals, jump-started vehicle, sealed puncture and inflated to 33 PSI, road-tested)..."
                required
              />
            </Form.Group>

            {/* Parts Used Section */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="fw-bold small text-muted text-uppercase mb-0">
                  Parts & Consumables Used (Optional)
                </Form.Label>
                <Button variant="outline-primary" size="sm" onClick={handleAddPartRow} className="py-0.5 px-2">
                  <FaPlus size={11} className="me-1" /> Add Part
                </Button>
              </div>

              {onSiteData.partsUsed.map((part, idx) => (
                <Row className="g-2 mb-2 align-items-center" key={idx}>
                  <Col md={6}>
                    <Form.Control
                      size="sm"
                      placeholder="Part / Consumable Name (e.g. Battery Clamp, Fuse 20A)"
                      value={part.partName}
                      onChange={(e) => handlePartChange(idx, 'partName', e.target.value)}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={part.quantity}
                      onChange={(e) => handlePartChange(idx, 'quantity', e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min="0"
                      placeholder="Cost (₹)"
                      value={part.cost}
                      onChange={(e) => handlePartChange(idx, 'cost', e.target.value)}
                    />
                  </Col>
                  <Col md={1}>
                    {onSiteData.partsUsed.length > 1 && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemovePartRow(idx)} className="py-1 px-2">
                        <FaTrash size={12} />
                      </Button>
                    )}
                  </Col>
                </Row>
              ))}
            </div>

            {/* Charges Breakdown */}
            <Row className="g-3 p-3 bg-light rounded border mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted text-uppercase">Labour / Service Charge (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    size="sm"
                    value={onSiteData.labourCost}
                    onChange={(e) => setOnSiteData(prev => ({ ...prev, labourCost: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <div className="small fw-bold text-muted text-uppercase mb-1">Parts Subtotal</div>
                <div className="fw-bold fs-6 text-navy">₹{calculatedPartsTotal.toFixed(2)}</div>
              </Col>
              <Col md={4}>
                <div className="small fw-bold text-muted text-uppercase mb-1">Total Billable (₹)</div>
                <div className="fw-bold fs-5 text-success">₹{calculatedGrandTotal.toFixed(2)}</div>
              </Col>
            </Row>

            {/* Customer Confirmation */}
            <div className="p-3 border rounded mb-2" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
              <Form.Check
                type="checkbox"
                id="customerConfirmedCheck"
                label={<strong className="text-navy">Customer has inspected vehicle and confirmed repair is complete</strong>}
                checked={onSiteData.customerConfirmed}
                onChange={(e) => setOnSiteData(prev => ({ ...prev, customerConfirmed: e.target.checked }))}
                className="mb-2"
              />
              <Form.Control
                size="sm"
                type="text"
                placeholder="Customer remarks / feedback (optional)"
                value={onSiteData.customerFeedback}
                onChange={(e) => setOnSiteData(prev => ({ ...prev, customerFeedback: e.target.value }))}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowOnSiteModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={updating}>
              {updating ? 'Saving...' : 'Resolve – On-Site Repair'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 2: Outcome 2 – Vehicle Pickup to Showroom Dispatch */}
      <Modal show={showPickupModal} onHide={() => setShowPickupModal(false)} centered>
        <Form onSubmit={handleSavePickupDispatch}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
              <FaTruck className="text-warning" />
              <span>Dispatch Vehicle Pickup to Showroom</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="p-3 bg-light rounded border mb-3 small">
              <div><strong>Vehicle:</strong> {selectedReq?.vehicle?.vehicleNumber} ({selectedReq?.vehicle?.brand} {selectedReq?.vehicle?.model})</div>
              <div><strong>Breakdown Location:</strong> {selectedReq?.location?.address || `${selectedReq?.location?.latitude}, ${selectedReq?.location?.longitude}`}</div>
              <div><strong>Destination:</strong> Garage ERP Udupi Main Showroom</div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                Diagnosis / Reason for Showroom Pickup <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={pickupData.diagnosisText}
                onChange={(e) => setPickupData(prev => ({ ...prev, diagnosisText: e.target.value }))}
                placeholder="Why the vehicle cannot be fixed on-site (e.g. Engine seized, clutch burn, suspension damage, collision towing required)..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                Towing / Pickup Vehicle Plate Number <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={pickupData.pickupVehicleNumber}
                onChange={(e) => setPickupData(prev => ({ ...prev, pickupVehicleNumber: e.target.value }))}
                placeholder="e.g. KA 20 TR 8844"
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Recovery Driver Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={pickupData.driverName}
                    onChange={(e) => setPickupData(prev => ({ ...prev, driverName: e.target.value }))}
                    placeholder="Driver Name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Driver Contact Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={pickupData.driverPhone}
                    onChange={(e) => setPickupData(prev => ({ ...prev, driverPhone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                Vehicle Condition at Pickup (Optional)
              </Form.Label>
              <Form.Control
                type="text"
                value={pickupData.conditionNotes}
                onChange={(e) => setPickupData(prev => ({ ...prev, conditionNotes: e.target.value }))}
                placeholder="Any existing body scratches, front bumper dent, odometer, keys handed over..."
              />
            </Form.Group>

            <div className="alert alert-info py-2 small mb-0">
              ℹ After the vehicle arrives at the showroom, marking <strong>"Arrived at Showroom"</strong> will automatically generate and connect an urgent Job Card.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPickupModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" type="submit" disabled={updating}>
              {updating ? 'Dispatching...' : 'Dispatch Pickup'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 3: General Dispatch / Mechanic Assignment */}
      <Modal show={showDispatchModal} onHide={() => setShowDispatchModal(false)} centered>
        <Form onSubmit={handleSaveDispatch}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold fs-6">
              Dispatch Roadside Team: {selectedReq?.requestNumber}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3 p-3 bg-light rounded border small">
              <div><strong>Vehicle:</strong> {selectedReq?.vehicle?.vehicleNumber} ({selectedReq?.vehicle?.brand} {selectedReq?.vehicle?.model})</div>
              <div><strong>Issue:</strong> {selectedReq?.breakdownType}</div>
              <div><strong>Distance:</strong> {selectedReq?.location?.distanceKm} km from Udupi garage</div>
              <div><strong>Location:</strong> {selectedReq?.location?.address || 'GPS Coordinates'}</div>
              <div><strong>Contact:</strong> {selectedReq?.contactPhone}</div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Update Status</Form.Label>
              <Form.Select
                value={dispatchStatus}
                onChange={(e) => setDispatchStatus(e.target.value)}
                required
              >
                <option value="Pending">Pending</option>
                <option value="Dispatched">Dispatched (Van / Tech en route)</option>
                <option value="Assigned">Assigned (Technician on-duty)</option>
                <option value="In Progress">In Progress (Diagnosing on site)</option>
                <option value="Resolved - On-Site Repair">Resolved – On-Site Repair</option>
                <option value="Pickup Dispatched">Pickup Dispatched (Towing)</option>
                <option value="Vehicle Picked Up">Vehicle Picked Up (In Transit)</option>
                <option value="Arrived at Showroom">Arrived at Showroom (Showroom Service)</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Assign Mechanic / Technician</Form.Label>
              <Form.Select
                value={assignedMechanicId}
                onChange={(e) => setAssignedMechanicId(e.target.value)}
              >
                <option value="">Select Mechanic (Optional)</option>
                {mechanics.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} — {m.specialization || 'Mechanic'} ({m.availability || 'Available'})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Notes / Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Instructions for technician, towing notes, etc."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDispatchModal(false)}>
              Cancel
            </Button>
            <Button variant="orange" type="submit" disabled={updating} className="btn btn-orange">
              {updating ? 'Saving...' : 'Save & Update'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 4: Full Breakdown & Diagnosis Details View */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-6">
            Roadside Request Overview: {selectedReq?.requestNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReq && (
            <div className="d-flex flex-column gap-3">
              {/* Summary Header */}
              <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold text-navy mb-1">{selectedReq.vehicle?.vehicleNumber} &bull; {selectedReq.vehicle?.brand} {selectedReq.vehicle?.model}</h6>
                  <div className="text-muted small">Customer: <strong>{selectedReq.customer?.fullName}</strong> &bull; Contact: <strong>{selectedReq.contactPhone}</strong></div>
                </div>
                <div>{getStatusBadge(selectedReq.status)}</div>
              </div>

              {/* Location details */}
              <div className="p-3 border rounded">
                <div className="fw-bold small text-muted text-uppercase mb-1">Breakdown Location</div>
                <div>{selectedReq.location?.address || `${selectedReq.location?.latitude}, ${selectedReq.location?.longitude}`}</div>
                <div className="small text-warning fw-semibold mt-1">Distance from Udupi Garage: {selectedReq.location?.distanceKm} km</div>
              </div>

              {/* On-Site Repair Details (if resolved on-site) */}
              {selectedReq.onSiteRepairDetails && selectedReq.onSiteRepairDetails.workPerformed && (
                <div className="p-3 border rounded" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="fw-bold text-success mb-2 d-flex align-items-center gap-1">
                    <FaCheckCircle /> On-Site Repair Summary
                  </div>
                  <div className="mb-2"><strong>Diagnosis:</strong> {selectedReq.diagnosisDetails?.diagnosisText || 'Resolved on site'}</div>
                  <div className="mb-2"><strong>Work Performed:</strong> {selectedReq.onSiteRepairDetails.workPerformed}</div>
                  
                  {selectedReq.onSiteRepairDetails.partsUsed?.length > 0 && (
                    <div className="mb-2">
                      <strong>Parts Used:</strong>
                      <ul className="mb-1 mt-1 small">
                        {selectedReq.onSiteRepairDetails.partsUsed.map((p, idx) => (
                          <li key={idx}>{p.partName} &times; {p.quantity} (₹{p.cost})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="d-flex gap-4 small mt-2 pt-2 border-top">
                    <div>Parts: <strong>₹{selectedReq.onSiteRepairDetails.partsCost || 0}</strong></div>
                    <div>Labour: <strong>₹{selectedReq.onSiteRepairDetails.labourCost || 0}</strong></div>
                    <div>Total Charged: <strong className="text-success fs-6">₹{selectedReq.onSiteRepairDetails.totalCost || 0}</strong></div>
                  </div>

                  {selectedReq.onSiteRepairDetails.customerConfirmation?.confirmed && (
                    <div className="small text-muted mt-2">
                      ✔ Customer Confirmation: {selectedReq.onSiteRepairDetails.customerConfirmation.customerName} ({new Date(selectedReq.onSiteRepairDetails.customerConfirmation.confirmedAt || selectedReq.updatedAt).toLocaleTimeString()})
                    </div>
                  )}
                </div>
              )}

              {/* Pickup Details (if pickup to showroom) */}
              {selectedReq.pickupDetails && selectedReq.pickupDetails.pickupVehicleNumber && (
                <div className="p-3 border rounded" style={{ background: 'rgba(217, 168, 62, 0.06)' }}>
                  <div className="fw-bold text-navy mb-2 d-flex align-items-center gap-1">
                    <FaTruck /> Vehicle Pickup to Showroom Summary
                  </div>
                  <div className="mb-1"><strong>Towing Vehicle:</strong> {selectedReq.pickupDetails.pickupVehicleNumber}</div>
                  <div className="mb-1"><strong>Recovery Driver:</strong> {selectedReq.pickupDetails.driverName} ({selectedReq.pickupDetails.driverPhone})</div>
                  {selectedReq.pickupDetails.conditionNotes && (
                    <div className="mb-1"><strong>Condition Notes:</strong> {selectedReq.pickupDetails.conditionNotes}</div>
                  )}
                  {selectedReq.pickupDetails.pickedUpAt && (
                    <div className="small text-muted">Picked Up: {new Date(selectedReq.pickupDetails.pickedUpAt).toLocaleString()}</div>
                  )}
                  {selectedReq.pickupDetails.arrivedAtShowroomAt && (
                    <div className="small text-success fw-bold">Arrived at Showroom: {new Date(selectedReq.pickupDetails.arrivedAtShowroomAt).toLocaleString()}</div>
                  )}
                </div>
              )}

              {/* Job Card link if created */}
              {selectedReq.jobCard && (
                <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold text-navy">Workshop Job Card #{selectedReq.jobCard.jobNumber || 'Linked'}</div>
                    <small className="text-muted">Vehicle queued for showroom workshop repair and billing.</small>
                  </div>
                  <Link to={`/job-cards/${selectedReq.jobCard._id || selectedReq.jobCard}`} className="btn btn-sm btn-primary">
                    Open Job Card
                  </Link>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRoadsideRequests;
