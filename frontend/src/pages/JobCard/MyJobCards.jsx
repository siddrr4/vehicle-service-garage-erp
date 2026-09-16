import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWrench, FaCalendarAlt, FaCheckCircle, FaClock, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jobCardService from '../../services/jobCardService';
import billingService from '../../services/billingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatDateIST } from '../../utils/dateUtils';

const MyJobCards = () => {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyJobCards = async () => {
      try {
        const data = await jobCardService.getMyJobCards();
        setJobCards(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to fetch your job cards');
        setLoading(false);
      }
    };
    fetchMyJobCards();
  }, []);

  const handleViewInvoice = async (jobCardId) => {
    try {
      const invoice = await billingService.getInvoiceByJobCard(jobCardId);
      if (invoice && invoice._id) {
        navigate(`/billing/invoice/${invoice._id}`);
      } else {
        toast.info('Invoice not generated yet.');
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.info('Invoice not generated yet.');
      } else {
        toast.error('Error checking invoice status.');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Completed':
        return <span className="badge bg-success px-3 py-2 rounded-pill"><FaCheckCircle className="me-1"/> {status}</span>;
      case 'Pending':
      case 'Open':
        return <span className="badge bg-primary px-3 py-2 rounded-pill"><FaClock className="me-1"/> Open</span>;
      case 'In Progress':
        return <span className="badge bg-info text-dark px-3 py-2 rounded-pill"><FaTools className="me-1"/> {status}</span>;
      case 'Waiting for Parts':
        return <span className="badge bg-warning text-dark px-3 py-2 rounded-pill"><FaWrench className="me-1"/> {status}</span>;
      default:
        return <span className="badge bg-secondary px-3 py-2 rounded-pill">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h2 className="fw-bold m-0 text-navy">My Job Cards</h2>
        <p className="text-muted mb-0">Track the repair status of your vehicles</p>
      </div>

      {jobCards.length === 0 ? (
        <div className="bg-card rounded shadow-sm p-5 text-center text-muted">
          <FaWrench size={48} className="mb-3 opacity-50" />
          <h5>No Job Cards Found</h5>
          <p>You don't have any active or past job cards at the moment.</p>
        </div>
      ) : (
        <div className="row g-4">
          {jobCards.map((jc) => (
            <div className="col-md-6 col-lg-4" key={jc._id}>
              <div className="card h-100 border-0 shadow-sm custom-card">
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-navy fs-5">{jc.jobNumber}</span>
                  {getStatusBadge(jc.status)}
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <p className="text-muted small mb-1">Vehicle</p>
                    <p className="fw-medium mb-0">
                      {jc.vehicle?.brand} {jc.vehicle?.model} <br/>
                      <span className="badge bg-light text-dark border mt-1">{jc.vehicle?.vehicleNumber}</span>
                    </p>
                  </div>
                  <div className="mb-3">
                    <p className="text-muted small mb-1">Complaint</p>
                    <p className="mb-0 text-truncate" style={{maxHeight: '4.5em', overflow: 'hidden'}}>{jc.complaint}</p>
                  </div>
                  {jc.workDescription && (
                    <div className="mb-3">
                      <p className="text-muted small mb-1">Work Description</p>
                      <p className="mb-0 text-truncate" style={{maxHeight: '3em', overflow: 'hidden'}}>{jc.workDescription}</p>
                    </div>
                  )}
                  {jc.invoice ? (
                    <div className="mt-3 pt-3 border-top small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Invoice No:</span>
                        <span className="fw-medium text-dark">{jc.invoice.invoiceNumber || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Total Amount:</span>
                        <strong className="text-dark">₹{jc.invoice.grandTotal.toFixed(2)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Paid Amount:</span>
                        <span className="text-success fw-medium">₹{jc.invoice.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Balance Due:</span>
                        <strong className="text-danger">₹{jc.invoice.balanceDue.toFixed(2)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-top small text-muted">
                      {jc.servicesPerformed && jc.servicesPerformed.length > 0 && (
                        <div className="mb-2">
                          <span className="fw-semibold text-dark">Services:</span>{' '}
                          {jc.servicesPerformed.map(s => s.serviceName).join(', ')}
                        </div>
                      )}
                      <div className="d-flex justify-content-between mb-1">
                        <span>Current Stage:</span>
                        <span className="fw-semibold text-primary">{jc.status}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Estimated Cost:</span>
                        <strong className="text-dark">₹{(jc.estimatedCost || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-footer bg-light border-top-0 rounded-bottom p-3">
                  <div className="d-flex justify-content-between align-items-center small mb-2">
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <FaCalendarAlt />
                      {jc.status === 'Completed' || jc.status === 'Delivered' ? (
                        <span>Completion Date: {jc.completionTime ? formatDateIST(jc.completionTime) : 'N/A'}</span>
                      ) : (
                        <span>Est. Delivery: {jc.estimatedDeliveryDate ? formatDateIST(jc.estimatedDeliveryDate) : 'N/A'}</span>
                      )}
                    </div>
                  </div>
                  {(jc.status === 'Completed' || jc.status === 'Delivered') && (
                    <div className="mb-2 small d-flex justify-content-between">
                      <span className="text-muted">Invoice Status:</span>
                      <strong className={jc.invoice ? (jc.invoice.status === 'Paid' ? 'text-success' : 'text-danger') : 'text-secondary'}>
                        {jc.invoice ? jc.invoice.status : 'Pending'}
                      </strong>
                    </div>
                  )}
                  <div className="d-grid gap-2 mt-2 border-top pt-2">
                    <button
                      className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => navigate(`/job-cards/${jc._id}`)}
                    >
                      <FaTools /> View Job Details
                    </button>

                    {(jc.status === 'Completed' || jc.status === 'Delivered') && (
                      <>
                        {jc.invoice ? (
                          <>
                            <button
                              className="btn btn-orange btn-sm w-100"
                              onClick={() => navigate(`/billing/invoice/${jc.invoice._id}`)}
                            >
                              View Invoice
                            </button>
                            {jc.invoice.status === 'Unpaid' && (
                              <button
                                className="btn btn-primary btn-sm w-100"
                                onClick={() => navigate(`/billing/invoice/${jc.invoice._id}`)}
                              >
                                Pay Now (₹{jc.invoice.balanceDue.toFixed(2)})
                              </button>
                            )}
                            {jc.invoice.status === 'Partially Paid' && (
                              <button
                                className="btn btn-warning text-dark btn-sm fw-semibold w-100"
                                onClick={() => navigate(`/billing/invoice/${jc.invoice._id}`)}
                              >
                                Pay Remaining (₹{jc.invoice.balanceDue.toFixed(2)})
                              </button>
                            )}
                            {jc.invoice.status === 'Paid' && (
                              <span className="badge bg-success py-2 w-100">Paid ✓</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted small text-center">Invoice pending generation</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyJobCards;
