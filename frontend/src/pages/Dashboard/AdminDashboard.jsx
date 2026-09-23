import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { 
  FaUsers, FaCar, FaCalendarCheck, FaWrench, 
  FaTools, FaClock, FaWalking, FaPlus, FaUserTie, 
  FaCheckCircle, FaExclamationTriangle, FaChartLine, FaFileInvoiceDollar, FaSyncAlt
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
import WalkInModal from '../../components/Advisor/WalkInModal';
import RecommendationModal from '../../components/Advisor/RecommendationModal';
import { getIndiaDateStr, formatDateIST } from '../../utils/dateUtils';
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

  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
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
        weeklyRevenue
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
        reportService.getRevenueAnalytics().catch(() => ({ dailyRevenue: [] }))
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
            {getGreeting()}, <span className="text-gold">{user?.firstName || 'Service Advisor'}</span>
          </h2>
          <p className="dash-subtitle mb-0">
            Workshop Console &bull; Live operational telemetry & capacity for <span className="text-gold fw-semibold">{todayStr}</span>
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
            to="/walk-in" 
            className="btn-dash-primary shadow-sm"
          >
            <FaWalking /> <span>New Walk-in Service</span>
          </Link>
          <Link 
            to="/job-cards/add" 
            className="btn-dash-secondary shadow-sm"
          >
            <FaPlus /> <span>New Job Card</span>
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

      {/* SECTION 6: LIVE WAITING QUEUE SNIPPET */}
      <div className="dark-card waiting-queue-card mb-4">
        <div className="dark-card-header">
          <div className="d-flex align-items-center gap-2">
            <FaWalking className="text-gold" size={18} />
            <h5 className="fw-bold mb-0 text-white">Live Waiting Queue (Walk-in Desk)</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-amber px-2.5 py-1">
              {waitlist.filter(w => w.status === 'Waiting').length} Waiting
            </span>
            <Link to="/waiting-queue" className="gold-link ms-2">
              Full Queue Console &rarr;
            </Link>
          </div>
        </div>
        <div className="p-0">
          <div className="table-responsive">
            <Table hover className="dark-table align-middle mb-0">
              <thead>
                <tr>
                  <th className="px-4">Queue #</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service Requested</th>
                  <th>Arrival Time</th>
                  <th>Status</th>
                  <th className="text-end px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.filter(w => w.status === 'Waiting').length > 0 ? (
                  waitlist.filter(w => w.status === 'Waiting').slice(0, 5).map((wl) => (
                    <tr key={wl._id}>
                      <td className="px-4">
                        <span className="queue-num-badge">#{wl.queueNumber}</span>
                      </td>
                      <td className="fw-bold text-white">{wl.customer?.fullName}</td>
                      <td>{wl.vehicle?.vehicleNumber} ({wl.vehicle?.brand})</td>
                      <td>{wl.serviceType}</td>
                      <td>{new Date(wl.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><StatusBadge status={wl.status} /></td>
                      <td className="text-end px-4">
                        <button 
                          className="btn-dash-primary btn-sm"
                          onClick={() => handleAssignWaitlist(wl)}
                        >
                          Assign Next Bay
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted-gray">
                      No walk-in customers waiting in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <WalkInModal 
        show={showWalkInModal} 
        onHide={() => setShowWalkInModal(false)} 
        onSuccess={loadDashboardData} 
      />

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
