import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Form, Badge, Alert, Spinner, Table, ProgressBar 
} from 'react-bootstrap';
import { 
  FaSearch, FaCar, FaUser, FaWrench, FaClipboardCheck, FaCheckCircle, 
  FaClock, FaGasPump, FaTachometerAlt, FaExclamationTriangle, FaPlus, 
  FaArrowRight, FaArrowLeft, FaTools, FaCalendarCheck, FaWalking, FaPrint,
  FaShieldAlt, FaAward, FaHistory, FaCheck, FaExclamationCircle, FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import PageHeader from '../../components/UI/PageHeader';
import vehicleService from '../../services/vehicleService';
import jobCardService from '../../services/jobCardService';
import appointmentService from '../../services/appointmentService';
import employeeService from '../../services/employeeService';
import waitlistService from '../../services/waitlistService';
import { getIndiaDateStr, formatDateIST } from '../../utils/dateUtils';

// 10 Predefined Services with standard garage catalogue rates
export const PREDEFINED_SERVICES = [
  { id: 'oil_change', name: 'Oil Change', labour: 300, washing: 0, desc: 'Engine oil level check, top-up and filter review' },
  { id: 'engine_oil_rep', name: 'Engine Oil Replacement', labour: 350, washing: 0, desc: 'Complete oil drainage, synthetic refill & filter change' },
  { id: 'general_service', name: 'General Service', labour: 600, washing: 300, desc: '40-point vehicle inspection, tuning & complimentary wash' },
  { id: 'brake_service', name: 'Brake Service', labour: 450, washing: 0, desc: 'Brake pads cleaning, caliper greasing & fluid level check' },
  { id: 'ac_service', name: 'AC Service', labour: 800, washing: 0, desc: 'AC filter cleaning, gas pressure check & condenser wash' },
  { id: 'wheel_alignment', name: 'Wheel Alignment', labour: 400, washing: 0, desc: '3D computerized 4-wheel angle calibration' },
  { id: 'wheel_balancing', name: 'Wheel Balancing', labour: 350, washing: 0, desc: 'Dynamic wheel weight balancing and tyre rotation' },
  { id: 'battery_replacement', name: 'Battery Replacement', labour: 200, washing: 0, desc: 'Battery terminal cleaning, health test & installation' },
  { id: 'engine_inspection', name: 'Engine Inspection', labour: 500, washing: 0, desc: 'OBD-II computer diagnostics, sensor & engine health scan' },
  { id: 'periodic_maintenance', name: 'Periodic Maintenance', labour: 750, washing: 300, desc: 'Manufacturer-recommended periodic service schedule' }
];

// Common Customer Complaints
const COMMON_COMPLAINTS = [
  'Unusual Engine Noise',
  'Brake Squeal / Weak Braking',
  'Poor AC Cooling',
  'Steering Vibration / Pulling',
  'Hard Starting / Battery Issue',
  'Fluid Leakage',
  'Suspension Noise / Bumpy Ride',
  'Low Fuel Mileage',
  'Scheduled Periodic Service',
  'General Inspection & Checkup'
];

const WalkInService = () => {
  const navigate = useNavigate();
  const todayStr = getIndiaDateStr();

  // Helper to read initial draft from sessionStorage
  const getDraftState = (key, fallback) => {
    try {
      const saved = sessionStorage.getItem('walkin_service_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[key] !== undefined && parsed[key] !== null) {
          return parsed[key];
        }
      }
    } catch {
      // Ignore parse errors
    }
    return fallback;
  };

  // Wizard Step State: 1: Lookup, 2: Services, 3: Complaints & Inspection, 4: Capacity & Slot, 5: Assign & Finalize
  const [currentStep, setCurrentStep] = useState(() => getDraftState('currentStep', 1));

  // Step 1: Vehicle Lookup
  const [regNumber, setRegNumber] = useState(() => getDraftState('regNumber', ''));
  const [searching, setSearching] = useState(false);
  const [vehicleData, setVehicleData] = useState(() => getDraftState('vehicleData', null));
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);

  // Step 2: Selected Services (array of service objects)
  const [selectedServices, setSelectedServices] = useState(() => getDraftState('selectedServices', [PREDEFINED_SERVICES[2]])); // Default General Service

  // Step 3: Customer Complaints & Inspection
  const [selectedComplaints, setSelectedComplaints] = useState(() => getDraftState('selectedComplaints', ['General Inspection & Checkup']));
  const [complaintRemarks, setComplaintRemarks] = useState(() => getDraftState('complaintRemarks', ''));
  
  const [inspection, setInspection] = useState(() => getDraftState('inspection', {
    engineOil: 'Good',
    brakes: 'Good',
    tyres: 'Good',
    battery: 'Healthy',
    lights: 'All Working',
    exteriorCondition: 'Clean / Minor Scratches',
    fuelLevel: '50%',
    odometerReading: '',
    remarks: ''
  }));

  // Step 4: Live Capacity & Slot
  const [loadingCapacity, setLoadingCapacity] = useState(false);
  const [slotData, setSlotData] = useState(null);
  const [recommendedSlotInfo, setRecommendedSlotInfo] = useState(null);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(() => getDraftState('selectedSlot', ''));
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [nextAvailableDateInfo, setNextAvailableDateInfo] = useState(null);
  const [loadingNextDate, setLoadingNextDate] = useState(false);

  // Step 5: Mechanic Assignment & Creation
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [activeMechanics, setActiveMechanics] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState(() => getDraftState('selectedMechanic', ''));
  const [priority, setPriority] = useState(() => getDraftState('priority', 'Medium'));
  const [advisorNotes, setAdvisorNotes] = useState(() => getDraftState('advisorNotes', ''));
  const [creatingJobCard, setCreatingJobCard] = useState(false);

  // Sync draft state to sessionStorage whenever state changes
  useEffect(() => {
    try {
      if (vehicleData) {
        const draft = {
          currentStep,
          regNumber,
          vehicleData,
          selectedServices,
          selectedComplaints,
          complaintRemarks,
          inspection,
          selectedSlot,
          selectedMechanic,
          priority,
          advisorNotes
        };
        sessionStorage.setItem('walkin_service_draft', JSON.stringify(draft));
      }
    } catch {
      // sessionStorage full or unavailable
    }
  }, [
    currentStep, regNumber, vehicleData, selectedServices,
    selectedComplaints, complaintRemarks, inspection,
    selectedSlot, selectedMechanic, priority, advisorNotes
  ]);

  // Prevent accidental page unload when walk-in service is in progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (vehicleData && !creatingJobCard) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [vehicleData, creatingJobCard]);

  // Fetch slot capacity whenever step 4 is entered
  useEffect(() => {
    if (currentStep === 4) {
      loadCapacity();
    }
    if (currentStep === 5) {
      loadMechanics();
    }
  }, [currentStep]);

  const loadCapacity = async () => {
    try {
      setLoadingCapacity(true);
      // Automatically find nearest available walk-in slot for today from current time onward
      const walkInData = await appointmentService.getNextWalkInSlot(todayStr);
      setRecommendedSlotInfo(walkInData);

      if (walkInData && !walkInData.allRemainingSlotsFull && walkInData.time) {
        setSelectedSlot(prev => prev || walkInData.time);
      } else if (!selectedSlot) {
        setSelectedSlot('');
      }

      // Also fetch full slot capacity for manual selection option
      const fullData = await appointmentService.getAvailableSlots(todayStr);
      setSlotData(fullData);
    } catch (error) {
      console.error('Failed to load slot capacity', error);
      toast.error('Could not fetch real-time garage slot capacity');
    } finally {
      setLoadingCapacity(false);
    }
  };

  const handleViewNextAvailableDate = async () => {
    try {
      setLoadingNextDate(true);
      const data = await appointmentService.getNextAvailableSlot();
      setNextAvailableDateInfo(data);
    } catch (err) {
      toast.error('No upcoming available slots found within 30 days');
    } finally {
      setLoadingNextDate(false);
    }
  };

  const loadMechanics = async () => {
    try {
      setLoadingMechanics(true);
      const list = await employeeService.getActiveMechanics();
      setActiveMechanics(Array.isArray(list) ? list : []);
      // If mechanic is already selected and still active, preserve it
      setSelectedMechanic(prev => {
        if (prev && (list || []).some(m => m._id === prev)) {
          return prev;
        }
        const freeMechanic = (list || []).find(m => m.activeJobsCount === 0);
        if (freeMechanic) return freeMechanic._id;
        if (list && list.length > 0) return list[0]._id;
        return '';
      });
    } catch (error) {
      console.error('Failed to load active mechanics', error);
      toast.error('Could not load checked-in mechanics');
    } finally {
      setLoadingMechanics(false);
    }
  };

  // Step 1: Search Vehicle
  const handleSearchVehicle = async (e) => {
    if (e) e.preventDefault();
    const cleanReg = regNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanReg) {
      toast.warning('Please enter vehicle registration number');
      return;
    }

    try {
      setSearching(true);
      setSearchAttempted(true);
      setVehicleNotFound(false);
      const data = await vehicleService.lookupVehicleByReg(cleanReg);
      
      const rawVehicle = data.vehicle || data;
      const rawCustomer = data.customer || rawVehicle.customer || {};
      const rawServiceInfo = data.serviceInfo || {};

      const vehicleId = rawVehicle._id;
      const customerId = rawCustomer._id || (typeof rawVehicle.customer === 'string' ? rawVehicle.customer : rawVehicle.customer?._id);

      const normalizedVehicleData = {
        ...rawVehicle,
        vehicle: rawVehicle,
        _id: vehicleId,
        vehicleId: vehicleId,
        customer: rawCustomer,
        customerId: customerId,
        vehicleNumber: rawVehicle.vehicleNumber || cleanReg,
        brand: rawVehicle.brand || '',
        model: rawVehicle.model || '',
        year: rawVehicle.manufacturingYear || rawVehicle.year || '',
        manufacturingYear: rawVehicle.manufacturingYear || rawVehicle.year || '',
        fuelType: rawVehicle.fuelType || '',
        color: rawVehicle.color || 'Standard',
        currentOdometerReading: rawVehicle.currentOdometerReading ?? 0,
        serviceInfo: rawServiceInfo,
        lastServiceDate: rawServiceInfo.lastServiceDate || null,
        lastJobCard: rawServiceInfo.lastJobCardNumber ? {
          jobNumber: rawServiceInfo.lastJobCardNumber,
          status: rawServiceInfo.lastJobCardStatus,
          _id: rawServiceInfo.lastJobCardId
        } : null,
        completedServicesCount: rawServiceInfo.completedServicesCount || 0,
        freeServicesEntitled: rawServiceInfo.freeServicesEntitled ?? (rawVehicle.freeServicesEntitled ?? 3),
        freeServicesUsed: rawServiceInfo.freeServicesUsed ?? (rawVehicle.freeServicesUsed ?? 0),
        freeServiceEligible: !!rawServiceInfo.freeServiceEligible,
        freeServiceNumber: rawServiceInfo.freeServiceNumber || null
      };

      setVehicleData(normalizedVehicleData);

      if (rawVehicle?.currentOdometerReading) {
        setInspection(prev => ({ ...prev, odometerReading: rawVehicle.currentOdometerReading }));
      }
      toast.success(`Vehicle ${normalizedVehicleData.vehicleNumber} found in registry`);
    } catch (error) {
      setVehicleData(null);
      if (error.response?.status === 404) {
        setVehicleNotFound(true);
      } else {
        toast.error(error.response?.data?.message || 'Error searching for vehicle');
      }
    } finally {
      setSearching(false);
    }
  };

  // Reset walk-in flow completely
  const handleResetWalkIn = () => {
    sessionStorage.removeItem('walkin_service_draft');
    setRegNumber('');
    setVehicleData(null);
    setSearchAttempted(false);
    setVehicleNotFound(false);
    setSelectedServices([PREDEFINED_SERVICES[2]]);
    setSelectedComplaints(['General Inspection & Checkup']);
    setComplaintRemarks('');
    setInspection({
      engineOil: 'Good',
      brakes: 'Good',
      tyres: 'Good',
      battery: 'Healthy',
      lights: 'All Working',
      exteriorCondition: 'Clean / Minor Scratches',
      fuelLevel: '50%',
      odometerReading: '',
      remarks: ''
    });
    setSelectedSlot('');
    setSelectedMechanic('');
    setPriority('Medium');
    setAdvisorNotes('');
    setCurrentStep(1);
  };

  // Service toggle
  const toggleService = (service) => {
    const exists = selectedServices.some(s => s.id === service.id);
    if (exists) {
      if (selectedServices.length === 1) {
        toast.info('At least one service must be selected');
        return;
      }
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Complaint toggle
  const toggleComplaint = (comp) => {
    if (selectedComplaints.includes(comp)) {
      setSelectedComplaints(selectedComplaints.filter(c => c !== comp));
    } else {
      setSelectedComplaints([...selectedComplaints, comp]);
    }
  };

  // Pricing calculations
  const isFreeEligible = vehicleData?.freeServiceEligible;
  const rawLabour = selectedServices.reduce((sum, s) => sum + s.labour, 0);
  const rawWashing = selectedServices.reduce((sum, s) => sum + s.washing, 0);
  const rawTotal = rawLabour + rawWashing;

  const finalLabour = isFreeEligible ? 0 : rawLabour;
  const finalWashing = isFreeEligible ? 0 : rawWashing;
  const finalTotal = isFreeEligible ? 0 : rawTotal;

  // Add to Waitlist if garage full
  const handleJoinWaitlist = async () => {
    const resolvedVehicleId = vehicleData?._id || vehicleData?.vehicleId || vehicleData?.vehicle?._id;
    const resolvedCustomerId = vehicleData?.customerId || vehicleData?.customer?._id || (typeof vehicleData?.customer === 'string' ? vehicleData.customer : null);

    if (!resolvedVehicleId || !resolvedCustomerId) {
      toast.error('Please select a customer and vehicle before joining the waiting queue.');
      setCurrentStep(1);
      return;
    }

    try {
      setJoiningWaitlist(true);
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      await waitlistService.addToWaitlist({
        vehicleId: resolvedVehicleId,
        customerId: resolvedCustomerId,
        customerName: vehicleData.customer?.fullName,
        phone: vehicleData.customer?.mobileNumber,
        serviceType: serviceNames,
        notes: `Walk-in customer added to queue. Complaints: ${selectedComplaints.join(', ')}`
      });
      sessionStorage.removeItem('walkin_service_draft');
      toast.success('Customer successfully added to Waiting Queue');
      navigate('/waiting-queue');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join waiting queue');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  // Create Walk-in Job Card
  const handleCreateJobCard = async () => {
    // Prevent accidental duplicate clicks
    if (creatingJobCard) return;

    // Resolve vehicle and customer IDs
    const resolvedVehicleId = vehicleData?._id || vehicleData?.vehicleId || vehicleData?.vehicle?._id;
    const resolvedCustomerId = vehicleData?.customerId || vehicleData?.customer?._id || (typeof vehicleData?.customer === 'string' ? vehicleData.customer : null) || vehicleData?.vehicle?.customer?._id;

    if (!resolvedVehicleId || !resolvedCustomerId) {
      toast.error('Please select a customer and vehicle before creating the Job Card.');
      setCurrentStep(1);
      return;
    }

    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    try {
      setCreatingJobCard(true);

      const formattedServices = selectedServices.map(srv => ({
        serviceName: srv.name,
        labourCharge: isFreeEligible ? 0 : srv.labour,
        washingCharge: isFreeEligible ? 0 : srv.washing,
        isFreeService: !!isFreeEligible
      }));

      const combinedComplaint = [
        ...selectedComplaints,
        complaintRemarks ? `Remarks: ${complaintRemarks}` : ''
      ].filter(Boolean).join(' | ');

      const payload = {
        vehicleId: resolvedVehicleId,
        customerId: resolvedCustomerId,
        services: formattedServices,
        complaint: combinedComplaint || 'Walk-in Service Request',
        preferredTime: selectedSlot,
        inspectionDetails: {
          ...inspection,
          odometerReading: Number(inspection.odometerReading) || vehicleData.currentOdometerReading || 0
        },
        assignedMechanic: selectedMechanic || null,
        priority: priority,
        notes: advisorNotes
      };

      console.log('Dispatching Walk-in Job Card payload:', {
        customerId: payload.customerId,
        vehicleId: payload.vehicleId,
        assignedMechanic: payload.assignedMechanic,
        servicesCount: payload.services.length
      });

      const response = await jobCardService.createWalkInJobCard(payload);
      sessionStorage.removeItem('walkin_service_draft');
      toast.success(`Job Card ${response.jobNumber} created successfully!`);
      navigate(`/job-cards/${response._id}`);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.nextSlot) {
        toast.warning(error.response.data.message);
        setSelectedSlot(error.response.data.nextSlot.time);
        setRecommendedSlotInfo(error.response.data.nextSlot);
        setCurrentStep(4);
        loadCapacity();
      } else {
        toast.error(error.response?.data?.message || 'Failed to generate walk-in job card');
      }
    } finally {
      setCreatingJobCard(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Walk-in Service Desk"
        subtitle="Identify arriving vehicles, record visual checkup, verify real-time garage capacity, and dispatch immediate Job Cards."
        breadcrumbs={[
          { label: 'Workshop', path: '/appointments' },
          { label: 'Walk-in Service Desk' }
        ]}
        actions={
          <div className="d-flex gap-2">
            <Link to="/waiting-queue" className="btn btn-outline-secondary d-flex align-items-center gap-2">
              <FaWalking /> <span>Waiting Queue</span>
            </Link>
            <Link to="/job-cards" className="btn btn-outline-primary d-flex align-items-center gap-2">
              <FaWrench /> <span>Active Job Cards</span>
            </Link>
          </div>
        }
      />

      {/* Progress Wizard Header */}
      <Card className="border-0 shadow-sm bg-card mb-4">
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {[
              { num: 1, label: 'Vehicle Lookup' },
              { num: 2, label: 'Select Services' },
              { num: 3, label: 'Inspection & Complaints' },
              { num: 4, label: 'Capacity & Slot' },
              { num: 5, label: 'Assign & Create' }
            ].map((st) => (
              <div 
                key={st.num} 
                className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${
                  currentStep === st.num 
                    ? 'bg-orange text-white fw-bold shadow-sm' 
                    : currentStep > st.num 
                      ? 'bg-light text-navy fw-semibold' 
                      : 'text-muted'
                }`}
                style={{ cursor: currentStep > st.num ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
                onClick={() => {
                  if (currentStep > st.num) setCurrentStep(st.num);
                }}
              >
                <span className={`badge rounded-pill ${currentStep === st.num ? 'bg-white text-orange' : currentStep > st.num ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                  {currentStep > st.num ? '✓' : st.num}
                </span>
                <span className="small">{st.label}</span>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* STEP 1: VEHICLE LOOKUP */}
      {currentStep === 1 && (
        <Card className="border-0 shadow-sm bg-card mb-4">
          <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <FaSearch className="text-orange" size={20} />
              <h5 className="fw-bold mb-0 text-navy">Step 1: Arriving Vehicle Identification</h5>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            <p className="text-muted small mb-4">
              Enter the vehicle's registration number to fetch profile, warranty status, free service quota, and past history.
            </p>

            <Form onSubmit={handleSearchVehicle} className="mb-4">
              <Row className="g-3 align-items-center">
                <Col xs={12} md={7} lg={6}>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-light text-navy fw-bold border-end-0">
                      <FaCar className="me-2" /> IND
                    </span>
                    <Form.Control
                      type="text"
                      className="text-uppercase fw-mono fw-bold fs-5"
                      placeholder="e.g. KA20HE0623 or MH12AB1234"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                      autoFocus
                    />
                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="btn-primary-custom px-4 d-flex align-items-center gap-2"
                      disabled={searching}
                    >
                      {searching ? <Spinner size="sm" /> : <FaSearch />}
                      <span>Lookup Vehicle</span>
                    </Button>
                  </div>
                </Col>
                <Col xs={12} md={5}>
                  <div className="small text-muted">
                    No special characters needed. Auto-capitalizes and removes whitespace.
                  </div>
                </Col>
              </Row>
            </Form>

            {/* If Vehicle Not Found */}
            {vehicleNotFound && (
              <Alert variant="warning" className="border-0 shadow-sm p-4 rounded-3 mt-4">
                <div className="d-flex align-items-start gap-3">
                  <FaExclamationTriangle className="text-warning mt-1" size={28} />
                  <div>
                    <h5 className="fw-bold text-navy mb-1">Vehicle Registration Not Found</h5>
                    <p className="text-muted small mb-3">
                      The vehicle registration <strong>"{regNumber}"</strong> is not yet registered in our garage database. 
                      Before initiating walk-in service, please register the customer and vehicle profile.
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <Link to="/vehicles/add" className="btn btn-orange btn-sm d-flex align-items-center gap-2">
                        <FaPlus /> <span>Register New Vehicle</span>
                      </Link>
                      <Link to="/customers/add" className="btn btn-outline-secondary btn-sm">
                        <span>Register New Customer First</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </Alert>
            )}

            {/* If Vehicle Found: 3 Summary Cards */}
            {vehicleData && (
              <div className="mt-4">
                <div className="alert alert-success d-flex align-items-center justify-content-between p-3 rounded-3 mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <FaCheckCircle className="text-success" size={20} />
                    <span className="fw-bold text-navy">Vehicle Profile Verified in Garage Database</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handleResetWalkIn}
                      className="bg-white"
                    >
                      Change Vehicle
                    </Button>
                    <Badge bg="success" className="px-3 py-2 fs-6">
                      {vehicleData.vehicleNumber}
                    </Badge>
                  </div>
                </div>

                <Row className="g-4 mb-4">
                  {/* Vehicle Details Card */}
                  <Col xs={12} md={4}>
                    <Card className="h-100 border shadow-sm">
                      <Card.Header className="bg-light fw-bold text-navy py-3">
                        <FaCar className="me-2 text-primary" /> Vehicle Profile
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div className="mb-2">
                          <span className="text-muted small">Brand & Model:</span>
                          <div className="fw-bold text-dark">{vehicleData.brand} {vehicleData.model}</div>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small">Year & Fuel:</span>
                          <div className="fw-bold text-dark">{vehicleData.year} &bull; {vehicleData.fuelType}</div>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small">Color:</span>
                          <div className="fw-bold text-dark">{vehicleData.color || 'Standard'}</div>
                        </div>
                        <div>
                          <span className="text-muted small">Recorded Odometer:</span>
                          <div className="fw-bold text-primary fs-6">{vehicleData.currentOdometerReading || 0} km</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Customer Details Card */}
                  <Col xs={12} md={4}>
                    <Card className="h-100 border shadow-sm">
                      <Card.Header className="bg-light fw-bold text-navy py-3">
                        <FaUser className="me-2 text-orange" /> Registered Owner
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div className="mb-2">
                          <span className="text-muted small">Customer Name:</span>
                          <div className="fw-bold text-dark">{vehicleData.customer?.fullName || 'N/A'}</div>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small">Mobile Number:</span>
                          <div className="fw-bold text-dark">{vehicleData.customer?.mobileNumber || 'N/A'}</div>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small">Email Address:</span>
                          <div className="fw-bold text-dark text-truncate">{vehicleData.customer?.emailAddress || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted small">City / Location:</span>
                          <div className="fw-bold text-dark">{vehicleData.customer?.city || 'Registered Customer'}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Service & Free Status Card */}
                  <Col xs={12} md={4}>
                    <Card className="h-100 border shadow-sm">
                      <Card.Header className="bg-light fw-bold text-navy py-3">
                        <FaAward className="me-2 text-success" /> Service & Warranty Status
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div className="mb-2">
                          <span className="text-muted small">Last Service Date:</span>
                          <div className="fw-bold text-dark">
                            {vehicleData.lastServiceDate ? formatDateIST(vehicleData.lastServiceDate) : 'First-time Service'}
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small">Previous Job Card:</span>
                          <div className="fw-bold text-dark">
                            {vehicleData.lastJobCard?.jobNumber ? (
                              <Link to={`/job-cards/${vehicleData.lastJobCard._id}`} className="text-decoration-none">
                                {vehicleData.lastJobCard.jobNumber} ({vehicleData.lastJobCard.status})
                              </Link>
                            ) : (
                              'None'
                            )}
                          </div>
                        </div>
                        <div className="mb-3">
                          <span className="text-muted small">Completed Services Count:</span>
                          <div className="fw-bold text-dark">{vehicleData.completedServicesCount || 0} visits</div>
                        </div>
                        <div>
                          <span className="text-muted small d-block mb-1">Free Service Benefit:</span>
                          {vehicleData.freeServiceEligible ? (
                            <Badge bg="success" className="p-2 w-100 text-center fs-7">
                              🟢 Free Service #{vehicleData.freeServiceNumber} of 3 (Labour Waived)
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="p-2 w-100 text-center fs-7">
                              ⚪ Standard Paid Service
                            </Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-4">
                  <Button 
                    variant="primary" 
                    className="btn-primary-custom px-4 py-2 d-flex align-items-center gap-2"
                    onClick={() => setCurrentStep(2)}
                  >
                    <span>Proceed to Service Selection</span>
                    <FaArrowRight />
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* STEP 2: PREDEFINED SERVICES SELECTION */}
      {currentStep === 2 && (
        <Card className="border-0 shadow-sm bg-card mb-4">
          <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <FaWrench className="text-orange" size={20} />
              <h5 className="fw-bold mb-0 text-navy">Step 2: Select Requested Services</h5>
            </div>
            <Badge bg="light" text="dark" className="border px-3 py-2 fs-6">
              Vehicle: {vehicleData?.vehicleNumber}
            </Badge>
          </Card.Header>
          <Card.Body className="p-4">
            <p className="text-muted small mb-3">
              Choose from our 10 standard predefined service packages. You may select multiple services for this visit.
            </p>

            {/* Free Service Callout */}
            {isFreeEligible && (
              <Alert variant="success" className="border-0 shadow-sm d-flex align-items-center gap-3 mb-4 py-2 px-3">
                <FaAward className="text-success fs-4 flex-shrink-0" />
                <div className="small">
                  <strong>Free Service #{vehicleData.freeServiceNumber} Applied:</strong> All labour and washing charges are 100% waived on this job card. (Spare parts remain chargeable if required).
                </div>
              </Alert>
            )}

            <Row className="g-3 mb-4">
              {PREDEFINED_SERVICES.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <Col xs={12} md={6} lg={4} key={service.id}>
                    <Card 
                      className={`h-100 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-2 border-primary bg-primary bg-opacity-10 shadow-sm' 
                          : 'border shadow-none hover-shadow'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleService(service)}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="fw-bold text-navy">{service.name}</div>
                          <Form.Check 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // Handled by Card onClick
                            className="fs-5 pointer-events-none"
                          />
                        </div>
                        <p className="text-muted small mb-3" style={{ minHeight: '38px' }}>
                          {service.desc}
                        </p>
                        <div className="d-flex justify-content-between align-items-center border-top pt-2 small">
                          <span className="text-muted">Labour: ₹{service.labour}</span>
                          {service.washing > 0 ? (
                            <span className="text-info fw-semibold">+ ₹{service.washing} Wash</span>
                          ) : (
                            <span className="text-muted">Wash: ₹0</span>
                          )}
                          <span className="fw-bold text-primary">
                            ₹{service.labour + service.washing}
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Live Pricing Calculation Card */}
            <Card className="bg-light border shadow-sm mb-4">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div className="fw-bold text-navy">
                      Selected Services ({selectedServices.length}):
                    </div>
                    <div className="small text-muted">
                      {selectedServices.map(s => s.name).join(' &bull; ')}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-4 text-end">
                    <div>
                      <div className="small text-muted">Standard Rate</div>
                      <div className="fw-bold text-secondary">₹{rawTotal}</div>
                    </div>
                    {isFreeEligible && (
                      <div>
                        <div className="small text-success fw-bold">Free Benefit</div>
                        <div className="fw-bold text-success">- ₹{rawTotal}</div>
                      </div>
                    )}
                    <div>
                      <div className="small text-muted">Estimated Labour & Service</div>
                      <div className="fw-bold text-navy fs-4">
                        ₹{finalTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between mt-4">
              <Button 
                variant="outline-secondary" 
                className="d-flex align-items-center gap-2"
                onClick={() => setCurrentStep(1)}
              >
                <FaArrowLeft /> <span>Back to Lookup</span>
              </Button>
              <Button 
                variant="primary" 
                className="btn-primary-custom px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => setCurrentStep(3)}
              >
                <span>Proceed to Inspection</span>
                <FaArrowRight />
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* STEP 3: CUSTOMER COMPLAINTS & INITIAL INSPECTION */}
      {currentStep === 3 && (
        <Card className="border-0 shadow-sm bg-card mb-4">
          <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <FaClipboardCheck className="text-orange" size={20} />
              <h5 className="fw-bold mb-0 text-navy">Step 3: Customer Complaint & 9-Point Inspection</h5>
            </div>
            <Badge bg="light" text="dark" className="border px-3 py-2 fs-6">
              Vehicle: {vehicleData?.vehicleNumber}
            </Badge>
          </Card.Header>
          <Card.Body className="p-4">
            
            {/* Section A: Customer Complaints */}
            <div className="mb-5">
              <h6 className="fw-bold text-navy mb-2 d-flex align-items-center gap-2">
                <FaExclamationCircle className="text-primary" /> Voice of Customer (Complaints Reported)
              </h6>
              <p className="text-muted small mb-3">
                Select common issues reported by the customer or type specific observations below.
              </p>

              <div className="d-flex flex-wrap gap-2 mb-3">
                {COMMON_COMPLAINTS.map((comp) => {
                  const isSelected = selectedComplaints.includes(comp);
                  return (
                    <Button
                      key={comp}
                      variant={isSelected ? "primary" : "outline-secondary"}
                      size="sm"
                      className={`rounded-pill px-3 py-1 ${isSelected ? 'btn-primary-custom' : ''}`}
                      onClick={() => toggleComplaint(comp)}
                    >
                      {isSelected ? <FaCheck className="me-1" size={10} /> : null}
                      {comp}
                    </Button>
                  );
                })}
              </div>

              <Form.Group>
                <Form.Label className="small fw-bold text-muted">Additional Customer Remarks / Specific Symptoms</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="e.g. Vibrations noticed at speeds above 80 km/h, slight oil smell after long drive..."
                  value={complaintRemarks}
                  onChange={(e) => setComplaintRemarks(e.target.value)}
                />
              </Form.Group>
            </div>

            {/* Section B: 9-Point Initial Vehicle Inspection */}
            <div>
              <h6 className="fw-bold text-navy mb-2 d-flex align-items-center gap-2">
                <FaTools className="text-orange" /> Initial Physical Vehicle Inspection Checklist
              </h6>
              <p className="text-muted small mb-4">
                Record the vehicle's intake condition to maintain transparent records before bay handover.
              </p>

              <Row className="g-3 mb-4">
                {/* 1. Engine Oil */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">1. Engine Oil Level & Color</Form.Label>
                    {['Good', 'Degraded', 'Low Level', 'Needs Replacement'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="engineOil"
                        id={`oil-${val}`}
                        label={val}
                        checked={inspection.engineOil === val}
                        onChange={() => setInspection(prev => ({ ...prev, engineOil: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>

                {/* 2. Brakes */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">2. Brake System Check</Form.Label>
                    {['Good', 'Worn Out', 'Spongy', 'Needs Replacement'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="brakes"
                        id={`brake-${val}`}
                        label={val}
                        checked={inspection.brakes === val}
                        onChange={() => setInspection(prev => ({ ...prev, brakes: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>

                {/* 3. Tyres */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">3. Tyre Condition & Tread</Form.Label>
                    {['Good', 'Normal Wear', 'Uneven Wear', 'Replacement Recommended'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="tyres"
                        id={`tyre-${val}`}
                        label={val}
                        checked={inspection.tyres === val}
                        onChange={() => setInspection(prev => ({ ...prev, tyres: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>

                {/* 4. Battery */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">4. Battery & Terminals</Form.Label>
                    {['Healthy', 'Weak', 'Low Voltage', 'Needs Replacement'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="battery"
                        id={`bat-${val}`}
                        label={val}
                        checked={inspection.battery === val}
                        onChange={() => setInspection(prev => ({ ...prev, battery: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>

                {/* 5. Lights */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">5. Headlights & Indicators</Form.Label>
                    {['All Working', 'Headlight Bulb Out', 'Tail Light Out', 'Indicator Issue'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="lights"
                        id={`light-${val}`}
                        label={val}
                        checked={inspection.lights === val}
                        onChange={() => setInspection(prev => ({ ...prev, lights: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>

                {/* 6. Exterior Condition */}
                <Col xs={12} md={4}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2">6. Exterior Body Condition</Form.Label>
                    {['Clean / Minor Scratches', 'Dent Present', 'Scratches Present', 'Bumper Damage'].map(val => (
                      <Form.Check
                        key={val}
                        type="radio"
                        name="exterior"
                        id={`ext-${val}`}
                        label={val}
                        checked={inspection.exteriorCondition === val}
                        onChange={() => setInspection(prev => ({ ...prev, exteriorCondition: val }))}
                        className="small mb-1"
                      />
                    ))}
                  </Card>
                </Col>
              </Row>

              <Row className="g-3 mb-4">
                {/* 7. Fuel Level */}
                <Col xs={12} md={6}>
                  <Card className="border p-3 h-100 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Form.Label className="small fw-bold text-navy mb-0 d-flex align-items-center gap-1">
                        <FaGasPump className="text-warning" /> 7. Intake Fuel Level
                      </Form.Label>
                      <Badge bg="primary">{inspection.fuelLevel}</Badge>
                    </div>
                    <div className="btn-group w-100 mt-2" role="group">
                      {['Empty', '25%', '50%', '75%', '100%'].map(lvl => (
                        <Button
                          key={lvl}
                          type="button"
                          variant={inspection.fuelLevel === lvl ? "primary" : "outline-secondary"}
                          size="sm"
                          onClick={() => setInspection(prev => ({ ...prev, fuelLevel: lvl }))}
                        >
                          {lvl}
                        </Button>
                      ))}
                    </div>
                  </Card>
                </Col>

                {/* 8. Current Odometer Reading */}
                <Col xs={12} md={6}>
                  <Card className="border p-3 h-100 bg-light">
                    <Form.Label className="small fw-bold text-navy mb-2 d-flex align-items-center gap-1">
                      <FaTachometerAlt className="text-primary" /> 8. Current Odometer Reading (km)
                    </Form.Label>
                    <div className="input-group">
                      <Form.Control
                        type="number"
                        placeholder="e.g. 45200"
                        value={inspection.odometerReading}
                        onChange={(e) => setInspection(prev => ({ ...prev, odometerReading: e.target.value }))}
                      />
                      <span className="input-group-text bg-white">km</span>
                    </div>
                    <div className="small text-muted mt-1">
                      Last recorded: {vehicleData?.currentOdometerReading || 0} km
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 9. Remarks */}
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-navy">9. Advisor Inspection Remarks / Observations</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Record any preexisting issues, spare tyre status, or special handling notes..."
                  value={inspection.remarks}
                  onChange={(e) => setInspection(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Form.Group>
            </div>

            <div className="d-flex justify-content-between mt-4">
              <Button 
                variant="outline-secondary" 
                className="d-flex align-items-center gap-2"
                onClick={() => setCurrentStep(2)}
              >
                <FaArrowLeft /> <span>Back to Services</span>
              </Button>
              <Button 
                variant="primary" 
                className="btn-primary-custom px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => setCurrentStep(4)}
              >
                <span>Check Today's Capacity</span>
                <FaArrowRight />
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* STEP 4: CAPACITY & TIME SLOT */}
      {currentStep === 4 && (
        <Card className="border-0 shadow-sm bg-card mb-4">
          <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <FaClock className="text-orange" size={20} />
              <h5 className="fw-bold mb-0 text-navy">Step 4: Today's Workshop Capacity & Slot Verification</h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                className="d-flex align-items-center gap-2"
                onClick={loadCapacity}
                disabled={loadingCapacity}
              >
                <FaSync className={loadingCapacity ? 'fa-spin' : ''} />
                <span>Refresh Capacity</span>
              </Button>
              <Badge bg="light" text="dark" className="border px-3 py-2 fs-6">
                Date: {todayStr}
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            {loadingCapacity ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted mt-2">Checking real-time mechanic attendance and bay workloads...</p>
              </div>
            ) : (
              <>
                {(() => {
                  const checkedInMechanics = slotData?.checkedInMechanics ?? recommendedSlotInfo?.checkedInMechanics ?? (slotData?.capacityPerSlot || 0);
                  const totalBooked = slotData?.totalBooked ?? (slotData?.slots?.reduce((sum, s) => sum + (s.booked || 0), 0) || 0);
                  const totalAvailable = slotData?.totalAvailable ?? (slotData?.slots?.reduce((sum, s) => sum + (s.available || 0), 0) || 0);
                  const isNoCapacity = (checkedInMechanics === 0 || totalAvailable === 0);
                  const hasAvailableSlot = recommendedSlotInfo && !recommendedSlotInfo.allRemainingSlotsFull && selectedSlot && checkedInMechanics > 0;

                  return (
                    <>
                      {/* Capacity KPI Overview */}
                      <Row className="g-3 mb-4">
                        <Col xs={12} sm={4}>
                          <div className="p-3 border rounded bg-light text-center">
                            <div className="text-muted small">Active Checked-in Mechanics</div>
                            <div className="fs-3 fw-bold text-navy">{checkedInMechanics}</div>
                            <div className="small text-success">On garage floor today</div>
                          </div>
                        </Col>
                        <Col xs={12} sm={4}>
                          <div className="p-3 border rounded bg-light text-center">
                            <div className="text-muted small">Total Booked Today</div>
                            <div className="fs-3 fw-bold text-orange">{totalBooked}</div>
                            <div className="small text-muted">Across all bays</div>
                          </div>
                        </Col>
                        <Col xs={12} sm={4}>
                          <div className="p-3 border rounded bg-light text-center">
                            <div className="text-muted small">Available Open Capacity</div>
                            <div className={`fs-3 fw-bold ${totalAvailable > 0 ? 'text-success' : 'text-danger'}`}>
                              {totalAvailable}
                            </div>
                            <div className="small text-muted">Remaining service slots</div>
                          </div>
                        </Col>
                      </Row>

                      {/* CASE C: SLOT AVAILABLE */}
                      {hasAvailableSlot ? (
                        <div className="card border-primary border-2 bg-primary bg-opacity-10 p-4 mb-4 rounded-3 shadow-sm">
                          <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                            <div>
                              <Badge bg="primary" className="px-3 py-2 text-uppercase mb-2">
                                Recommended Walk-in Slot
                              </Badge>
                              <h4 className="fw-bold text-navy mb-1">Today &bull; {selectedSlot}</h4>
                              <div className="text-muted small">
                                {recommendedSlotInfo.isCurrentSlot 
                                  ? 'Current active slot (immediately valid for check-in)' 
                                  : 'Nearest available slot from current time onward'}
                              </div>
                            </div>
                            <div className="text-sm-end">
                              <Badge bg="success" className="px-3 py-2 fs-6 mb-1 d-inline-block">
                                <FaCheckCircle className="me-1" /> Slot Assigned Successfully
                              </Badge>
                              <div className="small text-success fw-bold">
                                {recommendedSlotInfo.available} mechanic available
                              </div>
                            </div>
                          </div>

                          <Row className="g-3 bg-white p-3 rounded-2 border align-items-center mb-3">
                            <Col xs={12} sm={4}>
                              <span className="text-muted small d-block">Vehicle</span>
                              <span className="fw-bold text-dark font-monospace">{vehicleData?.vehicleNumber}</span>
                            </Col>
                            <Col xs={12} sm={4}>
                              <span className="text-muted small d-block">Intake Service</span>
                              <span className="fw-bold text-dark">{selectedServices[0]?.name || 'General Service'}</span>
                            </Col>
                            <Col xs={12} sm={4}>
                              <span className="text-muted small d-block">Real Capacity</span>
                              <span className="fw-bold text-navy">
                                {recommendedSlotInfo.booked} / {recommendedSlotInfo.capacity} bays occupied
                              </span>
                            </Col>
                          </Row>

                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1">
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => setShowAllSlots(!showAllSlots)}
                            >
                              {showAllSlots ? 'Hide Alternative Slots' : 'Choose Another Available Slot'}
                            </Button>
                            <span className="small text-success fw-medium">
                              ✓ Automatically selected based on live mechanic availability
                            </span>
                          </div>

                          {showAllSlots && (
                            <div className="mt-4 pt-3 border-top">
                              <h6 className="fw-bold text-navy mb-3">Other Valid Slots for Today:</h6>
                              <Row className="g-3">
                                {slotData?.slots?.map((slot, idx) => {
                                  const isSelected = selectedSlot === slot.time;
                                  const isFull = slot.available === 0;
                                  return (
                                    <Col xs={12} sm={6} md={4} key={idx}>
                                      <Card 
                                        className={`border ${
                                          isFull 
                                            ? 'bg-light opacity-75 border-secondary' 
                                            : isSelected 
                                              ? 'border-2 border-primary bg-primary bg-opacity-10 shadow-sm' 
                                              : 'hover-shadow cursor-pointer bg-white'
                                        }`}
                                        style={{ cursor: isFull ? 'not-allowed' : 'pointer' }}
                                        onClick={() => {
                                          if (!isFull) setSelectedSlot(slot.time);
                                        }}
                                      >
                                        <Card.Body className="p-3">
                                          <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="fw-bold text-navy small">{slot.time}</span>
                                            {isFull ? (
                                              <Badge bg="danger">FULL</Badge>
                                            ) : (
                                              <Badge bg="success">{slot.available} Available</Badge>
                                            )}
                                          </div>
                                          <div className="small text-muted">
                                            Booked: {slot.booked} / {slot.capacity}
                                          </div>
                                        </Card.Body>
                                      </Card>
                                    </Col>
                                  );
                                })}
                              </Row>
                            </div>
                          )}
                        </div>
                      ) : checkedInMechanics === 0 ? (
                        /* CASE A: ZERO MECHANICS CHECKED IN */
                        <Alert variant="warning" className="border-0 shadow-sm p-4 rounded-3 mb-4">
                          <div className="d-flex align-items-start gap-3">
                            <FaExclamationTriangle className="text-warning mt-1" size={32} />
                            <div className="w-100">
                              <h5 className="fw-bold text-navy mb-1">No Mechanics Available Today</h5>
                              <p className="text-dark small mb-3">
                                No mechanics are currently checked in today. A service slot cannot be assigned until mechanic availability is confirmed.
                              </p>
                              <div className="d-flex gap-2 flex-wrap mb-3">
                                <Button 
                                  variant="warning" 
                                  className="btn btn-orange text-white d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={handleJoinWaitlist}
                                  disabled={joiningWaitlist}
                                >
                                  {joiningWaitlist ? <Spinner size="sm" /> : <FaWalking />}
                                  <span>Add to Waiting Queue</span>
                                </Button>
                                <Button 
                                  variant="outline-primary"
                                  className="d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={handleViewNextAvailableDate}
                                  disabled={loadingNextDate}
                                >
                                  {loadingNextDate ? <Spinner size="sm" /> : <FaCalendarCheck />}
                                  <span>View Next Available Date</span>
                                </Button>
                                <Button 
                                  variant="outline-secondary"
                                  className="d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={loadCapacity}
                                  disabled={loadingCapacity}
                                >
                                  <FaSync className={loadingCapacity ? 'fa-spin' : ''} />
                                  <span>Refresh Capacity</span>
                                </Button>
                              </div>

                              {nextAvailableDateInfo && (
                                <div className="p-3 bg-white border rounded mt-2">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold text-navy">Upcoming Slot Found:</span>
                                    <Badge bg="success">{nextAvailableDateInfo.capacity} slots available</Badge>
                                  </div>
                                  <div className="small text-dark mb-2">
                                    Date: <strong>{nextAvailableDateInfo.date}</strong> &bull; Time: <strong>{nextAvailableDateInfo.time}</strong>
                                  </div>
                                  <Link to={`/appointments/book?date=${nextAvailableDateInfo.date}`} className="btn btn-sm btn-primary">
                                    Book for {nextAvailableDateInfo.date} &rarr;
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </Alert>
                      ) : (
                        /* CASE B: MECHANICS AVAILABLE BUT ALL REMAINING SLOTS FULL */
                        <Alert variant="danger" className="border-0 shadow-sm p-4 rounded-3 mb-4">
                          <div className="d-flex align-items-start gap-3">
                            <FaExclamationTriangle className="text-danger mt-1" size={32} />
                            <div className="w-100">
                              <h5 className="fw-bold text-navy mb-1">No Service Slot Available Today</h5>
                              <p className="text-dark small mb-3">
                                All remaining service slots are currently full or mechanics are occupied with active job cards.
                              </p>
                              <div className="d-flex gap-2 flex-wrap mb-3">
                                <Button 
                                  variant="warning" 
                                  className="btn btn-orange text-white d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={handleJoinWaitlist}
                                  disabled={joiningWaitlist}
                                >
                                  {joiningWaitlist ? <Spinner size="sm" /> : <FaWalking />}
                                  <span>Add to Waiting Queue</span>
                                </Button>
                                <Button 
                                  variant="outline-primary"
                                  className="d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={handleViewNextAvailableDate}
                                  disabled={loadingNextDate}
                                >
                                  {loadingNextDate ? <Spinner size="sm" /> : <FaCalendarCheck />}
                                  <span>View Next Available Date</span>
                                </Button>
                                <Button 
                                  variant="outline-secondary"
                                  className="d-flex align-items-center gap-2 px-3 py-2"
                                  onClick={loadCapacity}
                                  disabled={loadingCapacity}
                                >
                                  <FaSync className={loadingCapacity ? 'fa-spin' : ''} />
                                  <span>Refresh Capacity</span>
                                </Button>
                              </div>

                              {nextAvailableDateInfo && (
                                <div className="p-3 bg-white border rounded mt-2">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold text-navy">Upcoming Slot Found:</span>
                                    <Badge bg="success">{nextAvailableDateInfo.capacity} slots available</Badge>
                                  </div>
                                  <div className="small text-dark mb-2">
                                    Date: <strong>{nextAvailableDateInfo.date}</strong> &bull; Time: <strong>{nextAvailableDateInfo.time}</strong>
                                  </div>
                                  <Link to={`/appointments/book?date=${nextAvailableDateInfo.date}`} className="btn btn-sm btn-primary">
                                    Book for {nextAvailableDateInfo.date} &rarr;
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </Alert>
                      )}

                      <div className="d-flex justify-content-between mt-4">
                        <Button 
                          variant="outline-secondary" 
                          className="d-flex align-items-center gap-2"
                          onClick={() => setCurrentStep(3)}
                        >
                          <FaArrowLeft /> <span>Back to Inspection</span>
                        </Button>
                        <Button 
                          variant="primary" 
                          className="btn-primary-custom px-4 py-2 d-flex align-items-center gap-2"
                          onClick={() => setCurrentStep(5)}
                          disabled={!hasAvailableSlot || isNoCapacity || checkedInMechanics === 0}
                        >
                          <span>Confirm Walk-in Check-In</span>
                          <FaArrowRight />
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {/* STEP 5: MECHANIC ASSIGNMENT & JOB CARD GENERATION */}
      {currentStep === 5 && (
        <Card className="border-0 shadow-sm bg-card mb-4">
          <Card.Header className="bg-transparent border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <FaTools className="text-orange" size={20} />
              <h5 className="fw-bold mb-0 text-navy">Step 5: Mechanic Assignment & Final Dispatch</h5>
            </div>
            <Badge bg="light" text="dark" className="border px-3 py-2 fs-6">
              Vehicle: {vehicleData?.vehicleNumber}
            </Badge>
          </Card.Header>
          <Card.Body className="p-4">
            <Row className="g-4 mb-4">
              {/* Left Column: Mechanic Selection & Priority */}
              <Col xs={12} lg={7}>
                <h6 className="fw-bold text-navy mb-3">Assign Checked-In Mechanic:</h6>
                {loadingMechanics ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <span className="ms-2 small text-muted">Loading checked-in mechanics...</span>
                  </div>
                ) : activeMechanics.length === 0 ? (
                  <Alert variant="warning" className="small">
                    No active mechanics are checked in today. Job Card will be created with status "Open" for supervisor assignment.
                  </Alert>
                ) : (
                  <div className="d-flex flex-column gap-2 mb-4">
                    {activeMechanics.map((mech) => {
                      const isSelected = selectedMechanic === mech._id;
                      return (
                        <div 
                          key={mech._id}
                          className={`p-3 border rounded d-flex justify-content-between align-items-center cursor-pointer transition-all ${
                            isSelected ? 'border-2 border-primary bg-primary bg-opacity-10' : 'bg-light hover-shadow'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedMechanic(mech._id)}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <Form.Check 
                              type="radio" 
                              name="mechanicRadio" 
                              checked={isSelected}
                              onChange={() => {}} 
                              className="pointer-events-none"
                            />
                            <div>
                              <div className="fw-bold text-navy">{mech.fullName}</div>
                              <div className="small text-muted">
                                ID: {mech.employeeId} &bull; Spec: {mech.specialization || 'General Technician'}
                              </div>
                            </div>
                          </div>

                          <div className="text-end">
                            <Badge bg={mech.activeJobsCount === 0 ? 'success' : 'warning'} className="px-2 py-1">
                              {mech.activeJobsCount === 0 ? '0 Active Jobs (Available)' : `${mech.activeJobsCount} Active Jobs`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Row className="g-3 mb-4">
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-navy">Priority Level</Form.Label>
                      <Form.Select 
                        value={priority} 
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent (Express Walk-in)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-navy">Time Slot</Form.Label>
                      <Form.Control type="text" value={selectedSlot} readOnly className="bg-light" />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-navy">Internal Advisor Dispatch Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="e.g. Customer waiting in lounge, requested fast delivery before 1 PM..."
                    value={advisorNotes}
                    onChange={(e) => setAdvisorNotes(e.target.value)}
                  />
                </Form.Group>
              </Col>

              {/* Right Column: Complete Summary Card */}
              <Col xs={12} lg={5}>
                <Card className="border shadow-sm bg-light h-100">
                  <Card.Header className="bg-navy text-white fw-bold py-3">
                    Walk-in Job Card Summary
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="mb-3 border-bottom pb-2">
                      <div className="text-muted small">Customer & Vehicle:</div>
                      <div className="fw-bold text-dark">{vehicleData?.customer?.fullName} ({vehicleData?.customer?.mobileNumber})</div>
                      <div className="fw-semibold text-primary">{vehicleData?.vehicleNumber} - {vehicleData?.brand} {vehicleData?.model}</div>
                    </div>

                    <div className="mb-3 border-bottom pb-2">
                      <div className="text-muted small">Selected Services ({selectedServices.length}):</div>
                      <ul className="list-unstyled mb-1 small">
                        {selectedServices.map(s => (
                          <li key={s.id} className="d-flex justify-content-between py-1 border-bottom border-light">
                            <span>{s.name}</span>
                            <span className="fw-semibold">₹{s.labour + s.washing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3 border-bottom pb-2">
                      <div className="text-muted small">Inspection Highlights:</div>
                      <div className="small text-muted">
                        Oil: <strong>{inspection.engineOil}</strong> &bull; Brakes: <strong>{inspection.brakes}</strong> &bull; Tyres: <strong>{inspection.tyres}</strong><br/>
                        Battery: <strong>{inspection.battery}</strong> &bull; Fuel: <strong>{inspection.fuelLevel}</strong> &bull; Odo: <strong>{inspection.odometerReading} km</strong>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1 small">
                        <span>Standard Subtotal:</span>
                        <span>₹{rawTotal.toFixed(2)}</span>
                      </div>
                      {isFreeEligible && (
                        <div className="d-flex justify-content-between align-items-center mb-1 small text-success fw-bold">
                          <span>Free Service Discount:</span>
                          <span>- ₹{rawTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center fw-bold fs-5 text-navy border-top pt-2">
                        <span>Estimated Cost:</span>
                        <span>₹{finalTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Step 5 Confirmation Card: Customer, Vehicle, Vehicle Model */}
                    <Card className="mb-3 border-primary-subtle bg-white shadow-sm border">
                      <Card.Body className="p-3">
                        <div className="small fw-bold text-navy text-uppercase mb-2 d-flex align-items-center gap-2 border-bottom pb-1">
                          <FaCheckCircle className="text-success" />
                          <span>Walk-in Identification Confirmation</span>
                        </div>
                        <div className="small text-dark mb-1">
                          <strong>Customer:</strong> {vehicleData?.customer?.fullName || 'N/A'}
                        </div>
                        <div className="small text-dark mb-1">
                          <strong>Vehicle:</strong> <span className="font-monospace fw-bold text-primary">{vehicleData?.vehicleNumber || 'N/A'}</span>
                        </div>
                        <div className="small text-dark">
                          <strong>Vehicle Model:</strong> {vehicleData?.brand} {vehicleData?.model}
                        </div>
                      </Card.Body>
                    </Card>

                    <Button
                      variant="primary"
                      className="btn-primary-custom w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleCreateJobCard}
                      disabled={creatingJobCard}
                    >
                      {creatingJobCard ? <Spinner size="sm" /> : <FaPrint />}
                      <span>{creatingJobCard ? 'Creating Job Card...' : 'Generate Walk-in Job Card'}</span>
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button 
                variant="outline-secondary" 
                className="d-flex align-items-center gap-2"
                onClick={() => setCurrentStep(4)}
              >
                <FaArrowLeft /> <span>Back to Capacity</span>
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default WalkInService;
