import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getCustomers } from '../../services/customerService';
import { createVehicle, checkVehicleUniqueness } from '../../services/vehicleService';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { FaCar, FaUser, FaFileAlt, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic'];
const CURRENT_YEAR = new Date().getFullYear();
const KA20_REGEX = /^KA\s*20\s*[A-Z]{1,3}\s*\d{1,4}$/i;

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
  const [serverError, setServerError] = useState('');
  const debounceTimers = useRef({});

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

  const triggerUniquenessCheck = (field, rawVal) => {
    const val = (rawVal || '').trim();
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }
    if (!val) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      return;
    }

    if (field === 'vehicleNumber') {
      if (!KA20_REGEX.test(val)) {
        setErrors((prev) => ({ ...prev, vehicleNumber: 'Only KA 20 registered vehicles are allowed.' }));
        return;
      }
    }

    debounceTimers.current[field] = setTimeout(async () => {
      try {
        const result = await checkVehicleUniqueness(field, val);
        if (result && result.available === false) {
          setErrors((prev) => ({ ...prev, [field]: result.message }));
        } else {
          setErrors((prev) => {
            const updated = { ...prev };
            if (updated[field] && updated[field].includes('already registered')) {
              delete updated[field];
            }
            return updated;
          });
        }
      } catch (err) {
        // Ignore background check network errors
      }
    }, 350);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'purchaseType' && value === 'New') {
        updated.currentOdometerReading = 0;
      }
      return updated;
    });
    if (serverError) setServerError('');

    // Immediate field validation
    if (name === 'vehicleNumber') {
      const val = value.trim();
      if (!val) {
        setErrors((prev) => ({ ...prev, vehicleNumber: 'Vehicle number is required.' }));
      } else if (!KA20_REGEX.test(val)) {
        setErrors((prev) => ({ ...prev, vehicleNumber: 'Only KA 20 registered vehicles are allowed.' }));
      } else {
        setErrors((prev) => {
          const updated = { ...prev };
          if (updated.vehicleNumber && !updated.vehicleNumber.includes('already registered')) {
            delete updated.vehicleNumber;
          }
          return updated;
        });
        triggerUniquenessCheck('vehicleNumber', val);
      }
    } else if (name === 'chassisNumber') {
      const val = value.trim();
      if (val.length > 17) {
        setErrors((prev) => ({ ...prev, chassisNumber: 'Chassis number cannot exceed 17 characters' }));
      } else {
        setErrors((prev) => {
          const updated = { ...prev };
          if (updated.chassisNumber && !updated.chassisNumber.includes('already registered')) {
            delete updated.chassisNumber;
          }
          return updated;
        });
        triggerUniquenessCheck('chassisNumber', val);
      }
    } else if (name === 'engineNumber') {
      const val = value.trim();
      setErrors((prev) => {
        const updated = { ...prev };
        if (updated.engineNumber && !updated.engineNumber.includes('already registered')) {
          delete updated.engineNumber;
        }
        return updated;
      });
      triggerUniquenessCheck('engineNumber', val);
    } else if (name === 'insuranceNumber') {
      const val = value.trim();
      if (val.length > 50) {
        setErrors((prev) => ({ ...prev, insuranceNumber: 'Insurance number cannot exceed 50 characters' }));
      } else {
        setErrors((prev) => {
          const updated = { ...prev };
          if (updated.insuranceNumber && !updated.insuranceNumber.includes('already registered')) {
            delete updated.insuranceNumber;
          }
          return updated;
        });
        triggerUniquenessCheck('insuranceNumber', val);
      }
    } else {
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        if (updatedErrors[name]) {
          delete updatedErrors[name];
        }
        if (name === 'purchaseType' && value === 'New') {
          delete updatedErrors.currentOdometerReading;
        }
        return updatedErrors;
      });
    }
  };

  const onBlurCheck = async (field) => {
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }
    const val = formData[field]?.trim();
    if (!val) return;

    if (field === 'vehicleNumber') {
      if (!KA20_REGEX.test(val)) {
        setErrors((prev) => ({ ...prev, vehicleNumber: 'Only KA 20 registered vehicles are allowed.' }));
        return;
      }
    }

    try {
      const result = await checkVehicleUniqueness(field, val);
      if (result && result.available === false) {
        setErrors((prev) => ({ ...prev, [field]: result.message }));
      } else {
        setErrors((prev) => {
          const updated = { ...prev };
          if (updated[field] && updated[field].includes('already registered')) {
            delete updated[field];
          }
          return updated;
        });
      }
    } catch (err) {
      // Ignore background check network errors
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.customerId) newErrors.customerId = 'Please select a customer.';
    
    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required.';
    } else if (!KA20_REGEX.test(formData.vehicleNumber.trim())) {
      newErrors.vehicleNumber = 'Only KA 20 registered vehicles are allowed.';
    }

    if (formData.chassisNumber && formData.chassisNumber.trim().length > 17) {
      newErrors.chassisNumber = 'Chassis number cannot exceed 17 characters';
    }

    if (formData.insuranceNumber && formData.insuranceNumber.trim().length > 50) {
      newErrors.insuranceNumber = 'Insurance number cannot exceed 50 characters';
    }

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

    // Preserve any active duplicate errors
    const combinedErrors = { ...errors, ...validationErrors };
    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
      toast.error('Please fix the errors before registering.');
      return;
    }

    // Verify uniqueness for all provided identifiers right before create
    const checkFields = [
      { field: 'vehicleNumber', val: formData.vehicleNumber },
      { field: 'chassisNumber', val: formData.chassisNumber },
      { field: 'engineNumber', val: formData.engineNumber },
      { field: 'insuranceNumber', val: formData.insuranceNumber }
    ];

    for (const item of checkFields) {
      const val = item.val?.trim();
      if (val) {
        try {
          const res = await checkVehicleUniqueness(item.field, val);
          if (res && res.available === false) {
            setErrors((prev) => ({ ...prev, [item.field]: res.message }));
            toast.error(res.message);
            return;
          }
        } catch (err) {
          // let backend catch on submit
        }
      }
    }

    try {
      setSaving(true);
      setServerError('');
      await createVehicle(formData);
      toast.success('Vehicle registered successfully!');
      if (initialCustomerId) {
        navigate(`/customers/${initialCustomerId}`);
      } else {
        navigate('/vehicles');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error registering vehicle';
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

  const handleReset = () => {
    setFormData({ ...initialFormState, customerId: initialCustomerId });
    setErrors({});
    setServerError('');
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
                className={`form-control ${errors.vehicleNumber ? 'is-invalid' : (formData.vehicleNumber.trim() && KA20_REGEX.test(formData.vehicleNumber.trim())) ? 'is-valid' : ''}`}
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={onChange}
                onBlur={() => onBlurCheck('vehicleNumber')}
                placeholder="e.g. KA 20 EH 0627"
                style={{ textTransform: 'uppercase' }}
                required
              />
              {errors.vehicleNumber && (
                <div className="invalid-feedback d-block">✕ {errors.vehicleNumber}</div>
              )}
              {!errors.vehicleNumber && formData.vehicleNumber.trim() && KA20_REGEX.test(formData.vehicleNumber.trim()) && (
                <div className="valid-feedback d-block text-success small mt-1 fw-medium">
                  ✓ Valid KA 20 registration
                </div>
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
                className={`form-control text-uppercase ${errors.engineNumber ? 'is-invalid' : ''}`}
                name="engineNumber"
                value={formData.engineNumber}
                onChange={onChange}
                onBlur={() => onBlurCheck('engineNumber')}
                placeholder="Optional"
              />
              {errors.engineNumber && (
                <div className="invalid-feedback d-block">✕ {errors.engineNumber}</div>
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
                onBlur={() => onBlurCheck('chassisNumber')}
                maxLength="17"
                placeholder="Up to 17 characters"
              />
              {errors.chassisNumber && (
                <div className="invalid-feedback d-block">✕ {errors.chassisNumber}</div>
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
                onBlur={() => onBlurCheck('insuranceNumber')}
                maxLength="50"
                placeholder="Optional"
              />
              {errors.insuranceNumber && (
                <div className="invalid-feedback d-block">✕ {errors.insuranceNumber}</div>
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
