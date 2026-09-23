import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getVehicleById, updateVehicle } from '../../services/vehicleService';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FaCar, FaFileAlt, FaUser, FaInfoCircle } from 'react-icons/fa';

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic'];
const CURRENT_YEAR = new Date().getFullYear();

/** Format a MongoDB/ISO date string to YYYY-MM-DD for <input type="date"> */
const formatDateInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const EditVehicle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicleOwner, setVehicleOwner] = useState(null);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    brand: '',
    model: '',
    manufacturingYear: '',
    fuelType: '',
    transmission: '',
    registrationDate: '',
    insuranceNumber: '',
    insuranceExpiryDate: '',
    warrantyExpiryDate: '',
    engineNumber: '',
    chassisNumber: '',
    currentOdometerReading: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const vehicle = await getVehicleById(id);
        setVehicleOwner(vehicle.customer || null);
        setFormData({
          vehicleNumber: vehicle.vehicleNumber || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          manufacturingYear: vehicle.manufacturingYear || '',
          fuelType: vehicle.fuelType || '',
          transmission: vehicle.transmission || '',
          registrationDate: formatDateInput(vehicle.registrationDate),
          insuranceNumber: vehicle.insuranceNumber || '',
          insuranceExpiryDate: formatDateInput(vehicle.insuranceExpiryDate),
          warrantyExpiryDate: formatDateInput(vehicle.warrantyExpiryDate),
          engineNumber: vehicle.engineNumber || '',
          chassisNumber: vehicle.chassisNumber || '',
          currentOdometerReading: vehicle.currentOdometerReading ?? '',
        });
      } catch (error) {
        toast.error('Error fetching vehicle details. Redirecting...');
        navigate('/vehicles');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (serverError) setServerError('');
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.vehicleNumber.trim()) newErrors.vehicleNumber = 'Vehicle number is required.';
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required.';
    if (!formData.model.trim()) newErrors.model = 'Model is required.';
    if (!formData.manufacturingYear) newErrors.manufacturingYear = 'Manufacturing year is required.';
    if (!formData.fuelType) newErrors.fuelType = 'Fuel type is required.';
    if (!formData.transmission) newErrors.transmission = 'Transmission is required.';
    if (!formData.registrationDate) newErrors.registrationDate = 'Registration date is required.';
    if (formData.currentOdometerReading === '' || formData.currentOdometerReading === undefined) {
      newErrors.currentOdometerReading = 'Odometer reading is required.';
    }
    return newErrors;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors before saving.');
      return;
    }

    try {
      setSaving(true);
      setServerError('');
      await updateVehicle(id, formData);
      toast.success('Vehicle updated successfully!');
      navigate(`/vehicles/${id}`);
    } catch (error) {
      const message = error.response?.data?.message || 'Error updating vehicle';
      const field = error.response?.data?.field;
      toast.error(message);
      setServerError(message);
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

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
            Edit Vehicle
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-navy fw-bold mb-0">Edit Vehicle Details</h2>
          <p className="text-muted small mb-0 mt-1">
            Editing: <strong className="text-navy">{formData.vehicleNumber}</strong>
            {vehicleOwner && (
              <> &mdash; Owner: <strong>{vehicleOwner.fullName}</strong></>
            )}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/vehicles/${id}`} className="btn btn-light border shadow-sm">
            ← View Details
          </Link>
          <Link to="/vehicles" className="btn btn-light border shadow-sm">
            Vehicle List
          </Link>
        </div>
      </div>

      <form id="edit-vehicle-form" onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4 shadow-sm" role="alert">
            <FaInfoCircle className="me-2 flex-shrink-0" size={18} />
            <div className="flex-grow-1">{serverError}</div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setServerError('')}
            ></button>
          </div>
        )}
        {/* ── Owner Info Banner (read-only) ── */}
        {vehicleOwner && (
          <div className="bg-card p-4 mb-4 d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 rounded-circle p-3">
              <FaUser className="text-primary" size={20} />
            </div>
            <div>
              <div className="fw-bold text-navy">{vehicleOwner.fullName}</div>
              <small className="text-muted">
                {vehicleOwner.mobileNumber}
                {vehicleOwner.customerId && ` · ${vehicleOwner.customerId}`}
              </small>
            </div>
            <Link
              to={`/customers/${vehicleOwner._id}`}
              className="btn btn-sm btn-outline-primary ms-auto"
            >
              View Customer Profile
            </Link>
          </div>
        )}

        {/* ── Section 1: Basic Vehicle Info ── */}
        <div className="bg-card p-4 p-md-5 mb-4">
          <h5 className="text-navy fw-bold mb-4 d-flex align-items-center gap-2">
            <FaCar className="text-orange" /> Basic Information
          </h5>
          <div className="row g-4">
            <div className="col-md-4">
              <label htmlFor="vehicleNumber" className="form-label fw-bold">
                Vehicle Number <span className="text-danger">*</span>
              </label>
              <input
                id="vehicleNumber"
                type="text"
                className={`form-control text-uppercase ${errors.vehicleNumber ? 'is-invalid' : ''}`}
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={onChange}
                required
              />
              {errors.vehicleNumber && (
                <div className="invalid-feedback">{errors.vehicleNumber}</div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="brand" className="form-label fw-bold">
                Brand / Make <span className="text-danger">*</span>
              </label>
              <input
                id="brand"
                type="text"
                className={`form-control ${errors.brand ? 'is-invalid' : ''}`}
                name="brand"
                value={formData.brand}
                onChange={onChange}
                required
              />
              {errors.brand && <div className="invalid-feedback">{errors.brand}</div>}
            </div>

            <div className="col-md-4">
              <label htmlFor="model" className="form-label fw-bold">
                Model <span className="text-danger">*</span>
              </label>
              <input
                id="model"
                type="text"
                className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                name="model"
                value={formData.model}
                onChange={onChange}
                required
              />
              {errors.model && <div className="invalid-feedback">{errors.model}</div>}
            </div>

            <div className="col-md-3">
              <label htmlFor="manufacturingYear" className="form-label fw-bold">
                Manufacturing Year <span className="text-danger">*</span>
              </label>
              <input
                id="manufacturingYear"
                type="number"
                className={`form-control ${errors.manufacturingYear ? 'is-invalid' : ''}`}
                name="manufacturingYear"
                value={formData.manufacturingYear}
                onChange={onChange}
                min="1950"
                max={CURRENT_YEAR}
                required
              />
              {errors.manufacturingYear && (
                <div className="invalid-feedback">{errors.manufacturingYear}</div>
              )}
            </div>

            <div className="col-md-3">
              <label htmlFor="fuelType" className="form-label fw-bold">
                Fuel Type <span className="text-danger">*</span>
              </label>
              <select
                id="fuelType"
                name="fuelType"
                className={`form-select ${errors.fuelType ? 'is-invalid' : ''}`}
                value={formData.fuelType}
                onChange={onChange}
                required
              >
                <option value="">-- Select --</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {errors.fuelType && (
                <div className="invalid-feedback">{errors.fuelType}</div>
              )}
            </div>

            <div className="col-md-3">
              <label htmlFor="transmission" className="form-label fw-bold">
                Transmission <span className="text-danger">*</span>
              </label>
              <select
                id="transmission"
                name="transmission"
                className={`form-select ${errors.transmission ? 'is-invalid' : ''}`}
                value={formData.transmission}
                onChange={onChange}
                required
              >
                <option value="">-- Select --</option>
                {TRANSMISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.transmission && (
                <div className="invalid-feedback">{errors.transmission}</div>
              )}
            </div>

            <div className="col-md-3">
              <label htmlFor="currentOdometerReading" className="form-label fw-bold">
                Odometer (km) <span className="text-danger">*</span>
              </label>
              <input
                id="currentOdometerReading"
                type="number"
                className={`form-control ${errors.currentOdometerReading ? 'is-invalid' : ''}`}
                name="currentOdometerReading"
                value={formData.currentOdometerReading}
                onChange={onChange}
                min="0"
                required
              />
              {errors.currentOdometerReading && (
                <div className="invalid-feedback">{errors.currentOdometerReading}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Legal & Documentation ── */}
        <div className="bg-card p-4 p-md-5 mb-4">
          <h5 className="text-navy fw-bold mb-4 d-flex align-items-center gap-2">
            <FaFileAlt className="text-orange" /> Legal &amp; Documentation
          </h5>
          <div className="row g-4">
            <div className="col-md-4">
              <label htmlFor="registrationDate" className="form-label fw-bold">
                Registration Date <span className="text-danger">*</span>
              </label>
              <input
                id="registrationDate"
                type="date"
                className={`form-control ${errors.registrationDate ? 'is-invalid' : ''}`}
                name="registrationDate"
                value={formData.registrationDate}
                onChange={onChange}
                required
              />
              {errors.registrationDate && (
                <div className="invalid-feedback">{errors.registrationDate}</div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="engineNumber" className="form-label fw-bold">
                Engine Number
              </label>
              <input
                id="engineNumber"
                type="text"
                className={`form-control text-uppercase ${errors.engineNumber ? 'is-invalid' : ''}`}
                name="engineNumber"
                value={formData.engineNumber}
                onChange={onChange}
              />
              {errors.engineNumber && (
                <div className="invalid-feedback">{errors.engineNumber}</div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="chassisNumber" className="form-label fw-bold">
                Chassis Number (VIN)
              </label>
              <input
                id="chassisNumber"
                type="text"
                className={`form-control text-uppercase ${errors.chassisNumber ? 'is-invalid' : ''}`}
                name="chassisNumber"
                value={formData.chassisNumber}
                onChange={onChange}
                maxLength="17"
              />
              {errors.chassisNumber && (
                <div className="invalid-feedback">{errors.chassisNumber}</div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="insuranceNumber" className="form-label fw-bold">
                Insurance Policy Number
              </label>
              <input
                id="insuranceNumber"
                type="text"
                className={`form-control text-uppercase ${errors.insuranceNumber ? 'is-invalid' : ''}`}
                name="insuranceNumber"
                value={formData.insuranceNumber}
                onChange={onChange}
                maxLength="50"
              />
              {errors.insuranceNumber && (
                <div className="invalid-feedback">{errors.insuranceNumber}</div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="insuranceExpiryDate" className="form-label fw-bold">
                Insurance Expiry Date
              </label>
              <input
                id="insuranceExpiryDate"
                type="date"
                className="form-control"
                name="insuranceExpiryDate"
                value={formData.insuranceExpiryDate}
                onChange={onChange}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="warrantyExpiryDate" className="form-label fw-bold">
                Warranty Expiry Date
              </label>
              <input
                id="warrantyExpiryDate"
                type="date"
                className="form-control"
                name="warrantyExpiryDate"
                value={formData.warrantyExpiryDate}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-3 justify-content-end flex-wrap">
          <Link to="/vehicles" className="btn btn-light btn-lg px-4 border">
            Cancel
          </Link>
          <button
            id="btn-update-vehicle"
            type="submit"
            className="btn btn-orange btn-lg px-5"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Updating...
              </>
            ) : (
              'Update Vehicle'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditVehicle;
