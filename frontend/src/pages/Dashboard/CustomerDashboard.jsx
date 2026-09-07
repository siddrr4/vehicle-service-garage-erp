import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { FaCar, FaTools, FaCalendarCheck, FaExclamationTriangle, FaFileInvoiceDollar } from 'react-icons/fa';
import api from '../../services/api';
import billingService from '../../services/billingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [activeServices, setActiveServices] = useState(0);
  const [pastServices, setPastServices] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const vehiclesRes = await api.get('/vehicles/my-vehicles');
        setVehicles(vehiclesRes.data);
        
        const appointmentsRes = await api.get('/appointments');
        const appointments = appointmentsRes.data.appointments || [];
        
        const activeCount = appointments.filter(a => ['Pending', 'Approved', 'Confirmed', 'Checked-In', 'In Progress'].includes(a.status)).length;
        const pastCount = appointments.filter(a => a.status === 'Completed').length;
        
        // Extract Service Advisor recommendations from appointments
        const recs = appointments
          .filter(a => a.advisorRecommendation && a.advisorRecommendation.recommendationText)
          .map(a => ({
            id: a._id,
            serviceType: a.serviceType,
            vehicle: a.vehicle,
            recommendation: a.advisorRecommendation.recommendationText,
            date: a.advisorRecommendation.recommendedAt
          }));
        setRecommendations(recs);

        setActiveServices(activeCount);
        setPastServices(pastCount);

        try {
          const invoicesData = await billingService.getMyInvoices();
          setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        } catch (invError) {
          console.error("Failed to load invoices", invError);
        }

        setLoading(false);
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error('Failed to load dashboard data');
        }
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid px-0 px-md-3">
      <h2 className="text-navy fw-bold mb-4">Welcome back, {user?.firstName}!</h2>
      
      <div className="row g-3 g-md-4 mb-4">
        <div className="col-12 col-sm-6 col-md-4">
          <div className="bg-card p-3 p-md-4 h-100 d-flex align-items-center gap-3 gap-md-4 border-start border-orange border-4 shadow-sm">
            <div className="stat-icon-wrapper stat-icon-orange" style={{ width: '50px', height: '50px', borderRadius: '12px', fontSize: '1.5rem' }}>
              <FaCar />
            </div>
            <div>
              <h3 className="fw-bold mb-0 text-navy">{vehicles.length}</h3>
              <p className="text-muted mb-0 small">My Vehicles</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-4">
          <div className="bg-card p-3 p-md-4 h-100 d-flex align-items-center gap-3 gap-md-4 border-start border-primary border-4 shadow-sm">
            <div className="stat-icon-wrapper stat-icon-primary" style={{ width: '50px', height: '50px', borderRadius: '12px', fontSize: '1.5rem' }}>
              <FaTools />
            </div>
            <div>
              <h3 className="fw-bold mb-0 text-navy">{activeServices}</h3>
              <p className="text-muted mb-0 small">Active Services</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-4">
          <Link to="/service-history" className="text-decoration-none">
            <div className="bg-card p-3 p-md-4 h-100 d-flex align-items-center gap-3 gap-md-4 border-start border-success border-4 shadow-sm hover-elevate">
              <div className="stat-icon-wrapper stat-icon-success" style={{ width: '50px', height: '50px', borderRadius: '12px', fontSize: '1.5rem' }}>
                <FaCalendarCheck />
              </div>
              <div>
                <h3 className="fw-bold mb-0 text-navy">{pastServices}</h3>
                <p className="text-muted mb-0 small">Past Services</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="bg-card p-3 p-md-4 h-100 rounded shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 text-navy">My Vehicles</h5>
              <Link to="/my-vehicles" className="btn btn-sm btn-outline-orange">View All</Link>
            </div>
            
            {vehicles.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaCar size={48} className="mb-3 opacity-50" />
                <p>No vehicles found linked to your account.</p>
                <p className="small">If you believe this is an error, please contact the garage administration.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Vehicle Number</th>
                      <th>Make & Model</th>
                      <th>Odometer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.slice(0, 5).map(v => (
                      <tr key={v._id}>
                        <td className="fw-bold">{v.vehicleNumber}</td>
                        <td>{v.brand} {v.model}</td>
                        <td>{v.currentOdometerReading || '--'} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="bg-card p-3 p-md-4 h-100 rounded shadow-sm d-flex flex-column justify-content-between">
            <div>
              <h5 className="fw-bold mb-3 text-navy">Service Advisor Recommendations</h5>
              
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div key={idx} className="alert alert-warning border border-warning p-3 mb-2 rounded">
                    <div className="fw-bold text-dark small mb-1">💡 Service Recommendation</div>
                    <div className="text-dark mb-1">{rec.recommendation}</div>
                    <div className="text-muted fst-italic" style={{ fontSize: '0.75rem' }}>
                      {rec.vehicle?.vehicleNumber ? `Vehicle: ${rec.vehicle.vehicleNumber} | ` : ''}
                      {rec.date ? new Date(rec.date).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert alert-light border d-flex gap-3 text-muted">
                  <small>No active service recommendations from your advisor.</small>
                </div>
              )}
            </div>

            <div className="d-grid mt-4">
              <Link to="/request-service" className="btn btn-orange py-2 fw-bold">
                <FaTools className="me-2" /> Request Service
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-2 mb-4">
        <div className="col-12">
          <div className="bg-card p-3 p-md-4 h-100 rounded shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 text-navy">My Bills / Invoices</h5>
            </div>
            
            {invoices.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaFileInvoiceDollar size={48} className="mb-3 opacity-50" />
                <p>No invoices found for your account.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice No</th>
                      <th>Service Date</th>
                      <th>Vehicle</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv._id}>
                        <td className="fw-bold text-navy">{inv.invoiceNumber}</td>
                        <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td>{inv.vehicle?.vehicleNumber}</td>
                        <td className="fw-bold">₹{inv.grandTotal.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${inv.status === 'Paid' ? 'bg-success' : inv.status === 'Partially Paid' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/billing/invoice/${inv._id}`} className="btn btn-sm btn-outline-primary">
                            View Invoice
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
