import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { 
  FaArrowLeft, FaEdit, FaFileInvoiceDollar, FaWrench, 
  FaCar, FaUser, FaClipboardList, FaClock, FaCheckCircle, 
  FaExclamationTriangle, FaCalendarAlt, FaTools, FaPrint, FaPlus, FaUndo 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import jobCardService from '../../services/jobCardService';
import sparePartRequestService from '../../services/sparePartRequestService';
import sparePartService from '../../services/sparePartService';
import billingService from '../../services/billingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { AuthContext } from '../../context/AuthContext';
import SparePartsTabs from './SparePartsTabs';

const JobCardDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [jobCard, setJobCard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  const [selectedPart, setSelectedPart] = useState('');
  const [requestQty, setRequestQty] = useState(1);
  const [requestReason, setRequestReason] = useState('');
  
  const [selectedRequestToReturn, setSelectedRequestToReturn] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const fetchJobCardAndRequests = async () => {
    try {
      const jcData = await jobCardService.getJobCardById(id);
      setJobCard(jcData);
      
      const reqsData = await sparePartRequestService.getRequests(1, 100, '', '', id);
      setRequests(reqsData.requests || []);
      
      const partsData = await sparePartService.getAllSpareParts();
      setAvailableParts(partsData || []);
      
      try {
        const invData = await billingService.getInvoiceByJobCard(id);
        setInvoice(invData);
      } catch (err) {
        // Invoice might not exist yet
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load job card details or requests');
      setLoading(false);
      navigate('/job-cards');
    }
  };

  useEffect(() => {
    fetchJobCardAndRequests();
  }, [id]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPart) return;

    try {
      setSubmitting(true);
      await sparePartRequestService.createRequest({
        jobCardId: id,
        partId: selectedPart,
        requestedQuantity: requestQty,
        reason: requestReason
      });
      toast.success('Spare part request submitted successfully');
      setShowRequestModal(false);
      setSelectedPart('');
      setRequestQty(1);
      setRequestReason('');
      fetchJobCardAndRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request part');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequestToReturn) return;

    try {
      setSubmitting(true);
      await sparePartRequestService.requestReturn(selectedRequestToReturn._id, returnQty);
      toast.success('Return request submitted for admin approval');
      setShowReturnModal(false);
      setSelectedRequestToReturn(null);
      setReturnQty(1);
      fetchJobCardAndRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const newInvoice = await billingService.generateInvoice({ jobCardId: id });
      setInvoice(newInvoice);
      toast.success('Invoice generated successfully!');
      navigate(`/billing/invoice/${newInvoice._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge bg="success" className="px-3 py-2 rounded-pill fw-medium"><FaCheckCircle className="me-1" /> {status}</Badge>;
      case 'In Progress':
        return <Badge bg="info" text="dark" className="px-3 py-2 rounded-pill fw-medium"><FaTools className="me-1" /> {status}</Badge>;
      case 'Pending':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-medium"><FaClock className="me-1" /> {status}</Badge>;
      case 'Assigned':
        return <Badge bg="primary" className="px-3 py-2 rounded-pill fw-medium"><FaUser className="me-1" /> {status}</Badge>;
      case 'Delivered':
        return <Badge bg="dark" className="px-3 py-2 rounded-pill fw-medium"><FaCar className="me-1" /> {status}</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill fw-medium">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <Badge bg="danger" className="px-2 py-1">{priority}</Badge>;
      case 'Medium':
        return <Badge bg="warning" text="dark" className="px-2 py-1">{priority}</Badge>;
      case 'Low':
        return <Badge bg="info" className="px-2 py-1">{priority}</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">{priority}</Badge>;
    }
  };

  const getRequestStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge bg="warning" text="dark" className="px-2 py-1 rounded-pill">Pending</Badge>;
      case 'Issued':
        return <Badge bg="success" className="px-2 py-1 rounded-pill">Issued</Badge>;
      case 'Rejected':
        return <Badge bg="danger" className="px-2 py-1 rounded-pill">Rejected</Badge>;
      case 'Pending Return':
        return <Badge bg="info" text="dark" className="px-2 py-1 rounded-pill">Pending Return</Badge>;
      case 'Returned':
        return <Badge bg="primary" className="px-2 py-1 rounded-pill">Returned</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1 rounded-pill">{status}</Badge>;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!jobCard) return <div className="text-center py-5">Job Card not found.</div>;

  const renderFreeServiceBadge = () => {
    const vehicle = jobCard.vehicle;
    if (!vehicle || vehicle.freeServicesEntitled === 0) return null;

    const isThisFreeService = jobCard.servicesPerformed?.some(s => s.isFreeService);
    
    if (isThisFreeService) {
      return (
        <div className="alert alert-success d-flex flex-column mb-4 border-0 py-2">
           <div className="fw-bold fs-6">🟢 FREE SERVICE (Applied)</div>
           <div className="small text-muted mt-1">Labour and washing charges have been waived. Spare parts are chargeable.</div>
        </div>
      );
    }
    
    const remaining = vehicle.freeServicesEntitled - vehicle.freeServicesUsed;
    if (remaining > 0) {
      return (
        <div className="alert alert-info d-flex justify-content-between align-items-center mb-4 border-0 py-2">
           <div>
             <div className="fw-bold fs-6 text-navy">🟢 ELIGIBLE FOR FREE SERVICE #{vehicle.freeServicesUsed + 1} OF {vehicle.freeServicesEntitled}</div>
             <div className="small text-muted">Free Services Used: {vehicle.freeServicesUsed} / {vehicle.freeServicesEntitled} | Remaining: {remaining}</div>
           </div>
        </div>
      );
    } else {
      return (
        <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-4 border-0 py-2">
           <div>
             <div className="fw-bold fs-6 text-secondary">⚪ Free Service Benefit Exhausted</div>
             <div className="small text-muted">0 Free Services Remaining</div>
           </div>
        </div>
      );
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'advisor';
  const isMechanic = user?.role === 'mechanic';

  // Billing calculations: use parts snapshotted in jobCard.partsUsed (which is synced dynamically with issues/returns)
  const laborCost = jobCard.estimatedCost || 0;
  const partsExcludingTax = jobCard.partsUsed ? jobCard.partsUsed.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0) : 0;
  const partsTaxAmount = jobCard.partsUsed ? jobCard.partsUsed.reduce((sum, p) => sum + (p.sellingPrice * p.quantity * p.gstPercent / 100), 0) : 0;
  const partsIncludingTax = partsExcludingTax + partsTaxAmount;
  const grandTotal = laborCost + partsIncludingTax;

  // Split requests into sections
  const requestedParts = requests.filter(r => r.status === 'Pending' || r.status === 'Rejected');
  const issuedParts = requests.filter(r => r.status === 'Issued' || r.status === 'Pending Return');
  const returnedParts = requests.filter(r => r.status === 'Returned');

  return (
    <div className="container-fluid p-0">
      
      {/* Top Navigation Row */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <Link to={isAdmin ? "/job-cards" : "/my-job-cards"} className="btn btn-light border btn-sm text-muted">
            <FaArrowLeft />
          </Link>
          <div>
            <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
              Job Card: {jobCard.jobNumber}
            </h2>
            <p className="text-muted mb-0">Created on {new Date(jobCard.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="d-flex gap-2">
          {isAdmin && (
            <Link to={`/job-cards/edit/${jobCard._id}`} className="btn btn-light border d-flex align-items-center gap-2 text-dark text-decoration-none">
              <FaEdit /> <span>Edit Job Card</span>
            </Link>
          )}
          {(isMechanic || isAdmin) && (
            <Button className="btn-primary-custom d-flex align-items-center gap-2 border-0" onClick={() => setShowRequestModal(true)}>
              <FaPlus /> <span>Request Spare Part</span>
            </Button>
          )}
          {isAdmin && (jobCard.status === 'Completed' || jobCard.status === 'Delivered') && (
            invoice ? (
              <Link to={`/billing/invoice/${invoice._id}`} className="btn btn-success d-flex align-items-center gap-2 text-white text-decoration-none">
                <FaFileInvoiceDollar /> <span>View Invoice</span>
              </Link>
            ) : (
              <Button 
                variant="success" 
                className="d-flex align-items-center gap-2" 
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
              >
                {generatingInvoice ? <Spinner size="sm" /> : <FaFileInvoiceDollar />} <span>Generate Invoice</span>
              </Button>
            )
          )}
        </div>
      </div>

      <Row className="g-4">
        {/* Left Column: Job Details & Parts Workflow */}
        <Col xs={12} lg={8}>
          
          {/* Main Info Card */}
          <Card className="bg-card border-0 shadow-sm mb-4 p-2">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <h5 className="fw-bold text-navy mb-0 d-flex align-items-center gap-2">
                  <FaWrench /> Service Workbench Details
                </h5>
                <div className="d-flex gap-2">
                  {getStatusBadge(jobCard.status)}
                  {getPriorityBadge(jobCard.priority)}
                </div>
              </div>
              
              {renderFreeServiceBadge()}

              <Row className="g-3 mb-4">
                <Col xs={12} md={6}>
                  <div className="text-muted small mb-1">Service Type</div>
                  <div className="fw-bold text-dark">{jobCard.serviceType || 'General Service'}</div>
                </Col>
                
                <Col xs={12} md={6}>
                  <div className="text-muted small mb-1">Estimated Delivery Date</div>
                  <div className="fw-bold text-dark d-flex align-items-center gap-2">
                    <FaCalendarAlt size={14} className="text-muted" />
                    {jobCard.estimatedDeliveryDate ? new Date(jobCard.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}
                  </div>
                </Col>

                {jobCard.startTime && (
                  <Col xs={12} md={4}>
                    <div className="text-muted small mb-1">Service Started At</div>
                    <div className="fw-bold text-dark"><small>{new Date(jobCard.startTime).toLocaleString()}</small></div>
                  </Col>
                )}
                {jobCard.completionTime && (
                  <Col xs={12} md={4}>
                    <div className="text-muted small mb-1">Service Completed At</div>
                    <div className="fw-bold text-dark"><small>{new Date(jobCard.completionTime).toLocaleString()}</small></div>
                  </Col>
                )}
                {jobCard.deliveryTime && (
                  <Col xs={12} md={4}>
                    <div className="text-muted small mb-1">Vehicle Delivered At</div>
                    <div className="fw-bold text-dark"><small>{new Date(jobCard.deliveryTime).toLocaleString()}</small></div>
                  </Col>
                )}
              </Row>

              <div className="mb-4">
                <h6 className="fw-bold text-navy small text-uppercase">Customer Complaint / Issue Reported</h6>
                <div className="p-3 bg-light rounded text-secondary small">
                  {jobCard.complaint}
                </div>
              </div>

              {jobCard.workDescription && (
                <div className="mb-4">
                  <h6 className="fw-bold text-navy small text-uppercase">Work Description / Mechanic Notes</h6>
                  <div className="p-3 bg-light rounded text-dark small border-start border-3 border-info">
                    {jobCard.workDescription}
                  </div>
                </div>
              )}

              {jobCard.notes && (
                <div className="mb-2">
                  <h6 className="fw-bold text-navy small text-uppercase">Internal Advisor Remarks</h6>
                  <div className="p-3 bg-light rounded text-muted small">
                    {jobCard.notes}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          <SparePartsTabs 
            requestedParts={requestedParts}
            issuedParts={issuedParts}
            consumedParts={jobCard.partsUsed || []}
            returnedParts={returnedParts}
            isMechanic={isMechanic}
            isAdmin={isAdmin}
            setShowRequestModal={setShowRequestModal}
            setSelectedRequestToReturn={setSelectedRequestToReturn}
            setReturnQty={setReturnQty}
            setShowReturnModal={setShowReturnModal}
            getRequestStatusBadge={getRequestStatusBadge}
          />
        </Col>

        {/* Right Column: Customer, Vehicle & Pricing Summary */}
        <Col xs={12} lg={4}>
          
          {/* Customer Card */}
          <Card className="bg-card border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold text-navy mb-3 d-flex align-items-center gap-2">
                <FaUser className="text-primary" /> Customer Profile
              </h5>
              <div className="border-top pt-3">
                <div className="fw-bold text-dark fs-5 mb-1">{jobCard.customer?.fullName}</div>
                <div className="text-muted small mb-2">{jobCard.customer?.mobileNumber}</div>
                <div className="text-muted small mb-3">{jobCard.customer?.emailAddress}</div>
                
                {jobCard.customer?.address && (
                  <div className="small text-secondary border-top pt-2 mt-2">
                    <strong>Address:</strong><br/>
                    {jobCard.customer.address}, {jobCard.customer.city}<br/>
                    {jobCard.customer.state} - {jobCard.customer.pincode}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Vehicle Card */}
          <Card className="bg-card border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold text-navy mb-3 d-flex align-items-center gap-2">
                <FaCar className="text-info" /> Vehicle Profile
              </h5>
              <div className="border-top pt-3">
                <Badge bg="light" text="dark" className="border fs-6 fw-mono px-3 py-2 rounded mb-3">
                  {jobCard.vehicle?.vehicleNumber}
                </Badge>
                <div className="fw-bold text-dark mb-1">
                  {jobCard.vehicle?.brand} {jobCard.vehicle?.model}
                </div>
                <div className="text-muted small">
                  Color: {jobCard.vehicle?.color || 'N/A'} &bull; Year: {jobCard.vehicle?.year || 'N/A'}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Mechanic Card */}
          <Card className="bg-card border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold text-navy mb-3 d-flex align-items-center gap-2">
                <FaTools className="text-warning" /> Assigned Mechanic
              </h5>
              <div className="border-top pt-3">
                {jobCard.assignedMechanic ? (
                  <div>
                    <div className="fw-bold text-dark">{jobCard.assignedMechanic.fullName}</div>
                    <div className="text-muted small mb-1">{jobCard.assignedMechanic.employeeId}</div>
                    <div className="text-muted small">Specialization: {jobCard.assignedMechanic.specialization || 'General'}</div>
                  </div>
                ) : (
                  <span className="text-muted small">No mechanic assigned to this job card yet.</span>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Invoice Summary Card */}
          <Card className="border-0 shadow-sm bg-navy text-white mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 border-bottom border-light border-opacity-25 pb-2">
                <FaFileInvoiceDollar /> Billing Summary
              </h5>
              
              <div className="d-flex justify-content-between mb-2 small opacity-90">
                <span>Labor & Service charges:</span>
                <span>₹{laborCost.toFixed(2)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2 small opacity-90">
                <span>Spare Parts (Excl. Tax):</span>
                <span>₹{partsExcludingTax.toFixed(2)}</span>
              </div>

              <div className="d-flex justify-content-between mb-3 small opacity-90 border-bottom border-light border-opacity-25 pb-2">
                <span>Spare Parts GST Amount:</span>
                <span>₹{partsTaxAmount.toFixed(2)}</span>
              </div>

              <div className="d-flex justify-content-between mb-3 fs-5 fw-bold">
                <span>Grand Total:</span>
                <span className="text-orange">₹{grandTotal.toFixed(2)}</span>
              </div>

              {jobCard.status === 'Completed' ? (
                <Link to={`/billing/invoice/${jobCard._id}`} className="btn btn-warning w-100 text-dark fw-bold d-flex align-items-center justify-content-center gap-2 mt-3 shadow-sm border-0">
                  <FaPrint /> Print Invoice Receipt
                </Link>
              ) : (
                <div className="text-center small py-2 bg-white bg-opacity-10 rounded mt-3 text-white border border-light border-opacity-10">
                  Bill is generated upon service completion.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Mechanic Spare Part Request Modal */}
      <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy"><FaTools /> Request Spare Part</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRequestSubmit}>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Select Spare Part</Form.Label>
              <Form.Select 
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                required
              >
                <option value="">-- Choose Spare Part --</option>
                {availableParts.map(p => (
                  <option key={p._id} value={p._id} disabled={p.quantityAvailable <= 0}>
                    {p.partName} ({p.partNumber}) - ₹{p.sellingPrice} [{p.quantityAvailable <= 0 ? 'Out of Stock' : `${p.quantityAvailable} Avail.`}]
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Quantity Required</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={requestQty}
                onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Reason for Request (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Describe reason, e.g. Front pads fully worn out..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowRequestModal(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" className="btn-primary-custom border-0" disabled={submitting || !selectedPart}>
              {submitting ? <Spinner size="sm" animation="border" /> : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Return parts modal */}
      <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy"><FaUndo /> Return Unused Parts</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReturnSubmit}>
          <Modal.Body className="p-4">
            {selectedRequestToReturn && (
              <div>
                <p className="small text-muted mb-3">
                  Return unused parts for <strong>{selectedRequestToReturn.partId?.partName}</strong>. 
                  Issued Qty: {selectedRequestToReturn.issuedQuantity}, Returned Qty: {selectedRequestToReturn.returnedQuantity}.
                </p>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Quantity to Return</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max={selectedRequestToReturn.issuedQuantity - selectedRequestToReturn.returnedQuantity}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                  />
                </Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowReturnModal(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" className="btn-primary-custom border-0" disabled={submitting}>
              {submitting ? <Spinner size="sm" animation="border" /> : 'Submit Return'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
};

export default JobCardDetails;
