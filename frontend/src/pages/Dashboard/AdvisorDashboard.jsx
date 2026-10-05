import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Table, Badge, Button, Modal, Form } from 'react-bootstrap';
import { 
  FaWalking, FaUserClock, FaWrench, 
  FaSyncAlt, FaPlus, FaCheckCircle, FaExclamationTriangle,
  FaPhoneAlt, FaCar, FaUser, FaTools, FaLightbulb, FaUserCheck, FaClock, FaCheck, FaTimes
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import appointmentService from '../../services/appointmentService';
import jobCardService from '../../services/jobCardService';
import waitlistService from '../../services/waitlistService';
import attendanceService from '../../services/attendanceService';
import { getIndiaDateStr, formatDateIST, formatTimeIST } from '../../utils/dateUtils';
import { AuthContext } from '../../context/AuthContext';

import WalkInModal from '../../components/Advisor/WalkInModal';
import AssignMechanicModal from '../JobCard/AssignMechanicModal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './AdvisorDashboard.css';

const AdvisorDashboard = () => {
  const { user } = useContext(AuthContext);
  const todayStr = getIndiaDateStr();

  // Active Main Tab - Walk-in & front-desk focus
  const [activeTab, setActiveTab] = useState('walkin_queue'); // walkin_queue, jobcards

  // Data States
  const [loading, setLoading] = useState(true);
  const [slotData, setSlotData] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [queueFilter, setQueueFilter] = useState('waiting'); // 'waiting', 'all'
  const [jobCards, setJobCards] = useState([]);
  const [mechanicAvailability, setMechanicAvailability] = useState({
    total: 0,
    available: 0,
    busy: 0,
    onLeave: 0,
    mechanics: []
  });

  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showAssignJobCardModal, setShowAssignJobCardModal] = useState(false);
  const [selectedJobCardForAssign, setSelectedJobCardForAssign] = useState(null);

  // Assign Waitlist Slot Modal
  const [showAssignWaitlistModal, setShowAssignWaitlistModal] = useState(false);
  const [selectedWaitlistEntry, setSelectedWaitlistEntry] = useState(null);
  const [selectedSlotForWaitlist, setSelectedSlotForWaitlist] = useState('');
  const [selectedMechanicForWaitlist, setSelectedMechanicForWaitlist] = useState('');
  const [assigningWaitlist, setAssigningWaitlist] = useState(false);

  // Assign Waitlist Mechanic Modal
  const [showAssignWaitlistMechanicModal, setShowAssignWaitlistMechanicModal] = useState(false);
  const [selectedWaitlistForMech, setSelectedWaitlistForMech] = useState(null);
  const [targetMechanicId, setTargetMechanicId] = useState('');
  const [assigningWaitlistMech, setAssigningWaitlistMech] = useState(false);

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        slotsRes,
        wl,
        jcRes,
        mechAvail
      ] = await Promise.all([
        appointmentService.getAvailableSlots(todayStr).catch(() => ({ slots: [] })),
        waitlistService.getTodayWaitlist().catch(() => []),
        jobCardService.getJobCards(1, 50).catch(() => ({ jobCards: [] })),
        attendanceService.getTodayMechanicAvailability().catch(() => ({
          total: 0,
          available: 0,
          busy: 0,
          onLeave: 0,
          mechanics: []
        }))
      ]);

      setSlotData(slotsRes.slots || []);
      setWaitlist(wl || []);
      setJobCards(jcRes.jobCards || []);
      setMechanicAvailability(mechAvail || {
        total: 0,
        available: 0,
        busy: 0,
        onLeave: 0,
        mechanics: []
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading advisor dashboard:', error);
      toast.error('Failed to load operational console data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handler for waitlist assignment
  const openAssignWaitlistModal = (entry) => {
    setSelectedWaitlistEntry(entry);
    const firstAvail = slotData.find((s) => s.available > 0);
    setSelectedSlotForWaitlist(firstAvail ? firstAvail.time : (slotData[0]?.time || '09:00 AM - 10:00 AM'));
    setSelectedMechanicForWaitlist(entry.assignedMechanic?._id || entry.assignedMechanic || '');
    setShowAssignWaitlistModal(true);
  };

  const handleConfirmAssignWaitlist = async () => {
    if (!selectedWaitlistEntry || !selectedSlotForWaitlist) return;

    try {
      setAssigningWaitlist(true);
      await waitlistService.assignWaitlist(selectedWaitlistEntry._id, {
        assignedSlot: selectedSlotForWaitlist,
        assignedMechanic: selectedMechanicForWaitlist || undefined
      });
      toast.success(`Slot ${selectedSlotForWaitlist} assigned to ${selectedWaitlistEntry.customer?.fullName || 'Customer'}! Job card created.`);
      setShowAssignWaitlistModal(false);
      setAssigningWaitlist(false);
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign slot');
      setAssigningWaitlist(false);
    }
  };

  const handleConfirmAssignWaitlistMechanic = async () => {
    if (!selectedWaitlistForMech || !targetMechanicId) {
      toast.error('Please select an available mechanic');
      return;
    }

    try {
      setAssigningWaitlistMech(true);
      await waitlistService.assignMechanic(selectedWaitlistForMech._id, targetMechanicId);
      toast.success('Mechanic assigned successfully! Updated queue ticket & workbench.');
      setShowAssignWaitlistMechanicModal(false);
      setAssigningWaitlistMech(false);
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mechanic');
      setAssigningWaitlistMech(false);
    }
  };

  const handleCancelWaitlist = async (id) => {
    if (window.confirm('Cancel this waiting queue entry?')) {
      try {
        await waitlistService.cancelWaitlist(id);
        toast.success('Queue entry cancelled');
        loadDashboardData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to cancel entry');
      }
    }
  };

  // KPIs
  const totalBaysCapacity = slotData.reduce((acc, s) => acc + (s.capacity || 0), 0);
  const totalBaysAvailable = slotData.reduce((acc, s) => acc + (s.available || 0), 0);
  const activeQueueCount = waitlist.filter((w) => w.status === 'Waiting').length;
  const activeJobCardsCount = jobCards.filter((j) => ['Assigned', 'In Progress', 'Open'].includes(j.status)).length;
  const filteredWaitlist = waitlist.filter((w) => {
    if (queueFilter === 'waiting') return w.status === 'Waiting';
    return true;
  });



  return (
    <div className="advisor-dashboard-container container-fluid p-0">
      {/* 1. Header & Quick Front-Desk Actions */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 className="dash-title mb-0">
              {getGreeting()}, <span className="text-gold">{user?.firstName || 'Service Advisor'}</span>
            </h2>
            <span 
              className="badge px-2 py-1" 
              style={{ background: 'rgba(217, 168, 62, 0.18)', border: '1px solid rgba(217, 168, 62, 0.4)', color: '#F2C75C', fontSize: '0.75rem' }}
            >
              Front-Desk Console
            </span>
          </div>
          <p className="dash-subtitle mb-0">
            Customer Reception, Workshop Bay Allocation, Waiting Queue &amp; Job Dispatch &bull; <span className="text-gold fw-semibold">{todayStr}</span>
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button 
            type="button"
            className="btn-dash-refresh shadow-sm"
            onClick={loadDashboardData}
            title="Refresh Live Data"
          >
            <FaSyncAlt /> <span>Refresh Console</span>
          </button>
          <button 
            type="button"
            className="btn-dash-primary shadow-sm"
            onClick={() => setShowWalkInModal(true)}
          >
            <FaWalking /> <span>New Walk-in Service</span>
          </button>
          <Link 
            to="/job-cards/add" 
            className="btn-dash-secondary shadow-sm"
          >
            <FaPlus /> <span>New Job Card</span>
          </Link>
        </div>
      </div>

      {/* 2. Front-Desk Operational KPIs */}
      <Row className="g-3 mb-4">
        {/* KPI 1: Today's Walk-in Intake */}
        <Col xs={12} sm={6} lg={3}>
          <div className="advisor-kpi-card">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="kpi-label">Today's Walk-ins</div>
                <h3 className="kpi-value text-gold">{waitlist.length}</h3>
              </div>
              <div className="kpi-icon-box" style={{ borderColor: 'rgba(217, 168, 62, 0.4)', color: '#F2C75C' }}>
                <FaWalking />
              </div>
            </div>
            <div className="kpi-subtext">
              <span className="text-gold fw-semibold">
                {activeQueueCount} In Reception
              </span>
              <span>&bull;</span>
              <span>{waitlist.filter((w) => w.status === 'Assigned').length} In Bays</span>
            </div>
          </div>
        </Col>

        {/* KPI 2: Live Waiting Queue */}
        <Col xs={12} sm={6} lg={3}>
          <div className="advisor-kpi-card">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="kpi-label">Waiting Queue</div>
                <h3 className="kpi-value text-gold">{activeQueueCount}</h3>
              </div>
              <div className="kpi-icon-box" style={{ borderColor: 'rgba(249, 115, 22, 0.4)', color: '#FB923C' }}>
                <FaUserClock />
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{activeQueueCount > 0 ? 'Awaiting bay allocation' : 'Queue clear • All allocated'}</span>
            </div>
          </div>
        </Col>

        {/* KPI 3: Workshop Bay Live Capacity */}
        <Col xs={12} sm={6} lg={3}>
          <div className="advisor-kpi-card">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="kpi-label">Bay Slots Available</div>
                <h3 className="kpi-value" style={{ color: totalBaysAvailable > 0 ? '#4ADE80' : '#F87171' }}>
                  {totalBaysAvailable} <span style={{ fontSize: '1rem', color: '#A7B0AA' }}>/ {totalBaysCapacity} bays</span>
                </h3>
              </div>
              <div className="kpi-icon-box" style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ADE80' }}>
                <FaClock />
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{totalBaysCapacity - totalBaysAvailable} bays occupied / active today</span>
            </div>
          </div>
        </Col>

        {/* KPI 4: Active Job Cards */}
        <Col xs={12} sm={6} lg={3}>
          <div className="advisor-kpi-card">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="kpi-label">Active Job Cards</div>
                <h3 className="kpi-value">{activeJobCardsCount}</h3>
              </div>
              <div className="kpi-icon-box" style={{ borderColor: 'rgba(96, 165, 250, 0.4)', color: '#60A5FA' }}>
                <FaWrench />
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{jobCards.filter((j) => j.status === 'In Progress').length} in progress in bays</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* 3. Live Mechanic Availability Status Bar */}
      <div className="capacity-strip-card mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-circle" style={{ background: 'rgba(217, 168, 62, 0.15)', color: '#F2C75C' }}>
              <FaTools size={14} />
            </div>
            <div>
              <span className="fw-bold text-white small">Workshop Technicians Live Status:</span>
              <span className="text-muted-gray small ms-2">Real-time attendance &amp; bay allocation for mechanic assignment</span>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <span className="mech-badge-item available">
              <FaCheckCircle size={10} /> {mechanicAvailability.available || 0} Available
            </span>
            <span className="mech-badge-item busy">
              <FaWrench size={10} /> {mechanicAvailability.busy || 0} Working on Job
            </span>
            <span className="mech-badge-item leave">
              <FaTimes size={10} /> {mechanicAvailability.onLeave || 0} On Leave / Absent
            </span>
            <span className="mech-badge-item">
              Total {mechanicAvailability.total || 0} Technicians
            </span>
          </div>
        </div>
      </div>

      {/* 4. Navigation Tabs */}
      <div className="advisor-nav-tabs">

        <button
          type="button"
          className={`advisor-tab-btn ${activeTab === 'walkin_queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('walkin_queue')}
        >
          <FaWalking />
          <span>Walk-ins &amp; Waiting Queue</span>
          {activeQueueCount > 0 && (
            <span className="advisor-tab-badge" style={{ background: 'rgba(249, 115, 22, 0.25)', color: '#FB923C' }}>
              {activeQueueCount} Waiting
            </span>
          )}
        </button>

        <button
          type="button"
          className={`advisor-tab-btn ${activeTab === 'jobcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobcards')}
        >
          <FaWrench />
          <span>Walk-in Job Cards</span>
          <span className="advisor-tab-badge">{activeJobCardsCount}</span>
        </button>
      </div>

      {/* 5. TAB CONTENT */}
      {loading ? (
        <div className="py-5 text-center">
          <LoadingSpinner text="Syncing Workshop Operations..." />
        </div>
      ) : (
        <>


          {/* TAB 2: WALK-IN SERVICE & WAITING QUEUE */}
          {activeTab === 'walkin_queue' && (
            <div>
              {/* Real-time Bay Capacity Slot Grid */}
              <div className="capacity-strip-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-white mb-1">Live Workshop Bay Capacity &amp; Time Slots</h6>
                    <span className="text-muted-gray small">Derived strictly from active mechanic check-ins &amp; scheduled bay load for today ({todayStr})</span>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => setShowWalkInModal(true)}
                  >
                    <FaWalking className="me-1" /> Create Walk-in
                  </button>
                </div>

                <Row className="g-2">
                  {slotData.length === 0 ? (
                    <Col xs={12} className="text-center py-2 text-muted-gray small">
                      No slot capacity data available for today.
                    </Col>
                  ) : (
                    slotData.map((slot, idx) => (
                      <Col xs={6} md={3} lg={2} key={idx}>
                        <div className={`slot-pill ${slot.available > 0 ? 'has-capacity' : 'is-full'}`}>
                          <span className="small text-white fw-bold">{slot.time}</span>
                          <div className="d-flex justify-content-between align-items-center px-1">
                            <span className="text-muted-gray" style={{ fontSize: '0.72rem' }}>
                              Cap: {slot.capacity}
                            </span>
                            <span 
                              className="fw-bold" 
                              style={{ 
                                fontSize: '0.75rem', 
                                color: slot.available > 0 ? '#4ADE80' : '#F87171' 
                              }}
                            >
                              {slot.available > 0 ? `${slot.available} free` : 'Full'}
                            </span>
                          </div>
                        </div>
                      </Col>
                    ))
                  )}
                </Row>
              </div>

              {/* Waiting Queue Table */}
              <div className="advisor-table-card mb-4">
                <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                  <div>
                    <h5 className="fw-bold text-white mb-0">Live Customer Waiting Queue</h5>
                    <span className="text-muted-gray small">Unscheduled walk-in customers registered for service</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${queueFilter === 'waiting' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                        onClick={() => setQueueFilter('waiting')}
                      >
                        Currently Waiting ({activeQueueCount})
                      </button>
                      <button
                        type="button"
                        className={`btn ${queueFilter === 'all' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                        onClick={() => setQueueFilter('all')}
                      >
                        All Today's Tickets ({waitlist.length})
                      </button>
                    </div>
                    <Link to="/walk-in" className="btn btn-sm btn-outline-warning text-nowrap">
                      <FaWalking className="me-1" /> Full Walk-in Wizard
                    </Link>
                  </div>
                </div>

                <div className="table-responsive">
                  <Table hover className="table-dark-custom mb-0">
                    <thead>
                      <tr>
                        <th>Queue #</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Service Requirement</th>
                        <th>Queue Status</th>
                        <th>Assigned Mechanic</th>
                        <th>Job Card / Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWaitlist.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-4 text-center">
                            <EmptyState
                              title={queueFilter === 'waiting' ? "No customers currently in waiting queue" : "No queue tickets found for today"}
                              message={queueFilter === 'waiting' && waitlist.length > 0
                                ? "All registered walk-in customers have been assigned to workshop bays and job cards."
                                : "When walk-in customers arrive without a booking, register them into the queue."}
                              actionText="Add Walk-in Customer"
                              onAction={() => setShowWalkInModal(true)}
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredWaitlist.map((entry, idx) => {
                          const mech = entry.assignedMechanic || entry.jobCardRef?.assignedMechanic;
                          const jc = entry.jobCardRef;
                          const regNo = entry.vehicle?.registrationNumber || entry.vehicle?.vehicleNumber || 'Pending';

                          return (
                            <tr key={entry._id}>
                              <td>
                                <div className="fw-bold text-gold">
                                  {entry.queueNumber || `#${idx + 1}`}
                                </div>
                                <small className="text-muted-gray">
                                  {formatTimeIST(entry.arrivalTime || entry.createdAt)}
                                </small>
                              </td>
                              <td>
                                <div className="fw-semibold text-white">{entry.customer?.fullName || 'Walk-in Guest'}</div>
                                <small className="text-muted-gray">
                                  <FaPhoneAlt size={10} className="me-1 text-gold" />
                                  {entry.customer?.mobileNumber || 'N/A'}
                                </small>
                              </td>
                              <td>
                                <div className="fw-bold text-white">
                                  {regNo}
                                </div>
                                <small className="text-muted-gray">
                                  {entry.vehicle?.brand} {entry.vehicle?.model}
                                </small>
                              </td>
                              <td>
                                <div className="text-white fw-medium">{entry.serviceType || 'General Inspection'}</div>
                                <small className="text-muted-gray text-truncate d-block" style={{ maxWidth: '180px' }}>
                                  {entry.problemDescription || entry.notes || 'Walk-in service'}
                                </small>
                              </td>
                              <td>
                                <span className={`badge-status ${entry.status === 'Waiting' ? 'badge-waiting' : 'badge-completed'}`}>
                                  {entry.status}
                                </span>
                                {entry.assignedSlot && (
                                  <div className="small text-muted-gray mt-1">
                                    Slot: {entry.assignedSlot}
                                  </div>
                                )}
                              </td>
                              <td>
                                {mech ? (
                                  <div>
                                    <span className="badge bg-dark border border-secondary text-info px-2 py-1">
                                      <FaUserCheck className="me-1" />
                                      {mech.fullName || 'Assigned'}
                                    </span>
                                    <div className="small text-muted-gray mt-1">
                                      {mech.specialization || 'Mechanic'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="badge bg-secondary bg-opacity-25 text-warning px-2 py-1">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                              <td>
                                {jc ? (
                                  <div>
                                    <Link to={`/job-cards/${jc._id}`} className="text-gold fw-bold text-decoration-none">
                                      {jc.jobNumber || 'View Job Card'}
                                    </Link>
                                    <div>
                                      <span className={`badge-status mt-1 ${
                                        jc.status === 'In Progress' ? 'badge-progress' :
                                        jc.status === 'Completed' ? 'badge-completed' :
                                        jc.status === 'Assigned' ? 'badge-confirmed' : 'badge-pending'
                                      }`}>
                                        {jc.status}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-gray small">
                                    {entry.status === 'Waiting' ? 'Pending Slot' : 'Created'}
                                  </span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="d-inline-flex gap-1 flex-wrap justify-content-end">
                                  {/* Assign Mechanic Button */}
                                  <button
                                    type="button"
                                    className="btn-table-action btn-action-gold"
                                    title="Assign or Change Mechanic"
                                    onClick={() => {
                                      setSelectedWaitlistForMech(entry);
                                      setTargetMechanicId(mech?._id || '');
                                      setShowAssignWaitlistMechanicModal(true);
                                    }}
                                  >
                                    <FaUserCheck size={11} /> <span>Assign Mechanic</span>
                                  </button>

                                  {/* Assign Bay Slot Button if Waiting */}
                                  {entry.status === 'Waiting' && (
                                    <button
                                      type="button"
                                      className="btn-table-action btn-action-green"
                                      title="Allocate Workshop Bay Slot"
                                      onClick={() => openAssignWaitlistModal(entry)}
                                    >
                                      <FaCheck size={11} /> <span>Assign Bay</span>
                                    </button>
                                  )}

                                  {entry.status === 'Waiting' && (
                                    <button
                                      type="button"
                                      className="btn-table-action"
                                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                      title="Cancel Entry"
                                      onClick={() => handleCancelWaitlist(entry._id)}
                                    >
                                      <FaTimes size={11} /> <span>Cancel</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVE WORKSHOP JOB CARDS */}
          {activeTab === 'jobcards' && (
            <div className="advisor-table-card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold text-white mb-0">Workshop Job Cards</h5>
                  <span className="text-muted-gray small">Live repair orders, priority levels, charges &amp; technician assignments</span>
                </div>
                <Link to="/job-cards/add" className="btn btn-sm btn-warning text-dark fw-bold">
                  <FaPlus size={11} className="me-1" /> New Job Card
                </Link>
              </div>

              <div className="table-responsive">
                <Table hover className="table-dark-custom mb-0">
                  <thead>
                    <tr>
                      <th>Job Card #</th>
                      <th>Vehicle</th>
                      <th>Customer</th>
                      <th>Priority</th>
                      <th>Assigned Mechanic</th>
                      <th>Status</th>
                      <th>Est. Total</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCards.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-4 text-center">
                          <EmptyState
                            title="No Job Cards Found"
                            message="Create a new job card from walk-in service arrivals or queue allocations."
                            actionText="Create Job Card"
                            actionLink="/job-cards/add"
                          />
                        </td>
                      </tr>
                    ) : (
                      jobCards.map((jc) => (
                        <tr key={jc._id}>
                          <td>
                            <div className="fw-bold text-gold">{jc.jobNumber || jc._id.slice(-6).toUpperCase()}</div>
                            <small className="text-muted-gray">{formatDateIST(jc.createdAt)}</small>
                          </td>
                          <td>
                            <div className="fw-semibold text-white">
                              {jc.vehicle?.registrationNumber || 'N/A'}
                            </div>
                            <small className="text-muted-gray">
                              {jc.vehicle?.brand} {jc.vehicle?.model}
                            </small>
                          </td>
                          <td>
                            <div className="text-white">{jc.customer?.fullName || 'N/A'}</div>
                            <small className="text-muted-gray">{jc.customer?.mobileNumber || 'N/A'}</small>
                          </td>
                          <td>
                            <span className={`badge ${
                              jc.priority === 'High' ? 'bg-danger' :
                              jc.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-info text-dark'
                            } px-2 py-1`}>
                              {jc.priority || 'Normal'}
                            </span>
                          </td>
                          <td>
                            {jc.assignedMechanic ? (
                              <span className="badge bg-dark border border-secondary text-info px-2 py-1">
                                <FaTools size={10} className="me-1" />
                                {jc.assignedMechanic.fullName || 'Assigned'}
                              </span>
                            ) : (
                              <span className="badge bg-secondary bg-opacity-25 text-muted px-2 py-1">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge-status ${
                              jc.status === 'Completed' ? 'badge-completed' :
                              jc.status === 'In Progress' ? 'badge-progress' :
                              jc.status === 'Waiting for Parts' ? 'badge-pending' : 'badge-confirmed'
                            }`}>
                              {jc.status}
                            </span>
                          </td>
                          <td className="fw-bold text-white">
                            ₹{(jc.totalAmount || jc.estimatedCost || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className="btn-table-action btn-action-gold"
                                onClick={() => {
                                  setSelectedJobCardForAssign(jc);
                                  setShowAssignJobCardModal(true);
                                }}
                              >
                                <FaUserCheck size={11} /> <span>Assign</span>
                              </button>
                              <Link
                                to={`/job-cards/${jc._id}`}
                                className="btn-table-action btn-action-green"
                              >
                                Details
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Walk-In Service Modal */}
      <WalkInModal
        show={showWalkInModal}
        onHide={() => setShowWalkInModal(false)}
        onSuccess={() => {
          loadDashboardData();
          setShowWalkInModal(false);
        }}
      />



      {/* MODAL 4: Assign Mechanic to Job Card */}
      {selectedJobCardForAssign && (
        <AssignMechanicModal
          show={showAssignJobCardModal}
          onHide={() => {
            setShowAssignJobCardModal(false);
            setSelectedJobCardForAssign(null);
          }}
          jobCard={selectedJobCardForAssign}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}

      {/* MODAL 5: Assign Waitlist Entry to Slot */}
      <Modal 
        show={showAssignWaitlistModal} 
        onHide={() => setShowAssignWaitlistModal(false)} 
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Modal.Title className="fw-bold text-white fs-6">
            Assign Bay Slot to Waiting Customer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#111614', color: '#A7B0AA' }}>
          {selectedWaitlistEntry && (
            <div>
              <p className="mb-2">
                Allocate a workshop service bay slot to <strong className="text-white">{selectedWaitlistEntry.customer?.fullName}</strong> ({selectedWaitlistEntry.vehicle?.registrationNumber || 'Walk-in'}).
              </p>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-white">Select Available Time Slot for Today *</Form.Label>
                <Form.Select
                  value={selectedSlotForWaitlist}
                  onChange={(e) => setSelectedSlotForWaitlist(e.target.value)}
                  style={{
                    backgroundColor: '#0E1310',
                    borderColor: 'rgba(217, 168, 62, 0.35)',
                    color: '#FFFFFF'
                  }}
                >
                  {slotData.map((s, idx) => (
                    <option key={idx} value={s.time}>
                      {s.time} — ({s.available} bays available / {s.capacity} capacity)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-white">Assign Available Mechanic (Optional — can assign later)</Form.Label>
                <Form.Select
                  value={selectedMechanicForWaitlist}
                  onChange={(e) => setSelectedMechanicForWaitlist(e.target.value)}
                  style={{
                    backgroundColor: '#0E1310',
                    borderColor: 'rgba(217, 168, 62, 0.35)',
                    color: '#FFFFFF'
                  }}
                >
                  <option value="">-- No Mechanic Assigned Yet (Assign Later) --</option>
                  {mechanicAvailability.mechanics.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.specialization || 'Mechanic'}) &bull; Status: {m.status || m.availability || 'Available'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setShowAssignWaitlistModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            size="sm" 
            className="text-dark fw-bold"
            disabled={assigningWaitlist}
            onClick={handleConfirmAssignWaitlist}
          >
            {assigningWaitlist ? 'Allocating Bay...' : 'Confirm Bay Allocation'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL 6: Assign Mechanic to Walk-in Queue / Job Card */}
      <Modal 
        show={showAssignWaitlistMechanicModal} 
        onHide={() => setShowAssignWaitlistMechanicModal(false)} 
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Modal.Title className="fw-bold text-white fs-6">
            <FaUserCheck className="me-2 text-gold" /> Assign Mechanic to Walk-in Service
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#111614', color: '#A7B0AA' }}>
          {selectedWaitlistForMech && (
            <div>
              <div className="p-3 mb-3 rounded" style={{ background: 'rgba(217, 168, 62, 0.08)', border: '1px solid rgba(217, 168, 62, 0.25)' }}>
                <div className="fw-bold text-white">
                  Ticket #{selectedWaitlistForMech.queueNumber || 'Queue Entry'} &bull; {selectedWaitlistForMech.serviceType}
                </div>
                <div className="small text-muted-gray mt-1">
                  Customer: <span className="text-white">{selectedWaitlistForMech.customer?.fullName}</span> &bull; Vehicle: <span className="text-gold">{selectedWaitlistForMech.vehicle?.registrationNumber || selectedWaitlistForMech.vehicle?.vehicleNumber || 'N/A'}</span>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-white">Select Available Technician *</Form.Label>
                <Form.Select
                  value={targetMechanicId}
                  onChange={(e) => setTargetMechanicId(e.target.value)}
                  style={{
                    backgroundColor: '#0E1310',
                    borderColor: 'rgba(217, 168, 62, 0.35)',
                    color: '#FFFFFF'
                  }}
                >
                  <option value="">-- Choose Checked-In Mechanic --</option>
                  {mechanicAvailability.mechanics.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.fullName} ({m.specialization || 'Mechanic'}) — {m.status || m.availability || 'Available'}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted-gray small">
                  Assigning a technician syncs the walk-in ticket and updates the job card on the mechanic's workbench.
                </Form.Text>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setShowAssignWaitlistMechanicModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            size="sm" 
            className="text-dark fw-bold"
            disabled={assigningWaitlistMech || !targetMechanicId}
            onClick={handleConfirmAssignWaitlistMechanic}
          >
            {assigningWaitlistMech ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdvisorDashboard;
