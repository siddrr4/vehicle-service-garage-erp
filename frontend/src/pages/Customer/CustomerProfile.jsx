import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomerById } from '../../services/customerService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCar, FaPlus, FaEye, FaHistory, FaCalendarCheck, FaShieldAlt, FaFileContract } from 'react-icons/fa';
import { toast } from 'react-toastify';

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
  if (!customerData) return <div className="text-center mt-5">Customer not found</div>;

  const { customer, vehicles = [], jobCards = [], appointments = [] } = customerData;

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin-dashboard">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Profile</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-navy fw-bold m-0">Customer Profile</h2>
        <Link to={`/customers/edit/${customer._id}`} className="btn btn-outline-primary">
          Edit Customer
        </Link>
      </div>

      {/* Row 1: Profile & Vehicles */}
      <div className="row g-4">
        {/* Customer Details Card */}
        <div className="col-lg-4">
          <div className="bg-card p-4 h-100 shadow-sm border-0">
            <div className="text-center mb-4">
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '100px', height: '100px' }}>
                <FaUser size={40} className="text-muted" />
              </div>
              <h4 className="fw-bold m-0 text-navy">{customer.fullName}</h4>
              <p className="text-muted small mb-2">ID: {customer.customerId || '-'}</p>
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3">Active Customer</span>
            </div>
            
            <hr className="opacity-25" />
            
            <ul className="list-unstyled mt-4">
              <li className="mb-3 d-flex align-items-center gap-3">
                <div className="text-orange bg-orange bg-opacity-10 p-2 rounded"><FaPhone size={18} /></div>
                <div>
                  <small className="text-muted d-block lh-1">Phone</small>
                  <span className="fw-medium">{customer.mobileNumber}</span>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-center gap-3">
                <div className="text-orange bg-orange bg-opacity-10 p-2 rounded"><FaEnvelope size={18} /></div>
                <div>
                  <small className="text-muted d-block lh-1">Email</small>
                  <span className="fw-medium">{customer.emailAddress || 'N/A'}</span>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-3">
                <div className="text-orange bg-orange bg-opacity-10 p-2 rounded"><FaMapMarkerAlt size={18} /></div>
                <div>
                  <small className="text-muted d-block lh-1 mb-1">Address</small>
                  <span className="fw-medium d-block">{customer.address}</span>
                  <span className="fw-medium text-muted small">{customer.city}, {customer.state} - {customer.pincode}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Registered Vehicles */}
        <div className="col-lg-8">
          <div className="bg-card p-4 h-100 shadow-sm border-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 d-flex align-items-center gap-2 text-navy">
                <FaCar className="text-orange" /> Registered Vehicles
              </h5>
              <Link to={`/vehicles/add?customerId=${customer._id}`} className="btn btn-sm btn-orange d-flex align-items-center gap-2">
                <FaPlus /> Add Vehicle
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-5 bg-light rounded border border-dashed">
                <FaCar size={40} className="text-muted mb-3 opacity-50" />
                <p className="text-muted mb-0">No vehicles registered for this customer yet.</p>
              </div>
            ) : (
              <div className="row g-3">
                {vehicles.map(vehicle => (
                  <div key={vehicle._id} className="col-md-6">
                    <div className="card h-100 border bg-light bg-opacity-50">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-bold mb-0 text-navy">{vehicle.vehicleNumber}</h6>
                          <span className="badge bg-white text-dark border">{vehicle.fuelType}</span>
                        </div>
                        <p className="text-muted mb-3">{vehicle.brand} {vehicle.model} <span className="small">({vehicle.manufacturingYear})</span></p>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">Added: {new Date(vehicle.createdAt).toLocaleDateString()}</small>
                          <Link to={`/vehicles/${vehicle._id}`} className="btn btn-sm btn-outline-primary py-1 px-2">
                            <FaEye /> Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Service History & Extras */}
      <div className="row g-4 mt-1">
        {/* Service History */}
        <div className="col-lg-8">
          <div className="bg-card p-4 h-100 shadow-sm border-0">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-navy">
              <FaHistory className="text-orange" /> Service History
            </h5>
            {jobCards.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No service history found for this customer.</p>
            ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle border small">
                <thead className="table-light text-muted text-uppercase small">
                  <tr>
                    <th>Job No.</th>
                    <th>Date</th>
                    <th>Mechanic</th>
                    <th>Work Performed</th>
                    <th>Spare Parts Used</th>
                    <th>Total Parts Cost</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCards.map((jc) => {
                    const totalPartsCost = jc.partsUsed 
                      ? jc.partsUsed.reduce((sum, p) => sum + (p.sellingPrice * p.quantity * (1 + p.gstPercent / 100)), 0) 
                      : 0;
                    return (
                      <tr key={jc._id}>
                        <td className="fw-bold">
                          <Link to={`/job-cards/${jc._id}`} className="text-decoration-none text-primary">
                            {jc.jobNumber}
                          </Link>
                        </td>
                        <td>{new Date(jc.createdAt).toLocaleDateString()}</td>
                        <td>{jc.assignedMechanic?.fullName || <span className="text-muted small text-secondary">Not Assigned</span>}</td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '150px' }} title={jc.workDescription || jc.complaint}>
                            {jc.workDescription || jc.complaint}
                          </div>
                        </td>
                        <td>
                          {jc.partsUsed && jc.partsUsed.length > 0 ? (
                            <ul className="list-unstyled mb-0 px-0">
                              {jc.partsUsed.map((p, idx) => (
                                <li key={idx} className="small">
                                  • {p.part?.partName || 'Part'} (x{p.quantity})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted small text-secondary">None</span>
                          )}
                        </td>
                        <td className="fw-semibold text-navy">₹{totalPartsCost.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${jc.status === 'Completed' ? 'bg-success' : 'bg-info'} px-2 py-1 rounded-pill`}>
                            {jc.status}
                          </span>
                        </td>
                        <td>
                          {jc.status === 'Completed' ? (
                            <Link to={`/billing/invoice/${jc._id}`} className="btn btn-sm btn-outline-success py-0.5 px-2">
                              Invoice
                            </Link>
                          ) : (
                            <span className="text-muted small text-secondary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

        {/* Reminders & Cards */}
        <div className="col-lg-4">
          <div className="row g-4">
            {/* Upcoming Reminders */}
            <div className="col-12">
              <div className="bg-card p-4 shadow-sm border-0 border-start border-4 border-warning">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-navy">
                  <FaCalendarCheck className="text-warning" /> Appointments
                </h6>
                <div className="d-flex flex-column gap-2">
                  {appointments.length === 0 ? (
                    <p className="text-muted small text-center py-2 mb-0">No appointments recorded.</p>
                  ) : (
                    appointments.map((apt) => (
                      <div key={apt._id} className="p-3 bg-light rounded d-flex justify-content-between align-items-center border">
                        <div>
                          <strong className="d-block text-dark">{apt.serviceType}</strong>
                          <small className="text-muted">{apt.vehicle?.vehicleNumber || 'Vehicle'} • {new Date(apt.appointmentDate).toLocaleDateString()}</small>
                        </div>
                        <span className="badge bg-primary">{apt.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Insurance & Warranty Cards */}
            <div className="col-12">
              <div className="bg-card p-4 shadow-sm border-0">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-navy">
                  <FaShieldAlt className="text-primary" /> Insurance & Warranty Reminders
                </h6>
                
                <div className="mb-3 p-3 border rounded bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FaShieldAlt className="text-success" /> <strong className="text-dark">Active Insurance</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Policy: LIC-98765432</span>
                    <span className="text-success small fw-medium">Valid till: Dec 2024</span>
                  </div>
                </div>

                <div className="p-3 border rounded bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FaFileContract className="text-info" /> <strong className="text-dark">Extended Warranty</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Plan: Gold Plus</span>
                    <span className="text-info small fw-medium">Valid till: Mar 2025</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
