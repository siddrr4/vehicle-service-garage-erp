import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEye, FaEdit, FaTrash, FaFilter } from 'react-icons/fa';
import { getCustomers, deleteCustomer } from '../../services/customerService';
import SearchBox from '../../components/UI/SearchBox';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('Newest');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCustomers = async (currentPage = 1, currentKeyword = '') => {
    try {
      setLoading(true);
      const data = await getCustomers(currentPage, 10, currentKeyword);
      setCustomers(data.customers);
      setPages(data.pages);
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
    setKeyword(e.target.value);
    setPage(1);
    fetchCustomers(1, e.target.value);
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
      if (filter === 'Most Vehicles') return b.totalVehicles - a.totalVehicles;
      return 0; // 'Newest' matches the default backend sort
    });

  // Extract unique cities for filter
  const uniqueCities = [...new Set(customers.map(c => c.city).filter(Boolean))];

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin-dashboard">Home</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Customers</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-navy fw-bold">Customer Management</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm">
            Export
          </button>
          <Link to="/customers/add" className="btn btn-orange d-flex align-items-center gap-2 shadow-sm">
            <FaPlus /> Add Customer
          </Link>
        </div>
      </div>

      <div className="bg-card p-4">
        <div className="row mb-4 align-items-center g-3">
          <div className="col-md-6 col-lg-4">
            <SearchBox value={keyword} onChange={handleSearch} placeholder="Search name, phone, email..." />
          </div>
          <div className="col-md-6 col-lg-8 d-flex justify-content-md-end gap-3">
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select 
                className="form-select bg-light border-0 shadow-sm" 
                style={{ width: 'auto' }}
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                <option value="">Filter by City: All</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select 
                className="form-select bg-light border-0 shadow-sm" 
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Filter by Status: All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select 
                className="form-select bg-light border-0 shadow-sm" 
                style={{ width: 'auto' }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="Newest">Sort by: Newest</option>
                <option value="Name A-Z">Sort by: Name (A-Z)</option>
                <option value="Name Z-A">Sort by: Name (Z-A)</option>
                <option value="Most Vehicles">Sort by: Most Vehicles</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle border">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Customer ID</th>
                    <th>Full Name</th>
                    <th>Mobile Number</th>
                    <th>Email Address</th>
                    <th>City</th>
                    <th className="text-center">Total Vehicles</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th className="text-end px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td className="px-3 fw-medium text-navy">{customer.customerId || '-'}</td>
                      <td className="fw-bold text-dark">{customer.fullName}</td>
                      <td>{customer.mobileNumber}</td>
                      <td className="text-muted">{customer.emailAddress || '-'}</td>
                      <td>{customer.city || '-'}</td>
                      <td className="text-center">
                        <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2">
                          {customer.totalVehicles || 0}
                        </span>
                      </td>
                      <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${customer.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                          {customer.status || 'Active'}
                        </span>
                      </td>
                      <td className="text-end px-3">
                        <div className="d-flex gap-2 justify-content-end">
                          <Link to={`/customers/${customer._id}`} className="btn btn-sm btn-light border text-primary" title="View Profile">
                            <FaEye />
                          </Link>
                          <Link to={`/customers/edit/${customer._id}`} className="btn btn-sm btn-light border text-secondary" title="Edit">
                            <FaEdit />
                          </Link>
                          <button className="btn btn-sm btn-light border text-danger" onClick={() => handleDelete(customer._id)} title="Delete">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedCustomers.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <div className="text-muted mb-2">No customers found</div>
                        {(keyword || cityFilter || statusFilter) && <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => { handleSearch({target: {value: ''}}); setCityFilter(''); setStatusFilter(''); }}>Clear Filters</button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <nav aria-label="Page navigation" className="mt-4">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)}>Previous</button>
                  </li>
                  {[...Array(pages).keys()].map((x) => (
                    <li key={x + 1} className={`page-item ${page === x + 1 ? 'active bg-orange border-orange' : ''}`}>
                      <button className="page-link" onClick={() => setPage(x + 1)}>{x + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)}>Next</button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
