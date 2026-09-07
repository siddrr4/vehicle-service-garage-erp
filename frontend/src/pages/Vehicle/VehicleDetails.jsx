import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getVehicleById, deleteVehicle } from '../../services/vehicleService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  FaCar, FaUser, FaShieldAlt, FaTools, FaFileInvoice,
  FaExclamationTriangle, FaEdit, FaTrash, FaCheckCircle,
  FaTachometerAlt, FaCalendarAlt, FaCog, FaGasPump,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import serviceHistoryService from '../../services/serviceHistoryService';

/** Format a date string for display */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

/** Returns days until the given date (negative = already expired) */
const daysFromNow = (dateString) => {
  if (!dateString) return null;
  const diff = new Date(dateString) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const StatusBadge = ({ expiryDate, label }) => {
  if (!expiryDate) {
    return <span className="badge bg-secondary">Not Provided</span>;
  }
  const days = daysFromNow(expiryDate);
  if (days < 0) return <span className="badge bg-danger">Expired</span>;
  if (days <= 30) return <span className="badge bg-warning text-dark">Expiring in {days} days</span>;
  return <span className="badge bg-success">Active</span>;
};

const InfoRow = ({ label, value, icon }) => (
  <div className="col-md-6 col-lg-4">
    <div className="d-flex align-items-start gap-2">
      {icon && <span className="text-muted mt-1" style={{ minWidth: 16 }}>{icon}</span>}
      <div>
        <small className="text-muted d-block fw-medium">{label}</small>
        <span className="fw-semibold text-dark">{value || 'N/A'}</span>
      </div>
    </div>
  </div>
);

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const vehicleData = await getVehicleById(id);
        setVehicle(vehicleData);
        
        try {
          const historyData = await serviceHistoryService.getVehicleServiceHistory(id);
          setHistory(historyData);
        } catch (hErr) {
          console.error("Failed to load history", hErr);
        }
      } catch (error) {
        toast.error('Error loading vehicle details');
        navigate('/vehicles');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete vehicle ${vehicle?.vehicleNumber}? This cannot be undone.`)) {
      try {
        setDeleting(true);
        await deleteVehicle(id);
        toast.success('Vehicle deleted successfully');
        navigate('/vehicles');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting vehicle');
        setDeleting(false);
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!vehicle) {
    return (
      <div className="text-center mt-5 py-5">
        <FaCar size={50} className="text-muted mb-3" />
        <h4 className="text-muted">Vehicle not found</h4>
        <Link to="/vehicles" className="btn btn-orange mt-3">Back to Vehicles</Link>
      </div>
    );
  }

  const insuranceDays = daysFromNow(vehicle.insuranceExpiryDate);
  const warrantyDays = daysFromNow(vehicle.warrantyExpiryDate);

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/admin-dashboard">Home</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/vehicles">Vehicles</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {vehicle.vehicleNumber}
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-navy rounded-3 p-3 d-flex align-items-center justify-content-center">
            <FaCar className="text-orange" size={28} />
          </div>
          <div>
            <h2 className="text-navy fw-bold mb-0">{vehicle.vehicleNumber}</h2>
            <p className="text-muted mb-0">
              {vehicle.brand} {vehicle.model} &bull; {vehicle.manufacturingYear}
            </p>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link
            to={`/vehicles/edit/${vehicle._id}`}
            id="btn-edit-vehicle"
            className="btn btn-orange d-flex align-items-center gap-2 shadow-sm"
          >
            <FaEdit /> Edit Vehicle
          </Link>
          <button
            id="btn-delete-vehicle"
            className="btn btn-outline-danger d-flex align-items-center gap-2"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <FaTrash />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Quick Status Badges */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        <span className="badge bg-primary bg-opacity-10 text-primary border fw-normal px-3 py-2">
          <FaGasPump className="me-1" /> {vehicle.fuelType}
        </span>
        <span className="badge bg-secondary bg-opacity-10 text-secondary border fw-normal px-3 py-2">
          <FaCog className="me-1" /> {vehicle.transmission}
        </span>
        <span className="badge bg-info bg-opacity-10 text-info border fw-normal px-3 py-2">
          <FaTachometerAlt className="me-1" /> {vehicle.currentOdometerReading?.toLocaleString()} km
        </span>
        <span className={`badge border fw-normal px-3 py-2 ${vehicle.purchaseType === 'New' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
          <FaCar className="me-1" /> {vehicle.purchaseType === 'New' ? 'New Vehicle' : 'Used Vehicle'}
        </span>
        <StatusBadge expiryDate={vehicle.insuranceExpiryDate} label="Insurance" />
      </div>

      <div className="row g-4">
        {/* ── Left Column (wider) ── */}
        <div className="col-lg-8">
          {/* Vehicle Information Card */}
          <div className="bg-card p-4 mb-4">
            <h5 className="fw-bold mb-4 border-bottom pb-2 d-flex align-items-center gap-2">
              <FaCar className="text-orange" /> Vehicle Information
            </h5>
            <div className="row g-4">
              <InfoRow
                label="Make &amp; Model"
                value={`${vehicle.brand} ${vehicle.model}`}
              />
              <InfoRow label="Manufacturing Year" value={vehicle.manufacturingYear} />
              <InfoRow label="Fuel Type" value={vehicle.fuelType} />
              <InfoRow label="Transmission" value={vehicle.transmission} />
              <InfoRow
                label="Odometer Reading"
                value={`${vehicle.currentOdometerReading?.toLocaleString()} km`}
                icon={<FaTachometerAlt />}
              />
              <InfoRow
                label="Registration Date"
                value={formatDate(vehicle.registrationDate)}
                icon={<FaCalendarAlt />}
              />
              <InfoRow
                label="Engine Number"
                value={vehicle.engineNumber || 'N/A'}
              />
              <InfoRow
                label="Chassis / VIN"
                value={vehicle.chassisNumber || 'N/A'}
              />
            </div>
          </div>

          {vehicle.purchaseType === 'New' && (
            <div className="bg-card p-4 mb-4 border border-info border-opacity-25 shadow-sm">
              <h5 className="fw-bold mb-4 border-bottom pb-2 d-flex align-items-center gap-2 text-navy">
                <FaCheckCircle className="text-success" /> Free Service Benefits
              </h5>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <div className="small text-muted mb-1">Free Services Entitled</div>
                  <div className="fw-bold fs-5">{vehicle.freeServicesEntitled}</div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted mb-1">Free Services Used</div>
                  <div className="fw-bold fs-5">{vehicle.freeServicesUsed}</div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted mb-1">Free Services Remaining</div>
                  <div className="fw-bold fs-5 text-primary">{vehicle.freeServicesEntitled - vehicle.freeServicesUsed}</div>
                </div>
              </div>
              <div className="p-3 bg-light rounded d-flex align-items-center">
                <span className="fw-medium me-2">Status:</span>
                {vehicle.freeServicesEntitled > vehicle.freeServicesUsed ? (
                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 fs-6">
                    🟢 Eligible for Free Service
                  </span>
                ) : (
                  <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-3 py-2 fs-6">
                    ⚪ Free Service Benefit Exhausted
                  </span>
                )}
              </div>
            </div>
          )}

          {vehicle.purchaseType === 'New' && vehicle.freeServiceHistory && vehicle.freeServiceHistory.length > 0 && (
            <div className="bg-card p-4 mb-4 border-success border">
              <h5 className="fw-bold mb-4 border-bottom pb-2 d-flex align-items-center gap-2 text-success">
                <FaCheckCircle /> Completed Free Services
              </h5>
              <div className="table-responsive mt-3">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Odometer</th>
                      <th>Job Card</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.freeServiceHistory.map((fs, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(fs.date)}</td>
                        <td>{fs.odometer} km</td>
                        <td>
                          {fs.jobCardId ? (
                            <Link to={`/job-cards/${fs.jobCardId}`} className="text-decoration-none">View</Link>
                          ) : 'N/A'}
                        </td>
                        <td>{fs.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Service History Placeholder */}
          <div className="bg-card p-4">
            <h5 className="fw-bold mb-4 border-bottom pb-2 d-flex align-items-center gap-2">
              <FaTools className="text-orange" /> Service History
            </h5>

            <div className="alert border-0 d-flex align-items-center gap-3 mb-3"
              style={{ background: '#EFF6FF' }}>
              <FaTools size={22} className="text-primary flex-shrink-0" />
              <div>
                <strong className="text-primary">Service History Module</strong>
                <p className="mb-0 text-muted small mt-1">
                  Full service history, job cards, and maintenance records will appear here once the
                  Service Management module is implemented.
                </p>
              </div>
            </div>

            <div className="alert border-0 d-flex align-items-center gap-3"
              style={{ background: '#FFFBEB' }}>
              <FaExclamationTriangle size={22} className="text-warning flex-shrink-0" />
              <div>
                <strong className="text-warning">Upcoming Service Reminder</strong>
                <p className="mb-0 text-muted small mt-1">
                  Service reminders based on odometer reading and 6-month intervals will be shown here.
                </p>
              </div>
            </div>

            {/* Placeholder table */}
            <div className="table-responsive mt-3">
              {history.length === 0 ? (
                <div className="text-center py-4 text-muted border rounded bg-light">
                  No service records found.
                </div>
              ) : (
                <table className="table table-sm align-middle table-hover border">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Service Type</th>
                      <th>Odometer</th>
                      <th>Technician</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record._id}>
                        <td>{new Date(record.serviceDate).toLocaleDateString()}</td>
                        <td>
                          {record.jobCard?.serviceType || 'General'}
                          {record.isFreeService && <span className="badge bg-success ms-1">Free</span>}
                        </td>
                        <td>{record.odometerReading} km</td>
                        <td>{record.jobCard?.assignedMechanic?.firstName || 'N/A'}</td>
                        <td>
                          {record.invoice ? (
                            <span className={`badge ${record.invoice.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {record.invoice.status}
                            </span>
                          ) : (
                            <span className="badge bg-secondary">Pending</span>
                          )}
                        </td>
                        <td>
                          <Link to={`/service-history/${record._id}`} className="btn btn-sm btn-outline-primary">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column (narrower) ── */}
        <div className="col-lg-4">
          <div className="row g-4">
            {/* Owner Details */}
            <div className="col-12">
              <div className="bg-card p-4">
                <h5 className="fw-bold mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
                  <FaUser className="text-orange" /> Owner Details
                </h5>
                {vehicle.customer ? (
                  <>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 48, height: 48 }}
                      >
                        <FaUser className="text-primary" />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{vehicle.customer.fullName}</h6>
                        <small className="text-muted">{vehicle.customer.mobileNumber}</small>
                        {vehicle.customer.customerId && (
                          <div>
                            <small className="text-muted">{vehicle.customer.customerId}</small>
                          </div>
                        )}
                      </div>
                    </div>
                    {vehicle.customer.emailAddress && (
                      <p className="text-muted small mb-2">
                        ✉ {vehicle.customer.emailAddress}
                      </p>
                    )}
                    {vehicle.customer.city && (
                      <p className="text-muted small mb-3">
                        📍 {[vehicle.customer.city, vehicle.customer.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    <Link
                      to={`/customers/${vehicle.customer._id}`}
                      className="btn btn-outline-primary w-100 btn-sm"
                    >
                      View Full Profile
                    </Link>
                  </>
                ) : (
                  <p className="text-muted">No customer associated with this vehicle.</p>
                )}
              </div>
            </div>

            {/* Insurance Card */}
            <div className="col-12">
              <div className="bg-card p-4">
                <h5 className="fw-bold mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
                  <FaFileInvoice className="text-orange" /> Insurance
                </h5>

                {vehicle.insuranceNumber ? (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">Policy Number</small>
                      <span className="fw-semibold">{vehicle.insuranceNumber}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">Expiry Date</small>
                      <span className="fw-semibold">{formatDate(vehicle.insuranceExpiryDate)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">Status</small>
                      <StatusBadge expiryDate={vehicle.insuranceExpiryDate} />
                    </div>
                    {insuranceDays !== null && insuranceDays > 0 && insuranceDays <= 30 && (
                      <div className="alert alert-warning py-2 px-3 mt-3 small mb-0">
                        <FaExclamationTriangle className="me-1" />
                        Insurance expires in <strong>{insuranceDays} days</strong>. Renew soon!
                      </div>
                    )}
                    {insuranceDays !== null && insuranceDays < 0 && (
                      <div className="alert alert-danger py-2 px-3 mt-3 small mb-0">
                        <FaExclamationTriangle className="me-1" />
                        Insurance has expired. Please renew immediately.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No insurance information provided.</p>
                )}
              </div>
            </div>

            {/* Warranty Card */}
            <div className="col-12">
              <div className="bg-card p-4">
                <h5 className="fw-bold mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
                  <FaShieldAlt className="text-orange" /> Warranty
                </h5>

                {vehicle.warrantyExpiryDate ? (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">Expiry Date</small>
                      <span className="fw-semibold">{formatDate(vehicle.warrantyExpiryDate)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">Status</small>
                      <StatusBadge expiryDate={vehicle.warrantyExpiryDate} />
                    </div>
                    {warrantyDays !== null && warrantyDays > 0 && warrantyDays <= 60 && (
                      <div className="alert alert-warning py-2 px-3 mt-3 small mb-0">
                        <FaExclamationTriangle className="me-1" />
                        Warranty expires in <strong>{warrantyDays} days</strong>.
                      </div>
                    )}
                    {warrantyDays !== null && warrantyDays < 0 && (
                      <div className="alert alert-secondary py-2 px-3 mt-3 small mb-0">
                        <FaCheckCircle className="me-1" />
                        Warranty period has ended.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No warranty information provided.</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="col-12">
              <div className="bg-card p-4">
                <h5 className="fw-bold mb-3 border-bottom pb-2">Quick Actions</h5>
                <div className="d-grid gap-2">
                  <Link
                    to={`/vehicles/edit/${vehicle._id}`}
                    className="btn btn-orange d-flex align-items-center justify-content-center gap-2"
                  >
                    <FaEdit /> Edit Vehicle
                  </Link>
                  {vehicle.customer && (
                    <Link
                      to={`/vehicles/add?customerId=${vehicle.customer._id}`}
                      className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                    >
                      <FaCar /> Register Another Vehicle for Owner
                    </Link>
                  )}
                  <Link
                    to="/vehicles"
                    className="btn btn-light border d-flex align-items-center justify-content-center gap-2"
                  >
                    ← Back to Vehicle List
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;
