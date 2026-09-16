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
  Tooltip as RechartsTooltip, Legend, AreaChart, Area 
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
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import EmptyState from '../../components/UI/EmptyState';

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
        // Build fallback chart points based on weekly data from backend
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
    <div className="container-fluid p-0">
      {/* Top Welcome Message & Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-navy" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
            {getGreeting()}, {user?.firstName || 'Service Advisor'}
          </h2>
          <p className="text-muted mb-0 small">
            Workshop Console &bull; Live operational telemetry & capacity for <span className="fw-semibold text-navy">{todayStr}</span>
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button 
            variant="outline-secondary" 
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={loadDashboardData}
          >
            <FaSyncAlt /> <span>Refresh Data</span>
          </Button>
          <Link 
            to="/walk-in" 
            className="btn btn-orange d-flex align-items-center gap-2 shadow-sm text-decoration-none"
          >
            <FaWalking /> <span>New Walk-in Service</span>
          </Link>
          <Link to="/job-cards/add" className="btn btn-navy d-flex align-items-center gap-2 shadow-sm text-decoration-none">
            <FaPlus /> <span>New Job Card</span>
          </Link>
        </div>
      </div>

      {/* TODAY'S OVERVIEW (Required 4 KPI Cards) */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0 text-navy">Today's Overview</h5>
          <span className="text-muted small">Live from MongoDB</span>
        </div>

        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Vehicles in Service"
              value={todayOverview.vehiclesInService}
              icon={<FaTools />}
              color="primary"
              trend={`${todayOverview.vehiclesInService} active repairs`}
              trendColor="text-primary"
              subtext="Under active bay work"
            />
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Today's Appointments"
              value={todayOverview.todayAppointments}
              icon={<FaCalendarCheck />}
              color="success"
              trend={`${todaySchedule.length} booked slots`}
              trendColor="text-success"
              subtext="Scheduled for today"
            />
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Waiting Queue"
              value={todayOverview.waitingQueue}
              icon={<FaWalking />}
              color="orange"
              trend={`${todayOverview.waitingQueue} customers in line`}
              trendColor="text-warning"
              subtext="Walk-in priority queue"
            />
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Today's Revenue"
              value={`₹${Number(todayOverview.todayRevenue).toLocaleString('en-IN')}`}
              icon={<FaFileInvoiceDollar />}
              color="info"
              trend="Collections today"
              trendColor="text-info"
              subtext="Verified receipts"
            />
          </Col>
        </Row>
      </div>

      {/* JOB CARD OVERVIEW (Open, In Progress, Waiting for Parts, Completed) */}
      <Card className="border-0 shadow-sm mb-4 bg-card">
        <Card.Header className="bg-transparent border-bottom pt-3 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWrench className="text-orange" />
            <h6 className="fw-bold mb-0 text-navy">Job Card Overview</h6>
          </div>
          <Link to="/job-cards" className="text-primary text-decoration-none fw-semibold small">
            View All Job Cards &rarr;
          </Link>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col xs={6} md={3}>
              <div className="p-3 bg-light rounded text-center border">
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.725rem' }}>Open / Pending</small>
                <h3 className="fw-bold text-navy mb-0 mt-1">{jobCardStats.Open}</h3>
                <small className="text-muted">Awaiting assignment</small>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 bg-primary bg-opacity-10 rounded text-center border border-primary border-opacity-25">
                <small className="text-primary text-uppercase fw-bold" style={{ fontSize: '0.725rem' }}>In Progress</small>
                <h3 className="fw-bold text-primary mb-0 mt-1">{jobCardStats.InProgress}</h3>
                <small className="text-muted">Active in bay</small>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 bg-warning bg-opacity-10 rounded text-center border border-warning border-opacity-25">
                <small className="text-warning text-dark text-uppercase fw-bold" style={{ fontSize: '0.725rem' }}>Waiting for Parts</small>
                <h3 className="fw-bold text-warning mb-0 mt-1">{jobCardStats.WaitingForParts}</h3>
                <small className="text-muted">Parts requisition</small>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 bg-success bg-opacity-10 rounded text-center border border-success border-opacity-25">
                <small className="text-success text-uppercase fw-bold" style={{ fontSize: '0.725rem' }}>Completed</small>
                <h3 className="fw-bold text-success mb-0 mt-1">{jobCardStats.Completed}</h3>
                <small className="text-muted">Ready for billing</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* TODAY'S APPOINTMENT SCHEDULE */}
      <Card className="border-0 shadow-sm mb-4 bg-card">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaCalendarCheck className="text-primary" size={18} />
            <h5 className="fw-bold mb-0 text-navy">Today's Appointment Schedule</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="primary" className="px-3 py-1.5">
              {todaySchedule.length} Booked Today
            </Badge>
            <Link to="/appointments/book" className="btn btn-sm btn-outline-primary d-none d-sm-inline-flex">
              <FaPlus size={10} className="me-1" /> Add
            </Link>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
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
                        <span className="badge bg-light text-navy border fw-bold px-2 py-1">
                          <FaClock size={10} className="me-1 text-muted" />
                          {apt.preferredTime || '09:00 AM'}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-navy">{apt.customer?.fullName || 'Walk-in'}</div>
                        <small className="text-muted">{apt.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{apt.vehicle?.vehicleNumber}</div>
                        <small className="text-muted">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                      </td>
                      <td>
                        <span className="fw-medium text-navy">{apt.serviceType}</span>
                        {apt.bookingType && (
                          <span className="badge bg-light text-muted border ms-2" style={{ fontSize: '0.65rem' }}>
                            {apt.bookingType}
                          </span>
                        )}
                      </td>
                      <td>
                        {apt.assignedMechanic ? (
                          <span className="text-navy fw-semibold d-flex align-items-center gap-1">
                            <FaWrench size={12} className="text-orange" />
                            {apt.assignedMechanic.fullName}
                          </span>
                        ) : (
                          <span className="text-muted small fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={apt.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <EmptyState
                        icon={<FaCalendarCheck size={36} className="text-muted opacity-50" />}
                        title="No appointments scheduled for today"
                        message="There are no appointments on the workshop calendar for today yet."
                        actionLabel="Book Appointment"
                        actionLink="/appointments/book"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* REVENUE & SERVICE SUMMARY CHART & MECHANIC AVAILABILITY */}
      <Row className="g-4 mb-4">
        {/* Revenue / Activity Chart */}
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaChartLine className="text-orange" size={18} />
                <h5 className="fw-bold mb-0 text-navy">Revenue & Activity Summary</h5>
              </div>
              <Link to="/reports" className="text-primary text-decoration-none fw-semibold small">
                Full Analytics &rarr;
              </Link>
            </Card.Header>
            <Card.Body className="p-4">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px' }}
                      formatter={(val, name) => [name === 'Revenue' ? `₹${Number(val).toLocaleString('en-IN')}` : val, name]}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#EA580C" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Invoices" fill="#0F172A" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Live Mechanic Bay Availability */}
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm bg-card h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaTools className="text-primary" size={18} />
                <h5 className="fw-bold mb-0 text-navy">Mechanic Availability</h5>
              </div>
              <span className="badge bg-success text-white px-2 py-1">
                {mechanicData.available} Available Bays
              </span>
            </Card.Header>
            <Card.Body className="p-4 d-flex flex-column justify-content-between">
              <Row className="g-2 mb-3">
                <Col xs={4}>
                  <div className="p-2 bg-light rounded text-center border">
                    <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Total Staff</small>
                    <span className="fw-bold text-navy fs-5">{mechanicData.totalMechanics}</span>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="p-2 bg-success bg-opacity-10 rounded text-center border border-success border-opacity-25">
                    <small className="text-success d-block" style={{ fontSize: '0.7rem' }}>Checked In</small>
                    <span className="fw-bold text-success fs-5">{mechanicData.checkedIn}</span>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="p-2 bg-warning bg-opacity-10 rounded text-center border border-warning border-opacity-25">
                    <small className="text-warning text-dark d-block" style={{ fontSize: '0.7rem' }}>Busy</small>
                    <span className="fw-bold text-warning fs-5">{mechanicData.busy}</span>
                  </div>
                </Col>
              </Row>

              <div className="table-responsive" style={{ maxHeight: '180px' }}>
                <Table hover size="sm" className="align-middle mb-0 small">
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
                          <td className="fw-semibold text-navy">{m.fullName}</td>
                          <td className="text-muted">{m.specialization || 'General'}</td>
                          <td>
                            <StatusBadge status={m.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center py-2 text-muted">No mechanics active.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                <Link to="/employees" className="text-primary small fw-semibold text-decoration-none">
                  Manage Staff &rarr;
                </Link>
                <Link to="/admin-attendance" className="text-muted small text-decoration-none">
                  View Attendance Log
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* LIVE WAITING QUEUE SNIPPET */}
      <Card className="border-0 shadow-sm mb-4 bg-card border-start border-4 border-orange">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWalking className="text-orange" size={18} />
            <h5 className="fw-bold mb-0 text-navy">Live Waiting Queue (Walk-in Desk)</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark px-2.5 py-1">
              {waitlist.filter(w => w.status === 'Waiting').length} Waiting
            </span>
            <Link to="/waiting-queue" className="text-orange text-decoration-none fw-semibold small ms-2">
              Full Queue Console &rarr;
            </Link>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
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
                        <span className="badge bg-navy px-2.5 py-1">#{wl.queueNumber}</span>
                      </td>
                      <td className="fw-bold text-navy">{wl.customer?.fullName}</td>
                      <td>{wl.vehicle?.vehicleNumber} ({wl.vehicle?.brand})</td>
                      <td>{wl.serviceType}</td>
                      <td>{new Date(wl.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><StatusBadge status={wl.status} /></td>
                      <td className="text-end px-4">
                        <Button 
                          variant="orange" 
                          size="sm"
                          onClick={() => handleAssignWaitlist(wl)}
                        >
                          Assign Next Bay
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-3 text-muted">
                      No walk-in customers waiting in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

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
