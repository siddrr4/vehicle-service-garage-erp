import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Form } from 'react-bootstrap';
import { FaFileInvoiceDollar, FaSearch, FaPrint, FaArrowRight, FaWrench } from 'react-icons/fa';
import { toast } from 'react-toastify';
import billingService from '../../services/billingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PageHeader from '../../components/UI/PageHeader';
import EmptyState from '../../components/UI/EmptyState';

const BillingList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCompletedJobs = async (currentPage = 1, search = keyword) => {
    try {
      setLoading(true);
      // Fetch invoices
      const data = await billingService.getInvoices(currentPage, 10, search, '');
      setInvoices(data.invoices || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch invoices');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCompletedJobs(1, keyword);
  };

  const calculateTotalBilledValue = () => {
    return invoices.reduce((sum, inv) => {
      return sum + inv.grandTotal;
    }, 0);
  };

  return (
    <div className="container-fluid px-0">
      
      {/* Header */}
      <PageHeader
        title="Billing & Tax Invoicing"
        subtitle={`${total} workshop service invoices generated with GST tax breakdown and real-time settlement status`}
        breadcrumbs={[
          { label: 'Finance', to: '/billing' },
          { label: 'Invoices' }
        ]}
      />

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={6}>
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Total Invoices Recorded</span>
                <h3 className="fw-bold mb-0 text-navy mt-1">{total} Invoices</h3>
              </div>
              <div className="p-3 bg-light text-navy rounded-circle border">
                <FaWrench size={22} />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted fw-bold mb-1 small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Current Page Billed Value</span>
                <h3 className="fw-bold mb-0 text-success mt-1">
                  ₹{calculateTotalBilledValue().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle border border-success border-opacity-25">
                <FaFileInvoiceDollar size={22} />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-4">
          <form onSubmit={handleSearch} className="row g-3 align-items-center">
            <div className="col-md-9">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Search by Job Card Number, Invoice Number, or Customer..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-navy w-100">Search Invoices</button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FaFileInvoiceDollar}
            title="No Invoices Found"
            description="No invoices match the current search. Generate invoices from completed Job Cards in the workshop console."
          />
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 custom-table text-secondary small">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Invoice No</th>
                  <th>Customer</th>
                  <th>Vehicle Details</th>
                  <th>Service Type</th>
                  <th>Labor (₹)</th>
                  <th>Parts Cost (₹)</th>
                  <th>Grand Total (₹)</th>
                  <th>Balance Due (₹)</th>
                  <th>Status</th>
                  <th className="text-center pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const partsTotal = inv.totalParts + inv.taxAmount;
                  return (
                    <tr key={inv._id}>
                      <td className="ps-4">
                        <span className="fw-bold text-navy">{inv.invoiceNumber}</span>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{inv.customer?.fullName}</div>
                        <div className="small text-muted">{inv.customer?.mobileNumber}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{inv.vehicle?.vehicleNumber}</div>
                        <div className="small text-muted">{inv.vehicle?.brand} {inv.vehicle?.model}</div>
                      </td>
                      <td>{inv.jobCard?.jobNumber || 'N/A'}</td>
                      <td>₹{(inv.totalLabour + inv.totalWashing).toFixed(2)}</td>
                      <td>₹{partsTotal.toFixed(2)}</td>
                      <td className="fw-bold text-navy">₹{inv.grandTotal.toFixed(2)}</td>
                      <td className="fw-bold text-danger">₹{inv.balanceDue.toFixed(2)}</td>
                      <td>
                        <Badge bg={inv.status === 'Paid' ? 'success' : inv.status === 'Partially Paid' ? 'warning' : 'danger'} className="px-2.5 py-1.5 rounded-pill fw-medium">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="pe-4 text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          <Link to={`/billing/invoice/${inv._id}`} className="btn btn-sm btn-success text-white d-flex align-items-center gap-1">
                            <FaPrint size={11} /> <span>View/Print</span>
                          </Link>
                          <Link to={`/job-cards/${inv.jobCard?._id}`} className="btn btn-sm btn-light border text-navy">
                            Job Card <FaArrowRight size={10} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <Button className="page-link" onClick={() => fetchCompletedJobs(page - 1)} disabled={page === 1}>Previous</Button>
              </li>
              {[...Array(pages).keys()].map(x => (
                <li key={x + 1} className={`page-item ${x + 1 === page ? 'active' : ''}`}>
                  <Button className="page-link" onClick={() => fetchCompletedJobs(x + 1)}>{x + 1}</Button>
                </li>
              ))}
              <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                <Button className="page-link" onClick={() => fetchCompletedJobs(page + 1)} disabled={page === pages}>Next</Button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default BillingList;
