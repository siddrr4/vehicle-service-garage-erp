import React, { useState } from 'react';
import { Card, Table, Button, Badge } from 'react-bootstrap';
import { FaClipboardList, FaCheckCircle, FaTools, FaUndo, FaPlus } from 'react-icons/fa';

const SparePartsTabs = ({
  requestedParts = [],
  issuedParts = [],
  consumedParts = [],
  returnedParts = [],
  isMechanic,
  isAdmin,
  setShowRequestModal,
  setSelectedRequestToReturn,
  setReturnQty,
  setShowReturnModal,
  getRequestStatusBadge
}) => {
  const [activeTab, setActiveTab] = useState('requested');

  return (
    <Card className="bg-card border-0 shadow-sm mb-4">
      {/* Tabs Navigation */}
      <div className="d-flex flex-nowrap overflow-auto p-3 gap-2 border-bottom" style={{ whiteSpace: 'nowrap' }}>
        <button
          onClick={() => setActiveTab('requested')}
          className={`btn d-flex align-items-center gap-2 rounded-pill px-4 py-2 ${
            activeTab === 'requested' ? 'btn-primary text-white' : 'btn-light border text-navy'
          }`}
          style={{ transition: 'all 0.2s', minWidth: 'max-content' }}
        >
          <FaClipboardList className={activeTab === 'requested' ? 'text-white' : 'text-primary'} />
          Requested Parts ({requestedParts.length})
        </button>

        <button
          onClick={() => setActiveTab('issued')}
          className={`btn d-flex align-items-center gap-2 rounded-pill px-4 py-2 ${
            activeTab === 'issued' ? 'btn-success text-white' : 'btn-light border text-navy'
          }`}
          style={{ transition: 'all 0.2s', minWidth: 'max-content' }}
        >
          <FaCheckCircle className={activeTab === 'issued' ? 'text-white' : 'text-success'} />
          Issued Parts ({issuedParts.length})
        </button>

        <button
          onClick={() => setActiveTab('consumed')}
          className={`btn d-flex align-items-center gap-2 rounded-pill px-4 py-2 ${
            activeTab === 'consumed' ? 'btn-warning text-dark' : 'btn-light border text-navy'
          }`}
          style={{ transition: 'all 0.2s', minWidth: 'max-content' }}
        >
          <FaTools className={activeTab === 'consumed' ? 'text-dark' : 'text-warning'} />
          Consumed (Billed) ({consumedParts.length})
        </button>

        <button
          onClick={() => setActiveTab('returned')}
          className={`btn d-flex align-items-center gap-2 rounded-pill px-4 py-2 ${
            activeTab === 'returned' ? 'btn-info text-dark' : 'btn-light border text-navy'
          }`}
          style={{ transition: 'all 0.2s', minWidth: 'max-content', backgroundColor: activeTab === 'returned' ? '#e0cffc' : '', borderColor: activeTab === 'returned' ? '#e0cffc' : '' }}
        >
          <FaUndo className={activeTab === 'returned' ? 'text-dark' : 'text-info'} style={activeTab === 'returned' ? {} : { color: '#8a2be2' }} />
          Returned Parts ({returnedParts.length})
        </button>
      </div>

      <Card.Body className="p-0">
        {/* REQUESTED PARTS TAB */}
        {activeTab === 'requested' && (
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-navy m-0">Requested Spare Parts</h6>
              {(isMechanic || isAdmin) && (
                <Button variant="primary" size="sm" className="d-flex align-items-center gap-2" onClick={() => setShowRequestModal(true)}>
                  <FaPlus /> Request New Part
                </Button>
              )}
            </div>
            
            {requestedParts.length === 0 ? (
              <div className="text-center py-5 bg-light rounded text-muted">
                <FaClipboardList size={40} className="mb-3 text-secondary opacity-50" />
                <p className="mb-0">No spare parts requested for this job card.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-secondary small">
                  <thead className="table-light">
                    <tr>
                      <th>Part Name</th>
                      <th>Qty</th>
                      <th>Price Unit</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestedParts.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div className="fw-bold text-dark">{r.partId?.partName}</div>
                          <small className="font-monospace text-muted">{r.partId?.partNumber}</small>
                        </td>
                        <td>{r.requestedQuantity}</td>
                        <td>₹{r.partId?.sellingPrice || 0}</td>
                        <td>₹{((r.partId?.sellingPrice || 0) * r.requestedQuantity).toFixed(2)}</td>
                        <td>{getRequestStatusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ISSUED PARTS TAB */}
        {activeTab === 'issued' && (
          <div className="p-3">
            <h6 className="fw-bold text-navy mb-3">Issued Spare Parts</h6>
            {issuedParts.length === 0 ? (
              <div className="text-center py-5 bg-light rounded text-muted">
                <FaCheckCircle size={40} className="mb-3 text-success opacity-50" />
                <p className="mb-0">No parts issued yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-secondary small">
                  <thead className="table-light">
                    <tr>
                      <th>Part Name</th>
                      <th>Qty Issued</th>
                      <th>Price Unit</th>
                      <th>Total</th>
                      <th>Status</th>
                      {(isMechanic || isAdmin) && <th className="text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {issuedParts.map((r) => {
                      const returnable = r.issuedQuantity - r.returnedQuantity;
                      return (
                        <tr key={r._id}>
                          <td>
                            <div className="fw-bold text-dark">{r.partId?.partName}</div>
                            <small className="font-monospace text-muted">{r.partId?.partNumber}</small>
                          </td>
                          <td>{r.issuedQuantity}</td>
                          <td>₹{r.partId?.sellingPrice || 0}</td>
                          <td>₹{((r.partId?.sellingPrice || 0) * r.issuedQuantity).toFixed(2)}</td>
                          <td>{getRequestStatusBadge(r.status)}</td>
                          {(isMechanic || isAdmin) && (
                            <td className="text-center">
                              {r.status === 'Issued' && returnable > 0 ? (
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  className="d-flex align-items-center gap-2 mx-auto"
                                  onClick={() => {
                                    setSelectedRequestToReturn(r);
                                    setReturnQty(returnable);
                                    setShowReturnModal(true);
                                  }}
                                >
                                  <FaUndo size={11} /> <span>Return Parts</span>
                                </Button>
                              ) : r.status === 'Pending Return' ? (
                                <small className="text-info fst-italic">Awaiting Approval</small>
                              ) : (
                                <small className="text-muted">-</small>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* CONSUMED PARTS TAB */}
        {activeTab === 'consumed' && (
          <div className="p-3">
            <h6 className="fw-bold text-navy mb-3">Spare Parts Consumed (Billed)</h6>
            {consumedParts.length === 0 ? (
              <div className="text-center py-5 bg-light rounded text-muted">
                <FaTools size={40} className="mb-3 text-warning opacity-50" />
                <p className="mb-0">No spare parts consumed or billed on this job card yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-secondary small">
                  <thead className="table-light">
                    <tr>
                      <th>Part Name</th>
                      <th className="text-center">Qty Consumed</th>
                      <th>Unit Rate</th>
                      <th>GST %</th>
                      <th className="text-end">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumedParts.map((p, idx) => {
                      const partExcl = p.sellingPrice * p.quantity;
                      const partTax = partExcl * p.gstPercent / 100;
                      const partTotal = partExcl + partTax;
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="fw-bold text-dark">{p.part?.partName || 'Part Deleted'}</div>
                            <small className="font-monospace text-muted">{p.part?.partNumber || 'PART-N/A'}</small>
                          </td>
                          <td className="text-center fw-bold">{p.quantity}</td>
                          <td>₹{p.sellingPrice.toFixed(2)}</td>
                          <td>{p.gstPercent}%</td>
                          <td className="text-end fw-bold text-dark">₹{partTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* RETURNED PARTS TAB */}
        {activeTab === 'returned' && (
          <div className="p-3">
            <h6 className="fw-bold text-navy mb-3">Returned Spare Parts</h6>
            {returnedParts.length === 0 ? (
              <div className="text-center py-5 bg-light rounded text-muted">
                <FaUndo size={40} className="mb-3 opacity-50" style={{ color: '#8a2be2' }} />
                <p className="mb-0">No parts returned.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-secondary small">
                  <thead className="table-light">
                    <tr>
                      <th>Part Name</th>
                      <th>Qty Returned</th>
                      <th>Price Unit</th>
                      <th>Total Refund</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnedParts.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div className="fw-bold text-dark">{r.partId?.partName}</div>
                          <small className="font-monospace text-muted">{r.partId?.partNumber}</small>
                        </td>
                        <td className="fw-bold">{r.returnedQuantity}</td>
                        <td>₹{r.partId?.sellingPrice || 0}</td>
                        <td>₹{((r.partId?.sellingPrice || 0) * r.returnedQuantity).toFixed(2)}</td>
                        <td>{getRequestStatusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SparePartsTabs;
