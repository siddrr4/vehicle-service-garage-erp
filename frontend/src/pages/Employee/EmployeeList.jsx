import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaUserPlus, FaSearch, FaFilter, FaEdit, FaTrash, FaUserTie, FaCheckCircle, FaExclamationCircle, FaUserClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import employeeService from '../../services/employeeService';
import EmployeeFormModal from './EmployeeFormModal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter State
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Confirmation Delete Modal
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchEmployees = async (
    currentPage = page,
    search = keyword,
    role = roleFilter,
    availability = availabilityFilter,
    status = statusFilter
  ) => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployees(currentPage, 10, search, role, availability, status);
      setEmployees(data.employees);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch employee list');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees(1, keyword, roleFilter, availabilityFilter, statusFilter);
  };

  const handleFilterChange = (setter, key) => (e) => {
    const val = e.target.value;
    setter(val);
    setPage(1);
    const newFilters = {
      role: key === 'role' ? val : roleFilter,
      availability: key === 'availability' ? val : availabilityFilter,
      status: key === 'status' ? val : statusFilter,
    };
    fetchEmployees(1, keyword, newFilters.role, newFilters.availability, newFilters.status);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setShowModal(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setSubmitting(true);
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee._id, formData);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.createEmployee(formData);
        toast.success('Employee added successfully');
      }
      setShowModal(false);
      setSubmitting(false);
      fetchEmployees(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await employeeService.deleteEmployee(deleteId);
      toast.success('Employee removed successfully');
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchEmployees(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete employee');
      setShowDeleteModal(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'Mechanic') return <span className="badge bg-primary text-white rounded-pill px-3 py-1 fw-medium">Mechanic</span>;
    return <span className="badge bg-purple text-white rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#6f42c1' }}>Service Advisor</span>;
  };

  const getAvailabilityBadge = (availability) => {
    switch (availability) {
      case 'Available':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill"><FaCheckCircle className="me-1" /> Available</span>;
      case 'Busy':
        return <span className="badge bg-warning bg-opacity-10 text-warning text-dark border border-warning border-opacity-25 px-2 py-1 rounded-pill"><FaUserClock className="me-1" /> Busy</span>;
      case 'Leave':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill"><FaExclamationCircle className="me-1" /> Leave</span>;
      default:
        return <span className="badge bg-secondary px-2 py-1 rounded-pill">{availability}</span>;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return <span className="badge bg-success px-2 py-1 rounded-pill">Active</span>;
    }
    return <span className="badge bg-secondary px-2 py-1 rounded-pill">Inactive</span>;
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
            <FaUserTie /> Mechanic & Employee Management
          </h2>
          <p className="text-muted mb-0">View, register, and manage garage staff and mechanics</p>
        </div>
        <Button className="btn-primary-custom d-flex align-items-center gap-2 px-3 py-2 shadow-sm" onClick={handleOpenAddModal}>
          <FaUserPlus /> <span>Add New Employee</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <form onSubmit={handleSearch} className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaSearch className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by ID, Name, Email, Specialization..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={roleFilter} onChange={handleFilterChange(setRoleFilter, 'role')}>
              <option value="">All Roles</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Service Advisor">Service Advisor</option>
            </select>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={availabilityFilter} onChange={handleFilterChange(setAvailabilityFilter, 'availability')}>
              <option value="">All Availability</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Leave">On Leave</option>
            </select>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter, 'status')}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="col-md-2">
            <button type="submit" className="btn btn-navy w-100 d-flex align-items-center justify-content-center gap-2">
              <FaFilter size={14} /> <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* Employee Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : employees.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <h5>No employees found</h5>
            <p>Try adjusting your search criteria or register a new employee.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 custom-table">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="px-3 py-3 border-0">Emp ID</th>
                  <th className="px-3 py-3 border-0">Full Name</th>
                  <th className="px-3 py-3 border-0">Contact</th>
                  <th className="px-3 py-3 border-0">Role</th>
                  <th className="px-3 py-3 border-0">Specialization</th>
                  <th className="px-3 py-3 border-0">Exp.</th>
                  <th className="px-3 py-3 border-0">Availability</th>
                  <th className="px-3 py-3 border-0">Status</th>
                  <th className="px-3 py-3 border-0 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    <td className="px-3 py-3 fw-bold text-navy">{emp.employeeId}</td>
                    <td className="px-3 py-3">
                      <div className="fw-semibold text-dark">{emp.fullName}</div>
                      <small className="text-muted">Joined: {new Date(emp.joiningDate).toLocaleDateString()}</small>
                    </td>
                    <td className="px-3 py-3">
                      <div className="small fw-medium">{emp.email}</div>
                      <div className="small text-muted">{emp.phone}</div>
                    </td>
                    <td className="px-3 py-3">{getRoleBadge(emp.role)}</td>
                    <td className="px-3 py-3 fw-medium text-secondary">{emp.specialization}</td>
                    <td className="px-3 py-3 fw-semibold">{emp.experience} yrs</td>
                    <td className="px-3 py-3">{getAvailabilityBadge(emp.availability)}</td>
                    <td className="px-3 py-3">{getStatusBadge(emp.status)}</td>
                    <td className="px-3 py-3">
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          className="btn btn-sm btn-light text-primary border"
                          onClick={() => handleOpenEditModal(emp)}
                          title="Edit Employee"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-light text-danger border"
                          onClick={() => { setDeleteId(emp._id); setShowDeleteModal(true); }}
                          title="Delete Employee"
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
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 gap-3 text-center">
          <div className="small text-muted">
            Showing <strong>{employees.length}</strong> of <strong>{total}</strong> employees
          </div>
          <nav>
            <ul className="pagination mb-0 justify-content-center">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchEmployees(page - 1)}>Previous</button>
              </li>
              {[...Array(pages).keys()].map((x) => (
                <li key={x + 1} className={`page-item ${x + 1 === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => fetchEmployees(x + 1)}>{x + 1}</button>
                </li>
              ))}
              <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchEmployees(page + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      <EmployeeFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={handleFormSubmit}
        initialData={editingEmployee}
        loading={submitting}
      />

      {/* Confirmation Modal for Delete */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold text-danger">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <p className="mb-0">Are you sure you want to delete this employee record?</p>
          <small className="text-muted">This action cannot be undone.</small>
        </Modal.Body>
        <Modal.Footer className="justify-content-center bg-light">
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
            Yes, Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeList;
