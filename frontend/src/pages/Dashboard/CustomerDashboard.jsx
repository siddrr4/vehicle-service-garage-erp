import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { 
  FaCar, FaTools, FaCalendarCheck, FaFileInvoiceDollar, 
  FaPlus, FaLightbulb, FaHistory, FaCheck, FaTimes 
} from 'react-icons/fa';
import api from '../../services/api';
import billingService from '../../services/billingService';
import jobCardService from '../../services/jobCardService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { toast } from 'react-toastify';

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [activeServices, setActiveServices] = useState(0);
  const [pastServices, setPastServices] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [jobCardRecommendations, setJobCardRecommendations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const vehiclesRes = await api.get('/vehicles/my-vehicles');
        setVehicles(vehiclesRes.data || []);
        
        const appointmentsRes = await api.get('/appointments');
        const appointments = appointmentsRes.data.appointments || [];
        
        const activeCount = appointments.filter(a => ['Pending', 'Approved', 'Confirmed', 'Checked-In', 'In Progress'].includes(a.status)).length;
        const pastCount = appointments.filter(a => a.status === 'Completed').length;
        
        // Extract Service Advisor recommendations
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

        try {
          const myJobCards = await jobCardService.getMyJobCards();
          const list = Array.isArray(myJobCards) ? myJobCards : (myJobCards?.jobCards || []);
          const pendingRecs = [];
          list.forEach(jc => {
            if (jc.additionalRecommendations && Array.isArray(jc.additionalRecommendations)) {
              jc.additionalRecommendations.forEach(r => {
                if (r.status === 'Pending Customer Approval') {
                  pendingRecs.push({
                    jobCardId: jc._id,
                    jobNumber: jc.jobNumber,
                    vehicleNumber: jc.vehicle?.vehicleNumber || 'Vehicle',
                    recId: r._id,
                    serviceName: r.serviceName,
                    reason: r.reason,
                    estimatedLabour: r.estimatedLabour || 0,
                    estimatedParts: r.estimatedParts || 0,
                    estimatedTotal: r.estimatedTotal || 0,
                    createdAt: r.createdAt
                  });
                }
              });
            }
          });
          setJobCardRecommendations(pendingRecs);
        } catch (jcError) {
          console.error("Failed to load customer job cards", jcError);
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

  const handleCustomerApproval = async (jobCardId, recId, action) => {
    try {
      await jobCardService.respondToRecommendation(jobCardId, recId, { action });
      toast.success(`Additional service recommendation ${action === 'Approve' ? 'approved' : 'declined'} successfully`);
      setJobCardRecommendations(prev => prev.filter(r => r.recId !== recId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'Vehicle Owner'}!`}
        subtitle="Manage your registered vehicles, service appointments and repair invoices."
        breadcrumbs={[
          { label: 'Customer Portal', path: '/customer-dashboard' },
          { label: 'Overview' }
        ]}
        actions={
          <div className="d-flex gap-2">
            <Link to="/request-service" className="btn btn-orange d-flex align-items-center gap-2 shadow-sm">
              <FaPlus /> <span>Book New Service</span>
            </Link>
          </div>
        }
      />
      
      {/* Pending Additional Service Recommendations Alert */}
      {jobCardRecommendations.length > 0 && (
        <Alert variant="warning" className="border-0 shadow-sm p-4 rounded-3 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="d-flex align-items-center gap-2">
              <FaLightbulb className="text-warning fs-4" />
              <h5 className="fw-bold mb-0 text-navy">Service Approval Required</h5>
            </div>
            <Badge bg="danger" className="px-3 py-2 fs-7">
              {jobCardRecommendations.length} Action{jobCardRecommendations.length > 1 ? 's' : ''} Needed
            </Badge>
          </div>
          <p className="text-muted small mb-3">
            Your technician/advisor noted additional repairs required during inspection. Please approve or decline so work can proceed without delay.
          </p>
          <div className="d-flex flex-column gap-3">
            {jobCardRecommendations.map((rec) => (
              <div 
                key={rec.recId} 
                className="p-3 bg-white rounded border shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
              >
                <div>
                  <div className="fw-bold text-navy fs-6 mb-1">
                    {rec.serviceName} &bull; <span className="text-primary">Estimated: ₹{rec.estimatedTotal}</span>
                  </div>
                  <div className="text-dark small mb-1">{rec.reason}</div>
                  <div className="text-muted small">
                    Vehicle: <strong>{rec.vehicleNumber}</strong> &bull; Job Card: <Link to={`/job-cards/${rec.jobCardId}`} className="fw-medium">{rec.jobNumber}</Link>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="d-flex align-items-center gap-1 px-3 py-2 shadow-sm"
                    onClick={() => handleCustomerApproval(rec.jobCardId, rec.recId, 'Approve')}
                  >
                    <FaCheck /> <span>Approve (₹{rec.estimatedTotal})</span>
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="d-flex align-items-center gap-1 px-3 py-2"
                    onClick={() => handleCustomerApproval(rec.jobCardId, rec.recId, 'Reject')}
                  >
                    <FaTimes /> <span>Decline</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* 3 Overview KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={4}>
          <StatCard
            title="My Registered Vehicles"
            value={vehicles.length}
            icon={<FaCar />}
            color="orange"
            trend="Active in garage registry"
            trendColor="text-orange"
          />
        </Col>

        <Col xs={12} sm={6} md={4}>
          <StatCard
            title="Active Services"
            value={activeServices}
            icon={<FaTools />}
            color="primary"
            trend="Currently in workshop queue"
            trendColor="text-primary"
          />
        </Col>

        <Col xs={12} sm={6} md={4}>
          <StatCard
            title="Completed Services"
            value={pastServices}
            icon={<FaCalendarCheck />}
            color="success"
            trend="View complete service history"
            trendColor="text-success"
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        {/* Vehicles Section */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaCar className="text-orange" />
                <h5 className="fw-bold mb-0 text-navy">My Vehicles</h5>
              </div>
              <Link to="/my-vehicles" className="btn btn-sm btn-outline-secondary">
                View All &rarr;
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {vehicles.length === 0 ? (
                <EmptyState
                  icon={<FaCar size={40} className="text-muted opacity-50" />}
                  title="No vehicles registered"
                  message="You have not registered any vehicles yet. Add a vehicle to book services."
                  actionLabel="Add Vehicle"
                  actionLink="/my-vehicles"
                />
              ) : (
                <div className="table-responsive border-0 rounded-0">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="px-4">Vehicle Number</th>
                        <th>Make & Model</th>
                        <th>Fuel</th>
                        <th>Odometer</th>
                        <th className="text-end px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.slice(0, 5).map(v => (
                        <tr key={v._id}>
                          <td className="px-4 fw-bold text-navy">{v.vehicleNumber}</td>
                          <td>{v.brand} {v.model}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{v.fuelType || 'Petrol'}</span>
                          </td>
                          <td className="fw-medium text-dark">{v.currentOdometerReading || '--'} km</td>
                          <td className="text-end px-4">
                            <Link to={`/vehicles/${v._id}`} className="btn btn-sm btn-outline-primary py-1 px-2.5">
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recommendations Section */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm bg-card h-100 d-flex flex-column justify-content-between">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex align-items-center gap-2">
              <FaLightbulb className="text-warning" />
              <h5 className="fw-bold mb-0 text-navy">Advisor Recommendations</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 mb-2 rounded border border-warning bg-warning bg-opacity-10">
                    <div className="fw-bold text-dark small mb-1 d-flex align-items-center gap-1">
                      <FaLightbulb className="text-warning" /> Recommended Action
                    </div>
                    <div className="text-dark small mb-1">{rec.recommendation}</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      {rec.vehicle?.vehicleNumber ? `Vehicle: ${rec.vehicle.vehicleNumber} &bull; ` : ''}
                      {rec.date ? new Date(rec.date).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted bg-light rounded border border-dashed">
                  <small>No pending maintenance recommendations from your advisor.</small>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-transparent border-top p-3">
              <Link to="/request-service" className="btn btn-orange w-100 d-flex align-items-center justify-content-center gap-2">
                <FaTools /> <span>Request Vehicle Service</span>
              </Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Invoices Section */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaFileInvoiceDollar className="text-success" />
            <h5 className="fw-bold mb-0 text-navy">Recent Invoices & Payment Receipts</h5>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              icon={<FaFileInvoiceDollar size={40} className="text-muted opacity-50" />}
              title="No invoices available"
              message="Invoices for completed services will appear here with online payment options."
            />
          ) : (
            <div className="table-responsive border-0 rounded-0">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th className="px-4">Invoice No</th>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Grand Total</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th className="text-end px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv._id}>
                      <td className="px-4 fw-bold text-navy">{inv.invoiceNumber}</td>
                      <td>{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}</td>
                      <td>{inv.vehicle?.vehicleNumber || 'Vehicle'}</td>
                      <td className="fw-bold text-navy">₹{inv.grandTotal?.toFixed(2)}</td>
                      <td className={`fw-semibold ${inv.balanceDue > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{inv.balanceDue?.toFixed(2)}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-end px-4">
                        <Link to={`/billing/invoice/${inv._id}`} className="btn btn-sm btn-outline-primary">
                          View Invoice
                        </Link>
                      </td>
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

export default CustomerDashboard;
