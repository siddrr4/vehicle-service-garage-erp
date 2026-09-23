import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from 'react-bootstrap';
import {
  FaUserPlus,
  FaSearch,
  FaFilter,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaCheckCircle,
  FaExclamationCircle,
  FaUserClock,
  FaClock
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import employeeService from '../../services/employeeService';
import EmployeeFormModal from './EmployeeFormModal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import EmptyState from '../../components/UI/EmptyState';
import { formatTimeIST } from '../../utils/dateUtils';

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

  const getAvailabilityBadge = (emp) => {
    const today = emp.todayAttendance;
    
    // 1. Checked In: checkIn exists and checkOut does not exist (and not Absent/Leave)
    if (today && today.checkedIn && !today.checkedOut && today.status !== 'Absent' && today.status !== 'Leave') {
      return (
        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium">
          <FaCheckCircle size={11} />
          <span>Checked In {today.checkInTime ? `(${formatTimeIST(today.checkInTime)})` : ''}</span>
        </span>
      );
    }

    // 2. Checked Out: checkIn exists and checkOut exists
    if (today && today.checkedOut) {
      return (
        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium">
          <FaClock size={11} />
          <span>Checked Out {today.checkOutTime ? `(${formatTimeIST(today.checkOutTime)})` : ''}</span>
        </span>
      );
    }

    // 3. Explicit Absent
    if (today && (today.status === 'Absent' || today.attendanceStatus === 'Absent')) {
      return (
        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium">
          <FaExclamationCircle size={11} />
          <span>Absent</span>
        </span>
      );
    }

    // 4. Explicit Leave
    if (today && (today.status === 'Leave' || today.attendanceStatus === 'Leave')) {
      return (
        <span className="badge bg-warning bg-opacity-10 text-warning-emphasis border border-warning border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium" style={{ color: '#856404' }}>
          <FaExclamationCircle size={11} />
          <span>Leave</span>
        </span>
      );
    }

    // 5. Half Day
    if (today && (today.status === 'Half Day' || today.attendanceStatus === 'Half Day')) {
      return (
        <span className="badge px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium" style={{ backgroundColor: 'rgba(253, 126, 20, 0.12)', color: '#fd7e14', border: '1px solid rgba(253, 126, 20, 0.25)' }}>
          <FaClock size={11} />
          <span>Half Day</span>
        </span>
      );
    }

    // 6. Default: Not Checked In
    return (
      <span className="badge bg-light text-secondary border border-secondary border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-medium">
        <FaExclamationCircle className="text-warning" size={11} />
        <span>Not Checked In</span>
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return <span className="badge bg-success px-2 py-1 rounded-pill">Active</span>;
    }
    return <span className="badge bg-secondary px-2 py-1 rounded-pill">Inactive</span>;
  };

  const checkedInCount = employees.filter((e) => e.todayAttendance?.checkedIn && !e.todayAttendance?.checkedOut && e.todayAttendance?.status !== 'Absent' && e.todayAttendance?.status !== 'Leave').length;
  const notCheckedInCount = employees.filter((e) => !e.todayAttendance?.checkedIn).length;
  const checkedOutCount = employees.filter((e) => e.todayAttendance?.checkedOut).length;

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <PageHeader
        title="Staff & Technician Management"
        subtitle={`Directory of ${total} garage technicians, service advisors, and mechanics with real-time assignment status`}
        breadcrumbs={[
          { label: 'Employees', to: '/employees' },
          { label: 'Staff Directory' }
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link to="/admin-attendance" className="btn btn-outline-navy d-flex align-items-center gap-2 shadow-sm">
              <FaUserClock className="text-orange" /> <span>Manage Attendance</span>
            </Link>
            <button className="btn btn-orange d-flex align-items-center gap-2 shadow-sm" onClick={handleOpenAddModal}>
              <FaUserPlus /> <span>Add New Employee</span>
            </button>
          </div>
        }
      />

      {/* Quick Attendance & Staff Status Bar */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-primary h-100">
            <div className="text-muted small text-uppercase fw-semibold">Total Staff</div>
            <div className="fs-4 fw-bold text-navy">{total}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-success h-100">
            <div className="text-muted small text-uppercase fw-semibold">Checked In Today</div>
            <div className="fs-4 fw-bold text-success">{checkedInCount}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-warning h-100">
            <div className="text-muted small text-uppercase fw-semibold">Not Checked In</div>
            <div className="fs-4 fw-bold text-warning">{notCheckedInCount}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-secondary h-100">
            <div className="text-muted small text-uppercase fw-semibold">Shift Ended (Checked Out)</div>
            <div className="fs-4 fw-bold text-secondary">{checkedOutCount}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-4">
          <form onSubmit={handleSearch} className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Search by ID, Name, Email, Specialization..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-2">
              <select className="form-select bg-light" value={roleFilter} onChange={handleFilterChange(setRoleFilter, 'role')}>
                <option value="">All Roles</option>
                <option value="Mechanic">Mechanic</option>
                <option value="Service Advisor">Service Advisor</option>
              </select>
            </div>

            <div className="col-md-2">
              <select className="form-select bg-light" value={availabilityFilter} onChange={handleFilterChange(setAvailabilityFilter, 'availability')}>
                <option value="">All Availability</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Not Checked In">Not Checked In</option>
                <option value="Leave">On Leave</option>
              </select>
            </div>

            <div className="col-md-2">
              <select className="form-select bg-light" value={statusFilter} onChange={handleFilterChange(setStatusFilter, 'status')}>
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
      </div>

      {/* Employee Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={FaUserTie}
            title="No employees found"
            description="Try adjusting your search criteria or register a new employee to the team."
            actionLabel="Add New Employee"
            onAction={handleOpenAddModal}
          />
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
                  <th className="px-3 py-3 border-0 text-center" style={{ minWidth: '220px' }}>Actions</th>
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
                    <td className="px-3 py-3">{getAvailabilityBadge(emp)}</td>
                    <td className="px-3 py-3">{getStatusBadge(emp.status)}</td>
                    <td className="px-3 py-3">
                      <div className="d-flex gap-1.5 justify-content-center align-items-center flex-wrap">
                        {/* Attendance Link */}
                        <Link
                          to="/admin-attendance"
                          className="btn btn-sm btn-light text-navy border px-2.5 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
                          title="View Attendance Console"
                        >
                          <FaUserClock size={12} className="text-orange" />
                          <span className="small fw-semibold">Attendance</span>
                        </Link>

                        {/* Edit Employee */}
                        <button
                          className="btn btn-sm btn-light text-primary border px-2 py-1"
                          onClick={() => handleOpenEditModal(emp)}
                          title="Edit Employee Details"
                        >
                          <FaEdit size={13} />
                        </button>

                        {/* Delete Employee */}
                        <button
                          className="btn btn-sm btn-light text-danger border px-2 py-1"
                          onClick={() => { setDeleteId(emp._id); setShowDeleteModal(true); }}
                          title="Delete Employee"
                        >
                          <FaTrash size={13} />
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
