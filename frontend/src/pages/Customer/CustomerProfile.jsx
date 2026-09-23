import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { getCustomerById } from '../../services/customerService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { 
  FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCar, FaPlus, 
  FaEye, FaHistory, FaCalendarCheck, FaShieldAlt, FaFileInvoiceDollar, 
  FaWrench, FaEdit 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatDateIST } from '../../utils/dateUtils';

const CustomerProfile = () => {
  const { id } = useParams();
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const data = await getCustomerById(id);
        setCustomerData(data);
        setLoading(false);
      } catch (error) {
        toast.error('Error loading customer profile');
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!customerData) return <div className="text-center mt-5">Customer profile not found</div>;

  const { customer, vehicles = [], jobCards = [], appointments = [] } = customerData;

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title={`Customer Profile &bull; ${customer.fullName}`}
        subtitle="Complete customer history connecting vehicles, appointments, repair job cards, and invoices"
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Customers', path: '/customers' },
          { label: customer.fullName }
        ]}
        actions={
          <div className="d-flex gap-2">
            <Link to={`/vehicles/add?customerId=${customer._id}`} className="btn btn-orange d-flex align-items-center gap-1.5 shadow-sm">
              <FaPlus /> <span>Add Vehicle</span>
            </Link>
            <Link to={`/customers/edit/${customer._id}`} className="btn btn-outline-secondary d-flex align-items-center gap-1.5">
              <FaEdit /> <span>Edit Profile</span>
            </Link>
          </div>
        }
      />

      {/* Row 1: Profile Details & Registered Vehicles */}
      <Row className="g-4 mb-4">
        {/* Customer Identity Card */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Body className="p-4 text-center">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 text-white fw-bold shadow-sm"
                style={{ width: '80px', height: '80px', backgroundColor: 'var(--navy-primary)', fontSize: '1.75rem' }}
              >
                {customer.fullName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <h4 className="fw-bold mb-1 text-navy">{customer.fullName}</h4>
              <p className="text-muted small mb-2">Customer ID: <span className="fw-semibold">{customer.customerId || '-'}</span></p>
              <StatusBadge status={customer.status || 'Active'} />

              <hr className="my-3 opacity-25" />

              <div className="text-start">
                <div className="mb-3 d-flex align-items-center gap-3">
                  <div className="p-2 bg-orange bg-opacity-10 text-orange rounded">
                    <FaPhone size={15} />
                  </div>
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: '0.725rem' }}>Phone Number</small>
                    <span className="fw-semibold text-dark">{customer.mobileNumber}</span>
                  </div>
                </div>

                <div className="mb-3 d-flex align-items-center gap-3">
                  <div className="p-2 bg-primary bg-opacity-10 text-primary rounded">
                    <FaEnvelope size={15} />
                  </div>
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: '0.725rem' }}>Email Address</small>
                    <span className="fw-semibold text-dark">{customer.emailAddress || 'Not provided'}</span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="p-2 bg-secondary bg-opacity-10 text-secondary rounded mt-1">
                    <FaMapMarkerAlt size={15} />
                  </div>
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: '0.725rem' }}>Registered Address</small>
                    <span className="fw-semibold text-dark d-block">{customer.address || 'N/A'}</span>
                    <small className="text-muted">{customer.city}, {customer.state} {customer.pincode ? `- ${customer.pincode}` : ''}</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Registered Vehicles Grid */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaCar className="text-orange" />
                <h5 className="fw-bold mb-0 text-navy">Registered Vehicles ({vehicles.length})</h5>
              </div>
              <Link to={`/vehicles/add?customerId=${customer._id}`} className="btn btn-sm btn-outline-orange">
                <FaPlus size={10} className="me-1" /> Add Vehicle
              </Link>
            </Card.Header>
            <Card.Body className="p-4">
              {vehicles.length === 0 ? (
                <EmptyState
                  icon={<FaCar size={40} className="text-muted opacity-50" />}
                  title="No vehicles linked"
                  message="No vehicles registered for this customer yet."
                  actionLabel="Register Vehicle"
                  actionLink={`/vehicles/add?customerId=${customer._id}`}
                />
              ) : (
                <Row className="g-3">
                  {vehicles.map(vehicle => (
                    <Col xs={12} md={6} key={vehicle._id}>
                      <div className="p-3 rounded border bg-light bg-opacity-50 h-100 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold text-navy mb-0">{vehicle.vehicleNumber}</h6>
                            <span className="badge bg-white text-dark border small">{vehicle.fuelType || 'Petrol'}</span>
                          </div>
                          <p className="text-muted small mb-2">{vehicle.brand} {vehicle.model} {vehicle.manufacturingYear ? `(${vehicle.manufacturingYear})` : ''}</p>
                          <small className="text-muted d-block mb-3">
                            Odometer: <strong>{vehicle.currentOdometerReading || '--'} km</strong>
                          </small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          <small className="text-muted">Added: {new Date(vehicle.createdAt).toLocaleDateString()}</small>
                          <Link to={`/vehicles/${vehicle._id}`} className="btn btn-sm btn-outline-primary py-1 px-2.5">
                            <FaEye className="me-1" /> Details
                          </Link>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Service History & Job Cards */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex align-items-center gap-2">
          <FaHistory className="text-orange" />
          <h5 className="fw-bold mb-0 text-navy">Service History & Repair Work Orders ({jobCards.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {jobCards.length === 0 ? (
            <EmptyState
              icon={<FaWrench size={38} className="text-muted opacity-50" />}
              title="No service records"
              message="No job cards or repair records found for this customer."
            />
          ) : (
            <div className="table-responsive border-0 rounded-0">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th className="px-4">Job No.</th>
                    <th>Date</th>
                    <th>Assigned Mechanic</th>
                    <th>Reported Issue</th>
                    <th>Parts Consumed</th>
                    <th>Status</th>
                    <th className="text-end px-4">Invoice</th>
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
                      <td>{formatDateIST(jc.createdAt)}</td>
                      <td>{jc.assignedMechanic?.fullName || <span className="text-muted small fst-italic">Unassigned</span>}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '220px' }} title={jc.complaint || jc.workDescription}>
                          {jc.complaint || jc.workDescription || 'Standard service'}
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-navy">
                          {jc.partsUsed?.length ? `${jc.partsUsed.length} item(s)` : 'None'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={jc.status} />
                      </td>
                      <td className="text-end px-4">
                        {jc.status === 'Completed' || jc.status === 'Delivered' ? (
                          <Link to={`/billing/invoice/${jc._id}`} className="btn btn-sm btn-outline-success py-1 px-2.5">
                            <FaFileInvoiceDollar className="me-1" /> Invoice
                          </Link>
                        ) : (
                          <span className="text-muted small">In Service</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Row 3: Appointments Log */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex align-items-center gap-2">
          <FaCalendarCheck className="text-primary" />
          <h5 className="fw-bold mb-0 text-navy">Appointments & Booking Requests ({appointments.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {appointments.length === 0 ? (
            <EmptyState
              icon={<FaCalendarCheck size={38} className="text-muted opacity-50" />}
              title="No appointments scheduled"
              message="No upcoming or past appointment booking records found."
            />
          ) : (
            <div className="table-responsive border-0 rounded-0">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th className="px-4">Appointment Date</th>
                    <th>Time Slot</th>
                    <th>Service Type</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt._id}>
                      <td className="px-4 fw-semibold text-navy">{formatDateIST(apt.appointmentDate)}</td>
                      <td>{apt.preferredTime || '09:00 AM'}</td>
                      <td>{apt.serviceType}</td>
                      <td>{apt.vehicle?.vehicleNumber || 'Unregistered'}</td>
                      <td><StatusBadge status={apt.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default CustomerProfile;
