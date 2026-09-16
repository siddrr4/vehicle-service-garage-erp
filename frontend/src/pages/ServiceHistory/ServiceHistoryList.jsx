import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaHistory, FaSearch, FaEye, FaFileInvoiceDollar, FaFilter, FaSync } from 'react-icons/fa';
import serviceHistoryService from '../../services/serviceHistoryService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';

const ServiceHistoryList = () => {
  const { user } = useContext(AuthContext);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let res;
      if (user.role === 'customer') {
        res = await serviceHistoryService.getMyServiceHistory();
        setHistoryRecords(res);
        setTotalPages(1); // Usually we don't paginate 'my-history' strictly, or we can just render the array
      } else {
        res = await serviceHistoryService.getServiceHistory(currentPage, limit, filters);
        setHistoryRecords(res.history || []);
        setTotalPages(res.pages || 1);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load service history');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentPage, user.role]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory();
  };

  const resetFilters = () => {
    setFilters({ startDate: '', endDate: '' });
    setCurrentPage(1);
    fetchHistory();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid px-0 px-md-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-navy fw-bold mb-1">
            <FaHistory className="me-2 text-orange" />
            Service History
          </h2>
          <p className="text-muted mb-0">View and manage complete vehicle service records</p>
        </div>
      </div>

      {user.role !== 'customer' && (
        <div className="bg-card p-3 p-md-4 rounded shadow-sm mb-4">
          <form onSubmit={applyFilters} className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Date From</label>
              <input
                type="date"
                className="form-control"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Date To</label>
              <input
                type="date"
                className="form-control"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-4 d-flex gap-2">
              <button type="submit" className="btn btn-navy flex-grow-1">
                <FaSearch className="me-2" /> Search
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
                <FaSync /> Reset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded shadow-sm">
        {historyRecords.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaHistory size={48} className="mb-3 opacity-50" />
            <p>No completed service history found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Service Date</th>
                  <th>Job Card</th>
                  {user.role !== 'customer' && <th>Customer</th>}
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Mechanic</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <div className="fw-bold">{formatDateIST(record.serviceDate)}</div>
                    </td>
                    <td>
                      <span className="text-primary fw-bold">{record.jobCard?.jobNumber || 'N/A'}</span>
                    </td>
                    {user.role !== 'customer' && (
                      <td>
                        <div className="fw-bold">{record.customer?.fullName}</div>
                        <small className="text-muted">{record.customer?.mobileNumber}</small>
                      </td>
                    )}
                    <td>
                      <div className="fw-bold">{record.vehicle?.vehicleNumber}</div>
                      <small className="text-muted">{record.vehicle?.brand} {record.vehicle?.model}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{record.jobCard?.serviceType || 'General'}</span>
                      {record.isFreeService && (
                         <span className="badge bg-success ms-1">Free #{record.freeServiceNumber}</span>
                      )}
                    </td>
                    <td>{record.jobCard?.assignedMechanic?.firstName || 'Unassigned'}</td>
                    <td className="fw-bold">
                      {record.invoice ? `₹${record.invoice.grandTotal.toFixed(2)}` : 'Pending'}
                    </td>
                    <td>
                      {record.invoice ? (
                        <span className={`badge ${record.invoice.status === 'Paid' ? 'bg-success' : record.invoice.status === 'Partially Paid' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                          {record.invoice.status}
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark">Awaiting Invoice</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link to={`/service-history/${record._id}`} className="btn btn-sm btn-outline-primary" title="View Details">
                          <FaEye /> View
                        </Link>
                        {record.invoice && (
                          <Link to={`/billing/invoice/${record.invoice._id}`} className="btn btn-sm btn-outline-success" title="View Invoice">
                            <FaFileInvoiceDollar />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default ServiceHistoryList;
