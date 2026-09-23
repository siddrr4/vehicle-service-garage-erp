import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Form, InputGroup, Pagination, Card, Row, Col } from 'react-bootstrap';
import { FaPlus, FaEye, FaEdit, FaTrash, FaFilter, FaUsers, FaSearch, FaUserCheck, FaCar } from 'react-icons/fa';
import { getCustomers, deleteCustomer } from '../../services/customerService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import { toast } from 'react-toastify';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalVehicles: 0
  });
  const [filter, setFilter] = useState('Newest');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCustomers = async (currentPage = 1, currentKeyword = '') => {
    try {
      setLoading(true);
      const data = await getCustomers(currentPage, 10, currentKeyword);
      setCustomers(data.customers || []);
      setPages(data.pages || 1);
      const returnedTotal = data.total ?? (data.customers || []).length;
      setTotal(returnedTotal);
      if (data.stats) {
        setStats(data.stats);
      } else {
        setStats({
          totalCustomers: returnedTotal,
          activeCustomers: (data.customers || []).filter(c => (c.status || 'Active') === 'Active').length,
          totalVehicles: (data.customers || []).reduce((acc, c) => acc + (c.totalVehicles || 0), 0)
        });
      }
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error fetching customers');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page, keyword);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(1, keyword);
  };

  const hasActiveFilters = Boolean(keyword || cityFilter || statusFilter || filter !== 'Newest');

  const handleResetFilters = () => {
    setKeyword('');
    setCityFilter('');
    setStatusFilter('');
    setFilter('Newest');
    setPage(1);
    fetchCustomers(1, '');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer? This will also delete associated vehicles.')) {
      try {
        await deleteCustomer(id);
        toast.success('Customer deleted successfully');
        fetchCustomers(page, keyword);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting customer');
      }
    }
  };

  const filteredAndSortedCustomers = [...customers]
    .filter(c => cityFilter ? c.city === cityFilter : true)
    .filter(c => statusFilter ? (c.status || 'Active') === statusFilter : true)
    .sort((a, b) => {
      if (filter === 'Name A-Z') return a.fullName.localeCompare(b.fullName);
      if (filter === 'Name Z-A') return b.fullName.localeCompare(a.fullName);
      if (filter === 'Most Vehicles') return (b.totalVehicles || 0) - (a.totalVehicles || 0);
      return 0;
    });

  const uniqueCities = [...new Set(customers.map(c => c.city).filter(Boolean))];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title={
          <div className="d-inline-flex align-items-center gap-2">
            <span>Customer Management</span>
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill fs-6 fw-semibold">
              {stats.totalCustomers || total} Total
            </span>
          </div>
        }
        subtitle={`Directory of ${stats.totalCustomers || total} registered garage customers and their linked vehicle profiles`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Customers' }
        ]}
        actions={
          <Link to="/customers/add" className="btn btn-orange d-flex align-items-center gap-2 shadow-sm">
            <FaPlus /> <span>Add Customer</span>
          </Link>
        }
      />

      {/* KPI Overview Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers || total}
            icon={<FaUsers size={20} />}
            color="primary"
            subtext="Registered customer accounts"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Customers"
            value={stats.activeCustomers || filteredAndSortedCustomers.filter(c => (c.status || 'Active') === 'Active').length}
            icon={<FaUserCheck size={20} />}
            color="success"
            subtext="Active service accounts"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Customer Vehicles"
            value={stats.totalVehicles ?? filteredAndSortedCustomers.reduce((acc, c) => acc + (c.totalVehicles || 0), 0)}
            icon={<FaCar size={20} />}
            color="orange"
            subtext="Fleet linked to customers"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Showing on Page"
            value={filteredAndSortedCustomers.length}
            icon={<FaFilter size={20} />}
            color="info"
            subtext={hasActiveFilters ? 'Active filter matches' : `Page ${page} of ${pages || 1}`}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Body className="p-4">
          <Row className="g-3 mb-3 align-items-center">
            <Col md={5} lg={4}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    placeholder="Search name, phone, email..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <Button type="submit" variant="outline-secondary">
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form>
            </Col>

            <Col md={7} lg={8}>
              <div className="d-flex flex-wrap justify-content-md-end gap-2">
                <Form.Select 
                  style={{ width: 'auto' }}
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  <option value="">City: All</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Form.Select>

                <Form.Select 
                  style={{ width: 'auto' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>

                <Form.Select 
                  style={{ width: 'auto' }}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="Newest">Sort: Newest</option>
                  <option value="Name A-Z">Sort: Name (A-Z)</option>
                  <option value="Name Z-A">Sort: Name (Z-A)</option>
                  <option value="Most Vehicles">Sort: Most Vehicles</option>
                </Form.Select>
              </div>
            </Col>
          </Row>

          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 px-1 text-muted small">
            <div>
              Showing <strong className="text-navy">{filteredAndSortedCustomers.length}</strong> of <strong className="text-navy">{total}</strong> {hasActiveFilters ? 'filtered' : 'registered'} customers
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none text-primary"
                onClick={handleResetFilters}
              >
                Reset filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-5"><LoadingSpinner /></div>
          ) : filteredAndSortedCustomers.length === 0 ? (
            <EmptyState
              icon={<FaUsers size={42} className="text-muted opacity-50" />}
              title="No customers found"
              message="No customer profiles match your search criteria."
              actionLabel="Add First Customer"
              actionLink="/customers/add"
            />
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="px-4">Customer ID</th>
                      <th>Full Name</th>
                      <th>Mobile Number</th>
                      <th>Email Address</th>
                      <th>City</th>
                      <th className="text-center">Vehicles</th>
                      <th>Status</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedCustomers.map((customer) => (
                      <tr key={customer._id}>
                        <td className="px-4 fw-semibold text-navy">
                          {customer.customerId || '-'}
                        </td>
                        <td>
                          <Link to={`/customers/${customer._id}`} className="fw-bold text-navy text-decoration-none">
                            {customer.fullName}
                          </Link>
                        </td>
                        <td>{customer.mobileNumber}</td>
                        <td className="text-muted">{customer.emailAddress || '-'}</td>
                        <td>{customer.city || '-'}</td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1">
                            {customer.totalVehicles || 0}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={customer.status || 'Active'} />
                        </td>
                        <td className="text-end px-4">
                          <div className="d-flex gap-1 justify-content-end">
                            <Link to={`/customers/${customer._id}`} className="btn btn-sm btn-outline-secondary p-1" title="View Profile">
                              <FaEye size={13} />
                            </Link>
                            <Link to={`/customers/edit/${customer._id}`} className="btn btn-sm btn-outline-primary p-1" title="Edit Customer">
                              <FaEdit size={13} />
                            </Link>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="p-1" 
                              onClick={() => handleDelete(customer._id)} 
                              title="Delete Customer"
                            >
                              <FaTrash size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-4 pt-3 border-top border-light">
                <small className="text-muted">
                  Showing <strong>{filteredAndSortedCustomers.length}</strong> of <strong>{total}</strong> total customers {pages > 1 ? `• Page ${page} of ${pages}` : ''}
                </small>
                {pages > 1 && (
                  <Pagination className="mb-0">
                    <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                    {[...Array(pages).keys()].map((x) => (
                      <Pagination.Item key={x + 1} active={x + 1 === page} onClick={() => setPage(x + 1)}>
                        {x + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={page === pages} onClick={() => setPage(p => p + 1)} />
                  </Pagination>
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default CustomerList;
