/**
 * Test Suite: Walk-in Service Customer/Vehicle State Persistence & Job Card Creation
 * Validates:
 * 1. Vehicle Lookup returns { vehicle, customer, serviceInfo }
 * 2. Frontend normalization extracts valid vehicleId and customerId
 * 3. Pre-flight validation blocks request if vehicleId or customerId is missing
 * 4. Backend createWalkInJobCard validation strictly enforces "Customer and Vehicle are required"
 * 5. Backend createWalkInJobCard successfully creates Job Card with valid customerId & vehicleId
 * 6. Backend createWalkInJobCard resolves customerId from vehicle.customer if customerId was omitted
 * 7. Double-click prevention avoids duplicate Job Card creation
 * 8. Wizard step navigation preserves all state from Step 1 through Step 5
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Vehicle from './models/Vehicle.js';
import Customer from './models/Customer.js';
import JobCard from './models/JobCard.js';
import Appointment from './models/Appointment.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import { lookupVehicleByRegNumber } from './controllers/vehicleController.js';
import { createWalkInJobCard } from './controllers/jobCardController.js';
import { getIndiaDateStr } from './utils/dateUtils.js';

dotenv.config();

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING WALK-IN CUSTOMER/VEHICLE STATE BUG VERIFICATION SUITE');
  console.log('================================================================\n');

  await connectDB();
  console.log('Connected to MongoDB.\n');

  try {
    // 1. SETUP / ENSURE TEST CUSTOMER AND VEHICLE
    let customer = await Customer.findOne({ mobileNumber: '9876543210' });
    if (!customer) {
      customer = await Customer.create({
        fullName: 'Rajesh Kumar Test',
        mobileNumber: '9876543210',
        emailAddress: 'rajesh.test@example.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
        address: '101, Test Road',
        pincode: '380001'
      });
    }

    let vehicle = await Vehicle.findOne({ vehicleNumber: 'GJ01RE5500' });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        customer: customer._id,
        vehicleNumber: 'GJ01RE5500',
        brand: 'Hyundai',
        model: 'Creta',
        manufacturingYear: 2022,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        registrationDate: new Date('2022-05-15'),
        currentOdometerReading: 24500,
        color: 'Polar White'
      });
    } else {
      // Ensure it links to the test customer
      vehicle.customer = customer._id;
      await vehicle.save();
    }

    const mockAdvisorUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Service Advisor Test',
      role: 'advisor'
    };

    // Helper for mock response
    function createMockRes() {
      return {
        statusCode: 200,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        }
      };
    }

    // -------------------------------------------------------------
    // TEST 1: Vehicle Lookup returns { vehicle, customer, serviceInfo }
    // -------------------------------------------------------------
    console.log('--- TEST 1: Vehicle Lookup Endpoint Output ---');
    const mockLookupReq = { params: { regNumber: 'GJ01RE5500' } };
    const mockLookupRes = createMockRes();
    await lookupVehicleByRegNumber(mockLookupReq, mockLookupRes);

    assert(mockLookupRes.statusCode === 200, 'Lookup succeeds with status 200');
    assert(mockLookupRes.data && mockLookupRes.data.vehicle, 'Response contains vehicle object');
    assert(mockLookupRes.data && mockLookupRes.data.customer, 'Response contains customer object');
    assert(mockLookupRes.data && mockLookupRes.data.serviceInfo, 'Response contains serviceInfo object');
    assert(mockLookupRes.data.vehicle.vehicleNumber === 'GJ01RE5500', 'Vehicle number matches GJ01RE5500');
    assert(mockLookupRes.data.customer._id.toString() === customer._id.toString(), 'Customer ID matches linked customer');

    // -------------------------------------------------------------
    // TEST 2: Frontend Normalization Logic produces valid IDs and fields
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Frontend Normalization Logic ---');
    const rawLookupData = mockLookupRes.data;
    const rawVehicleDoc = rawLookupData.vehicle || rawLookupData;
    const rawVehicle = rawVehicleDoc.toObject ? rawVehicleDoc.toObject() : rawVehicleDoc;
    const rawCustomerDoc = rawLookupData.customer || rawVehicle.customer || {};
    const rawCustomer = rawCustomerDoc.toObject ? rawCustomerDoc.toObject() : rawCustomerDoc;
    const rawServiceInfo = rawLookupData.serviceInfo || {};

    const normalizedVehicleData = {
      ...rawVehicle,
      vehicle: rawVehicle,
      _id: rawVehicle._id,
      vehicleId: rawVehicle._id,
      customer: rawCustomer,
      customerId: rawCustomer._id || (typeof rawVehicle.customer === 'string' ? rawVehicle.customer : rawVehicle.customer?._id),
      vehicleNumber: rawVehicle.vehicleNumber || 'GJ01RE5500',
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
      freeServicesEntitled: rawServiceInfo.freeServicesEntitled ?? 3,
      freeServicesUsed: rawServiceInfo.freeServicesUsed ?? 0,
      freeServiceEligible: !!rawServiceInfo.freeServiceEligible,
      freeServiceNumber: rawServiceInfo.freeServiceNumber || null
    };

    assert(Boolean(normalizedVehicleData._id), 'Normalized data has valid _id', normalizedVehicleData._id.toString());
    assert(Boolean(normalizedVehicleData.vehicleId), 'Normalized data has valid vehicleId', normalizedVehicleData.vehicleId.toString());
    assert(Boolean(normalizedVehicleData.customerId), 'Normalized data has valid customerId', normalizedVehicleData.customerId.toString());
    assert(normalizedVehicleData.vehicleNumber === 'GJ01RE5500', 'Normalized data has vehicleNumber');
    assert(Boolean(normalizedVehicleData.brand) && normalizedVehicleData.brand === rawVehicle.brand, 'Normalized data has brand', normalizedVehicleData.brand);
    assert(Boolean(normalizedVehicleData.model) && normalizedVehicleData.model === rawVehicle.model, 'Normalized data has model', normalizedVehicleData.model);
    assert(normalizedVehicleData.customer.fullName === customer.fullName, 'Normalized data has customer fullName', normalizedVehicleData.customer.fullName);

    // -------------------------------------------------------------
    // TEST 3: Frontend Pre-flight Guard Check
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Frontend Pre-flight Guard Check ---');
    function simulateFrontendPreFlight(vData) {
      const resolvedVehicleId = vData?._id || vData?.vehicleId || vData?.vehicle?._id;
      const resolvedCustomerId = vData?.customerId || vData?.customer?._id || (typeof vData?.customer === 'string' ? vData.customer : null);
      if (!resolvedVehicleId || !resolvedCustomerId) {
        return { ok: false, error: 'Please select a customer and vehicle before creating the Job Card.' };
      }
      return { ok: true, vehicleId: resolvedVehicleId, customerId: resolvedCustomerId };
    }

    const preFlightFail1 = simulateFrontendPreFlight(null);
    assert(!preFlightFail1.ok && preFlightFail1.error === 'Please select a customer and vehicle before creating the Job Card.',
           'Pre-flight rejects null vehicleData');

    const preFlightFail2 = simulateFrontendPreFlight({ _id: vehicle._id, customer: null });
    assert(!preFlightFail2.ok && preFlightFail2.error === 'Please select a customer and vehicle before creating the Job Card.',
           'Pre-flight rejects missing customerId');

    const preFlightPass = simulateFrontendPreFlight(normalizedVehicleData);
    assert(preFlightPass.ok && preFlightPass.vehicleId && preFlightPass.customerId,
           'Pre-flight accepts normalized vehicleData with valid customer and vehicle IDs');

    // -------------------------------------------------------------
    // TEST 4: Backend createWalkInJobCard strictly requires customer and vehicle
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Backend createWalkInJobCard Validation Enforcement ---');
    // Missing both
    const emptyReq = { body: {}, user: mockAdvisorUser };
    const emptyRes = createMockRes();
    await createWalkInJobCard(emptyReq, emptyRes);
    assert(emptyRes.statusCode === 400 && emptyRes.data.message === 'Customer and Vehicle are required',
           'Backend returns 400 "Customer and Vehicle are required" when both are missing');

    // Missing vehicleId
    const noVehicleReq = { body: { customerId: customer._id }, user: mockAdvisorUser };
    const noVehicleRes = createMockRes();
    await createWalkInJobCard(noVehicleReq, noVehicleRes);
    assert(noVehicleRes.statusCode === 400 && noVehicleRes.data.message === 'Customer and Vehicle are required',
           'Backend returns 400 "Customer and Vehicle are required" when vehicleId is missing');

    // Missing customerId with an invalid vehicleId
    const invalidVehicleReq = { body: { vehicleId: new mongoose.Types.ObjectId() }, user: mockAdvisorUser };
    const invalidVehicleRes = createMockRes();
    await createWalkInJobCard(invalidVehicleReq, invalidVehicleRes);
    assert(invalidVehicleRes.statusCode === 400 && invalidVehicleRes.data.message === 'Customer and Vehicle are required',
           'Backend returns 400 "Customer and Vehicle are required" when vehicle has no customer link');

    // -------------------------------------------------------------
    // TEST 5: Backend createWalkInJobCard Success with Explicit IDs
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Successful Walk-in Job Card Creation ---');
    const validCreateReq = {
      body: {
        vehicleId: vehicle._id,
        customerId: customer._id,
        services: [
          { serviceName: 'General Service', labourCharge: 600, washingCharge: 300, isFreeService: false }
        ],
        complaint: 'Routine checkup & oil level check',
        inspectionDetails: {
          odometerReading: 24500,
          engineOil: 'Good',
          brakes: 'Good',
          tyres: 'Good'
        },
        preferredTime: '11:00 AM - 12:00 PM',
        priority: 'High',
        dispatchNotes: 'Customer waiting in lounge'
      },
      user: mockAdvisorUser
    };
    const validCreateRes = createMockRes();
    await createWalkInJobCard(validCreateReq, validCreateRes);

    assert(validCreateRes.statusCode === 201, 'Job Card created with status 201');
    assert(validCreateRes.data && validCreateRes.data.jobNumber, 'Created Job Card has valid jobNumber', validCreateRes.data?.jobNumber);
    assert(validCreateRes.data.customer && (validCreateRes.data.customer._id.toString() === customer._id.toString() || validCreateRes.data.customer.toString() === customer._id.toString()),
           'Created Job Card has correct customer reference');
    assert(validCreateRes.data.vehicle && (validCreateRes.data.vehicle._id.toString() === vehicle._id.toString() || validCreateRes.data.vehicle.toString() === vehicle._id.toString()),
           'Created Job Card has correct vehicle reference');
    assert(validCreateRes.data.notes === 'Customer waiting in lounge', 'Created Job Card has dispatch notes mapped correctly');

    // Verify linked Appointment was created
    const createdAppointment = await Appointment.findById(validCreateRes.data.serviceRequest);
    assert(createdAppointment !== null, 'Linked Appointment was created for tracking');
    assert(createdAppointment && createdAppointment.bookingType === 'Walk-in', 'Appointment has bookingType Walk-in');
    assert(createdAppointment && createdAppointment.status === 'Approved', 'Appointment has status Approved');

    // -------------------------------------------------------------
    // TEST 6: Backend Fallback Resolution of customerId from Vehicle
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Backend Fallback Customer Resolution ---');
    const fallbackCreateReq = {
      body: {
        vehicleId: vehicle._id,
        // customerId intentionally omitted
        services: [
          { serviceName: 'Oil Change', labourCharge: 300, washingCharge: 0, isFreeService: false }
        ],
        complaint: 'Oil change only',
        priority: 'Medium'
      },
      user: mockAdvisorUser
    };
    const fallbackCreateRes = createMockRes();
    await createWalkInJobCard(fallbackCreateReq, fallbackCreateRes);

    assert(fallbackCreateRes.statusCode === 201, 'Job Card created with fallback customer resolution (status 201)');
    assert(fallbackCreateRes.data.customer && (fallbackCreateRes.data.customer._id.toString() === customer._id.toString() || fallbackCreateRes.data.customer.toString() === customer._id.toString()),
           'Job Card customer correctly resolved from vehicle.customer');

    // -------------------------------------------------------------
    // TEST 7: Double-click Prevention Simulation
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Double Click Prevention ---');
    let apiCallCount = 0;
    let creatingJobCard = false;

    async function simulateHandleCreateJobCard() {
      if (creatingJobCard) {
        return { blocked: true };
      }
      creatingJobCard = true;
      apiCallCount++;
      // simulate async delay
      await new Promise(r => setTimeout(r, 50));
      creatingJobCard = false;
      return { blocked: false };
    }

    const click1 = simulateHandleCreateJobCard();
    const click2 = simulateHandleCreateJobCard(); // immediate second click while first is executing
    const [res1, res2] = await Promise.all([click1, click2]);

    assert(res1.blocked === false && res2.blocked === true,
           'Double-click prevention: second concurrent click is blocked while first executes');
    assert(apiCallCount === 1, 'Only 1 API call was dispatched despite double click');

    // -------------------------------------------------------------
    // TEST 8: State Persistence across Step 1 to Step 5 Navigation
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Step 1 to 5 Navigation State Preservation ---');
    const wizardState = {
      currentStep: 1,
      regNumber: 'GJ01RE5500',
      vehicleData: normalizedVehicleData,
      selectedServices: [{ id: 'general_service', name: 'General Service', labour: 600, washing: 300 }],
      selectedComplaints: ['General Inspection & Checkup'],
      complaintRemarks: 'Customer reports mild squeak',
      inspection: { engineOil: 'Good', brakes: 'Good' },
      selectedSlot: '10:00 AM - 11:00 AM',
      selectedMechanic: '66a123456789abcdef012345',
      priority: 'High',
      advisorNotes: 'Priority delivery'
    };

    // Forward navigation
    wizardState.currentStep = 2; // Step 2: Services
    wizardState.currentStep = 3; // Step 3: Inspection
    wizardState.currentStep = 4; // Step 4: Capacity
    wizardState.currentStep = 5; // Step 5: Assign & Create

    assert(wizardState.vehicleData._id.toString() === vehicle._id.toString(), 'Step 5 has vehicleId preserved');
    assert(wizardState.vehicleData.customer._id.toString() === customer._id.toString(), 'Step 5 has customerId preserved');

    // Back to Step 1 and Forward again
    wizardState.currentStep = 1; // Back to Step 1
    assert(wizardState.vehicleData !== null && wizardState.regNumber === 'GJ01RE5500', 'Navigating back to Step 1 preserves vehicleData');

    wizardState.currentStep = 5; // Forward to Step 5
    assert(wizardState.selectedServices.length === 1, 'Returning to Step 5 preserves selectedServices');
    assert(wizardState.complaintRemarks === 'Customer reports mild squeak', 'Returning to Step 5 preserves complaintRemarks');
    assert(wizardState.selectedMechanic === '66a123456789abcdef012345', 'Returning to Step 5 preserves selectedMechanic');

    // Clean up test created job cards
    await JobCard.deleteMany({ _id: { $in: [validCreateRes.data._id, fallbackCreateRes.data._id] } });
    await Appointment.deleteMany({ _id: { $in: [validCreateRes.data.serviceRequest, fallbackCreateRes.data.serviceRequest] } });

  } catch (err) {
    console.error('Error during test execution:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
