import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FaUser, FaCar, FaTools, FaFileInvoiceDollar, 
  FaCalendarAlt, FaCheckCircle, FaClipboardList, FaClock 
} from 'react-icons/fa';
import serviceHistoryService from '../../services/serviceHistoryService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';

const ServiceHistoryDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await serviceHistoryService.getServiceHistoryById(id);
        setHistory(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load service history details');
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!history) return <div className="text-center py-5">Service history not found.</div>;

  const { customer, vehicle, jobCard, invoice } = history;

  return (
    <div className="container-fluid px-0 px-md-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-navy fw-bold mb-1">
            Service Record: {jobCard?.jobNumber}
          </h2>
          <p className="text-muted mb-0">
            <FaCalendarAlt className="me-1" /> Completed on {new Date(history.serviceDate).toLocaleDateString()}
          </p>
        </div>
        <div>
          {invoice && (
            <Link to={`/billing/invoice/${invoice._id}`} className="btn btn-outline-success me-2">
              <FaFileInvoiceDollar className="me-2" /> View Invoice
            </Link>
          )}
          {user.role !== 'customer' && (
            <Link to="/service-history" className="btn btn-outline-secondary">
              Back to History
            </Link>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column - Details */}
        <div className="col-12 col-lg-8">
          
          {/* Work Performed */}
          <div className="bg-card p-4 rounded shadow-sm mb-4">
            <h5 className="fw-bold mb-3 border-bottom pb-2 text-navy">
              <FaClipboardList className="me-2 text-orange" /> Work Performed
            </h5>
            
            <div className="row mb-3">
              <div className="col-md-6">
                <span className="text-muted d-block small fw-bold">Customer Complaint</span>
                <p className="mb-2">{jobCard?.complaint || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <span className="text-muted d-block small fw-bold">Assigned Mechanic</span>
                <p className="mb-2">{jobCard?.assignedMechanic ? `${jobCard.assignedMechanic.firstName} ${jobCard.assignedMechanic.lastName}` : 'N/A'}</p>
              </div>
            </div>

            <div className="mb-3">
              <span className="text-muted d-block small fw-bold">Diagnosis / Work Performed</span>
              <div className="p-3 bg-light rounded border">
                {jobCard?.workDescription || 'No work description provided.'}
              </div>
            </div>
            
            {history.isFreeService && (
              <div className="alert alert-success mt-3 py-2 border-0">
                <FaCheckCircle className="me-2" /> 
                <strong>Free Service Applied</strong> (Service #{history.freeServiceNumber}) - Labour & Washing charges waived.
              </div>
            )}
          </div>

          {/* Spare Parts Used */}
          <div className="bg-card p-4 rounded shadow-sm mb-4">
            <h5 className="fw-bold mb-3 border-bottom pb-2 text-navy">
              <FaTools className="me-2 text-orange" /> Spare Parts Consumed
            </h5>
            
            {jobCard?.partsUsed && jobCard.partsUsed.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Part Name</th>
                      <th>Part Number</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCard.partsUsed.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.part?.partName}</td>
                        <td>{item.part?.partNumber}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-end">₹{item.part?.sellingPrice?.toFixed(2)}</td>
                        <td className="text-end fw-bold">₹{(item.quantity * item.part?.sellingPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-center my-4">No spare parts were consumed for this service.</p>
            )}
          </div>

        </div>

        {/* Right Column - Summary */}
        <div className="col-12 col-lg-4">
          
          {/* Service Charges Summary */}
          <div className="bg-card p-4 rounded shadow-sm mb-4 border-top border-orange border-4">
            <h5 className="fw-bold mb-3 text-navy">Service Charges</h5>
            
            {invoice ? (
              <>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Total Labour</span>
                  <span>{history.isFreeService ? <del className="text-muted">₹{invoice.totalLabour}</del> : `₹${invoice.totalLabour.toFixed(2)}`}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Total Washing</span>
                  <span>{history.isFreeService ? <del className="text-muted">₹{invoice.totalWashing}</del> : `₹${invoice.totalWashing.toFixed(2)}`}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Spare Parts</span>
                  <span>₹{invoice.totalParts.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Tax</span>
                  <span>₹{invoice.taxAmount.toFixed(2)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Discount</span>
                    <span>-₹{invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-bold text-navy fs-5">Grand Total</span>
                  <span className="fw-bold text-navy fs-5">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                  <span className="small fw-bold text-muted">Payment Status</span>
                  <span className={`badge ${invoice.status === 'Paid' ? 'bg-success' : invoice.status === 'Partially Paid' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                    {invoice.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="alert alert-warning py-2 small">
                Invoice generation pending.
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="bg-card p-4 rounded shadow-sm mb-4">
            <h5 className="fw-bold mb-3 border-bottom pb-2 text-navy">
              <FaCar className="me-2 text-orange" /> Vehicle Info
            </h5>
            <div className="mb-2">
              <span className="text-muted small d-block">Registration</span>
              <span className="fw-bold">{vehicle?.vehicleNumber}</span>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">Make & Model</span>
              <span>{vehicle?.brand} {vehicle?.model} ({vehicle?.yearOfManufacture})</span>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">Odometer at Service</span>
              <span>{history.odometerReading} km</span>
            </div>
            <div className="mb-0">
              <span className="text-muted small d-block">VIN / Chassis</span>
              <span>{vehicle?.vinNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Customer Info (Hide for customers themselves) */}
          {user.role !== 'customer' && (
            <div className="bg-card p-4 rounded shadow-sm">
              <h5 className="fw-bold mb-3 border-bottom pb-2 text-navy">
                <FaUser className="me-2 text-orange" /> Customer Info
              </h5>
              <div className="mb-2">
                <span className="text-muted small d-block">Name</span>
                <span className="fw-bold">{customer?.fullName}</span>
              </div>
              <div className="mb-2">
                <span className="text-muted small d-block">Contact</span>
                <span>{customer?.mobileNumber}</span>
              </div>
              <div className="mb-0">
                <span className="text-muted small d-block">Email</span>
                <span>{customer?.emailAddress || 'N/A'}</span>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Timeline Section */}
      <div className="row mt-4 mb-5">
        <div className="col-12">
          <div className="bg-card p-4 rounded shadow-sm">
            <h5 className="fw-bold mb-4 text-navy">
              <FaClock className="me-2 text-orange" /> Service Timeline
            </h5>
            <div className="timeline-container px-3">
              <div className="d-flex flex-column gap-3">
                <div className="d-flex gap-3 align-items-start">
                  <div className="bg-primary rounded-circle mt-1" style={{ width: '12px', height: '12px' }}></div>
                  <div>
                    <h6 className="mb-1 fw-bold">Service Completed</h6>
                    <p className="text-muted small mb-0">{new Date(history.serviceDate).toLocaleString()}</p>
                  </div>
                </div>
                {invoice && (
                  <div className="d-flex gap-3 align-items-start">
                    <div className="bg-success rounded-circle mt-1" style={{ width: '12px', height: '12px' }}></div>
                    <div>
                      <h6 className="mb-1 fw-bold">Invoice Generated</h6>
                      <p className="text-muted small mb-0">{new Date(invoice.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ServiceHistoryDetails;
