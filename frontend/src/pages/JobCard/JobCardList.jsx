import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaFilter, FaUserPlus, FaWrench, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jobCardService from '../../services/jobCardService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import AssignMechanicModal from './AssignMechanicModal';

const JobCardList = () => {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Assign Mechanic Modal State
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchJobCards = async (currentPage = 1, search = keyword, status = statusFilter) => {
    try {
      setLoading(true);
      const data = await jobCardService.getJobCards(currentPage, 10, search, status);
      setJobCards(data.jobCards);
      setPage(data.page);
      setPages(data.pages);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch job cards');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobCards(1, keyword, statusFilter);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
    fetchJobCards(1, keyword, e.target.value);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job card?')) {
      try {
        await jobCardService.deleteJobCard(id);
        toast.success('Job card deleted successfully');
        fetchJobCards(page);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete job card');
      }
    }
  };

  const openAssignModal = (jobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignModal(true);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-warning text-dark';
      case 'Assigned': return 'bg-primary';
      case 'In Progress': return 'bg-info text-dark';
      case 'Completed': return 'bg-success';
      case 'Delivered': return 'bg-dark';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'text-danger fw-bold';
      case 'Medium': return 'text-warning fw-bold';
      case 'Low': return 'text-info fw-bold';
      default: return '';
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-navy">Job Cards</h2>
          <p className="text-muted mb-0">Manage all garage job cards and mechanic assignments</p>
        </div>
        <Link to="/job-cards/add" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <FaPlus /> <span>Create Job Card</span>
        </Link>
      </div>

      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <form onSubmit={handleSearch} className="row g-3 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaSearch className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by Job Card Number..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaFilter className="text-muted" />
              </span>
              <select
                className="form-select border-start-0"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="col-md-3">
            <button type="submit" className="btn btn-navy w-100">Search</button>
          </div>
        </form>
      </div>

      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : jobCards.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <h5>No job cards found</h5>
            <p>Try adjusting your search criteria or create a new job card.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table">
              <thead className="table-light">
                <tr>
                  <th>Job No.</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Assigned Mechanic</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Date Created</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobCards.map((jc) => (
                  <tr key={jc._id}>
                    <td>
                      <span className="fw-bold text-navy">{jc.jobNumber}</span>
                    </td>
                    <td>
                      <div className="fw-medium">{jc.customer?.fullName}</div>
                      <div className="small text-muted">{jc.customer?.mobileNumber}</div>
                    </td>
                    <td>
                      <div className="fw-medium">{jc.vehicle?.vehicleNumber}</div>
                      <div className="small text-muted">{jc.vehicle?.brand} {jc.vehicle?.model}</div>
                    </td>
                    <td>
                      {jc.assignedMechanic ? (
                        <div>
                          <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                            <FaWrench size={12} className="text-primary" /> {jc.assignedMechanic.fullName}
                          </div>
                          <small className="text-muted">{jc.assignedMechanic.employeeId} ({jc.assignedMechanic.specialization || 'Mechanic'})</small>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-secondary text-white fw-normal">Not Assigned</span>
                          <button
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                            onClick={() => openAssignModal(jc)}
                          >
                            <FaUserPlus size={12} /> <span>Assign Mechanic</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(jc.status)} px-2 py-1 rounded-pill`}>
                        {jc.status}
                      </span>
                    </td>
                    <td>
                      <span className={getPriorityBadgeClass(jc.priority)}>{jc.priority}</span>
                    </td>
                    <td>
                      {new Date(jc.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="d-flex gap-2 justify-content-center">
                        <Link to={`/job-cards/${jc._id}`} className="btn btn-sm btn-light text-secondary border" title="View Details">
                          <FaEye />
                        </Link>
                        <button
                          className="btn btn-sm btn-light text-secondary border"
                          onClick={() => openAssignModal(jc)}
                          title="Assign / Reassign Mechanic"
                        >
                          <FaUserPlus />
                        </button>
                        <Link to={`/job-cards/edit/${jc._id}`} className="btn btn-sm btn-light text-primary border" title="Edit Job Card">
                          <FaEdit />
                        </Link>
                        <button
                          className="btn btn-sm btn-light text-danger border"
                          onClick={() => handleDelete(jc._id)}
                          title="Delete Job Card"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchJobCards(page - 1)}>Previous</button>
              </li>
              {[...Array(pages).keys()].map(x => (
                <li key={x + 1} className={`page-item ${x + 1 === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => fetchJobCards(x + 1)}>{x + 1}</button>
                </li>
              ))}
              <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchJobCards(page + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Assign Mechanic Modal */}
      <AssignMechanicModal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        jobCard={selectedJobCard}
        onSuccess={() => fetchJobCards(page)}
      />
    </div>
  );
};

export default JobCardList;
