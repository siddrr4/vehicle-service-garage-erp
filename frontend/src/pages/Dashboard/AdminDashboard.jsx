import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Table, Badge, Button, Modal } from 'react-bootstrap';
import { 
  FaUsers, FaCar, FaCalendarCheck, FaWrench, 
  FaTools, FaClock, FaWalking, FaPlus, FaUserTie, 
  FaCheckCircle, FaExclamationTriangle, FaChartLine, FaFileInvoiceDollar, FaSyncAlt,
  FaInfoCircle, FaPhoneAlt, FaEnvelope, FaCheck
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend
} from 'recharts';

import appointmentService from '../../services/appointmentService';
import { getCustomers } from '../../services/customerService';
import { getVehicles } from '../../services/vehicleService';
import jobCardService from '../../services/jobCardService';
import employeeService from '../../services/employeeService';
import attendanceService from '../../services/attendanceService';
import waitlistService from '../../services/waitlistService';
import reportService from '../../services/reportService';
import RecommendationModal from '../../components/Advisor/RecommendationModal';
import { getIndiaDateStr, formatDateIST, formatTimeIST } from '../../utils/dateUtils';
import { AuthContext } from '../../context/AuthContext';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const todayStr = getIndiaDateStr();

  // Overview 4 KPIs (Today's Overview)
  const [todayOverview, setTodayOverview] = useState({
    vehiclesInService: 0,
    todayAppointments: 0,
    waitingQueue: 0,
    todayRevenue: 0
  });

  // Job card stats breakdown
  const [jobCardStats, setJobCardStats] = useState({
    Open: 0,
    InProgress: 0,
    WaitingForParts: 0,
    Completed: 0
  });

  // Mechanic data
  const [mechanicData, setMechanicData] = useState({
    totalMechanics: 0,
    checkedIn: 0,
    available: 0,
    busy: 0,
    notCheckedIn: 0,
    onLeave: 0,
    mechanics: []
  });

  // Schedules & queues
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [slotData, setSlotData] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Walk-In Monitoring Telemetry
  const [walkInOverview, setWalkInOverview] = useState([]);
  const [selectedWalkInDetails, setSelectedWalkInDetails] = useState(null);
  const [showWalkInDetailsModal, setShowWalkInDetailsModal] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [selectedAptForRec, setSelectedAptForRec] = useState(null);

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
        sched,
        slots,
        wl,
        allApts,
        mechAvail,
        jcStats,
        todaySummary,
        weeklyRevenue,
        wlOverview
      ] = await Promise.all([
        appointmentService.getTodaySchedule().catch(() => []),
        appointmentService.getAvailableSlots(todayStr).catch(() => ({ slots: [] })),
        waitlistService.getTodayWaitlist().catch(() => []),
        appointmentService.getAppointments({ limit: 50 }).catch(() => ({ appointments: [] })),
        attendanceService.getTodayMechanicAvailability().catch(() => ({
          totalMechanics: 0, checkedIn: 0, available: 0, busy: 0, notCheckedIn: 0, onLeave: 0, mechanics: []
        })),
        jobCardService.getJobCardStats().catch(() => ({})),
        reportService.getSummary(todayStr, todayStr).catch(() => ({})),
        reportService.getRevenueAnalytics().catch(() => ({ dailyRevenue: [] })),
        waitlistService.getWalkInOverview().catch(() => [])
      ]);

      const activeJobs = Number(jcStats['In Progress'] || jcStats['in progress'] || 0);
      const openJobs = Number(jcStats['Open'] || jcStats['Pending'] || 0);
      const waitingParts = Number(jcStats['Waiting for Parts'] || jcStats['Waiting For Parts'] || 0);
      const completedJobs = Number(jcStats['Completed'] || jcStats['Delivered'] || 0);
      const waitingWaitlist = (wl || []).filter(w => w.status === 'Waiting').length;
      const todayRev = Number(todaySummary.amountCollected !== undefined ? todaySummary.amountCollected : (todaySummary.totalBilled || 0));

      setTodayOverview({
        vehiclesInService: activeJobs,
        todayAppointments: (sched || []).length,
        waitingQueue: waitingWaitlist,
        todayRevenue: todayRev
      });

      setJobCardStats({
        Open: openJobs,
        InProgress: activeJobs,
        WaitingForParts: waitingParts,
        Completed: completedJobs
      });

      setTodaySchedule(sched || []);
      setSlotData(slots.slots || []);
      setWaitlist(wl || []);
      setMechanicData(mechAvail);
      setWalkInOverview(wlOverview || []);

      // Future bookings
      const future = (allApts.appointments || []).filter(apt => {
        const aptDateStr = getIndiaDateStr(apt.appointmentDate);
        return aptDateStr > todayStr && apt.status !== 'Cancelled' && apt.status !== 'Completed';
      });
      setUpcomingBookings(future);

      // Format weekly revenue chart if available
      if (weeklyRevenue && Array.isArray(weeklyRevenue.dailyRevenue) && weeklyRevenue.dailyRevenue.length > 0) {
        setChartData(weeklyRevenue.dailyRevenue.map(item => ({
          name: item.date ? item.date.slice(5) : 'Day',
          Revenue: item.amount || item.total || 0,
          Invoices: item.count || 0
        })));
      } else {
        // Fallback chart points
        setChartData([
          { name: 'Mon', Revenue: 0, Invoices: 0 },
          { name: 'Tue', Revenue: 0, Invoices: 0 },
          { name: 'Wed', Revenue: 0, Invoices: 0 },
          { name: 'Thu', Revenue: 0, Invoices: 0 },
          { name: 'Fri', Revenue: 0, Invoices: 0 },
          { name: 'Sat', Revenue: 0, Invoices: 0 },
          { name: 'Today', Revenue: todayRev, Invoices: sched.length }
        ]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard live data', error);
      toast.error('Unable to fetch live dashboard updates');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAssignWaitlist = async (wl) => {
    try {
      const nextAvail = slotData.find(s => s.available > 0);
      if (!nextAvail) {
        toast.error('No slots available today to assign this customer.');
        return;
      }
      
      if (window.confirm(`Assign slot ${nextAvail.time} to ${wl.customer?.fullName}?`)) {
        await waitlistService.assignWaitlist(wl._id, { assignedSlot: nextAvail.time });
        toast.success(`Slot assigned to ${wl.customer?.fullName} successfully! Job Card created.`);
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign slot');
    }
  };

  return (
    <div className="admin-dashboard-container container-fluid p-0">
      {/* SECTION 1: Top Welcome Message & Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="dash-title mb-1">
            {getGreeting()}, <span className="text-gold">{user?.firstName || 'Administrator'}</span>
          </h2>
          <p className="dash-subtitle mb-0">
            Admin Management Console &bull; Live operational telemetry & capacity for <span className="text-gold fw-semibold">{todayStr}</span>
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button 
            type="button"
            className="btn-dash-refresh shadow-sm"
            onClick={loadDashboardData}
          >
            <FaSyncAlt /> <span>Refresh Data</span>
          </button>
          <Link 
            to="/employees" 
            className="btn-dash-primary shadow-sm"
          >
            <FaUserTie /> <span>Manage Staff</span>
          </Link>
          <Link 
            to="/admin-attendance" 
            className="btn-dash-secondary shadow-sm"
          >
            <FaUsers /> <span>Attendance Log</span>
          </Link>
        </div>
      </div>

      {/* SECTION 2: TODAY'S OVERVIEW (Required 4 KPI Cards) */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0 text-white">Today's Overview</h5>
          <span className="text-muted-gray small">Live from MongoDB</span>
        </div>

        <Row className="g-3">
          {/* Card 1: Vehicles in Service */}
          <Col xs={12} sm={6} lg={3}>
            <div className="overview-kpi-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="kpi-label">Vehicles in Service</div>
                  <div className="kpi-value">{todayOverview.vehiclesInService}</div>
                </div>
                <div className="kpi-icon-box">
                  <FaTools />
                </div>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend" style={{ color: '#60A5FA' }}>
                  {todayOverview.vehiclesInService} active repairs
                </span>
                <span className="kpi-subtext">Under active bay work</span>
              </div>
            </div>
          </Col>

          {/* Card 2: Today's Appointments */}
          <Col xs={12} sm={6} lg={3}>
            <div className="overview-kpi-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="kpi-label">Today's Appointments</div>
                  <div className="kpi-value">{todayOverview.todayAppointments}</div>
                </div>
                <div className="kpi-icon-box">
                  <FaCalendarCheck />
                </div>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend" style={{ color: '#34D399' }}>
                  {todaySchedule.length} booked slots
                </span>
                <span className="kpi-subtext">Scheduled for today</span>
              </div>
            </div>
          </Col>

          {/* Card 3: Waiting Queue */}
          <Col xs={12} sm={6} lg={3}>
            <div className="overview-kpi-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="kpi-label">Waiting Queue</div>
                  <div className="kpi-value">{todayOverview.waitingQueue}</div>
                </div>
                <div className="kpi-icon-box">
                  <FaWalking />
                </div>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend" style={{ color: '#FBBF24' }}>
                  {todayOverview.waitingQueue} customers in line
                </span>
                <span className="kpi-subtext">Walk-in priority queue</span>
              </div>
            </div>
          </Col>

          {/* Card 4: Today's Revenue */}
          <Col xs={12} sm={6} lg={3}>
            <div className="overview-kpi-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="kpi-label">Today's Revenue</div>
                  <div className="kpi-value">
                    ₹{Number(todayOverview.todayRevenue).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="kpi-icon-box">
                  <FaFileInvoiceDollar />
                </div>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend text-gold">
                  Collections today
                </span>
                <span className="kpi-subtext">Verified receipts</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* SECTION 3: JOB CARD OVERVIEW (Open, In Progress, Waiting for Parts, Completed) */}
      <div className="dark-card mb-4">
        <div className="dark-card-header">
          <div className="d-flex align-items-center gap-2">
            <FaWrench className="text-gold" size={16} />
            <h6 className="fw-bold mb-0 text-white">Job Card Overview</h6>
          </div>
          <Link to="/job-cards" className="gold-link">
            View All Job Cards &rarr;
          </Link>
        </div>
        <div className="p-4">
          <Row className="g-3">
            <Col xs={6} md={3}>
              <div className="job-stat-card job-stat-open">
                <span className="stat-tag">Open / Pending</span>
                <div className="stat-count">{jobCardStats.Open}</div>
                <span className="stat-desc">Awaiting assignment</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="job-stat-card job-stat-progress">
                <span className="stat-tag">In Progress</span>
                <div className="stat-count">{jobCardStats.InProgress}</div>
                <span className="stat-desc">Active in bay</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="job-stat-card job-stat-parts">
                <span className="stat-tag">Waiting for Parts</span>
                <div className="stat-count">{jobCardStats.WaitingForParts}</div>
                <span className="stat-desc">Parts requisition</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="job-stat-card job-stat-completed">
                <span className="stat-tag">Completed</span>
                <div className="stat-count">{jobCardStats.Completed}</div>
                <span className="stat-desc">Ready for billing</span>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* SECTION 4: TODAY'S APPOINTMENT SCHEDULE */}
      <div className="dark-card mb-4">
        <div className="dark-card-header">
          <div className="d-flex align-items-center gap-2">
            <FaCalendarCheck className="text-gold" size={18} />
            <h5 className="fw-bold mb-0 text-white">Today's Appointment Schedule</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-gold px-3 py-1.5">
              {todaySchedule.length} Booked Today
            </span>
            <Link to="/appointments/book" className="btn-dash-secondary btn-sm d-none d-sm-inline-flex">
              <FaPlus size={10} className="me-1" /> Add
            </Link>
          </div>
        </div>
        <div className="p-0">
          <div className="table-responsive">
            <Table hover className="dark-table align-middle mb-0">
              <thead>
                <tr>
                  <th className="px-4">Time Slot</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Assigned Mechanic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedule.length > 0 ? (
                  todaySchedule.map((apt) => (
                    <tr key={apt._id}>
                      <td className="px-4">
                        <span className="time-slot-badge">
                          <FaClock size={10} />
                          {apt.preferredTime || '09:00 AM'}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-white">{apt.customer?.fullName || 'Walk-in'}</div>
                        <small className="text-muted-gray">{apt.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-white">{apt.vehicle?.vehicleNumber}</div>
                        <small className="text-muted-gray">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                      </td>
                      <td>
                        <span className="fw-medium text-white">{apt.serviceType}</span>
                        {apt.bookingType && (
                          <span className="booking-type-badge">
                            {apt.bookingType}
                          </span>
                        )}
                      </td>
                      <td>
                        {apt.assignedMechanic ? (
                          <span className="text-white fw-semibold d-flex align-items-center gap-1">
                            <FaWrench size={11} className="text-gold" />
                            {apt.assignedMechanic.fullName}
                          </span>
                        ) : (
                          <span className="text-muted-gray small fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={apt.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="dark-empty-box mx-auto" style={{ maxWidth: '480px' }}>
                        <div className="dark-empty-icon">
                          <FaCalendarCheck size={28} />
                        </div>
                        <h6 className="fw-bold text-white mb-1">No appointments scheduled for today</h6>
                        <p className="text-muted-gray small mb-3">
                          There are no appointments on the workshop calendar for today yet.
                        </p>
                        <Link to="/appointments/book" className="btn-dash-primary btn-sm">
                          Book Appointment
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* SECTION 5: REVENUE & SERVICE SUMMARY CHART & MECHANIC AVAILABILITY */}
      <Row className="g-4 mb-4">
        {/* Revenue / Activity Chart */}
        <Col xs={12} lg={7}>
          <div className="dark-card h-100 mb-0">
            <div className="dark-card-header">
              <div className="d-flex align-items-center gap-2">
                <FaChartLine className="text-gold" size={18} />
                <h5 className="fw-bold mb-0 text-white">Revenue & Activity Summary</h5>
              </div>
              <Link to="/reports" className="gold-link">
                Full Analytics &rarr;
              </Link>
            </div>
            <div className="p-4">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(217, 168, 62, 0.08)" />
                    <XAxis dataKey="name" stroke="#A7B0AA" fontSize={12} />
                    <YAxis stroke="#A7B0AA" fontSize={12} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#151A17', 
                        borderColor: 'rgba(217, 168, 62, 0.3)', 
                        borderRadius: '10px',
                        color: '#FFFFFF',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6)'
                      }}
                      formatter={(val, name) => [name === 'Revenue' ? `₹${Number(val).toLocaleString('en-IN')}` : val, name]}
                    />
                    <Legend wrapperStyle={{ color: '#A7B0AA' }} />
                    <Bar dataKey="Revenue" fill="#D9A83E" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Invoices" fill="#3A4841" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Col>

        {/* Live Mechanic Bay Availability */}
        <Col xs={12} lg={5}>
          <div className="dark-card h-100 mb-0 d-flex flex-column justify-content-between">
            <div>
              <div className="dark-card-header">
                <div className="d-flex align-items-center gap-2">
                  <FaTools className="text-gold" size={18} />
                  <h5 className="fw-bold mb-0 text-white">Mechanic Availability</h5>
                </div>
                <span className="badge badge-green px-2 py-1">
                  {mechanicData.available} Available Bays
                </span>
              </div>
              <div className="p-4">
                <Row className="g-2 mb-3">
                  <Col xs={4}>
                    <div className="mechanic-stat-box">
                      <small className="text-muted-gray d-block" style={{ fontSize: '0.7rem' }}>Total Staff</small>
                      <span className="fw-bold text-white fs-5">{mechanicData.totalMechanics}</span>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="mechanic-stat-box box-checked">
                      <small className="d-block" style={{ color: '#34D399', fontSize: '0.7rem' }}>Checked In</small>
                      <span className="fw-bold fs-5" style={{ color: '#34D399' }}>{mechanicData.checkedIn}</span>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="mechanic-stat-box box-busy">
                      <small className="d-block" style={{ color: '#FBBF24', fontSize: '0.7rem' }}>Busy</small>
                      <span className="fw-bold fs-5" style={{ color: '#FBBF24' }}>{mechanicData.busy}</span>
                    </div>
                  </Col>
                </Row>

                <div className="table-responsive" style={{ maxHeight: '180px' }}>
                  <Table hover size="sm" className="dark-table align-middle mb-0 small">
                    <thead>
                      <tr>
                        <th>Mechanic</th>
                        <th>Specialization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mechanicData.mechanics && mechanicData.mechanics.length > 0 ? (
                        mechanicData.mechanics.slice(0, 5).map((m) => (
                          <tr key={m._id}>
                            <td className="fw-semibold text-white">{m.fullName}</td>
                            <td className="text-muted-gray">{m.specialization || 'General'}</td>
                            <td>
                              <StatusBadge status={m.status} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-2 text-muted-gray">No mechanics active.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'rgba(217, 168, 62, 0.12)' }}>
              <Link to="/employees" className="gold-link">
                Manage Staff &rarr;
              </Link>
              <Link to="/admin-attendance" className="text-muted-gray small text-decoration-none">
                View Attendance Log
              </Link>
            </div>
          </div>
        </Col>
      </Row>

      {/* SECTION 6: WALK-IN SERVICE OVERVIEW (MONITORING & TELEMETRY) */}
      <div className="dark-card waiting-queue-card mb-4">
        <div className="dark-card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWalking className="text-gold" size={18} />
            <div>
              <h5 className="fw-bold mb-0 text-white">Walk-In Service Overview</h5>
              <span className="text-muted-gray small" style={{ fontSize: '0.75rem' }}>
                Operational monitoring of walk-in intake, waiting queue, technician workbench &amp; billing status
              </span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-amber px-2.5 py-1">
              {walkInOverview.length} Total Walk-Ins
            </span>
          </div>
        </div>
        <div className="p-0">
          <div className="table-responsive">
            <Table hover className="dark-table align-middle mb-0">
              <thead>
                <tr>
                  <th className="px-3">Queue / Ref #</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service Requirement</th>
                  <th>Priority</th>
                  <th>Queue Status</th>
                  <th>Assigned Mechanic</th>
                  <th>Job Card # / Status</th>
                  <th>Billing Status</th>
                  <th className="text-end px-3">Monitoring</th>
                </tr>
              </thead>
              <tbody>
                {walkInOverview.length > 0 ? (
                  walkInOverview.map((item) => {
                    const custName = item.customer?.fullName || 'Walk-in Guest';
                    const custPhone = item.customer?.mobileNumber || 'N/A';
                    const vehReg = item.vehicle?.registrationNumber || item.vehicle?.vehicleNumber || 'Pending';
                    const vehBrand = item.vehicle?.brand || '';
                    const vehModel = item.vehicle?.model || '';
                    const mechName = item.assignedMechanic?.fullName || null;
                    const jcNumber = item.jobCard?.jobNumber || null;
                    const jcStatus = item.jobCard?.status || null;
                    const billingStatus = item.billing?.status || (item.billing ? 'Billed' : 'Pending Billing');

                    return (
                      <tr key={item._id}>
                        <td className="px-3">
                          <span className="queue-num-badge">
                            {item.queueNumber || 'Direct'}
                          </span>
                          <div className="text-muted-gray" style={{ fontSize: '0.7rem' }}>
                            {item.walkInDate ? formatDateIST(item.walkInDate) : 'Today'}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-white">{custName}</div>
                          <small className="text-muted-gray">{custPhone}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-gold">{vehReg}</div>
                          <small className="text-muted-gray">{vehBrand} {vehModel}</small>
                        </td>
                        <td>
                          <div className="text-white fw-medium">{item.serviceType}</div>
                          <div className="text-muted-gray small text-truncate" style={{ maxWidth: '160px' }}>
                            {item.complaint || 'No complaint notes'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            item.priority === 'High' || item.priority === 'Urgent' ? 'bg-danger' :
                            item.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          } px-2 py-1`}>
                            {item.priority || 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${
                            item.queueStatus === 'Waiting' ? 'badge-waiting' : 'badge-completed'
                          }`}>
                            {item.queueStatus}
                          </span>
                          {item.assignedSlot && item.assignedSlot !== 'Waiting in Queue' && (
                            <div className="text-muted-gray small mt-0.5">
                              {item.assignedSlot}
                            </div>
                          )}
                        </td>
                        <td>
                          {mechName ? (
                            <div>
                              <span className="badge bg-dark border border-secondary text-info px-2 py-1">
                                <FaWrench className="me-1" size={10} />
                                {mechName}
                              </span>
                              <div className="text-muted-gray small mt-0.5">
                                {item.assignedMechanic?.specialization || 'Mechanic'}
                              </div>
                            </div>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-25 text-warning px-2 py-1">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td>
                          {jcNumber ? (
                            <div>
                              <Link to={`/job-cards/${item.jobCard._id}`} className="text-gold fw-bold text-decoration-none">
                                {jcNumber}
                              </Link>
                              <div>
                                <span className={`badge-status mt-1 ${
                                  jcStatus === 'In Progress' ? 'badge-progress' :
                                  jcStatus === 'Completed' ? 'badge-completed' :
                                  jcStatus === 'Assigned' ? 'badge-confirmed' : 'badge-pending'
                                }`}>
                                  {jcStatus}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-gray small">Pending bay slot</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            billingStatus === 'Paid' ? 'bg-success' :
                            billingStatus === 'Pending' ? 'bg-warning text-dark' : 'bg-secondary bg-opacity-50 text-white'
                          } px-2 py-1`}>
                            {billingStatus}
                          </span>
                          {item.billing?.totalAmount !== undefined && (
                            <div className="text-muted-gray small mt-0.5">
                              ₹{item.billing.totalAmount}
                            </div>
                          )}
                        </td>
                        <td className="text-end px-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning d-inline-flex align-items-center gap-1"
                            onClick={() => {
                              setSelectedWalkInDetails(item);
                              setShowWalkInDetailsModal(true);
                            }}
                          >
                            <FaInfoCircle size={12} /> <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted-gray">
                      No walk-in service records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* MODAL: Walk-in Complete Inspection (Monitoring Only for Admin) */}
      <Modal 
        show={showWalkInDetailsModal} 
        onHide={() => setShowWalkInDetailsModal(false)} 
        size="lg"
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Modal.Title className="fw-bold text-white fs-6 d-flex align-items-center gap-2">
            <FaWalking className="text-gold" /> Walk-In Service Details &bull; Monitoring Telemetry
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#111614', color: '#A7B0AA' }}>
          {selectedWalkInDetails && (
            <div className="d-flex flex-column gap-3">
              {/* Header Strip */}
              <div className="p-3 rounded d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ background: 'rgba(217, 168, 62, 0.08)', border: '1px solid rgba(217, 168, 62, 0.25)' }}>
                <div>
                  <div className="fw-bold text-white fs-6">
                    Ticket #{selectedWalkInDetails.queueNumber || 'Direct Check-in'} &bull; {selectedWalkInDetails.serviceType}
                  </div>
                  <div className="small text-muted-gray">
                    Walk-in Time: <span className="text-gold">{selectedWalkInDetails.walkInDate ? formatDateIST(selectedWalkInDetails.walkInDate) : 'Today'}</span>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Badge bg="warning" className="text-dark px-2 py-1">
                    Priority: {selectedWalkInDetails.priority || 'Medium'}
                  </Badge>
                  <Badge bg="info" className="text-dark px-2 py-1">
                    Queue: {selectedWalkInDetails.queueStatus}
                  </Badge>
                </div>
              </div>

              {/* Grid 1: Customer & Vehicle */}
              <Row className="g-3">
                <Col md={6}>
                  <div className="p-3 rounded h-100" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Customer Information
                    </div>
                    <div className="text-white fw-bold fs-6 mb-1">
                      {selectedWalkInDetails.customer?.fullName || 'Walk-in Guest'}
                    </div>
                    <div className="small text-muted-gray mb-1">
                      <strong>Phone:</strong> {selectedWalkInDetails.customer?.mobileNumber || 'N/A'}
                    </div>
                    <div className="small text-muted-gray mb-1">
                      <strong>Email:</strong> {selectedWalkInDetails.customer?.emailAddress || 'N/A'}
                    </div>
                    <div className="small text-muted-gray">
                      <strong>Address:</strong> {selectedWalkInDetails.customer?.address || 'N/A'}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-3 rounded h-100" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Vehicle Details
                    </div>
                    <div className="text-white fw-bold fs-6 mb-1">
                      {selectedWalkInDetails.vehicle?.registrationNumber || selectedWalkInDetails.vehicle?.vehicleNumber || 'N/A'}
                    </div>
                    <div className="small text-muted-gray mb-1">
                      <strong>Make &amp; Model:</strong> {selectedWalkInDetails.vehicle?.brand} {selectedWalkInDetails.vehicle?.model}
                    </div>
                    <div className="small text-muted-gray mb-1">
                      <strong>Fuel Type:</strong> {selectedWalkInDetails.vehicle?.fuelType || 'Petrol'}
                    </div>
                    <div className="small text-muted-gray">
                      <strong>Odometer Reading:</strong> {selectedWalkInDetails.vehicle?.currentOdometerReading ? `${selectedWalkInDetails.vehicle.currentOdometerReading} km` : 'N/A'}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Grid 2: Complaint & Queue Slot */}
              <Row className="g-3">
                <Col md={12}>
                  <div className="p-3 rounded" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Complaint &amp; Service Requirement
                    </div>
                    <p className="text-white mb-2">
                      {selectedWalkInDetails.complaint || 'No special complaints recorded.'}
                    </p>
                    <div className="small text-muted-gray">
                      <strong>Assigned Bay Slot:</strong> <span className="text-white">{selectedWalkInDetails.assignedSlot || 'Not allocated'}</span>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Grid 3: Mechanic, Job Card & Billing */}
              <Row className="g-3">
                <Col md={4}>
                  <div className="p-3 rounded h-100" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Assigned Mechanic
                    </div>
                    {selectedWalkInDetails.assignedMechanic ? (
                      <div>
                        <div className="text-white fw-bold mb-1">
                          {selectedWalkInDetails.assignedMechanic.fullName}
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Staff ID:</strong> {selectedWalkInDetails.assignedMechanic.employeeId || 'N/A'}
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Specialization:</strong> {selectedWalkInDetails.assignedMechanic.specialization || 'General'}
                        </div>
                        <div className="small text-muted-gray">
                          <strong>Status:</strong> <span className="text-info">{selectedWalkInDetails.assignedMechanic.availability || 'Busy'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-warning small">
                        No technician assigned yet. Waiting for Service Advisor dispatch.
                      </div>
                    )}
                  </div>
                </Col>

                <Col md={4}>
                  <div className="p-3 rounded h-100" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Job Card Status
                    </div>
                    {selectedWalkInDetails.jobCard ? (
                      <div>
                        <div className="text-white fw-bold mb-1">
                          {selectedWalkInDetails.jobCard.jobNumber}
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Status:</strong> <span className="text-warning">{selectedWalkInDetails.jobCard.status}</span>
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Est. Charge:</strong> ₹{selectedWalkInDetails.jobCard.estimatedCost || 0}
                        </div>
                        <Link 
                          to={`/job-cards/${selectedWalkInDetails.jobCard._id}`}
                          className="btn btn-sm btn-outline-warning mt-2"
                        >
                          View Full Job Card &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="text-muted-gray small">
                        Job Card will be created upon bay slot allocation.
                      </div>
                    )}
                  </div>
                </Col>

                <Col md={4}>
                  <div className="p-3 rounded h-100" style={{ background: '#161B18', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-gold fw-bold small text-uppercase mb-2">
                      Billing &amp; Payment
                    </div>
                    {selectedWalkInDetails.billing ? (
                      <div>
                        <div className="text-white fw-bold mb-1">
                          Invoice #{selectedWalkInDetails.billing.invoiceNumber}
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Total:</strong> ₹{selectedWalkInDetails.billing.totalAmount || 0}
                        </div>
                        <div className="small text-muted-gray mb-1">
                          <strong>Status:</strong> <span className={selectedWalkInDetails.billing.status === 'Paid' ? 'text-success fw-bold' : 'text-warning'}>
                            {selectedWalkInDetails.billing.status}
                          </span>
                        </div>
                        <Link 
                          to={`/billing/invoice/${selectedWalkInDetails.billing._id}`}
                          className="btn btn-sm btn-outline-success mt-2"
                        >
                          View Invoice &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="text-muted-gray small">
                        Invoice is auto-generated when the mechanic completes the job card.
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#151A17', borderColor: 'rgba(217, 168, 62, 0.25)' }}>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setShowWalkInDetailsModal(false)}
          >
            Close Monitoring View
          </Button>
        </Modal.Footer>
      </Modal>

      {selectedAptForRec && (
        <RecommendationModal 
          show={showRecommendationModal} 
          onHide={() => setShowRecommendationModal(false)} 
          appointment={selectedAptForRec} 
          onSuccess={loadDashboardData} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
