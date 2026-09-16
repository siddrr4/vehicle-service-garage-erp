import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Modal, Form } from 'react-bootstrap';
import { 
  FaWalking, FaClock, FaCalendarCheck, FaCar, FaUser, 
  FaPlus, FaSyncAlt, FaTimes, FaCheck 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import waitlistService from '../../services/waitlistService';
import appointmentService from '../../services/appointmentService';
import PageHeader from '../../components/UI/PageHeader';
import StatCard from '../../components/UI/StatCard';
import EmptyState from '../../components/UI/EmptyState';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import WalkInModal from '../../components/Advisor/WalkInModal';
import { getIndiaDateStr, formatTimeIST } from '../../utils/dateUtils';

const WaitingQueue = () => {
  const [waitlist, setWaitlist] = useState([]);
  const [slotData, setSlotData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchWaitlistData = async () => {
    try {
      setLoading(true);
      const todayStr = getIndiaDateStr();
      const [wlData, slotsData] = await Promise.all([
        waitlistService.getTodayWaitlist(),
        appointmentService.getAvailableSlots(todayStr)
      ]);
      setWaitlist(wlData || []);
      setSlotData(slotsData.slots || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load waiting queue data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlistData();
  }, []);

  const openAssignModal = (entry) => {
    setSelectedEntry(entry);
    const firstAvail = slotData.find(s => s.available > 0);
    setSelectedSlot(firstAvail ? firstAvail.time : (slotData[0]?.time || '09:00 AM - 10:00 AM'));
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedEntry || !selectedSlot) return;

    try {
      setAssigning(true);
      await waitlistService.assignWaitlist(selectedEntry._id, { assignedSlot: selectedSlot });
      toast.success(`Slot ${selectedSlot} successfully assigned to ${selectedEntry.customer?.fullName || 'customer'}! Job card created.`);
      setShowAssignModal(false);
      setAssigning(false);
      fetchWaitlistData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign slot');
      setAssigning(false);
    }
  };

  const handleCancelEntry = async (id) => {
    if (window.confirm('Are you sure you want to cancel this waiting queue entry?')) {
      try {
        await waitlistService.cancelWaitlist(id);
        toast.success('Queue entry cancelled');
        fetchWaitlistData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to cancel queue entry');
      }
    }
  };

  const waitingCount = waitlist.filter(w => w.status === 'Waiting').length;
  const assignedCount = waitlist.filter(w => w.status === 'Assigned').length;
  const totalCapacity = slotData.reduce((acc, s) => acc + (s.capacity || 0), 0);
  const totalAvailable = slotData.reduce((acc, s) => acc + (s.available || 0), 0);

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Live Workshop Waiting Queue"
        subtitle="Manage customer walk-ins, track queue priority and assign bay capacity"
        breadcrumbs={[
          { label: 'Dashboard', path: '/admin-dashboard' },
          { label: 'Workshop', path: '/appointments' },
          { label: 'Waiting Queue' }
        ]}
        actions={
          <div className="d-flex gap-2">
            <Button 
              variant="outline-secondary" 
              onClick={fetchWaitlistData} 
              className="d-flex align-items-center gap-2 shadow-sm"
            >
              <FaSyncAlt /> <span>Refresh</span>
            </Button>
            <Link 
              to="/walk-in" 
              className="btn btn-orange d-flex align-items-center gap-2 shadow-sm text-decoration-none"
            >
              <FaWalking /> <span>New Walk-in Entry</span>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Currently Waiting"
            value={waitingCount}
            icon={<FaWalking />}
            color="orange"
            trend={`${waitingCount} in line today`}
            trendColor="text-warning"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Slots Assigned Today"
            value={assignedCount}
            icon={<FaCalendarCheck />}
            color="success"
            trend="Converted to Job Cards"
            trendColor="text-success"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Available Bay Slots"
            value={totalAvailable}
            icon={<FaClock />}
            color="primary"
            trend={`Out of ${totalCapacity} daily capacity`}
            trendColor="text-primary"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Queue Entries"
            value={waitlist.length}
            icon={<FaCar />}
            color="info"
            trend="Today's queue throughput"
            trendColor="text-info"
          />
        </Col>
      </Row>

      {/* Queue List Table Card */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWalking className="text-orange" size={20} />
            <h5 className="fw-bold mb-0 text-navy">Today's Queue Log</h5>
          </div>
          <Badge bg="light" text="dark" className="border px-3 py-2">
            Date: {getIndiaDateStr()}
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="py-5"><LoadingSpinner /></div>
          ) : waitlist.length === 0 ? (
            <EmptyState
              icon={<FaWalking size={44} className="text-muted opacity-50" />}
              title="No customers in the waiting queue"
              message="No walk-in entries have been registered for today yet."
              actionLabel="Add Walk-in Customer"
              onAction={() => setShowWalkInModal(true)}
            />
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th className="px-4">Queue #</th>
                    <th>Arrival Time</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Service Requested</th>
                    <th>Estimated Wait</th>
                    <th>Status</th>
                    <th className="text-end px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((wl) => (
                    <tr key={wl._id}>
                      <td className="px-4">
                        <span className="badge bg-navy px-3 py-2 fs-6">
                          #{wl.queueNumber || '--'}
                        </span>
                      </td>
                      <td className="fw-semibold text-navy">
                        {wl.arrivalTime ? formatTimeIST(wl.arrivalTime) : '--:--'}
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{wl.customer?.fullName || 'Walk-in Customer'}</div>
                        <small className="text-muted">{wl.customer?.mobileNumber || 'N/A'}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{wl.vehicle?.vehicleNumber || 'Unregistered'}</div>
                        <small className="text-muted">{wl.vehicle?.brand} {wl.vehicle?.model}</small>
                      </td>
                      <td>
                        <span className="fw-medium text-navy">{wl.serviceType || 'General Service'}</span>
                      </td>
                      <td>
                        <span className="text-muted small">
                          {wl.estimatedWaitMinutes ? `${wl.estimatedWaitMinutes} mins` : 'Immediate'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${wl.status === 'Assigned' ? 'badge-status-completed' : wl.status === 'Cancelled' ? 'badge-status-cancelled' : 'badge-status-pending'}`}>
                          {wl.status}
                        </span>
                      </td>
                      <td className="text-end px-4">
                        {wl.status === 'Waiting' && (
                          <div className="d-flex justify-content-end gap-2">
                            <Button
                              variant="orange"
                              size="sm"
                              onClick={() => openAssignModal(wl)}
                              className="d-flex align-items-center gap-1"
                            >
                              <FaCheck size={11} /> <span>Assign Slot</span>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleCancelEntry(wl._id)}
                              className="p-1"
                              title="Cancel Queue Entry"
                            >
                              <FaTimes size={12} />
                            </Button>
                          </div>
                        )}
                        {wl.status === 'Assigned' && (
                          <span className="text-success small fw-semibold">
                            Assigned to {wl.assignedSlot || 'Bay'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Assign Slot Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-navy h5">Assign Service Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEntry && (
            <div>
              <div className="p-3 bg-light rounded mb-3 border">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Customer:</span>
                  <span className="fw-bold text-navy">{selectedEntry.customer?.fullName}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Vehicle:</span>
                  <span className="fw-semibold">{selectedEntry.vehicle?.vehicleNumber} ({selectedEntry.vehicle?.brand})</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Service:</span>
                  <span className="fw-semibold text-orange">{selectedEntry.serviceType}</span>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="form-label">Select Available Time Slot</Form.Label>
                <Form.Select 
                  value={selectedSlot} 
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  {slotData.map((s, idx) => (
                    <option key={idx} value={s.time} disabled={s.available <= 0}>
                      {s.time} — ({s.available > 0 ? `${s.available} bays available` : 'Full / No Capacity'})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Assigning a slot automatically reserves mechanic bay capacity and creates a workshop Job Card.
                </Form.Text>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button variant="orange" onClick={handleConfirmAssign} disabled={assigning}>
            {assigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Walk In Modal */}
      <WalkInModal
        show={showWalkInModal}
        onHide={() => setShowWalkInModal(false)}
        onSuccess={fetchWaitlistData}
      />
    </div>
  );
};

export default WaitingQueue;
