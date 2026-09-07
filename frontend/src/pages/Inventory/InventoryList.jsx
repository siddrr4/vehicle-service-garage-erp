import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { 
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash, 
  FaExclamationTriangle, FaWarehouse, FaTag, FaBoxes, 
  FaDollarSign, FaList, FaTools, FaCheckCircle, FaClipboardList 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import sparePartService from '../../services/sparePartService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const categories = [
  'Engine Parts',
  'Brake System',
  'Suspension',
  'Electrical',
  'Filters',
  'Oils & Lubricants',
  'Battery',
  'Tyres & Wheels',
  'Cooling System',
  'Transmission',
  'Accessories'
];

const InventoryList = () => {
  const [parts, setParts] = useState([]);
  const [stats, setStats] = useState({
    totalParts: 0,
    lowStockParts: 0,
    outOfStockParts: 0,
    totalInventoryValue: 0,
    categoriesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter/Sort States
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    partName: '',
    category: 'Engine Parts',
    compatibleVehicleBrands: '',
    manufacturer: '',
    unitPrice: '',
    sellingPrice: '',
    quantityAvailable: '',
    minimumStockLevel: '',
    rackLocation: '',
    supplier: '',
    warranty: '',
    gstPercent: '18'
  });

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await sparePartService.getSparePartStats();
      setStats(data);
      setStatsLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats', error);
      setStatsLoading(false);
    }
  };

  const fetchParts = async (currentPage = 1) => {
    try {
      setLoading(true);
      const data = await sparePartService.getSpareParts(
        currentPage,
        10,
        keyword,
        categoryFilter,
        statusFilter,
        sortBy,
        sortOrder
      );
      setParts(data.spareParts || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch spare parts');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchParts();
  }, [categoryFilter, statusFilter, sortBy, sortOrder]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchParts(1);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategoryFilter('');
    setStatusFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    // Directly fetch with cleared fields
    sparePartService.getSpareParts(1, 10, '', '', '', 'createdAt', 'desc')
      .then(data => {
        setParts(data.spareParts || []);
        setPage(data.page || 1);
        setPages(data.pages || 1);
      });
  };

  const handleOpenAddModal = () => {
    setIsEdit(false);
    setSelectedPartId(null);
    setFormData({
      partName: '',
      category: 'Engine Parts',
      compatibleVehicleBrands: '',
      manufacturer: '',
      unitPrice: '',
      sellingPrice: '',
      quantityAvailable: '',
      minimumStockLevel: '5',
      rackLocation: '',
      supplier: '',
      warranty: '',
      gstPercent: '18'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (part) => {
    setIsEdit(true);
    setSelectedPartId(part._id);
    setFormData({
      partName: part.partName || '',
      category: part.category || 'Engine Parts',
      compatibleVehicleBrands: part.compatibleVehicleBrands ? part.compatibleVehicleBrands.join(', ') : '',
      manufacturer: part.manufacturer || '',
      unitPrice: part.unitPrice || '',
      sellingPrice: part.sellingPrice || '',
      quantityAvailable: part.quantityAvailable !== undefined ? part.quantityAvailable.toString() : '',
      minimumStockLevel: part.minimumStockLevel !== undefined ? part.minimumStockLevel.toString() : '5',
      rackLocation: part.rackLocation || '',
      supplier: part.supplier || '',
      warranty: part.warranty || '',
      gstPercent: part.gstPercent !== undefined ? part.gstPercent.toString() : '18'
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        await sparePartService.deleteSparePart(id);
        toast.success('Spare part deleted successfully');
        fetchStats();
        fetchParts(page);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete spare part');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.partName || !formData.manufacturer || !formData.unitPrice || !formData.sellingPrice || !formData.quantityAvailable || !formData.rackLocation || !formData.supplier || !formData.warranty) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      ...formData,
      unitPrice: parseFloat(formData.unitPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      quantityAvailable: parseInt(formData.quantityAvailable, 10),
      minimumStockLevel: parseInt(formData.minimumStockLevel, 10),
      gstPercent: parseInt(formData.gstPercent, 10),
      compatibleVehicleBrands: formData.compatibleVehicleBrands.split(',').map(b => b.trim()).filter(b => b)
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await sparePartService.updateSparePart(selectedPartId, payload);
        toast.success('Spare part updated successfully');
      } else {
        await sparePartService.createSparePart(payload);
        toast.success('Spare part added successfully');
      }
      setSubmitting(false);
      setShowModal(false);
      fetchStats();
      fetchParts(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save spare part');
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return <Badge bg="success" className="px-2.5 py-1.5 rounded-pill fw-medium">In Stock</Badge>;
      case 'Low Stock':
        return <Badge bg="warning" text="dark" className="px-2.5 py-1.5 rounded-pill fw-medium">Low Stock</Badge>;
      case 'Out of Stock':
        return <Badge bg="danger" className="px-2.5 py-1.5 rounded-pill fw-medium">Out of Stock</Badge>;
      default:
        return <Badge bg="secondary" className="px-2.5 py-1.5 rounded-pill fw-medium">{status}</Badge>;
    }
  };

  // Find parts that are Low or Out of Stock to show in the alerts
  const alertParts = parts.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');
  const lowStockAlerts = alertParts.filter(p => p.status === 'Low Stock');
  const outOfStockAlerts = alertParts.filter(p => p.status === 'Out of Stock');

  return (
    <div className="container-fluid p-0">
      
      {/* Header and Quick Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-navy d-flex align-items-center gap-2">
            <FaWarehouse className="text-primary" /> Spare Parts Inventory
          </h2>
          <p className="text-muted mb-0">Track stock levels, pricing, compatible brands, and warehouse locations.</p>
        </div>
        
        <div>
          <Button onClick={handleOpenAddModal} className="btn-primary-custom d-flex align-items-center gap-2 px-4 py-2 shadow-sm border-0">
            <FaPlus /> <span>Add New Spare Part</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <Row className="g-4 mb-4">
        <Col xs={12} sm={6} xl>
          <Card className="h-100 bg-card border-0 shadow-sm dashboard-card">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Total Spare Parts</h6>
                <h3 className="fw-bold mb-0 text-dark">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : stats.totalParts}
                </h3>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                <FaClipboardList size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl>
          <Card className="h-100 bg-card border-0 shadow-sm dashboard-card">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Low Stock Items</h6>
                <h3 className="fw-bold mb-0 text-warning">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : stats.lowStockParts}
                </h3>
              </div>
              <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle">
                <FaExclamationTriangle size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl>
          <Card className="h-100 bg-card border-0 shadow-sm dashboard-card">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Out Of Stock</h6>
                <h3 className="fw-bold mb-0 text-danger">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : stats.outOfStockParts}
                </h3>
              </div>
              <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle">
                <FaBoxes size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl>
          <Card className="h-100 bg-card border-0 shadow-sm dashboard-card">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Inventory Value (Val)</h6>
                <h3 className="fw-bold mb-0 text-success">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : `₹${stats.totalInventoryValue.toLocaleString('en-IN')}`}
                </h3>
              </div>
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                <FaDollarSign size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl>
          <Card className="h-100 bg-card border-0 shadow-sm dashboard-card">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Categories</h6>
                <h3 className="fw-bold mb-0 text-purple" style={{ color: '#6f42c1' }}>
                  {statsLoading ? <Spinner animation="border" size="sm" /> : stats.categoriesCount}
                </h3>
              </div>
              <div className="p-3 bg-purple bg-opacity-10 text-purple rounded-circle" style={{ color: '#6f42c1' }}>
                <FaTag size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stock Alerts Banners */}
      {lowStockAlerts.length > 0 && (
        <div className="alert alert-warning border-0 shadow-sm mb-3 d-flex align-items-start gap-3 p-3">
          <FaExclamationTriangle className="text-warning mt-1" size={20} />
          <div>
            <h6 className="alert-heading fw-bold mb-1">Low Stock Alert</h6>
            <p className="mb-1 text-dark small">
              The following parts are below their minimum stock levels. Please coordinate with suppliers:
            </p>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {lowStockAlerts.slice(0, 8).map(p => (
                <span key={p._id} className="badge bg-white text-dark border shadow-2xs font-monospace">
                  {p.partName} ({p.partNumber}) - Qty: {p.quantityAvailable}/{p.minimumStockLevel}
                </span>
              ))}
              {lowStockAlerts.length > 8 && (
                <span className="badge bg-secondary text-white fw-bold">+{lowStockAlerts.length - 8} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {outOfStockAlerts.length > 0 && (
        <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-start gap-3 p-3 text-danger-custom">
          <FaBoxes className="text-danger mt-1" size={20} />
          <div>
            <h6 className="alert-heading fw-bold mb-1">Out of Stock Warning</h6>
            <p className="mb-1 text-dark small">
              The following parts have reached 0 quantity. They are disabled for Job Card assignment until stock is updated:
            </p>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {outOfStockAlerts.slice(0, 8).map(p => (
                <span key={p._id} className="badge bg-white text-danger border border-danger border-opacity-25 shadow-2xs font-monospace">
                  {p.partName} ({p.partNumber})
                </span>
              ))}
              {outOfStockAlerts.length > 8 && (
                <span className="badge bg-secondary text-white fw-bold">+{outOfStockAlerts.length - 8} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <Form onSubmit={handleSearch}>
          <Row className="g-3">
            <Col xs={12} lg={4}>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by Part Name or Number..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </Col>
            
            <Col xs={12} sm={6} lg={2.4} style={{ width: '20%' }} className="filter-col-responsive">
              <Form.Select 
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={2.4} style={{ width: '15%' }} className="filter-col-responsive">
              <Form.Select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Stock Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={2.4} style={{ width: '15%' }} className="filter-col-responsive">
              <Form.Select 
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
              >
                <option value="createdAt-desc">Newest Added</option>
                <option value="sellingPrice-asc">Price: Low to High</option>
                <option value="sellingPrice-desc">Price: High to Low</option>
                <option value="quantityAvailable-asc">Quantity: Low to High</option>
                <option value="quantityAvailable-desc">Quantity: High to Low</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg className="d-flex gap-2">
              <Button type="submit" className="btn-navy flex-grow-1">Search</Button>
              <Button variant="light" className="border" onClick={handleClearFilters}>Clear</Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Parts Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : parts.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaTools size={48} className="mb-3 opacity-50" />
            <h5>No Spare Parts Found</h5>
            <p>Try refining your search or add a new part to inventory.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 custom-table">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Part Details</th>
                  <th>Category</th>
                  <th>Compatibility</th>
                  <th>Stock Levels</th>
                  <th>Selling Price</th>
                  <th>Rack Location</th>
                  <th>Supplier / Warranty</th>
                  <th className="text-center pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part._id}>
                    <td className="ps-4 py-3">
                      <div className="fw-bold text-navy">{part.partName}</div>
                      <div className="small text-secondary font-monospace">{part.partNumber}</div>
                      <div className="small text-muted">{part.manufacturer}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{part.category}</span>
                    </td>
                    <td>
                      <div className="small text-secondary" style={{ maxWidth: '180px' }}>
                        {part.compatibleVehicleBrands ? part.compatibleVehicleBrands.join(', ') : 'Universal'}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold mb-1 text-dark">
                        {part.quantityAvailable} Units
                      </div>
                      <div className="small text-muted mb-1">
                        Min. Alert Level: {part.minimumStockLevel}
                      </div>
                      {getStatusBadge(part.status)}
                    </td>
                    <td>
                      <div className="fw-bold text-dark">₹{part.sellingPrice.toLocaleString('en-IN')}</div>
                      <small className="text-muted d-block">Cost: ₹{part.unitPrice} (+{part.gstPercent}% GST)</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1.5 text-secondary">
                        <FaWarehouse size={13} className="text-muted" />
                        <span>{part.rackLocation}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-dark small fw-medium">{part.supplier}</div>
                      <small className="text-muted">Warranty: {part.warranty}</small>
                    </td>
                    <td className="pe-4">
                      <div className="d-flex gap-2 justify-content-center">
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="text-primary border" 
                          title="Edit"
                          onClick={() => handleOpenEditModal(part)}
                        >
                          <FaEdit />
                        </Button>
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="text-danger border" 
                          title="Delete"
                          onClick={() => handleDelete(part._id, part.partName)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <Button className="page-link" onClick={() => fetchParts(page - 1)} disabled={page === 1}>Previous</Button>
              </li>
              {[...Array(pages).keys()].map(x => (
                <li key={x + 1} className={`page-item ${x + 1 === page ? 'active' : ''}`}>
                  <Button className="page-link" onClick={() => fetchParts(x + 1)}>{x + 1}</Button>
                </li>
              ))}
              <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                <Button className="page-link" onClick={() => fetchParts(page + 1)} disabled={page === pages}>Next</Button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold text-navy">
            {isEdit ? <><FaEdit /> Edit Spare Part</> : <><FaPlus /> Add New Spare Part</>}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleFormSubmit}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Part Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="partName"
                    value={formData.partName}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Timing Belt"
                  />
                </Form.Group>
              </Col>
              
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Category <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Manufacturer <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Bosch, Castrol"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Compatible Vehicle Brands <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="compatibleVehicleBrands"
                    value={formData.compatibleVehicleBrands}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Maruti Suzuki, Hyundai, Universal"
                  />
                  <Form.Text className="text-muted">Separate multiple brands with commas.</Form.Text>
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium">Cost Price (₹) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    required
                    placeholder="Purchase Cost"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium">Selling Price (₹) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    required
                    placeholder="Customer Price"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium">Quantity Available <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="quantityAvailable"
                    value={formData.quantityAvailable}
                    onChange={handleInputChange}
                    required
                    placeholder="In Stock Count"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium">Min. Stock Alert <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="minimumStockLevel"
                    value={formData.minimumStockLevel}
                    onChange={handleInputChange}
                    required
                    placeholder="Low stock alert trigger"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Rack Location <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="rackLocation"
                    value={formData.rackLocation}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Rack A-12"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Supplier Company <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Metro Auto Distributors"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Warranty <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="warranty"
                    value={formData.warranty}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 6 Months, 1 Year, No Warranty"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">GST (%) <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="gstPercent"
                    value={formData.gstPercent}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary-custom d-flex align-items-center gap-2" disabled={submitting}>
              {submitting ? <Spinner animation="border" size="sm" /> : <FaCheckCircle />}
              <span>{isEdit ? 'Save Changes' : 'Add Spare Part'}</span>
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryList;
