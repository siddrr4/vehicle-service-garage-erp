import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Form } from 'react-bootstrap';
import { FaFileInvoiceDollar, FaSearch, FaPrint, FaArrowRight, FaWrench } from 'react-icons/fa';
import { toast } from 'react-toastify';
import billingService from '../../services/billingService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

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
    <div className="container-fluid p-0">
      
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-navy d-flex align-items-center gap-2">
          <FaFileInvoiceDollar className="text-success" /> Billing & Invoicing
        </h2>
        <p className="text-muted mb-0">Generate, view, and print invoices for completed service job cards and track payments.</p>
      </div>

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        <Col xs={12} md={6}>
          <Card className="bg-card border-0 shadow-sm dashboard-card h-100">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Total Invoices</h6>
                <h3 className="fw-bold mb-0 text-dark">{total} Invoices</h3>
              </div>
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                <FaWrench size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6}>
          <Card className="bg-card border-0 shadow-sm dashboard-card h-100">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted fw-medium mb-1 small text-uppercase">Page Billed Revenue</h6>
                <h3 className="fw-bold mb-0 text-navy">
                  ₹{calculateTotalBilledValue().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                <FaFileInvoiceDollar size={22} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search Bar */}
      <div className="bg-card rounded shadow-sm p-4 mb-4">
        <form onSubmit={handleSearch} className="row g-3 align-items-center">
          <div className="col-md-9">
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
          <div className="col-md-3">
            <button type="submit" className="btn btn-navy w-100">Search Invoices</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-card rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingSpinner /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <FaFileInvoiceDollar size={48} className="mb-3 opacity-50" />
            <h5>No Invoices Found</h5>
            <p>Generate invoices from the Job Card details page after a job is completed.</p>
          </div>
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
