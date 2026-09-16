import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Form, InputGroup, Pagination, Card, Row, Col } from 'react-bootstrap';
import { FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaWalking, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { formatDateIST } from '../../utils/dateUtils';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAppointments({ 
        page, 
        keyword, 
        status: statusFilter 
      });
      setAppointments(data.appointments || []);
      setPages(data.pages || 1);
      setTotal(data.total || (data.appointments || []).length);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch appointments');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAppointments();
  };

  const handleDelete = async (apt) => {
    if (apt.status !== 'Pending') {
      toast.warning('This appointment has already generated a Job Card and cannot be deleted.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentService.deleteAppointment(apt._id);
        toast.success('Appointment deleted successfully');
        fetchAppointments();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete appointment');
      }
    }
  };

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Appointment Management"
        subtitle="Manage scheduled workshop appointments, inspect customer requests and assign mechanics"
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Workshop', path: '/appointments' },
          { label: 'Appointments' }
        ]}
        actions={
          <div className="d-flex gap-2">
            <Link to="/waiting-queue" className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm">
              <FaWalking /> <span>Waiting Queue</span>
            </Link>
            <Link to="/appointments/book" className="btn btn-orange d-flex align-items-center gap-2 shadow-sm">
              <FaPlus /> <span>Book Appointment</span>
            </Link>
          </div>
        }
      />

      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Body className="p-4">
          {/* Filters & Search Row */}
          <Row className="g-3 mb-4 align-items-center">
            <Col md={6} lg={4}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    placeholder="Search customer, vehicle, or phone..."
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
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved / Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Col>

            <Col className="text-md-end text-muted small">
              Showing <strong>{appointments.length}</strong> of <strong>{total}</strong> appointments
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><LoadingSpinner /></div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<FaCalendarAlt size={42} className="text-muted opacity-50" />}
              title="No appointments found"
              message="No appointments match the selected filter or search criteria."
              actionLabel="Book New Appointment"
              actionLink="/appointments/book"
            />
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="px-4">Date & Time</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Service Type</th>
                      <th>Assigned Mechanic</th>
                      <th>Status</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt._id}>
                        <td className="px-4">
                          <div className="fw-bold text-navy">{formatDateIST(apt.appointmentDate)}</div>
                          <small className="text-muted">{apt.preferredTime}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{apt.customer?.fullName || 'Walk-in Customer'}</div>
                          <small className="text-muted">{apt.customer?.mobileNumber}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{apt.vehicle?.vehicleNumber || 'Unregistered'}</div>
                          <small className="text-muted">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                        </td>
                        <td>
                          <span className="fw-medium text-navy">{apt.serviceType}</span>
                        </td>
                        <td>
                          {apt.assignedMechanic ? (
                            <span className="fw-semibold text-navy">{apt.assignedMechanic.fullName}</span>
                          ) : (
                            <span className="text-muted small fst-italic">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="text-end px-4">
                          <div className="d-flex justify-content-end gap-2">
                            <Link 
                              to={`/appointments/${apt._id}`} 
                              className="btn btn-sm btn-outline-secondary p-1"
                              title="View Details"
                            >
                              <FaEye size={13} />
                            </Link>
                            <Link 
                              to={`/appointments/edit/${apt._id}`} 
                              className="btn btn-sm btn-outline-primary p-1"
                              title="Edit Appointment"
                            >
                              <FaEdit size={13} />
                            </Link>
                            {apt.status === 'Pending' && (
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="p-1"
                                onClick={() => handleDelete(apt)}
                                title="Delete"
                              >
                                <FaTrash size={13} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <small className="text-muted">Page {page} of {pages}</small>
                  <Pagination className="mb-0">
                    <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                    {[...Array(pages).keys()].map(x => (
                      <Pagination.Item key={x + 1} active={x + 1 === page} onClick={() => setPage(x + 1)}>
                        {x + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={page === pages} onClick={() => setPage(p => p + 1)} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AppointmentList;
