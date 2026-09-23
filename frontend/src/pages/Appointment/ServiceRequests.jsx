import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Form, InputGroup, Pagination, Row, Col } from 'react-bootstrap';
import { FaSearch, FaCheck, FaTimes, FaUserTie } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatDateIST } from '../../utils/dateUtils';

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [advisors, setAdvisors] = useState([]);
  const [selectedAdvisors, setSelectedAdvisors] = useState({});

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAppointments({
        page,
        keyword,
        status: statusFilter
      });
      setRequests(data.appointments);
      setPages(data.pages);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load service requests');
      setLoading(false);
    }
  };

  const fetchAdvisors = async () => {
    try {
      const data = await appointmentService.getServiceAdvisors();
      setAdvisors(data);
    } catch (error) {
      console.error('Failed to load service advisors', error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updateData = { status };
      
      // If approving and an advisor is selected, assign the advisor
      if (status === 'Approved' && selectedAdvisors[id]) {
        updateData.serviceAdvisor = selectedAdvisors[id];
      }

      await appointmentService.updateAppointment(id, updateData);
      if (status === 'Approved') {
        toast.success('Appointment approved and Job Card created successfully.');
      } else if (status === 'Cancelled') {
        toast.success('Appointment and linked Job Card cancelled successfully.');
      } else if (status === 'Completed') {
        toast.success('Appointment and linked Job Card marked as completed.');
      } else {
        toast.success(`Request ${status.toLowerCase()} successfully`);
      }
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
    }
  };

  const handleDelete = async (req) => {
    if (req.status !== 'Pending') {
      toast.warning('This appointment has already generated a Job Card and cannot be deleted.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this pending service request?')) {
      try {
        await appointmentService.deleteAppointment(req._id);
        toast.success('Service request deleted successfully');
        fetchRequests();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete service request');
      }
    }
  };

  const handleAdvisorSelect = (id, advisorId) => {
    setSelectedAdvisors(prev => ({ ...prev, [id]: advisorId }));
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return <Badge bg="success">{status}</Badge>;
      case 'Approved':
      case 'Confirmed': 
        return <Badge bg="primary">Approved</Badge>;
      case 'Pending': return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'Rejected':
      case 'Cancelled': 
        return <Badge bg="danger">Cancelled</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark mb-0">Manage Service Requests</h3>
      </div>

      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <Row className="g-3 mb-4">
          <Col md={6} lg={4}>
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  placeholder="Search customer, vehicle or service..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <Button type="submit" variant="outline-secondary">
                  <FaSearch />
                </Button>
              </InputGroup>
            </Form>
          </Col>
          <Col md={4} lg={3}>
            <Form.Select value={statusFilter} onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><LoadingSpinner /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <h5>No requests found</h5>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Description</th>
                    <th>Assign Advisor</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <div className="fw-bold">{formatDateIST(req.appointmentDate)}</div>
                      </td>
                      <td>
                        <div>{req.customer?.fullName}</div>
                        <small className="text-muted">{req.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <div className="fw-bold">{req.vehicle?.vehicleNumber}</div>
                        <small className="text-muted">{req.vehicle?.brand} {req.vehicle?.model}</small>
                      </td>
                      <td>{req.serviceType}</td>
                      <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{req.problemDescription}</td>
                      <td>
                        {req.status === 'Pending' ? (
                          <Form.Select 
                            size="sm" 
                            value={selectedAdvisors[req._id] || ''} 
                            onChange={(e) => handleAdvisorSelect(req._id, e.target.value)}
                          >
                            <option value="">Select Advisor</option>
                            {advisors.map(adv => (
                              <option key={adv._id} value={adv._id}>{adv.firstName} {adv.lastName}</option>
                            ))}
                          </Form.Select>
                        ) : (
                          req.serviceAdvisor ? `${req.serviceAdvisor.firstName} ${req.serviceAdvisor.lastName}` : 'N/A'
                        )}
                      </td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          {req.status === 'Pending' && (
                            <>
                              <Button 
                                variant="outline-success" 
                                size="sm" 
                                onClick={() => handleStatusChange(req._id, 'Approved')}
                                className="d-flex align-items-center gap-1"
                              >
                                <FaCheck /> Approve
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                onClick={() => handleStatusChange(req._id, 'Cancelled')}
                                className="d-flex align-items-center gap-1"
                              >
                                <FaTimes /> Reject
                              </Button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <>
                              <Button 
                                variant="outline-success" 
                                size="sm" 
                                onClick={() => handleStatusChange(req._id, 'Completed')}
                              >
                                Complete
                              </Button>
                              <Button 
                                variant="outline-warning" 
                                size="sm" 
                                onClick={() => handleStatusChange(req._id, 'Cancelled')}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                disabled
                                title="This appointment has already generated a Job Card and cannot be deleted."
                              >
                                Delete
                              </Button>
                            </>
                          )}
                          {(req.status === 'Cancelled' || req.status === 'Completed' || req.status === 'Rejected') && (
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              disabled
                              title="This appointment has already generated a Job Card and cannot be deleted."
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {pages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination>
                  {[...Array(pages).keys()].map((x) => (
                    <Pagination.Item
                      key={x + 1}
                      active={x + 1 === page}
                      onClick={() => setPage(x + 1)}
                    >
                      {x + 1}
                    </Pagination.Item>
                  ))}
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ServiceRequests;
