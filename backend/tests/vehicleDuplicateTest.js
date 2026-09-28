import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import { createVehicle, updateVehicle } from '../controllers/vehicleController.js';

// Mock Express req and res
const mockReqRes = (body = {}, params = {}) => {
  const req = { body, params };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode() {
      return statusCode;
    },
    getResponseData() {
      return responseData;
    }
  };

  return { req, res };
};

const runTests = async () => {
  console.log('=== STARTING VEHICLE STRICT KA 20 & UNIQUE IDENTIFIERS TESTS ===\n');
  await connectDB();
  await Vehicle.syncIndexes();

  // Find or create a test customer
  let testCustomer = await Customer.findOne();
  if (!testCustomer) {
    testCustomer = await Customer.create({
      fullName: 'Test Customer',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      address: '123 Test St',
      city: 'Udupi',
      state: 'Karnataka',
      pincode: '576101'
    });
  }
  const customerId = testCustomer._id.toString();

  const cleanupIds = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Register Vehicle A with valid KA 20 number -> SUCCESS
    // ----------------------------------------------------
    console.log('Test 1: Register Vehicle A with valid KA 20 number (KA20ZZ9001) -> SUCCESS');
    const { req: req1, res: res1 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA20ZZ9001',
      brand: 'Toyota',
      model: 'Innova',
      manufacturingYear: 2022,
      fuelType: 'Diesel',
      transmission: 'Manual',
      registrationDate: '2022-01-15',
      chassisNumber: 'VINTEST0000000001',
      engineNumber: 'ENGTEST0001',
      insuranceNumber: 'POLTEST0001',
      currentOdometerReading: 15000,
      purchaseType: 'Used'
    });
    await createVehicle(req1, res1);
    const v1 = res1.getResponseData();
    if (res1.getStatusCode() === 201 && v1?._id) {
      cleanupIds.push(v1._id);
      console.log('  [PASS] Vehicle A created successfully with ID:', v1._id, 'vehicleNumber:', v1.vehicleNumber);
    } else {
      throw new Error(`Test 1 Failed: Status ${res1.getStatusCode()}, data: ${JSON.stringify(v1)}`);
    }

    // ----------------------------------------------------
    // TEST 2: Reject non-KA 20 registration numbers -> REJECT
    // ----------------------------------------------------
    console.log('\nTest 2: Reject non-KA 20 vehicle numbers (KA01AB1234, MH12AB1234, KL07AB1234, TN01AB1234) -> REJECT');
    const invalidNumbers = ['KA01AB1234', 'KA05AB1234', 'MH12AB1234', 'KL07AB1234', 'TN01AB1234'];
    for (const invalidNo of invalidNumbers) {
      const { req: reqInv, res: resInv } = mockReqRes({
        customerId,
        vehicleNumber: invalidNo,
        brand: 'Honda',
        model: 'City',
        manufacturingYear: 2021,
        fuelType: 'Petrol',
        transmission: 'Manual',
        registrationDate: '2021-05-20',
        currentOdometerReading: 20000,
        purchaseType: 'Used'
      });
      await createVehicle(reqInv, resInv);
      const dataInv = resInv.getResponseData();
      if (resInv.getStatusCode() === 400 && dataInv.field === 'vehicleNumber' && dataInv.message === 'Only KA 20 registered vehicles are allowed.') {
        console.log(`  [PASS] Successfully rejected ${invalidNo}: "${dataInv.message}"`);
      } else {
        throw new Error(`Test 2 Failed for ${invalidNo}: Expected 400 with KA20 error, got ${resInv.getStatusCode()}: ${JSON.stringify(dataInv)}`);
      }
    }

    // ----------------------------------------------------
    // TEST 3: Duplicate Vehicle Number (KA 20 ZZ 9001 vs KA20ZZ9001 and pre-existing KA 20 EH 0627) -> REJECT
    // ----------------------------------------------------
    console.log('\nTest 3: Reject duplicate vehicle number with spaced/cased variations ("KA 20 ZZ 9001") -> REJECT');
    const { req: req3, res: res3 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 ZZ 9001', // Spaced variation of Vehicle A
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req3, res3);
    const data3 = res3.getResponseData();
    if (res3.getStatusCode() === 400 && data3.field === 'vehicleNumber' && data3.message === 'This vehicle registration number is already registered.') {
      console.log('  [PASS] Blocked duplicate vehicle number (Vehicle A duplicate):', data3.message);
    } else {
      throw new Error(`Test 3 Failed: Expected 400 duplicate error, got ${res3.getStatusCode()}: ${JSON.stringify(data3)}`);
    }

    // Also test pre-existing vehicle in database KA 20 EH 0627
    const { req: req3b, res: res3b } = mockReqRes({
      customerId,
      vehicleNumber: 'ka20eh0627', // lowercase of existing vehicle KA 20 EH 0627
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req3b, res3b);
    const data3b = res3b.getResponseData();
    if (res3b.getStatusCode() === 400 && data3b.field === 'vehicleNumber' && data3b.message === 'This vehicle registration number is already registered.') {
      console.log('  [PASS] Blocked duplicate of pre-existing vehicle (ka20eh0627):', data3b.message);
    } else {
      throw new Error(`Test 3b Failed: Expected 400 duplicate error, got ${res3b.getStatusCode()}: ${JSON.stringify(data3b)}`);
    }

    // ----------------------------------------------------
    // TEST 4: Reject duplicate chassis/VIN number -> REJECT
    // ----------------------------------------------------
    console.log('\nTest 4: Reject duplicate chassis/VIN number ("vintest0000000001") -> REJECT');
    const { req: req4, res: res4 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 AB 1234',
      brand: 'Hyundai',
      model: 'i20',
      manufacturingYear: 2022,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2022-03-10',
      chassisNumber: '  vintest0000000001  ', // Duplicate of Vehicle A in lowercase + spaces
      currentOdometerReading: 12000,
      purchaseType: 'Used'
    });
    await createVehicle(req4, res4);
    const data4 = res4.getResponseData();
    if (res4.getStatusCode() === 400 && data4.field === 'chassisNumber' && data4.message === 'This chassis/VIN number is already registered to another vehicle.') {
      console.log('  [PASS] Blocked duplicate chassisNumber:', data4.message);
    } else {
      throw new Error(`Test 4 Failed: Expected 400 chassis error, got ${res4.getStatusCode()}: ${JSON.stringify(data4)}`);
    }

    // ----------------------------------------------------
    // TEST 5: Reject duplicate engine number -> REJECT
    // ----------------------------------------------------
    console.log('\nTest 5: Reject duplicate engine number ("engtest0001") -> REJECT');
    const { req: req5, res: res5 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 AB 1234',
      brand: 'Hyundai',
      model: 'i20',
      manufacturingYear: 2022,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2022-03-10',
      engineNumber: '  engtest0001  ', // Duplicate of Vehicle A in lowercase + spaces
      currentOdometerReading: 12000,
      purchaseType: 'Used'
    });
    await createVehicle(req5, res5);
    const data5 = res5.getResponseData();
    if (res5.getStatusCode() === 400 && data5.field === 'engineNumber' && data5.message === 'This engine number is already registered to another vehicle.') {
      console.log('  [PASS] Blocked duplicate engineNumber:', data5.message);
    } else {
      throw new Error(`Test 5 Failed: Expected 400 engine error, got ${res5.getStatusCode()}: ${JSON.stringify(data5)}`);
    }

    // ----------------------------------------------------
    // TEST 6: Reject duplicate insurance policy number -> REJECT
    // ----------------------------------------------------
    console.log('\nTest 6: Reject duplicate insurance policy number ("poltest0001") -> REJECT');
    const { req: req6, res: res6 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 AB 1234',
      brand: 'Hyundai',
      model: 'i20',
      manufacturingYear: 2022,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2022-03-10',
      insuranceNumber: '  poltest0001  ', // Duplicate of Vehicle A in lowercase + spaces
      currentOdometerReading: 12000,
      purchaseType: 'Used'
    });
    await createVehicle(req6, res6);
    const data6 = res6.getResponseData();
    if (res6.getStatusCode() === 400 && data6.field === 'insuranceNumber' && data6.message === 'This insurance policy number is already registered to another vehicle.') {
      console.log('  [PASS] Blocked duplicate insuranceNumber:', data6.message);
    } else {
      throw new Error(`Test 6 Failed: Expected 400 insurance error, got ${res6.getStatusCode()}: ${JSON.stringify(data6)}`);
    }

    // ----------------------------------------------------
    // TEST 7: Multiple vehicles with empty/undefined optional fields -> ALLOW
    // ----------------------------------------------------
    console.log('\nTest 7: Multiple vehicles with empty optional fields (chassis, engine, insurance) -> ALLOW');
    const { req: req7a, res: res7a } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 CD 3333',
      brand: 'Tata',
      model: 'Punch',
      manufacturingYear: 2023,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2023-02-14',
      chassisNumber: '',
      engineNumber: '',
      insuranceNumber: '',
      currentOdometerReading: 5000,
      purchaseType: 'Used'
    });
    await createVehicle(req7a, res7a);
    const v7a = res7a.getResponseData();
    if (res7a.getStatusCode() === 201 && v7a?._id) cleanupIds.push(v7a._id);

    const { req: req7b, res: res7b } = mockReqRes({
      customerId,
      vehicleNumber: 'KA 20 CD 4444',
      brand: 'Tata',
      model: 'Nexon',
      manufacturingYear: 2023,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      registrationDate: '2023-03-15',
      chassisNumber: undefined,
      engineNumber: undefined,
      insuranceNumber: undefined,
      currentOdometerReading: 8000,
      purchaseType: 'Used'
    });
    await createVehicle(req7b, res7b);
    const v7b = res7b.getResponseData();
    if (res7b.getStatusCode() === 201 && v7b?._id) cleanupIds.push(v7b._id);

    if (res7a.getStatusCode() === 201 && res7b.getStatusCode() === 201) {
      console.log('  [PASS] Both vehicles registered successfully with empty optional identifiers.');
    } else {
      throw new Error(`Test 7 Failed: 7a status ${res7a.getStatusCode()}, 7b status ${res7b.getStatusCode()}`);
    }

    // ----------------------------------------------------
    // TEST 8: Edit a vehicle retaining its own identifiers -> ALLOW
    // ----------------------------------------------------
    console.log('\nTest 8: Edit Vehicle A while keeping its own identifiers -> ALLOW');
    const { req: req8, res: res8 } = mockReqRes({
      vehicleNumber: 'KA 20 ZZ 9001', // Keeps own number
      chassisNumber: 'VINTEST0000000001',
      engineNumber: 'ENGTEST0001',
      insuranceNumber: 'POLTEST0001',
      brand: 'Toyota Updated',
      currentOdometerReading: 16000
    }, { id: v1._id.toString() });
    await updateVehicle(req8, res8);
    const v8 = res8.getResponseData();
    if (res8.getStatusCode() === 200 && v8.brand === 'Toyota Updated') {
      console.log('  [PASS] Vehicle A updated successfully while retaining its own identifiers.');
    } else {
      throw new Error(`Test 8 Failed: Expected 200, got ${res8.getStatusCode()}: ${JSON.stringify(v8)}`);
    }

    // ----------------------------------------------------
    // TEST 9: Edit a vehicle using another vehicle's number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 9: Edit Vehicle 7a and attempt to take Vehicle A\'s number -> BLOCK');
    const { req: req9, res: res9 } = mockReqRes({
      vehicleNumber: 'KA20ZZ9001' // Belongs to Vehicle A
    }, { id: v7a._id.toString() });
    await updateVehicle(req9, res9);
    const d9 = res9.getResponseData();
    if (res9.getStatusCode() === 400 && d9.field === 'vehicleNumber' && d9.message === 'This vehicle registration number is already registered.') {
      console.log('  [PASS] Blocked changing vehicleNumber to Vehicle A\'s number.');
    } else {
      throw new Error(`Test 9 Failed: Expected 400, got ${res9.getStatusCode()}: ${JSON.stringify(d9)}`);
    }

    // ----------------------------------------------------
    // TEST 10: Edit a vehicle changing to non-KA 20 number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 10: Edit Vehicle 7a and attempt to change to non-KA 20 number ("MH12AB1234") -> BLOCK');
    const { req: req10, res: res10 } = mockReqRes({
      vehicleNumber: 'MH12AB1234'
    }, { id: v7a._id.toString() });
    await updateVehicle(req10, res10);
    const d10 = res10.getResponseData();
    if (res10.getStatusCode() === 400 && d10.field === 'vehicleNumber' && d10.message === 'Only KA 20 registered vehicles are allowed.') {
      console.log('  [PASS] Blocked updating vehicleNumber to non-KA 20 number.');
    } else {
      throw new Error(`Test 10 Failed: Expected 400, got ${res10.getStatusCode()}: ${JSON.stringify(d10)}`);
    }

    // ----------------------------------------------------
    // TEST 11: Normalization test: ka20eh9999 -> stored and formatted -> SUCCESS
    // ----------------------------------------------------
    console.log('\nTest 11: Normalization test with lowercase input ("ka20ab9999") -> SUCCESS');
    const { req: req11, res: res11 } = mockReqRes({
      customerId,
      vehicleNumber: 'ka20ab9999',
      brand: 'Maruti',
      model: 'Swift',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-04-12',
      currentOdometerReading: 18000,
      purchaseType: 'Used'
    });
    await createVehicle(req11, res11);
    const v11 = res11.getResponseData();
    if (res11.getStatusCode() === 201 && v11?._id) {
      cleanupIds.push(v11._id);
      if (v11.vehicleNumber === 'KA 20 AB 9999' && v11.normalizedVehicleNumber === 'KA20AB9999') {
        console.log('  [PASS] Successfully normalized "ka20ab9999" -> vehicleNumber:', v11.vehicleNumber, 'normalizedVehicleNumber:', v11.normalizedVehicleNumber);
      } else {
        throw new Error(`Test 11 Failed: Unexpected vehicle format: ${JSON.stringify(v11)}`);
      }
    } else {
      throw new Error(`Test 11 Failed: Status ${res11.getStatusCode()}: ${JSON.stringify(v11)}`);
    }

    console.log('\n=== ALL 11 TESTS PASSED SUCCESSFULLY! (100% SUCCESS) ===\n');
  } finally {
    // Clean up test records created during testing
    console.log('Cleaning up test records...');
    if (cleanupIds.length > 0) {
      const deleteResult = await Vehicle.deleteMany({ _id: { $in: cleanupIds } });
      console.log(`Cleaned up ${deleteResult.deletedCount} temporary test vehicle records.`);
    }
    await mongoose.connection.close();
  }
};

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nTEST RUN FAILED:', err);
    process.exit(1);
  });
