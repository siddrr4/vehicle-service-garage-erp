import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Badge, Button, Form, InputGroup, Pagination } from 'react-bootstrap';
import { FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaCheckCircle, FaClock, FaTools, FaTimesCircle, FaCalendarCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
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
      setAppointments(data.appointments);
      setPages(data.pages);
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return <Badge bg="success"><FaCheckCircle className="me-1"/> {status}</Badge>;
      case 'Approved':
      case 'Confirmed': return <Badge bg="primary"><FaCheckCircle className="me-1"/> Approved</Badge>;
      case 'Pending': return <Badge bg="warning" text="dark"><FaClock className="me-1"/> {status}</Badge>;
      case 'In Progress': return <Badge bg="info"><FaTools className="me-1"/> {status}</Badge>;
      case 'Cancelled':
      case 'Rejected': return <Badge bg="danger"><FaTimesCircle className="me-1"/> Cancelled</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (loading && appointments.length === 0) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark mb-0">View Appointments</h3>
        <Link to="/appointments/book" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <FaPlus /> <span>New Appointment</span>
        </Link>
      </div>

      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-lg-4">
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
          </div>
          <div className="col-md-4 col-lg-3">
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
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><LoadingSpinner /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaCalendarCheck size={48} className="mb-3 opacity-50" />
            <h5>No appointments found</h5>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt._id}>
                      <td>
                        <div className="fw-bold">{new Date(apt.appointmentDate).toLocaleDateString()}</div>
                        <small className="text-muted">{apt.preferredTime}</small>
                      </td>
                      <td>
                        <div>{apt.customer?.fullName}</div>
                        <small className="text-muted">{apt.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <div className="fw-bold">{apt.vehicle?.vehicleNumber}</div>
                        <small className="text-muted">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                      </td>
                      <td>{apt.serviceType}</td>
                      <td>{getStatusBadge(apt.status)}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Link to={`/appointments/${apt._id}`} className="btn btn-sm btn-outline-info" title="View Details">
                            <FaEye />
                          </Link>
                          {apt.status === 'Pending' ? (
                            <>
                              <Link to={`/appointments/edit/${apt._id}`} className="btn btn-sm btn-outline-primary" title="Edit Appointment">
                                <FaEdit />
                              </Link>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(apt)} title="Delete Appointment">
                                <FaTrash />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                disabled
                                title="Editing is disabled for non-pending appointments"
                              >
                                <FaEdit />
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleDelete(apt)}
                                title="This appointment has already generated a Job Card and cannot be deleted."
                              >
                                <FaTrash />
                              </Button>
                            </>
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

export default AppointmentList;
