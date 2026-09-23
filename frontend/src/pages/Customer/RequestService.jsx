import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaWrench } from 'react-icons/fa';
import api from '../../services/api';
import appointmentService from '../../services/appointmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';
import { getIndiaDateStr } from '../../utils/dateUtils';

const RequestService = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const todayStr = getIndiaDateStr();

  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'Regular Maintenance',
    preferredDate: todayStr,
    preferredTime: '',
    description: ''
  });

  useEffect(() => {
    const fetchMyVehicles = async () => {
      try {
        const { data } = await api.get('/vehicles/my-vehicles');
        setVehicles(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, vehicleId: data[0]._id }));
        }
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load your vehicles');
        setLoading(false);
      }
    };
    fetchMyVehicles();
  }, []);

  useEffect(() => {
    if (formData.preferredDate) {
      fetchSlots(formData.preferredDate);
    }
  }, [formData.preferredDate]);

  const fetchSlots = async (rawDate) => {
    try {
      setLoadingSlots(true);
      let date = rawDate;
      if (typeof rawDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const [m, d, y] = rawDate.split('/');
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const res = await appointmentService.getAvailableSlots(date);
      setAvailableSlots(res.slots || []);
      // Automatically preselect first available slot if any
      const firstAvail = (res.slots || []).find(s => s.status === 'Available');
      if (firstAvail) {
        setFormData(prev => ({ ...prev, preferredTime: firstAvail.time }));
      } else {
        setFormData(prev => ({ ...prev, preferredTime: '' }));
      }
      setLoadingSlots(false);
    } catch (error) {
      toast.error('Failed to load available time slots');
      setLoadingSlots(false);
    }
  };

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.preferredDate || !formData.preferredTime || !formData.description) {
      toast.error('Please fill all required fields and select an available time slot');
      return;
    }

    try {
      setSubmitting(true);
      let apptDate = formData.preferredDate;
      if (typeof apptDate === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(apptDate)) {
        const [m, d, y] = apptDate.split('/');
        apptDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const appointmentData = {
        vehicle: formData.vehicleId,
        serviceType: formData.serviceType,
        appointmentDate: apptDate,
        preferredTime: formData.preferredTime,
        problemDescription: formData.description,
        bookingType: 'Online',
        status: 'Pending'
      };
      
      await appointmentService.createAppointment(appointmentData);
      toast.success('Service request submitted successfully!');
      setSubmitting(false);
      navigate('/customer-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting request');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid px-0 px-md-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/customer-dashboard">Home</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Request Service</li>
        </ol>
      </nav>

      <h2 className="text-navy fw-bold mb-4 d-flex align-items-center gap-3">
        <FaWrench className="text-orange" /> Request a Service
      </h2>

      <div className="bg-card p-3 p-md-5 rounded shadow-sm">
        {vehicles.length === 0 ? (
          <div className="alert alert-warning">
            You must have at least one vehicle registered to request a service.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <label className="form-label fw-bold">Select Vehicle <span className="text-danger">*</span></label>
                <select className="form-select form-select-lg" name="vehicleId" value={formData.vehicleId} onChange={onChange} required>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>{v.vehicleNumber} - {v.brand} {v.model}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-bold">Service Type <span className="text-danger">*</span></label>
                <select className="form-select form-select-lg" name="serviceType" value={formData.serviceType} onChange={onChange} required>
                  <option value="Regular Maintenance">Regular Maintenance</option>
                  <option value="Repair">Repair</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Detailing">Washing & Detailing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-bold">Preferred Date <span className="text-danger">*</span></label>
                <input 
                  type="date" 
                  className="form-control form-control-lg" 
                  name="preferredDate" 
                  value={formData.preferredDate} 
                  onChange={onChange} 
                  required 
                  min={todayStr} 
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-bold">Available Time Slot <span className="text-danger">*</span></label>
                {loadingSlots ? (
                  <div className="form-control form-control-lg text-muted">Checking available capacity...</div>
                ) : (
                  <select 
                    className="form-select form-select-lg" 
                    name="preferredTime" 
                    value={formData.preferredTime} 
                    onChange={onChange} 
                    required
                  >
                    <option value="">Select Time Slot</option>
                    {availableSlots.map(slot => (
                      <option 
                        key={slot.time} 
                        value={slot.time} 
                        disabled={slot.available <= 0}
                      >
                        {slot.time} — {slot.status === 'No Capacity' || slot.capacity === 0 ? 'No Capacity' : (slot.available === 0 ? 'FULL' : `${slot.available} slot(s) available`)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="col-12">
                <label className="form-label fw-bold">Description of Issue/Service <span className="text-danger">*</span></label>
                <textarea className="form-control" rows="4" name="description" value={formData.description} onChange={onChange} required placeholder="Please describe what needs to be done..."></textarea>
              </div>
            </div>

            <hr className="my-4 my-md-5" />

            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-end">
              <Link to="/customer-dashboard" className="btn btn-light btn-lg px-4 border text-center">Cancel</Link>
              <button type="submit" className="btn btn-orange btn-lg px-5" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RequestService;
