import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCustomer } from '../../services/customerService';
import { toast } from 'react-toastify';

const AddCustomer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    emailAddress: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadharNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { fullName, mobileNumber, emailAddress, address, city, state, pincode, aadharNumber } = formData;

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    }

    if (emailAddress && !/\S+@\S+\.\S+/.test(emailAddress)) {
      newErrors.emailAddress = 'Invalid email address';
    }

    if (!address.trim()) newErrors.address = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    
    if (!pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    if (aadharNumber && !/^[0-9]{12}$/.test(aadharNumber)) {
      newErrors.aadharNumber = 'Aadhar number must be exactly 12 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      await createCustomer(formData);
      toast.success('Customer registered successfully');
      setLoading(false);
      navigate('/customers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registering customer');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      mobileNumber: '',
      emailAddress: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      aadharNumber: ''
    });
    setErrors({});
  };

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin-dashboard">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Add Customer</li>
        </ol>
      </nav>

      <h2 className="text-navy fw-bold mb-4">Register New Customer</h2>

      <div className="bg-card p-4 p-md-5 shadow-sm border-0">
        <form onSubmit={onSubmit}>
          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.fullName ? 'is-invalid' : ''}`} name="fullName" value={fullName} onChange={onChange} placeholder="Enter full name" />
              {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
            </div>
            
            <div className="col-md-6">
              <label className="form-label fw-bold">Mobile Number <span className="text-danger">*</span></label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.mobileNumber ? 'is-invalid' : ''}`} name="mobileNumber" value={mobileNumber} onChange={onChange} placeholder="10-digit mobile number" maxLength="10" />
              {errors.mobileNumber && <div className="invalid-feedback">{errors.mobileNumber}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Email Address</label>
              <input type="email" className={`form-control form-control-lg bg-light ${errors.emailAddress ? 'is-invalid' : ''}`} name="emailAddress" value={emailAddress} onChange={onChange} placeholder="Enter email address (optional)" />
              {errors.emailAddress && <div className="invalid-feedback">{errors.emailAddress}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Aadhar Number</label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.aadharNumber ? 'is-invalid' : ''}`} name="aadharNumber" value={aadharNumber} onChange={onChange} maxLength="12" placeholder="12-digit Aadhar Number" />
              {errors.aadharNumber && <div className="invalid-feedback">{errors.aadharNumber}</div>}
            </div>

            <div className="col-md-12">
              <label className="form-label fw-bold">Address <span className="text-danger">*</span></label>
              <textarea className={`form-control bg-light ${errors.address ? 'is-invalid' : ''}`} rows="3" name="address" value={address} onChange={onChange} placeholder="Enter complete address"></textarea>
              {errors.address && <div className="invalid-feedback">{errors.address}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">City <span className="text-danger">*</span></label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.city ? 'is-invalid' : ''}`} name="city" value={city} onChange={onChange} placeholder="Enter city" />
              {errors.city && <div className="invalid-feedback">{errors.city}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">State <span className="text-danger">*</span></label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.state ? 'is-invalid' : ''}`} name="state" value={state} onChange={onChange} placeholder="Enter state" />
              {errors.state && <div className="invalid-feedback">{errors.state}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Pincode <span className="text-danger">*</span></label>
              <input type="text" className={`form-control form-control-lg bg-light ${errors.pincode ? 'is-invalid' : ''}`} name="pincode" value={pincode} onChange={onChange} placeholder="6-digit pincode" maxLength="6" />
              {errors.pincode && <div className="invalid-feedback">{errors.pincode}</div>}
            </div>
          </div>

          <hr className="my-5 opacity-25" />

          <div className="d-flex gap-3 justify-content-end">
            <Link to="/customers" className="btn btn-light btn-lg px-4 border text-secondary fw-medium">Cancel</Link>
            <button type="button" className="btn btn-light btn-lg px-4 border text-dark fw-medium" onClick={handleReset}>Reset</button>
            <button type="submit" className="btn btn-orange btn-lg px-5 shadow-sm" disabled={loading}>
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomer;
