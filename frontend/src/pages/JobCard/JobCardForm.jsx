import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jobCardService from '../../services/jobCardService';
import appointmentService from '../../services/appointmentService';
import employeeService from '../../services/employeeService';
import sparePartService from '../../services/sparePartService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const JobCardForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);

  // Parts Selector State
  const [selectedPartToAdd, setSelectedPartToAdd] = useState('');
  const [partQuantityToAdd, setPartQuantityToAdd] = useState(1);

  const [formData, setFormData] = useState({
    serviceRequest: '',
    assignedMechanic: '',
    complaint: '',
    workDescription: '',
    estimatedCost: '',
    estimatedDeliveryDate: '',
    priority: 'Medium',
    status: 'Open',
    notes: '',
    partsUsed: [],
    servicesPerformed: [],
    odometerAtService: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const activeMechanics = await employeeService.getActiveMechanics();
        setMechanics(activeMechanics || []);

        const partsData = await sparePartService.getAllSpareParts();
        setAvailableParts(partsData || []);

        if (isEdit) {
          const jobCard = await jobCardService.getJobCardById(id);
          setFormData({
            serviceRequest: jobCard.serviceRequest?._id || '',
            assignedMechanic: jobCard.assignedMechanic?._id || jobCard.assignedMechanic || '',
            complaint: jobCard.complaint || '',
            workDescription: jobCard.workDescription || '',
            estimatedCost: jobCard.estimatedCost || '',
            estimatedDeliveryDate: jobCard.estimatedDeliveryDate
              ? new Date(jobCard.estimatedDeliveryDate).toISOString().split('T')[0]
              : '',
            priority: jobCard.priority || 'Medium',
            status: jobCard.status || 'Pending',
            notes: jobCard.notes || '',
            partsUsed: jobCard.partsUsed ? jobCard.partsUsed.map(p => ({
              part: p.part?._id || p.part || '',
              partName: p.part?.partName || 'Unknown Part',
              partNumber: p.part?.partNumber || '',
              quantity: p.quantity || 1,
              sellingPrice: p.sellingPrice || 0,
              gstPercent: p.gstPercent || 18,
              quantityAvailable: p.part?.quantityAvailable !== undefined ? p.part.quantityAvailable : 999
            })) : [],
            servicesPerformed: jobCard.servicesPerformed || [],
            odometerAtService: jobCard.odometerAtService || ''
          });
        } else {
          const apptsData = await appointmentService.getAppointments({ limit: 100, status: 'Approved' });
          setApprovedAppointments(apptsData.appointments || []);
        }
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load initial data');
        setLoading(false);
        navigate('/job-cards');
      }
    };
    fetchInitialData();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-fill complaint if serviceRequest is selected
    if (name === 'serviceRequest' && !isEdit) {
      const selectedAppt = approvedAppointments.find((a) => a._id === value);
      if (selectedAppt) {
        setFormData((prev) => ({
          ...prev,
          serviceRequest: value,
          complaint: selectedAppt.problemDescription || '',
        }));
      }
    }
  };

  const handleAddPart = () => {
    if (!selectedPartToAdd) return;
    const part = availableParts.find(p => p._id === selectedPartToAdd);
    if (!part) return;

    const existingIndex = formData.partsUsed.findIndex(p => p.part === selectedPartToAdd);
    const existingQty = existingIndex > -1 ? formData.partsUsed[existingIndex].quantity : 0;
    const totalQty = existingQty + parseInt(partQuantityToAdd, 10);

    // Validate stock
    if (part.quantityAvailable < totalQty) {
      toast.error(`Insufficient stock! Only ${part.quantityAvailable} units available.`);
      return;
    }

    if (existingIndex > -1) {
      const updatedParts = [...formData.partsUsed];
      updatedParts[existingIndex].quantity = totalQty;
      setFormData(prev => ({ ...prev, partsUsed: updatedParts }));
    } else {
      const newPart = {
        part: part._id,
        partName: part.partName,
        partNumber: part.partNumber,
        quantity: parseInt(partQuantityToAdd, 10),
        sellingPrice: part.sellingPrice,
        gstPercent: part.gstPercent,
        quantityAvailable: part.quantityAvailable
      };
      setFormData(prev => ({ ...prev, partsUsed: [...prev.partsUsed, newPart] }));
    }

    setSelectedPartToAdd('');
    setPartQuantityToAdd(1);
  };

  const handleRemovePart = (partId) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter(p => p.part !== partId)
    }));
  };

  const handleAddService = () => {
    setFormData(prev => ({
      ...prev,
      servicesPerformed: [...prev.servicesPerformed, { serviceName: '', labourCharge: 0, washingCharge: 0 }]
    }));
  };

  const handleRemoveService = (index) => {
    setFormData(prev => ({
      ...prev,
      servicesPerformed: prev.servicesPerformed.filter((_, i) => i !== index)
    }));
  };

  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...formData.servicesPerformed];
    updatedServices[index][field] = field === 'serviceName' ? value : parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, servicesPerformed: updatedServices }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.serviceRequest || !formData.complaint || !formData.estimatedCost || !formData.estimatedDeliveryDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const submitPayload = {
      ...formData,
      estimatedCost: parseFloat(formData.estimatedCost) || 0,
      odometerAtService: formData.odometerAtService ? Number(formData.odometerAtService) : undefined,
      partsUsed: formData.partsUsed.map(p => ({
        part: p.part,
        quantity: p.quantity
      })),
      servicesPerformed: formData.servicesPerformed
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await jobCardService.updateJobCard(id, submitPayload);
        toast.success('Job card updated successfully');
      } else {
        await jobCardService.createJobCard(submitPayload);
        toast.success('Job card created successfully');
      }
      navigate('/job-cards');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
      setSubmitting(false);
    }
  };

  // Calculations for Pricing Summary
  const laborCost = formData.servicesPerformed.length > 0 
    ? formData.servicesPerformed.reduce((sum, s) => sum + s.labourCharge + s.washingCharge, 0)
    : (parseFloat(formData.estimatedCost) || 0);
  
  const partsExcludingTax = formData.partsUsed.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);
  const partsTaxAmount = formData.partsUsed.reduce((sum, p) => sum + (p.sellingPrice * p.quantity * p.gstPercent / 100), 0);
  const partsIncludingTax = partsExcludingTax + partsTaxAmount;
  const grandTotal = laborCost + partsIncludingTax;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Link to="/job-cards" className="btn btn-light border btn-sm text-muted">
            <FaArrowLeft />
          </Link>
          <div>
            <h2 className="fw-bold m-0 text-navy">{isEdit ? 'Edit Job Card' : 'Create Job Card'}</h2>
            <p className="text-muted mb-0">
              {isEdit ? 'Update existing job card details and mechanic assignment' : 'Create a new job card for an approved service request'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded shadow-sm p-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            {!isEdit && (
              <div className="col-md-12">
                <label className="form-label fw-medium">
                  Approved Service Request <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="serviceRequest"
                  value={formData.serviceRequest}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select an Approved Request --</option>
                  {approvedAppointments.map((appt) => (
                    <option key={appt._id} value={appt._id}>
                      {new Date(appt.appointmentDate).toLocaleDateString()} - {appt.serviceType} (Customer: {appt.customer?.fullName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-md-6">
              <label className="form-label fw-medium">Assign Mechanic</label>
              <select
                className="form-select"
                name="assignedMechanic"
                value={formData.assignedMechanic}
                onChange={handleChange}
                disabled={mechanics.length === 0}
              >
                {mechanics.length === 0 ? (
                  <option value="">-- No mechanics currently available. Please check employee attendance. --</option>
                ) : (
                  <>
                    <option value="">-- Select Mechanic (Optional) --</option>
                    {mechanics.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.fullName} - ({m.displayStatus || m.availability} | {m.activeJobsCount !== undefined ? m.activeJobsCount : 0} active jobs)
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">Priority</label>
              <select className="form-select" name="priority" value={formData.priority} onChange={handleChange}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">
                Customer Complaint / Issue <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows="3"
                name="complaint"
                value={formData.complaint}
                onChange={handleChange}
                required
                placeholder="Details of the issue reported"
              ></textarea>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">Work Description</label>
              <textarea
                className="form-control"
                rows="3"
                name="workDescription"
                value={formData.workDescription}
                onChange={handleChange}
                placeholder="Details of work to be done / done"
              ></textarea>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">
                Odometer Reading at Service (km)
              </label>
              <input
                type="number"
                min="0"
                className="form-control"
                name="odometerAtService"
                value={formData.odometerAtService}
                onChange={handleChange}
                placeholder="e.g. 15000"
              />
              <div className="form-text text-muted">Required if updating Odometer History</div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">
                Overall Estimated Cost (Fallback) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
              <div className="form-text text-muted">Used if no specific services are added below.</div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">
                Estimated Delivery Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                name="estimatedDeliveryDate"
                value={formData.estimatedDeliveryDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">Status</label>
              <select className="form-select" name="status" value={formData.status} onChange={handleChange} disabled={!isEdit}>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Parts">Waiting for Parts</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {isEdit && <div className="form-text text-muted">Must follow: Pending &rarr; Assigned &rarr; In Progress &rarr; Completed &rarr; Delivered</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">Additional Notes</label>
              <textarea
                className="form-control"
                rows="2"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any internal notes or observations"
              ></textarea>
            </div>

            {/* SERVICES PERFORMED SECTION */}
            <div className="col-md-12 mt-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-navy mb-0">Services Performed</h5>
                <Button variant="outline-primary" size="sm" onClick={handleAddService}>
                  <FaPlus className="me-1" /> Add Service
                </Button>
              </div>

              {formData.servicesPerformed.length === 0 ? (
                <div className="bg-light text-center py-3 text-muted rounded small mb-3">
                  No specific services added. General estimated cost will be used.
                </div>
              ) : (
                <div className="table-responsive border rounded bg-white mb-3">
                  <Table className="mb-0 align-middle small table-hover">
                    <thead className="table-light text-muted">
                      <tr>
                        <th>Service Name</th>
                        <th style={{ width: '150px' }}>Labour Charge (₹)</th>
                        <th style={{ width: '150px' }}>Washing Charge (₹)</th>
                        <th style={{ width: '100px' }}>Free Service</th>
                        <th className="text-center" style={{ width: '80px' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.servicesPerformed.map((srv, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={srv.serviceName}
                              onChange={(e) => handleServiceChange(idx, 'serviceName', e.target.value)}
                              placeholder="e.g. Engine Oil Change"
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={srv.labourCharge}
                              onChange={(e) => handleServiceChange(idx, 'labourCharge', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-sm"
                              value={srv.washingCharge}
                              onChange={(e) => handleServiceChange(idx, 'washingCharge', e.target.value)}
                            />
                          </td>
                          <td>
                            {srv.isFreeService ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>}
                          </td>
                          <td className="text-center">
                            <Button
                              variant="light"
                              size="sm"
                              className="text-danger border"
                              onClick={() => handleRemoveService(idx)}
                            >
                              <FaTrash size={12} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>

            {/* SPARE PARTS INTEGRATION SECTION */}
            <div className="col-md-12 mt-4 pt-3 border-top">
              <h5 className="fw-bold text-navy mb-3">Add Spare Parts Used</h5>
              
              <Row className="g-3 align-items-end mb-3">
                <Col xs={12} md={7}>
                  <label className="form-label small fw-medium">Select Spare Part</label>
                  <select
                    className="form-select"
                    value={selectedPartToAdd}
                    onChange={(e) => setSelectedPartToAdd(e.target.value)}
                  >
                    <option value="">-- Search and Select Spare Part --</option>
                    {availableParts.map((p) => (
                      <option 
                        key={p._id} 
                        value={p._id} 
                        disabled={p.quantityAvailable <= 0}
                      >
                        {p.partName} ({p.partNumber}) - {p.manufacturer} &bull; ₹{p.sellingPrice} [{p.quantityAvailable <= 0 ? 'Out of Stock' : `${p.quantityAvailable} Avail.`}]
                      </option>
                    ))}
                  </select>
                </Col>

                <Col xs={6} md={3}>
                  <label className="form-label small fw-medium">Qty to Use</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={partQuantityToAdd}
                    onChange={(e) => setPartQuantityToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </Col>

                <Col xs={6} md={2}>
                  <button
                    type="button"
                    className="btn btn-navy w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleAddPart}
                    disabled={!selectedPartToAdd}
                  >
                    <FaPlus size={12} /> Add Part
                  </button>
                </Col>
              </Row>

              {formData.partsUsed.length === 0 ? (
                <div className="bg-light text-center py-3 text-muted rounded small">
                  No spare parts have been added to this job card yet.
                </div>
              ) : (
                <div className="table-responsive border rounded bg-white">
                  <Table className="mb-0 align-middle small table-hover">
                    <thead className="table-light text-muted">
                      <tr>
                        <th className="ps-3">Part Details</th>
                        <th>Price Unit</th>
                        <th>Qty</th>
                        <th>GST %</th>
                        <th>Total</th>
                        <th className="text-center pe-3" style={{ width: '80px' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.partsUsed.map((p, idx) => (
                        <tr key={idx}>
                          <td className="ps-3">
                            <div className="fw-semibold text-dark">{p.partName}</div>
                            <div className="small font-monospace text-muted">{p.partNumber}</div>
                          </td>
                          <td>₹{p.sellingPrice}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max={p.quantityAvailable}
                              className="form-control form-control-sm"
                              style={{ width: '70px' }}
                              value={p.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                if (val > p.quantityAvailable) {
                                  toast.error(`Only ${p.quantityAvailable} items available in stock!`);
                                  return;
                                }
                                const updatedParts = [...formData.partsUsed];
                                updatedParts[idx].quantity = val;
                                setFormData(prev => ({ ...prev, partsUsed: updatedParts }));
                              }}
                            />
                          </td>
                          <td>{p.gstPercent}%</td>
                          <td className="fw-semibold">
                            ₹{(p.sellingPrice * p.quantity * (1 + p.gstPercent / 100)).toFixed(2)}
                          </td>
                          <td className="text-center pe-3">
                            <Button
                              variant="light"
                              size="sm"
                              className="text-danger border"
                              onClick={() => handleRemovePart(p.part)}
                            >
                              <FaTrash size={12} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>

            {/* LIVE BILLING SUMMARY */}
            <div className="col-md-12 mt-4 pt-3 border-top">
              <Row>
                <Col md={6} className="ms-auto">
                  <div className="bg-light p-3 rounded border">
                    <h6 className="fw-bold text-navy mb-3 border-bottom pb-2">Estimated Final Bill Summary</h6>
                    
                    <div className="d-flex justify-content-between mb-2 small text-secondary">
                      <span>Labor & Service:</span>
                      <span className="fw-medium">₹{laborCost.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2 small text-secondary">
                      <span>Spare Parts Cost (Excl. GST):</span>
                      <span className="fw-medium">₹{partsExcludingTax.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2 small text-secondary">
                      <span>Spare Parts GST Amount:</span>
                      <span className="fw-medium">₹{partsTaxAmount.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2 small text-secondary">
                      <span>Spare Parts Cost (Incl. GST):</span>
                      <span className="fw-medium">₹{partsIncludingTax.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between fs-5 fw-bold text-dark">
                      <span>Total Invoice Est:</span>
                      <span className="text-navy">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
            <Link to="/job-cards" className="btn btn-light border px-4">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary-custom px-4 d-flex align-items-center gap-2"
              disabled={submitting}
            >
              {submitting ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : <FaSave />}
              <span>{isEdit ? 'Update Job Card' : 'Save Job Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCardForm;

