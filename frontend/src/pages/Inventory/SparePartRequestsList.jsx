import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Badge, Button, Form, Row, Col, Modal, Spinner } from 'react-bootstrap';
import { 
  FaClipboardList, FaSearch, FaCheck, FaTimes, 
  FaInfoCircle, FaUndo, FaWarehouse, FaExclamationTriangle 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import sparePartRequestService from '../../services/sparePartRequestService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const SparePartRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [issueQty, setIssueQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async (currentPage = 1, search = keyword, status = statusFilter) => {
    try {
      setLoading(true);
      const data = await sparePartRequestService.getRequests(currentPage, 10, search, status);
      setRequests(data.requests || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch spare parts requests');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests(1, keyword, statusFilter);
  };

  const handleOpenIssue = (req) => {
    setSelectedRequest(req);
    setIssueQty(req.requestedQuantity);
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const availableStock = selectedRequest.partId?.quantityAvailable || 0;
    if (issueQty > availableStock) {
      toast.error('Insufficient Stock! Cannot issue more than available quantity.');
      return;
    }

    try {
      setSubmitting(true);
      await sparePartRequestService.issueRequest(selectedRequest._id, issueQty);
      toast.success(`Request ${selectedRequest.requestId} issued successfully`);
      setShowIssueModal(false);
      fetchRequests(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue parts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id, reqId) => {
    if (window.confirm(`Are you sure you want to reject request ${reqId}?`)) {
      try {
        await sparePartRequestService.rejectRequest(id);
        toast.success(`Request ${reqId} rejected`);
        fetchRequests(page);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to reject request');
      }
    }
  };

  const handleOpenReturn = (req) => {
    setSelectedRequest(req);
    setShowReturnModal(true);
  };

  const handleReturnApprove = async () => {
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      await sparePartRequestService.approveReturn(selectedRequest._id);
      toast.success(`Return request for ${selectedRequest.requestId} approved`);
      setShowReturnModal(false);
      fetchRequests(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnReject = async () => {
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      await sparePartRequestService.rejectReturn(selectedRequest._id);
      toast.success(`Return request for ${selectedRequest.requestId} rejected`);
      setShowReturnModal(false);
      fetchRequests(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = (req) => {
    setSelectedRequest(req);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge bg="warning" text="dark" className="px-2 py-1 rounded-pill fw-medium">Pending</Badge>;
      case 'Issued':
        return <Badge bg="success" className="px-2 py-1 rounded-pill fw-medium">Issued</Badge>;
      case 'Rejected':
        return <Badge bg="danger" className="px-2 py-1 rounded-pill fw-medium">Rejected</Badge>;
      case 'Pending Return':
        return <Badge bg="info" text="dark" className="px-2 py-1 rounded-pill fw-medium">Pending Return</Badge>;
      case 'Returned':
        return <Badge bg="primary" className="px-2 py-1 rounded-pill fw-medium">Returned</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1 rounded-pill fw-medium">{status}</Badge>;
    }
  };

  return (
    <div className="container-fluid p-0">
      
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-navy d-flex align-items-center gap-2">
          <FaClipboardList className="text-primary" /> Spare Parts Requests
        </h2>
        <p className="text-muted mb-0">Review and action spare parts requests submitted by mechanics.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <Form onSubmit={handleSearch}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by Job Card, Part Name, Mechanic, Customer..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </Col>
            
            <Col xs={12} sm={6} md={3}>
              <Form.Select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Issued">Issued</option>
                <option value="Rejected">Rejected</option>
                <option value="Pending Return">Pending Return</option>
                <option value="Returned">Returned</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} md={3} className="d-flex gap-2">
              <Button type="submit" className="btn btn-navy flex-grow-1">Search</Button>
              <Button variant="light" className="border" onClick={() => { setKeyword(''); setStatusFilter(''); setPage(1); fetchRequests(1, '', ''); }}>Clear</Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : requests.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaClipboardList size={48} className="mb-3 opacity-50" />
            <h5>No Spare Parts Requests Found</h5>
            <p>Mechanics can request parts from their Job Card details page.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 custom-table text-secondary small">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Request ID</th>
                  <th>Job Card Number</th>
                  <th>Customer</th>
                  <th>Mechanic</th>
                  <th>Part Name</th>
                  <th className="text-center">Quantity</th>
                  <th>Status</th>
                  <th>Request Date</th>
                  <th className="text-center pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  return (
                    <tr key={req._id}>
                      <td className="ps-4 py-3">
                        <span className="fw-bold text-navy font-monospace">{req.requestId}</span>
                      </td>
                      <td>
                        <Link to={`/job-cards/${req.jobCardId?._id}`} className="fw-bold text-decoration-none text-primary">
                          {req.jobCardId?.jobNumber || 'Deleted'}
                        </Link>
                      </td>
                      <td>
                        <span className="fw-medium text-dark">{req.customerId?.fullName || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="fw-medium text-dark">{req.mechanicId?.fullName || 'N/A'}</span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{req.partId?.partName || 'Part Deleted'}</div>
                        <div className="small font-monospace text-muted">{req.partId?.partNumber || 'PART-N/A'}</div>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-dark">{req.requestedQuantity}</span>
                      </td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                      <td className="pe-4 text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="d-flex align-items-center gap-1" 
                            title="View Details"
                            onClick={() => handleOpenDetails(req)}
                          >
                            <FaInfoCircle size={12} /> <span>Details</span>
                          </Button>
                          
                          {req.status === 'Pending' && (
                            <>
                              <Button 
                                variant="success" 
                                size="sm" 
                                className="d-flex align-items-center gap-1" 
                                title="Issue Parts"
                                onClick={() => handleOpenIssue(req)}
                                disabled={(req.partId?.quantityAvailable || 0) <= 0}
                              >
                                <FaCheck size={12} /> <span>Issue</span>
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="d-flex align-items-center gap-1" 
                                title="Reject Request"
                                onClick={() => handleReject(req._id, req.requestId)}
                              >
                                <FaTimes size={12} /> <span>Reject</span>
                              </Button>
                            </>
                          )}

                          {req.status === 'Pending Return' && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="d-flex align-items-center gap-1" 
                              title="Process Return"
                              onClick={() => handleOpenReturn(req)}
                            >
                              <FaUndo size={12} /> <span>Process Return</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination pagination-sm">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <Button className="page-link" onClick={() => fetchRequests(page - 1)} disabled={page === 1}>Previous</Button>
              </li>
              {[...Array(pages).keys()].map(x => (
                <li key={x + 1} className={`page-item ${x + 1 === page ? 'active' : ''}`}>
                  <Button className="page-link" onClick={() => fetchRequests(x + 1)}>{x + 1}</Button>
                </li>
              ))}
              <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                <Button className="page-link" onClick={() => fetchRequests(page + 1)} disabled={page === pages}>Next</Button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Issue Modal */}
      <Modal show={showIssueModal} onHide={() => setShowIssueModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy"><FaWarehouse /> Issue Spare Parts</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleIssueSubmit}>
          <Modal.Body className="p-4">
            {selectedRequest && (
              <div>
                <div className="mb-3">
                  <strong>Request:</strong> {selectedRequest.requestId} for Job Card {selectedRequest.jobCardId?.jobNumber}<br/>
                  <strong>Spare Part:</strong> {selectedRequest.partId?.partName} ({selectedRequest.partId?.partNumber})<br/>
                  <strong>Available Stock:</strong> <span className="fw-bold text-success">{selectedRequest.partId?.quantityAvailable} Units</span>
                </div>
                
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Quantity to Issue <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max={selectedRequest.partId?.quantityAvailable}
                    value={issueQty}
                    onChange={(e) => setIssueQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                  />
                  {(selectedRequest.partId?.quantityAvailable || 0) < issueQty && (
                    <div className="text-danger mt-2 small d-flex align-items-center gap-1">
                      <FaExclamationTriangle /> Insufficient Stock
                    </div>
                  )}
                </Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowIssueModal(false)} disabled={submitting}>Cancel</Button>
            <Button 
              type="submit" 
              className="btn-primary-custom border-0" 
              disabled={submitting || issueQty > (selectedRequest?.partId?.quantityAvailable || 0)}
            >
              {submitting ? <Spinner size="sm" animation="border" /> : 'Issue Parts'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Return Modal */}
      <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy"><FaUndo /> Approve Return Request</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedRequest && (
            <div>
              <p>
                Mechanic <strong>{selectedRequest.mechanicId?.fullName}</strong> wishes to return <strong>{selectedRequest.returnPendingQuantity}</strong> unused unit(s) of <strong>{selectedRequest.partId?.partName}</strong> for Job Card <strong>{selectedRequest.jobCardId?.jobNumber}</strong>.
              </p>
              <p className="text-muted small">
                Upon approval, this quantity will be automatically added back to the active inventory and logged to Stock History.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light d-flex justify-content-between">
          <Button variant="danger" onClick={handleReturnReject} disabled={submitting}>
            Reject Return
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => setShowReturnModal(false)} disabled={submitting}>Cancel</Button>
            <Button className="btn-primary-custom border-0" onClick={handleReturnApprove} disabled={submitting}>
              {submitting ? <Spinner size="sm" animation="border" /> : 'Approve Return'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy">Request Information details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 small">
          {selectedRequest && (
            <Row className="g-3">
              <Col xs={6}>
                <div className="text-muted">Request ID</div>
                <div className="fw-bold">{selectedRequest.requestId}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted">Job Card No</div>
                <div className="fw-bold">{selectedRequest.jobCardId?.jobNumber}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted">Mechanic</div>
                <div className="fw-bold">{selectedRequest.mechanicId?.fullName}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted">Customer</div>
                <div className="fw-bold">{selectedRequest.customerId?.fullName}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted">Vehicle</div>
                <div className="fw-bold">{selectedRequest.vehicleId?.brand} {selectedRequest.vehicleId?.model} ({selectedRequest.vehicleId?.vehicleNumber})</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted">Part Name</div>
                <div className="fw-bold">{selectedRequest.partId?.partName} ({selectedRequest.partId?.partNumber})</div>
              </Col>
              <Col xs={4}>
                <div className="text-muted">Requested Qty</div>
                <div className="fw-bold">{selectedRequest.requestedQuantity}</div>
              </Col>
              <Col xs={4}>
                <div className="text-muted">Issued Qty</div>
                <div className="fw-bold text-success">{selectedRequest.issuedQuantity}</div>
              </Col>
              <Col xs={4}>
                <div className="text-muted">Returned Qty</div>
                <div className="fw-bold text-primary">{selectedRequest.returnedQuantity}</div>
              </Col>
              <Col xs={12}>
                <div className="text-muted">Mechanic's Reason Comment</div>
                <div className="p-2 bg-light rounded text-dark italic">{selectedRequest.reason || 'No comments provided.'}</div>
              </Col>
              <Col xs={12} className="border-top pt-2">
                <div className="text-muted">Audit logs</div>
                <div>Requested At: {new Date(selectedRequest.requestedAt).toLocaleString()}</div>
                {selectedRequest.issuedAt && (
                  <div>Issued At: {new Date(selectedRequest.issuedAt).toLocaleString()}</div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SparePartRequestsList;
