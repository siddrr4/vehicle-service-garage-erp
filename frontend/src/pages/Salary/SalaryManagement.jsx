import React, { useState, useEffect } from 'react';
import { Button, Modal, Badge, Card, Row, Col, Table, Form } from 'react-bootstrap';
import { 
  FaMoneyBillWave, FaSearch, FaFilter, FaEdit, FaTrash, 
  FaPlus, FaCheckCircle, FaTimesCircle, FaCalendarAlt, 
  FaUserTie, FaCoins, FaCalculator 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import salaryService from '../../services/salaryService';
import employeeService from '../../services/employeeService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const SalaryManagement = () => {
  const [structures, setStructures] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [keyword, setKeyword] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const initialFormState = {
    employee: '',
    salaryType: 'Monthly',
    basicSalary: '',
    allowances: [
      { name: 'HRA', amount: 0 },
      { name: 'Conveyance', amount: 0 }
    ],
    deductions: [
      { name: 'PF', amount: 0 },
      { name: 'ESI', amount: 0 }
    ],
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true,
    remarks: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Employees for dropdown
  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees(1, 100);
      setAllEmployees(data.employees || []);
    } catch (err) {
      console.error('Failed to load employees for salary dropdown', err);
    }
  };

  // Fetch Salary Structures
  const fetchStructures = async (
    currentPage = page,
    search = keyword,
    type = salaryTypeFilter,
    status = statusFilter
  ) => {
    try {
      setLoading(true);
      const data = await salaryService.getSalaryStructures({
        page: currentPage,
        limit: 10,
        keyword: search,
        salaryType: type,
        isActive: status,
      });
      setStructures(data.salaryStructures || data.structures || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch salary structures');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    fetchStructures();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStructures(1, keyword, salaryTypeFilter, statusFilter);
  };

  const handleFilterChange = (setter, key) => (e) => {
    const val = e.target.value;
    setter(val);
    setPage(1);
    fetchStructures(
      1,
      keyword,
      key === 'type' ? val : salaryTypeFilter,
      key === 'status' ? val : statusFilter
    );
  };

  const handleOpenAddModal = () => {
    setEditingStructure(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingStructure(item);
    setFormData({
      employee: item.employee?._id || item.employee,
      salaryType: item.salaryType || 'Monthly',
      basicSalary: item.basicSalary || '',
      allowances: Array.isArray(item.allowanceItems) && item.allowanceItems.length > 0
        ? item.allowanceItems.map(a => ({ name: a.name, amount: a.amount }))
        : (Array.isArray(item.allowances) && item.allowances.length > 0
            ? item.allowances.map(a => ({ name: a.name, amount: a.amount }))
            : [{ name: 'Allowance', amount: item.allowances || 0 }]),
      deductions: Array.isArray(item.deductionItems) && item.deductionItems.length > 0
        ? item.deductionItems.map(d => ({ name: d.name, amount: d.amount }))
        : (Array.isArray(item.deductions) && item.deductions.length > 0
            ? item.deductions.map(d => ({ name: d.name, amount: d.amount }))
            : [{ name: 'Deduction', amount: item.deductions || 0 }]),
      effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isActive: item.isActive !== undefined ? item.isActive : true,
      remarks: item.remarks || '',
    });
    setShowModal(true);
  };

  // Dynamic Allowance row management
  const handleAddAllowance = () => {
    setFormData({
      ...formData,
      allowances: [...formData.allowances, { name: '', amount: 0 }],
    });
  };

  const handleRemoveAllowance = (index) => {
    const updated = formData.allowances.filter((_, i) => i !== index);
    setFormData({ ...formData, allowances: updated });
  };

  const handleAllowanceChange = (index, field, value) => {
    const updated = [...formData.allowances];
    updated[index][field] = field === 'amount' ? Number(value) || 0 : value;
    setFormData({ ...formData, allowances: updated });
  };

  // Dynamic Deduction row management
  const handleAddDeduction = () => {
    setFormData({
      ...formData,
      deductions: [...formData.deductions, { name: '', amount: 0 }],
    });
  };

  const handleRemoveDeduction = (index) => {
    const updated = formData.deductions.filter((_, i) => i !== index);
    setFormData({ ...formData, deductions: updated });
  };

  const handleDeductionChange = (index, field, value) => {
    const updated = [...formData.deductions];
    updated[index][field] = field === 'amount' ? Number(value) || 0 : value;
    setFormData({ ...formData, deductions: updated });
  };

  // Form Calculations
  const calculatedAllowances = formData.allowances.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const calculatedDeductions = formData.deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const calculatedBasic = Number(formData.basicSalary) || 0;
  const calculatedNet = Math.max(0, calculatedBasic + calculatedAllowances - calculatedDeductions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee) {
      toast.error('Please select an employee');
      return;
    }
    if (formData.basicSalary === '' || isNaN(Number(formData.basicSalary))) {
      toast.error('Please enter a valid basic salary');
      return;
    }
    if (Number(formData.basicSalary) < 0) {
      toast.error('Basic salary cannot be negative');
      return;
    }
    if (formData.allowances.some(a => Number(a.amount) < 0)) {
      toast.error('Allowance amounts cannot be negative');
      return;
    }
    if (formData.deductions.some(d => Number(d.amount) < 0)) {
      toast.error('Deduction amounts cannot be negative');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStructure) {
        await salaryService.updateSalaryStructure(editingStructure._id, formData);
        toast.success('Salary structure updated successfully');
      } else {
        await salaryService.createSalaryStructure(formData);
        toast.success('Salary structure configured successfully');
      }
      setShowModal(false);
      setSubmitting(false);
      fetchStructures(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save salary structure');
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await salaryService.toggleSalaryStructureStatus(id);
      toast.success('Status updated successfully');
      fetchStructures(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    try {
      await salaryService.deleteSalaryStructure(deletingId);
      toast.success('Salary structure deleted');
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchStructures(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  // Stats calculation
  const totalConfigured = total;
  const activeCount = structures.filter(s => s.isActive).length;
  const monthlyCount = structures.filter(s => s.salaryType === 'Monthly').length;

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold m-0 text-navy d-flex align-items-center gap-2">
            <FaMoneyBillWave /> Employee Salary Structures
          </h2>
          <p className="text-muted mb-0">Configure salary packages, allowances, and statutory deductions for garage staff</p>
        </div>
        <Button 
          className="btn-primary-custom d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FaPlus /> <span>Configure New Salary</span>
        </Button>
      </div>

      {/* Overview Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                <FaUserTie size={24} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Total Configured</div>
                <h4 className="fw-bold text-navy mb-0">{totalConfigured}</h4>
              </div>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                <FaCheckCircle size={24} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Active Structures</div>
                <h4 className="fw-bold text-navy mb-0">{activeCount}</h4>
              </div>
            </div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded p-3 bg-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-info bg-opacity-10 text-info rounded-circle">
                <FaCoins size={24} />
              </div>
              <div>
                <div className="text-muted small fw-medium">Monthly Salaried Staff</div>
                <h4 className="fw-bold text-navy mb-0">{monthlyCount}</h4>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filters & Search */}
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
                placeholder="Search by Employee Name or ID..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select"
              value={salaryTypeFilter}
              onChange={handleFilterChange(setSalaryTypeFilter, 'type')}
            >
              <option value="">All Salary Types</option>
              <option value="Monthly">Monthly</option>
              <option value="Daily">Daily Wage</option>
            </select>
          </div>

          <div className="col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter, 'status')}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="col-md-2">
            <button type="submit" className="btn btn-navy w-100 d-flex align-items-center justify-content-center gap-2">
              <FaFilter size={14} /> <span>Filter</span>
            </button>
          </div>
        </form>
      </div>

      {/* Salary Structures Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : structures.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaMoneyBillWave size={40} className="mb-3 text-secondary opacity-50" />
            <h5>No Salary Structures Configured</h5>
            <p>Click "Configure New Salary" to set up salary for garage employees.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th className="ps-4">Employee</th>
                  <th>Type</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Standard Net</th>
                  <th>Effective Date</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => {
                  const totalAllowances = typeof s.allowances === 'number'
                    ? s.allowances
                    : (Array.isArray(s.allowanceItems) && s.allowanceItems.length > 0
                        ? s.allowanceItems.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
                        : (Array.isArray(s.allowances)
                            ? s.allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
                            : 0));

                  const totalDeductions = typeof s.deductions === 'number'
                    ? s.deductions
                    : (Array.isArray(s.deductionItems) && s.deductionItems.length > 0
                        ? s.deductionItems.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
                        : (Array.isArray(s.deductions)
                            ? s.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
                            : 0));

                  const stdNet = Math.max(0, (s.basicSalary || 0) + totalAllowances - totalDeductions);

                  return (
                    <tr key={s._id}>
                      <td className="ps-4">
                        <div className="fw-bold text-dark">
                          {s.employee?.fullName || 'Unknown Employee'}
                        </div>
                        <div className="small text-muted d-flex align-items-center gap-2">
                          <span className="badge bg-light text-secondary border font-monospace">
                            {s.employee?.employeeId || 'N/A'}
                          </span>
                          <span>• {s.employee?.role || 'Staff'}</span>
                        </div>
                      </td>
                      <td>
                        <Badge bg={s.salaryType === 'Monthly' ? 'primary' : 'info'} className="px-2 py-1">
                          {s.salaryType}
                        </Badge>
                      </td>
                      <td className="fw-semibold text-dark">
                        ₹{s.basicSalary?.toLocaleString('en-IN')}
                        <span className="small text-muted fw-normal">{s.salaryType === 'Daily' ? '/day' : '/mo'}</span>
                      </td>
                      <td className="text-success">
                        +₹{totalAllowances.toLocaleString('en-IN')}
                      </td>
                      <td className="text-danger">
                        -₹{totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="fw-bold text-navy">
                        ₹{stdNet.toLocaleString('en-IN')}
                      </td>
                      <td className="small text-muted">
                        <FaCalendarAlt className="me-1 opacity-75" />
                        {s.effectiveDate ? new Date(s.effectiveDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleStatus(s._id)}
                          className={`badge border-0 px-2 py-1 rounded-pill ${
                            s.isActive ? 'bg-success text-white' : 'bg-secondary text-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                          title="Click to toggle status"
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenEditModal(s)}
                            title="Edit Structure"
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              setDeletingId(s._id);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Structure"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <span className="text-muted small">
              Showing page {page} of {pages} ({total} items)
            </span>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  fetchStructures(newPage);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  fetchStructures(newPage);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Salary Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-navy h5 mb-0">
            {editingStructure ? 'Edit Salary Structure' : 'Configure Employee Salary Structure'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="p-4">
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium small">Employee <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                    required
                    disabled={!!editingStructure}
                  >
                    <option value="">Select Employee...</option>
                    {allEmployees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId} - {emp.role})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium small">Salary Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.salaryType}
                    onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                    required
                  >
                    <option value="Monthly">Monthly Fixed</option>
                    <option value="Daily">Daily Wage</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium small">
                    {formData.salaryType === 'Monthly' ? 'Basic Monthly Pay (₹)' : 'Daily Rate (₹)'} <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Allowances Section */}
            <div className="bg-light p-3 rounded border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold small text-navy text-uppercase">1. Allowances & Benefits</span>
                <Button variant="outline-success" size="sm" onClick={handleAddAllowance} className="py-0 px-2 small">
                  <FaPlus size={10} className="me-1" /> Add Allowance
                </Button>
              </div>
              {formData.allowances.map((allowance, idx) => (
                <Row key={idx} className="g-2 mb-2 align-items-center">
                  <Col md={6}>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Allowance Name (e.g. HRA, Travel, Medical)"
                      value={allowance.name}
                      onChange={(e) => handleAllowanceChange(idx, 'name', e.target.value)}
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min="0"
                      placeholder="Amount (₹)"
                      value={allowance.amount}
                      onChange={(e) => handleAllowanceChange(idx, 'amount', e.target.value)}
                    />
                  </Col>
                  <Col md={1} className="text-center">
                    <Button 
                      variant="link" 
                      className="text-danger p-0"
                      onClick={() => handleRemoveAllowance(idx)}
                      disabled={formData.allowances.length === 1}
                    >
                      <FaTrash size={12} />
                    </Button>
                  </Col>
                </Row>
              ))}
              <div className="text-end small text-muted">
                Subtotal Allowances: <strong className="text-success">+₹{calculatedAllowances.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="bg-light p-3 rounded border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold small text-navy text-uppercase">2. Statutory / Fixed Deductions</span>
                <Button variant="outline-danger" size="sm" onClick={handleAddDeduction} className="py-0 px-2 small">
                  <FaPlus size={10} className="me-1" /> Add Deduction
                </Button>
              </div>
              {formData.deductions.map((deduction, idx) => (
                <Row key={idx} className="g-2 mb-2 align-items-center">
                  <Col md={6}>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Deduction Name (e.g. PF, ESI, TDS, PT)"
                      value={deduction.name}
                      onChange={(e) => handleDeductionChange(idx, 'name', e.target.value)}
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min="0"
                      placeholder="Amount (₹)"
                      value={deduction.amount}
                      onChange={(e) => handleDeductionChange(idx, 'amount', e.target.value)}
                    />
                  </Col>
                  <Col md={1} className="text-center">
                    <Button 
                      variant="link" 
                      className="text-danger p-0"
                      onClick={() => handleRemoveDeduction(idx)}
                      disabled={formData.deductions.length === 1}
                    >
                      <FaTrash size={12} />
                    </Button>
                  </Col>
                </Row>
              ))}
              <div className="text-end small text-muted">
                Subtotal Deductions: <strong className="text-danger">-₹{calculatedDeductions.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium small">Effective From <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium small">Remarks / Bank Info</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. HDFC A/C: 5010023418293, IFSC: HDFC0001234"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Check
              type="switch"
              id="active-switch"
              label="Set as active salary structure for this employee"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mb-3"
            />

            {/* Live Calculation Preview Card */}
            <Card className="bg-light border-primary border-opacity-25 p-3">
              <div className="d-flex align-items-center gap-2 text-primary fw-bold small mb-2">
                <FaCalculator /> Net Salary Preview (Pre-Attendance Calculation)
              </div>
              <Row className="text-center">
                <Col xs={4}>
                  <div className="text-muted small">Basic Pay</div>
                  <div className="fw-bold">₹{calculatedBasic.toLocaleString('en-IN')}</div>
                </Col>
                <Col xs={4}>
                  <div className="text-muted small">Allowances</div>
                  <div className="fw-bold text-success">+₹{calculatedAllowances.toLocaleString('en-IN')}</div>
                </Col>
                <Col xs={4}>
                  <div className="text-muted small">Deductions</div>
                  <div className="fw-bold text-danger">-₹{calculatedDeductions.toLocaleString('en-IN')}</div>
                </Col>
              </Row>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark">Estimated Base Net Pay:</span>
                <span className="fs-5 fw-bold text-navy">₹{calculatedNet.toLocaleString('en-IN')}</span>
              </div>
            </Card>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="btn-primary-custom">
              {submitting ? 'Saving...' : editingStructure ? 'Update Structure' : 'Save Salary Structure'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-danger">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this salary structure? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalaryManagement;
