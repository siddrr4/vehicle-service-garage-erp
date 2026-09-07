import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { 
  FaUsers, FaCar, FaCalendarCheck, FaWrench, 
  FaTools, FaExclamationTriangle, FaChartLine, 
  FaPlus, FaUserTie, FaCheckCircle, FaClock, FaLightbulb, FaWalking
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import { getCustomers } from '../../services/customerService';
import { getVehicles } from '../../services/vehicleService';
import jobCardService from '../../services/jobCardService';
import employeeService from '../../services/employeeService';
import attendanceService from '../../services/attendanceService';
import waitlistService from '../../services/waitlistService';
import WalkInModal from '../../components/Advisor/WalkInModal';
import RecommendationModal from '../../components/Advisor/RecommendationModal';

const summaryStats = [
  { id: 1, title: 'Total Customers', value: '0', icon: <FaUsers />, color: 'primary', bg: 'bg-primary', trend: 'Live from DB', trendColor: 'text-success' },
  { id: 2, title: 'Total Vehicles', value: '0', icon: <FaCar />, color: 'info', bg: 'bg-info', trend: 'Live from DB', trendColor: 'text-success' },
  { id: 3, title: "Pending Job Cards", value: '0', icon: <FaClock />, color: 'warning', bg: 'bg-warning', trend: 'Live from DB', trendColor: 'text-warning' },
  { id: 4, title: 'Assigned Job Cards', value: '0', icon: <FaUserTie />, color: 'primary', bg: 'bg-primary', trend: 'Live from DB', trendColor: 'text-primary' },
  { id: 5, title: 'In Progress Jobs', value: '0', icon: <FaTools />, color: 'info', bg: 'bg-info', trend: 'Live from DB', trendColor: 'text-info' },
  { id: 6, title: 'Completed Jobs', value: '0', icon: <FaCheckCircle />, color: 'success', bg: 'bg-success', trend: 'Live from DB', trendColor: 'text-success' },
  { id: 7, title: 'Delivered Jobs', value: '0', icon: <FaCar />, color: 'purple', bg: 'bg-secondary', trend: 'Live from DB', trendColor: 'text-purple' },
  { id: 8, title: 'Mechanics Available', value: '0/0', icon: <FaWrench />, color: 'primary', bg: 'bg-primary', trend: 'Live from DB', trendColor: 'text-success' },
];

const getStatusBadge = (status) => {
  switch(status) {
    case 'Completed':
    case 'Success':
      return <Badge bg="success" className="px-3 py-2 rounded-pill fw-medium"><FaCheckCircle className="me-1"/> {status}</Badge>;
    case 'Pending':
      return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-medium"><FaClock className="me-1"/> {status}</Badge>;
    case 'In Progress':
    case 'Checked-In':
      return <Badge bg="info" className="px-3 py-2 rounded-pill fw-medium"><FaTools className="me-1"/> {status}</Badge>;
    case 'Warning':
      return <Badge bg="danger" className="px-3 py-2 rounded-pill fw-medium"><FaExclamationTriangle className="me-1"/> {status}</Badge>;
    default:
      return <Badge bg="secondary" className="px-3 py-2 rounded-pill fw-medium">{status}</Badge>;
  }
};

const getMechanicStatusBadge = (status) => {
  switch(status) {
    case 'Available':
      return <Badge bg="success" className="px-3 py-1 rounded-pill">Available</Badge>;
    case 'Busy':
      return <Badge bg="warning" text="dark" className="px-3 py-1 rounded-pill">Busy</Badge>;
    case 'Checked Out':
      return <Badge bg="secondary" className="px-3 py-1 rounded-pill">Not Available</Badge>;
    case 'On Approved Leave':
      return <Badge bg="info" className="px-3 py-1 rounded-pill">On Leave</Badge>;
    default:
      return <Badge bg="danger" className="px-3 py-1 rounded-pill">Not Checked In / Absent</Badge>;
  }
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(summaryStats);
  const [mechanicData, setMechanicData] = useState({
    totalMechanics: 0,
    checkedIn: 0,
    available: 0,
    busy: 0,
    notCheckedIn: 0,
    onLeave: 0,
    mechanics: []
  });

  const [todaySchedule, setTodaySchedule] = useState([]);
  const [slotData, setSlotData] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [selectedAptForRec, setSelectedAptForRec] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoadingSchedule(true);
      const allApts = await appointmentService.getAppointments({ limit: 100 });
      const customersData = await getCustomers(1, 1);
      const vehiclesData = await getVehicles(1, 1);
      const jobCardsData = await jobCardService.getJobCards(1, 1, '', 'Open,In Progress');
      const empStats = await employeeService.getEmployeeStats();

      // Today's schedule & Waitlist & Slots
      const sched = await appointmentService.getTodaySchedule();
      setTodaySchedule(sched || []);
      
      const slots = await appointmentService.getAvailableSlots(new Date().toISOString().split('T')[0]);
      setSlotData(slots.slots || []);
      
      const wl = await waitlistService.getTodayWaitlist();
      setWaitlist(wl || []);

      // Upcoming bookings (date after today)
      const todayStr = new Date().toISOString().split('T')[0];
      const futureApts = (allApts.appointments || []).filter(apt => {
        const aptDateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDateStr > todayStr && apt.status !== 'Cancelled' && apt.status !== 'Completed';
      });
      setUpcomingBookings(futureApts);

      // Mechanic Availability from MongoDB
      const mechAvail = await attendanceService.getTodayMechanicAvailability();
      setMechanicData(mechAvail);

      const jcStats = await jobCardService.getJobCardStats();

      setStats(prevStats => 
        prevStats.map(stat => {
          if (stat.id === 1) return { ...stat, value: customersData.total ? customersData.total.toString() : '0' };
          if (stat.id === 2) return { ...stat, value: vehiclesData.total ? vehiclesData.total.toString() : '0' };
          if (stat.id === 3) return { ...stat, value: jcStats.Pending !== undefined ? jcStats.Pending.toString() : '0' };
          if (stat.id === 4) return { ...stat, value: jcStats.Assigned !== undefined ? jcStats.Assigned.toString() : '0' };
          if (stat.id === 5) return { ...stat, value: jcStats['In Progress'] !== undefined ? jcStats['In Progress'].toString() : '0' };
          if (stat.id === 6) return { ...stat, value: jcStats.Completed !== undefined ? jcStats.Completed.toString() : '0' };
          if (stat.id === 7) return { ...stat, value: jcStats.Delivered !== undefined ? jcStats.Delivered.toString() : '0' };
          if (stat.id === 8) return { ...stat, value: `${mechAvail.available}/${mechAvail.totalMechanics}`, trend: `${mechAvail.busy} Busy, ${mechAvail.checkedIn} Checked In` };
          return stat;
        })
      );
      setLoadingSchedule(false);
    } catch (error) {
      console.error("Error fetching live dashboard stats", error);
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openRecommendation = (apt) => {
    setSelectedAptForRec(apt);
    setShowRecommendationModal(true);
  };

  const handleAssignWaitlist = async (wl) => {
    try {
      // Find an available slot
      const nextAvail = slotData.find(s => s.available > 0);
      if (!nextAvail) {
        toast.error('No slots available today to assign this customer.');
        return;
      }
      
      if (window.confirm(`Assign slot ${nextAvail.time} to ${wl.customer?.fullName}?`)) {
        await waitlistService.assignWaitlist(wl._id, { assignedSlot: nextAvail.time });
        toast.success(`Slot assigned to ${wl.customer?.fullName} successfully! Job Card created.`);
        loadDashboardData(); // Refresh UI
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign slot');
    }
  };

  return (
    <div className="container-fluid p-0">
      
      {/* Header & Quick Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Service Advisor & Garage Console</h2>
          <p className="text-muted mb-0">Live MongoDB capacity & mechanic availability overview</p>
        </div>
        
        <div className="d-flex flex-wrap gap-2">
          <Button 
            variant="orange" 
            className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
            onClick={() => setShowWalkInModal(true)}
          >
            <FaWalking /> <span>New Walk-in Service</span>
          </Button>
          <Link to="/job-cards/add" className="btn btn-primary-custom d-flex align-items-center gap-2 px-3 py-2 shadow-sm text-decoration-none">
            <FaPlus /> <span>New Job Card</span>
          </Link>
          <Link to="/employees" className="btn btn-light border d-flex align-items-center gap-2 px-3 py-2 shadow-sm text-dark text-decoration-none">
            <FaUserTie /> <span>Employees</span>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row className="g-4 mb-4">
        {stats.map((stat) => (
          <Col xs={12} sm={6} lg={4} xl={3} key={stat.id}>
            <Card className="h-100 bg-card dashboard-card border-0 shadow-sm">
              <Card.Body className="p-3 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="text-muted small fw-medium mb-1">{stat.title}</h6>
                    <h4 className="fw-bold mb-0 text-dark">{stat.value}</h4>
                  </div>
                  <div className={`stat-icon-wrapper stat-icon-${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-auto pt-2 border-top border-light">
                  <small className={`fw-medium ${stat.trendColor || 'text-success'} d-flex align-items-center gap-1`}>
                    {stat.trend}
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* TODAY'S MECHANIC AVAILABILITY SECTION */}
      <Card className="border-0 shadow-sm mb-4 bg-card">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaTools className="text-primary" size={20} />
            <h5 className="fw-bold mb-0 text-dark">Today's Mechanic Availability</h5>
          </div>
          <Badge bg="primary" className="px-3 py-2">
            Capacity: {mechanicData.available} Available Slots / Hour
          </Badge>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-3 mb-4">
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-light rounded text-center border">
                <small className="text-muted text-uppercase fw-bold">Total</small>
                <h4 className="fw-bold mb-0 mt-1">{mechanicData.totalMechanics}</h4>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-success bg-opacity-10 rounded text-center border border-success">
                <small className="text-success text-uppercase fw-bold">Checked In</small>
                <h4 className="fw-bold text-success mb-0 mt-1">{mechanicData.checkedIn}</h4>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-primary bg-opacity-10 rounded text-center border border-primary">
                <small className="text-primary text-uppercase fw-bold">Available</small>
                <h4 className="fw-bold text-primary mb-0 mt-1">{mechanicData.available}</h4>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-warning bg-opacity-10 rounded text-center border border-warning">
                <small className="text-warning text-dark text-uppercase fw-bold">Busy</small>
                <h4 className="fw-bold text-warning mb-0 mt-1">{mechanicData.busy}</h4>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-danger bg-opacity-10 rounded text-center border border-danger">
                <small className="text-danger text-uppercase fw-bold">Not Checked In</small>
                <h4 className="fw-bold text-danger mb-0 mt-1">{mechanicData.notCheckedIn}</h4>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div className="p-3 bg-info bg-opacity-10 rounded text-center border border-info">
                <small className="text-info text-uppercase fw-bold">On Approved Leave</small>
                <h4 className="fw-bold text-info mb-0 mt-1">{mechanicData.onLeave}</h4>
              </div>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th>Mechanic</th>
                  <th>Specialization</th>
                  <th>Check-In Time</th>
                  <th>Status</th>
                  <th>Current Active Job</th>
                </tr>
              </thead>
              <tbody>
                {mechanicData.mechanics && mechanicData.mechanics.length > 0 ? (
                  mechanicData.mechanics.map(m => (
                    <tr key={m._id}>
                      <td className="fw-bold text-dark">{m.fullName} <small className="text-muted">({m.employeeId})</small></td>
                      <td>{m.specialization}</td>
                      <td>{m.checkInTime ? new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td>{getMechanicStatusBadge(m.status)}</td>
                      <td>
                        {m.activeJobCard ? (
                          <span className="text-primary fw-medium">
                            {m.activeJobCard.vehicle ? `${m.activeJobCard.vehicle.brand} ${m.activeJobCard.vehicle.model} (${m.activeJobCard.vehicle.vehicleNumber})` : 'Active Job'}
                          </span>
                        ) : '--'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-3 text-muted">No mechanics registered in MongoDB Atlas.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* TODAY'S SERVICE SCHEDULE SECTION */}
      <Card className="border-0 shadow-sm mb-4 bg-card">
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaCalendarCheck className="text-success" size={20} />
            <h5 className="fw-bold mb-0 text-dark">Today's Service Schedule</h5>
          </div>
          <Badge bg="success" className="px-3 py-2">
            {todaySchedule.length} Service(s) Scheduled Today
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="accordion accordion-flush" id="scheduleAccordion">
            {slotData.map((slot, index) => {
              const slotAppointments = todaySchedule.filter(apt => apt.preferredTime === slot.time || apt.preferredTime === slot.time.split(' - ')[0]);
              
              return (
                <div className="accordion-item" key={index}>
                  <h2 className="accordion-header">
                    <button 
                      className={`accordion-button ${slotAppointments.length > 0 ? '' : 'collapsed'}`} 
                      type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target={`#collapseSlot${index}`}
                    >
                      <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span className="fw-bold">{slot.time}</span>
                        <div className="d-flex gap-3 align-items-center">
                          <span className="small text-muted">Capacity: <strong>{slot.capacity}</strong></span>
                          <span className="small text-muted">Booked: <strong>{slot.booked}</strong></span>
                          <span className={`small fw-bold ${slot.available > 0 ? 'text-success' : 'text-danger'}`}>
                            Available: {slot.available}
                          </span>
                        </div>
                      </div>
                    </button>
                  </h2>
                  <div id={`collapseSlot${index}`} className={`accordion-collapse collapse ${slotAppointments.length > 0 ? 'show' : ''}`} data-bs-parent="#scheduleAccordion">
                    <div className="accordion-body p-0">
                      {slotAppointments.length > 0 ? (
                        <div className="table-responsive">
                          <Table hover className="align-middle mb-0 border-top">
                            <thead className="table-light text-muted small text-uppercase">
                              <tr>
                                <th className="px-4">Customer</th>
                                <th>Vehicle</th>
                                <th>Service</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Assigned Mechanic</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slotAppointments.map((apt) => (
                                <tr key={apt._id}>
                                  <td className="px-4">
                                    <div className="fw-bold text-dark">{apt.customer?.fullName || 'Walk-in Customer'}</div>
                                    <small className="text-muted">{apt.customer?.mobileNumber}</small>
                                  </td>
                                  <td>
                                    <div className="fw-medium text-dark">{apt.vehicle?.vehicleNumber}</div>
                                    <small className="text-muted">{apt.vehicle?.brand} {apt.vehicle?.model}</small>
                                  </td>
                                  <td>{apt.serviceType}</td>
                                  <td>
                                    <Badge bg={apt.bookingType === 'Walk-in' ? 'warning' : 'primary'} text={apt.bookingType === 'Walk-in' ? 'dark' : 'light'}>
                                      {apt.bookingType || 'Online'}
                                    </Badge>
                                  </td>
                                  <td>{getStatusBadge(apt.status)}</td>
                                  <td>
                                    {apt.assignedMechanic ? (
                                      <span className="fw-bold text-success">{apt.assignedMechanic.fullName}</span>
                                    ) : (
                                      <span className="text-muted fst-italic">Unassigned</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted bg-light">
                          No bookings for this time slot.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* LIVE WAITING QUEUE SECTION */}
      <Card className="border-0 shadow-sm mb-4 bg-card border-warning" style={{ borderLeft: '4px solid #ffc107' }}>
        <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWalking className="text-warning" size={20} />
            <h5 className="fw-bold mb-0 text-dark">Live Waiting Queue</h5>
          </div>
          <Badge bg="warning" text="dark" className="px-3 py-2">
            {waitlist.length} Waiting
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="px-4">Arrival Time</th>
                  <th>Queue #</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th className="text-end px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.length > 0 ? (
                  waitlist.map((wl) => (
                    <tr key={wl._id}>
                      <td className="px-4 fw-bold">{new Date(wl.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><Badge bg="dark">{wl.queueNumber}</Badge></td>
                      <td>
                        <div className="fw-bold text-dark">{wl.customer?.fullName}</div>
                        <small className="text-muted">{wl.customer?.mobileNumber}</small>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{wl.vehicle?.vehicleNumber}</div>
                        <small className="text-muted">{wl.vehicle?.brand}</small>
                      </td>
                      <td>{wl.serviceType}</td>
                      <td>
                        <Badge bg={wl.status === 'Assigned' ? 'success' : 'warning'} text={wl.status === 'Assigned' ? 'light' : 'dark'}>
                          {wl.status}
                        </Badge>
                      </td>
                      <td className="text-end px-4">
                        {wl.status === 'Waiting' && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleAssignWaitlist(wl)}
                          >
                            Assign Slot
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No customers currently in the waiting queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* UPCOMING BOOKINGS SECTION */}
      <Row className="g-4">
        <Col xs={12} xl={8}>
          <Card className="bg-card border-0 shadow-sm h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">Upcoming Bookings (Future Dates)</h5>
              <Link to="/appointments" className="text-primary text-decoration-none fw-medium small">View All Appointments</Link>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="px-4">Date & Time</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Service</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.length > 0 ? (
                      upcomingBookings.slice(0, 5).map((apt) => (
                        <tr key={apt._id}>
                          <td className="px-4">
                            <div className="fw-bold text-dark">
                              {new Date(apt.appointmentDate).toLocaleDateString()}
                            </div>
                            <small className="text-muted">{apt.preferredTime}</small>
                          </td>
                          <td>
                            <div className="fw-medium text-dark">{apt.customer?.fullName}</div>
                          </td>
                          <td>
                            <div>{apt.vehicle?.vehicleNumber}</div>
                          </td>
                          <td>{apt.serviceType}</td>
                          <td>{getStatusBadge(apt.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No upcoming bookings scheduled for future dates.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xs={12} xl={4}>
          <Card className="bg-card border-0 shadow-sm h-100">
            <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4">
              <h5 className="fw-bold mb-0 text-dark">Quick Navigation</h5>
            </Card.Header>
            <Card.Body className="p-4 d-flex flex-column gap-3">
               <Link to="/employees" className="btn btn-light border text-start p-3 d-flex align-items-center gap-3 dashboard-card text-decoration-none">
                 <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><FaUserTie size={20}/></div>
                 <div>
                   <h6 className="mb-0 fw-bold text-dark">Manage Employees</h6>
                   <small className="text-muted">Check-in, Check-out & Mechanics</small>
                 </div>
               </Link>
               <Link to="/customers" className="btn btn-light border text-start p-3 d-flex align-items-center gap-3 dashboard-card text-decoration-none">
                 <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle"><FaUsers size={20}/></div>
                 <div>
                   <h6 className="mb-0 fw-bold text-dark">Manage Customers</h6>
                   <small className="text-muted">View or register CRM customers</small>
                 </div>
               </Link>
               <Link to="/job-cards" className="btn btn-light border text-start p-3 d-flex align-items-center gap-3 dashboard-card text-decoration-none">
                 <div className="bg-warning bg-opacity-10 text-warning p-3 rounded-circle"><FaWrench size={20}/></div>
                 <div>
                   <h6 className="mb-0 fw-bold text-dark">Job Cards</h6>
                   <small className="text-muted">Assign mechanics & track repairs</small>
                 </div>
               </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
