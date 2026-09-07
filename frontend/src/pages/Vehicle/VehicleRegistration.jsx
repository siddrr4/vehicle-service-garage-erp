import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getCustomers } from '../../services/customerService';
import { createVehicle } from '../../services/vehicleService';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FaCar, FaUser, FaFileAlt, FaInfoCircle } from 'react-icons/fa';

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic'];
const CURRENT_YEAR = new Date().getFullYear();

const initialFormState = {
  customerId: '',
  vehicleNumber: '',
  brand: '',
  model: '',
  manufacturingYear: CURRENT_YEAR,
  fuelType: 'Petrol',
  transmission: 'Manual',
  registrationDate: '',
  insuranceNumber: '',
  insuranceExpiryDate: '',
  warrantyExpiryDate: '',
  engineNumber: '',
  chassisNumber: '',
  currentOdometerReading: '',
  purchaseType: 'Used',
};

const VehicleRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [formData, setFormData] = useState({
    ...initialFormState,
    customerId: initialCustomerId,
  });

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchAllCustomers = async () => {
      try {
        // Fetch all customers for the dropdown (up to 1000 for now)
        const data = await getCustomers(1, 1000);
        setCustomers(data.customers);
      } catch (error) {
        toast.error('Error fetching customers. Please refresh and try again.');
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchAllCustomers();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'purchaseType' && value === 'New') {
        updated.currentOdometerReading = 0;
      }
      return updated;
    });
    // Clear the individual field error on change
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (updatedErrors[name]) {
        updatedErrors[name] = '';
      }
      if (name === 'purchaseType' && value === 'New') {
        updatedErrors.currentOdometerReading = '';
      }
      return updatedErrors;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.customerId) newErrors.customerId = 'Please select a customer.';
    if (!formData.vehicleNumber.trim()) newErrors.vehicleNumber = 'Vehicle number is required.';
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required.';
    if (!formData.model.trim()) newErrors.model = 'Model is required.';
    if (!formData.manufacturingYear) newErrors.manufacturingYear = 'Manufacturing year is required.';
    if (!formData.fuelType) newErrors.fuelType = 'Fuel type is required.';
    if (!formData.transmission) newErrors.transmission = 'Transmission is required.';
    if (!formData.registrationDate) newErrors.registrationDate = 'Registration date is required.';
    
    if (formData.purchaseType === 'Used') {
      if (formData.currentOdometerReading === '' || formData.currentOdometerReading === undefined) {
        newErrors.currentOdometerReading = 'Odometer reading is required for used vehicles.';
      } else if (Number(formData.currentOdometerReading) <= 0) {
        newErrors.currentOdometerReading = 'Used vehicle odometer must be greater than 0 km.';
      }
    }
    return newErrors;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fill all required fields.');
      return;
    }

    try {
      setSaving(true);
      await createVehicle(formData);
      toast.success('Vehicle registered successfully!');
      if (initialCustomerId) {
        navigate(`/customers/${initialCustomerId}`);
      } else {
        navigate('/vehicles');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registering vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...initialFormState, customerId: initialCustomerId });
    setErrors({});
  };

  if (loadingCustomers) return <LoadingSpinner />;

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
            Register Vehicle
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-navy fw-bold mb-0">Register New Vehicle</h2>
          <p className="text-muted small mb-0 mt-1">
            Fill in the vehicle details below. Fields marked with{' '}
            <span className="text-danger">*</span> are required.
          </p>
        </div>
        <Link to="/vehicles" className="btn btn-light border shadow-sm">
          ← Back to List
        </Link>
      </div>

      <form id="vehicle-registration-form" onSubmit={onSubmit} noValidate>
        {/* ── Section 1: Customer Association ── */}
        <div className="bg-card p-4 p-md-5 mb-4">
          <h5 className="text-navy fw-bold mb-4 d-flex align-items-center gap-2">
            <FaUser className="text-orange" /> Customer Association
          </h5>
          <div className="row g-4">
            <div className="col-md-6">
              <label htmlFor="customerId" className="form-label fw-bold">
                Select Customer <span className="text-danger">*</span>
              </label>
              <select
                id="customerId"
                name="customerId"
                className={`form-select form-select-lg ${errors.customerId ? 'is-invalid' : ''}`}
                value={formData.customerId}
                onChange={onChange}
                disabled={!!initialCustomerId}
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName} ({c.mobileNumber}){c.customerId ? ` — ${c.customerId}` : ''}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <div className="invalid-feedback">{errors.customerId}</div>
              )}
              {!!initialCustomerId && (
                <small className="text-muted mt-1 d-block">
                  <FaInfoCircle className="me-1" />
                  Customer is pre-selected from the profile page.
                </small>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Vehicle Details ── */}
        <div className="bg-card p-4 p-md-5 mb-4">
          <h5 className="text-navy fw-bold mb-4 d-flex align-items-center gap-2">
            <FaCar className="text-orange" /> Vehicle Details
          </h5>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">Purchase Type <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="purchaseType"
                    id="typeUsed"
                    value="Used"
                    checked={formData.purchaseType === 'Used'}
                    onChange={onChange}
                  />
                  <label className="form-check-label" htmlFor="typeUsed">Used Vehicle</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="purchaseType"
                    id="typeNew"
                    value="New"
                    checked={formData.purchaseType === 'New'}
                    onChange={onChange}
                  />
                  <label className="form-check-label" htmlFor="typeNew">
                    New Vehicle <span className="badge bg-success ms-1">3 Free Services</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <label htmlFor="vehicleNumber" className="form-label fw-bold">
                Vehicle Number <span className="text-danger">*</span>
              </label>
              <input
                id="vehicleNumber"
                type="text"
                className={`form-control ${errors.vehicleNumber ? 'is-invalid' : ''}`}
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={onChange}
                placeholder="e.g. MH12AB1234"
                style={{ textTransform: 'uppercase' }}
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
                placeholder="e.g. Honda, Maruti Suzuki, Tata"
                required
              />
              {errors.brand && (
                <div className="invalid-feedback">{errors.brand}</div>
              )}
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
                placeholder="e.g. City, Swift, Nexon"
                required
              />
              {errors.model && (
                <div className="invalid-feedback">{errors.model}</div>
              )}
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
                Odometer Reading (km) {formData.purchaseType === 'Used' && <span className="text-danger">*</span>}
              </label>
              <input
                id="currentOdometerReading"
                type="number"
                className={`form-control ${errors.currentOdometerReading ? 'is-invalid' : ''}`}
                name="currentOdometerReading"
                value={formData.purchaseType === 'New' ? 0 : formData.currentOdometerReading}
                onChange={onChange}
                min="0"
                placeholder="e.g. 12000"
                required={formData.purchaseType === 'Used'}
                disabled={formData.purchaseType === 'New'}
              />
              {formData.purchaseType === 'New' && (
                <div className="form-text text-success"><FaInfoCircle /> New vehicles start at 0 km.</div>
              )}
              {errors.currentOdometerReading && (
                <div className="invalid-feedback">{errors.currentOdometerReading}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Legal & Documentation ── */}
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
                className="form-control text-uppercase"
                name="engineNumber"
                value={formData.engineNumber}
                onChange={onChange}
                placeholder="Optional"
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="chassisNumber" className="form-label fw-bold">
                Chassis Number (VIN)
              </label>
              <input
                id="chassisNumber"
                type="text"
                className="form-control text-uppercase"
                name="chassisNumber"
                value={formData.chassisNumber}
                onChange={onChange}
                maxLength="17"
                placeholder="Up to 17 characters"
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="insuranceNumber" className="form-label fw-bold">
                Insurance Policy Number
              </label>
              <input
                id="insuranceNumber"
                type="text"
                className="form-control"
                name="insuranceNumber"
                value={formData.insuranceNumber}
                onChange={onChange}
                maxLength="20"
                placeholder="Optional"
              />
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
          <button
            type="button"
            className="btn btn-light btn-lg px-4 border"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg px-4"
            onClick={handleReset}
          >
            Reset Form
          </button>
          <button
            id="btn-register-vehicle"
            type="submit"
            className="btn btn-orange btn-lg px-5"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Registering...
              </>
            ) : (
              'Register Vehicle'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleRegistration;
