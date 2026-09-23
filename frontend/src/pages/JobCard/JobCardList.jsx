import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Form, InputGroup, Pagination, Card, Row, Col } from 'react-bootstrap';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaFilter, FaUserPlus, FaWrench, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jobCardService from '../../services/jobCardService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import AssignMechanicModal from './AssignMechanicModal';
import PageHeader from '../../components/UI/PageHeader';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { formatDateIST } from '../../utils/dateUtils';

const JobCardList = () => {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Assign Mechanic Modal State
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchJobCards = async (currentPage = 1, search = keyword, status = statusFilter) => {
    try {
      setLoading(true);
      const data = await jobCardService.getJobCards(currentPage, 10, search, status);
      setJobCards(data.jobCards || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || (data.jobCards || []).length);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch job cards');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobCards(1, keyword, statusFilter);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
    fetchJobCards(1, keyword, e.target.value);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job card?')) {
      try {
        await jobCardService.deleteJobCard(id);
        toast.success('Job card deleted successfully');
        fetchJobCards(page);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete job card');
      }
    }
  };

  const openAssignModal = (jobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignModal(true);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'text-danger fw-bold';
      case 'Medium': return 'text-warning fw-bold';
      case 'Low': return 'text-info fw-bold';
      default: return 'text-muted';
    }
  };

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Workshop Job Cards"
        subtitle="Manage garage work orders, technician bay assignments, and repair lifecycles"
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Workshop', path: '/job-cards' },
          { label: 'Job Cards' }
        ]}
        actions={
          <Link to="/job-cards/add" className="btn btn-orange d-flex align-items-center gap-2 shadow-sm">
            <FaPlus /> <span>New Job Card</span>
          </Link>
        }
      />

      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Body className="p-4">
          <Row className="g-3 mb-4 align-items-center">
            <Col md={6} lg={4}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    placeholder="Search by Job Card number, complaint..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <Button type="submit" variant="outline-secondary">
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select value={statusFilter} onChange={handleStatusChange}>
                <option value="">All Statuses</option>
                <option value="Pending">Open / Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Parts">Waiting for Parts</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Col>

            <Col className="text-md-end text-muted small">
              Showing <strong>{jobCards.length}</strong> of <strong>{total}</strong> job cards
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><LoadingSpinner /></div>
          ) : jobCards.length === 0 ? (
            <EmptyState
              icon={<FaWrench size={42} className="text-muted opacity-50" />}
              title="No job cards found"
              message="No job cards match your current search or status filter."
              actionLabel="Create Job Card"
              actionLink="/job-cards/add"
            />
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="px-4">Job No.</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Assigned Mechanic</th>
                      <th>Priority</th>
                      <th>Created Date</th>
                      <th>Status</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCards.map((jc) => (
                      <tr key={jc._id}>
                        <td className="px-4">
                          <Link to={`/job-cards/${jc._id}`} className="fw-bold text-navy text-decoration-none">
                            {jc.jobNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{jc.customer?.fullName || 'Walk-in'}</div>
                          <small className="text-muted">{jc.customer?.mobileNumber}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{jc.vehicle?.vehicleNumber}</div>
                          <small className="text-muted">{jc.vehicle?.brand} {jc.vehicle?.model}</small>
                        </td>
                        <td>
                          {jc.assignedMechanic ? (
                            <div>
                              <div className="fw-semibold text-navy d-flex align-items-center gap-1">
                                <FaWrench size={11} className="text-orange" /> {jc.assignedMechanic.fullName}
                              </div>
                              <small className="text-muted">
                                {jc.assignedMechanic.specialization || 'Mechanic'}
                              </small>
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-secondary bg-opacity-10 text-secondary border">Unassigned</span>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="py-0.5 px-2"
                                onClick={() => openAssignModal(jc)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                <FaUserPlus size={10} className="me-1" /> Assign
                              </Button>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={getPriorityBadgeClass(jc.priority)} style={{ fontSize: '0.825rem' }}>
                            {jc.priority}
                          </span>
                        </td>
                        <td className="text-muted small">
                          {formatDateIST(jc.createdAt)}
                        </td>
                        <td>
                          <StatusBadge status={jc.status} />
                        </td>
                        <td className="text-end px-4">
                          <div className="d-flex gap-1 justify-content-end">
                            <Link to={`/job-cards/${jc._id}`} className="btn btn-sm btn-outline-secondary p-1" title="View Details">
                              <FaEye size={13} />
                            </Link>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="p-1"
                              onClick={() => openAssignModal(jc)}
                              title="Assign Mechanic"
                            >
                              <FaUserPlus size={13} />
                            </Button>
                            <Link to={`/job-cards/edit/${jc._id}`} className="btn btn-sm btn-outline-primary p-1" title="Edit Job Card">
                              <FaEdit size={13} />
                            </Link>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="p-1"
                              onClick={() => handleDelete(jc._id)}
                              title="Delete Job Card"
                            >
                              <FaTrash size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <small className="text-muted">Page {page} of {pages}</small>
                  <Pagination className="mb-0">
                    <Pagination.Prev disabled={page === 1} onClick={() => fetchJobCards(page - 1)} />
                    {[...Array(pages).keys()].map(x => (
                      <Pagination.Item key={x + 1} active={x + 1 === page} onClick={() => fetchJobCards(x + 1)}>
                        {x + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={page === pages} onClick={() => fetchJobCards(page + 1)} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Assign Mechanic Modal */}
      <AssignMechanicModal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        jobCard={selectedJobCard}
        onSuccess={() => fetchJobCards(page)}
      />
    </div>
  );
};

export default JobCardList;
