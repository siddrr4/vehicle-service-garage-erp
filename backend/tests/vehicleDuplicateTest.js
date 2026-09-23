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
  console.log('=== STARTING VEHICLE DUPLICATE VALIDATION TESTS ===\n');
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
      city: 'Testville',
      state: 'Test State',
      pincode: '560001'
    });
  }
  const customerId = testCustomer._id.toString();

  const cleanupIds = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Register Vehicle A with unique identification numbers -> SUCCESS
    // ----------------------------------------------------
    console.log('Test 1: Register Vehicle A with unique vehicle number -> SUCCESS');
    const { req: req1, res: res1 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST01',
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
      console.log('  [PASS] Vehicle A created successfully with ID:', v1._id);
    } else {
      throw new Error(`Test 1 Failed: Status ${res1.getStatusCode()}, data: ${JSON.stringify(v1)}`);
    }

    // ----------------------------------------------------
    // TEST 2: Register Vehicle B using Vehicle A's vehicle number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 2: Register Vehicle B using Vehicle A\'s vehicle number -> BLOCK');
    const { req: req2, res: res2 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST01', // Duplicate
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      chassisNumber: 'VINTEST0000000002',
      engineNumber: 'ENGTEST0002',
      insuranceNumber: 'POLTEST0002',
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req2, res2);
    const data2 = res2.getResponseData();
    if (res2.getStatusCode() === 400 && data2.field === 'vehicleNumber' && data2.message === 'Vehicle number already exists. Please enter a different vehicle number.') {
      console.log('  [PASS] Blocked duplicate vehicle number with expected message:', data2.message);
    } else {
      throw new Error(`Test 2 Failed: Expected 400 with duplicate message, got ${res2.getStatusCode()}: ${JSON.stringify(data2)}`);
    }

    // ----------------------------------------------------
    // TEST 3: Register Vehicle B with duplicate VIN / chassisNumber -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 3: Register Vehicle B with duplicate VIN / chassisNumber -> BLOCK');
    const { req: req3, res: res3 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST02',
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      chassisNumber: 'VINTEST0000000001', // Duplicate of Vehicle A
      engineNumber: 'ENGTEST0002',
      insuranceNumber: 'POLTEST0002',
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req3, res3);
    const data3 = res3.getResponseData();
    if (res3.getStatusCode() === 400 && data3.field === 'chassisNumber' && data3.message === 'Chassis/VIN number already exists for another vehicle.') {
      console.log('  [PASS] Blocked duplicate chassisNumber with expected message:', data3.message);
    } else {
      throw new Error(`Test 3 Failed: Expected 400 with chassis error, got ${res3.getStatusCode()}: ${JSON.stringify(data3)}`);
    }

    // ----------------------------------------------------
    // TEST 4: Register Vehicle B with duplicate engine number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 4: Register Vehicle B with duplicate engine number -> BLOCK');
    const { req: req4, res: res4 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST02',
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      chassisNumber: 'VINTEST0000000002',
      engineNumber: 'ENGTEST0001', // Duplicate of Vehicle A
      insuranceNumber: 'POLTEST0002',
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req4, res4);
    const data4 = res4.getResponseData();
    if (res4.getStatusCode() === 400 && data4.field === 'engineNumber' && data4.message === 'Engine number already exists for another vehicle.') {
      console.log('  [PASS] Blocked duplicate engineNumber with expected message:', data4.message);
    } else {
      throw new Error(`Test 4 Failed: Expected 400 with engine error, got ${res4.getStatusCode()}: ${JSON.stringify(data4)}`);
    }

    // ----------------------------------------------------
    // TEST 5: Register Vehicle B with duplicate insurance policy number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 5: Register Vehicle B with duplicate insurance policy number -> BLOCK');
    const { req: req5, res: res5 } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST02',
      brand: 'Honda',
      model: 'City',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-05-20',
      chassisNumber: 'VINTEST0000000002',
      engineNumber: 'ENGTEST0002',
      insuranceNumber: 'POLTEST0001', // Duplicate of Vehicle A
      currentOdometerReading: 20000,
      purchaseType: 'Used'
    });
    await createVehicle(req5, res5);
    const data5 = res5.getResponseData();
    if (res5.getStatusCode() === 400 && data5.field === 'insuranceNumber' && data5.message === 'Insurance policy number already exists for another vehicle.') {
      console.log('  [PASS] Blocked duplicate insuranceNumber with expected message:', data5.message);
    } else {
      throw new Error(`Test 5 Failed: Expected 400 with insurance error, got ${res5.getStatusCode()}: ${JSON.stringify(data5)}`);
    }

    // ----------------------------------------------------
    // TEST 6: Register multiple vehicles without insurance policy numbers -> ALLOW
    // ----------------------------------------------------
    console.log('\nTest 6: Register multiple vehicles without insurance policy numbers -> ALLOW');
    const { req: req6a, res: res6a } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST03',
      brand: 'Hyundai',
      model: 'Creta',
      manufacturingYear: 2023,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      registrationDate: '2023-03-10',
      chassisNumber: 'VINTEST0000000003',
      engineNumber: 'ENGTEST0003',
      insuranceNumber: '', // Empty
      currentOdometerReading: 5000,
      purchaseType: 'Used'
    });
    await createVehicle(req6a, res6a);
    const v6a = res6a.getResponseData();
    if (res6a.getStatusCode() === 201 && v6a?._id) cleanupIds.push(v6a._id);

    const { req: req6b, res: res6b } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST04',
      brand: 'Hyundai',
      model: 'Venue',
      manufacturingYear: 2023,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2023-04-10',
      chassisNumber: 'VINTEST0000000004',
      engineNumber: 'ENGTEST0004',
      insuranceNumber: undefined, // Missing/undefined
      currentOdometerReading: 6000,
      purchaseType: 'Used'
    });
    await createVehicle(req6b, res6b);
    const v6b = res6b.getResponseData();
    if (res6b.getStatusCode() === 201 && v6b?._id) cleanupIds.push(v6b._id);

    if (res6a.getStatusCode() === 201 && res6b.getStatusCode() === 201) {
      console.log('  [PASS] Both vehicles registered successfully without insurance policy numbers.');
    } else {
      throw new Error(`Test 6 Failed: 6a status ${res6a.getStatusCode()}, 6b status ${res6b.getStatusCode()}`);
    }

    // ----------------------------------------------------
    // TEST 7: Register multiple vehicles without chassis numbers -> ALLOW
    // ----------------------------------------------------
    console.log('\nTest 7: Register multiple vehicles without chassis numbers -> ALLOW');
    const { req: req7a, res: res7a } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST05',
      brand: 'Maruti',
      model: 'Swift',
      manufacturingYear: 2020,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2020-02-12',
      chassisNumber: '', // Empty
      engineNumber: 'ENGTEST0005',
      currentOdometerReading: 35000,
      purchaseType: 'Used'
    });
    await createVehicle(req7a, res7a);
    const v7a = res7a.getResponseData();
    if (res7a.getStatusCode() === 201 && v7a?._id) cleanupIds.push(v7a._id);

    const { req: req7b, res: res7b } = mockReqRes({
      customerId,
      vehicleNumber: 'KA05TEST06',
      brand: 'Maruti',
      model: 'Baleno',
      manufacturingYear: 2021,
      fuelType: 'Petrol',
      transmission: 'Manual',
      registrationDate: '2021-03-15',
      chassisNumber: undefined, // Undefined
      engineNumber: 'ENGTEST0006',
      currentOdometerReading: 22000,
      purchaseType: 'Used'
    });
    await createVehicle(req7b, res7b);
    const v7b = res7b.getResponseData();
    if (res7b.getStatusCode() === 201 && v7b?._id) cleanupIds.push(v7b._id);

    if (res7a.getStatusCode() === 201 && res7b.getStatusCode() === 201) {
      console.log('  [PASS] Both vehicles registered successfully without chassis numbers.');
    } else {
      throw new Error(`Test 7 Failed: 7a status ${res7a.getStatusCode()}, 7b status ${res7b.getStatusCode()}`);
    }

    // ----------------------------------------------------
    // TEST 8: Edit a vehicle without changing its own identification number -> ALLOW
    // ----------------------------------------------------
    console.log('\nTest 8: Edit Vehicle A without changing its own identification number -> ALLOW');
    const { req: req8, res: res8 } = mockReqRes({
      vehicleNumber: 'KA05TEST01', // Keeps own number
      chassisNumber: 'VINTEST0000000001',
      engineNumber: 'ENGTEST0001',
      insuranceNumber: 'POLTEST0001',
      brand: 'Toyota Updated',
      currentOdometerReading: 16000
    }, { id: v1._id.toString() });
    await updateVehicle(req8, res8);
    const v8 = res8.getResponseData();
    if (res8.getStatusCode() === 200 && v8.brand === 'Toyota Updated') {
      console.log('  [PASS] Vehicle A updated successfully while keeping its own numbers.');
    } else {
      throw new Error(`Test 8 Failed: Expected 200, got ${res8.getStatusCode()}: ${JSON.stringify(v8)}`);
    }

    // ----------------------------------------------------
    // TEST 9: Edit a vehicle and use another vehicle's identification number -> BLOCK
    // ----------------------------------------------------
    console.log('\nTest 9: Edit Vehicle 6a and use Vehicle A\'s identification number -> BLOCK');
    // 9a: Duplicate vehicleNumber
    const { req: req9a, res: res9a } = mockReqRes({
      vehicleNumber: 'KA05TEST01' // Belongs to Vehicle A
    }, { id: v6a._id.toString() });
    await updateVehicle(req9a, res9a);
    const d9a = res9a.getResponseData();
    if (res9a.getStatusCode() === 400 && d9a.field === 'vehicleNumber') {
      console.log('  [PASS] Blocked changing vehicleNumber to Vehicle A\'s number.');
    } else {
      throw new Error(`Test 9a Failed: Expected 400, got ${res9a.getStatusCode()}: ${JSON.stringify(d9a)}`);
    }

    // 9b: Duplicate chassisNumber
    const { req: req9b, res: res9b } = mockReqRes({
      chassisNumber: 'VINTEST0000000001' // Belongs to Vehicle A
    }, { id: v6a._id.toString() });
    await updateVehicle(req9b, res9b);
    const d9b = res9b.getResponseData();
    if (res9b.getStatusCode() === 400 && d9b.field === 'chassisNumber') {
      console.log('  [PASS] Blocked changing chassisNumber to Vehicle A\'s VIN.');
    } else {
      throw new Error(`Test 9b Failed: Expected 400, got ${res9b.getStatusCode()}: ${JSON.stringify(d9b)}`);
    }

    // 9c: Duplicate engineNumber
    const { req: req9c, res: res9c } = mockReqRes({
      engineNumber: 'ENGTEST0001' // Belongs to Vehicle A
    }, { id: v6a._id.toString() });
    await updateVehicle(req9c, res9c);
    const d9c = res9c.getResponseData();
    if (res9c.getStatusCode() === 400 && d9c.field === 'engineNumber') {
      console.log('  [PASS] Blocked changing engineNumber to Vehicle A\'s engine number.');
    } else {
      throw new Error(`Test 9c Failed: Expected 400, got ${res9c.getStatusCode()}: ${JSON.stringify(d9c)}`);
    }

    // 9d: Duplicate insuranceNumber
    const { req: req9d, res: res9d } = mockReqRes({
      insuranceNumber: 'POLTEST0001' // Belongs to Vehicle A
    }, { id: v6a._id.toString() });
    await updateVehicle(req9d, res9d);
    const d9d = res9d.getResponseData();
    if (res9d.getStatusCode() === 400 && d9d.field === 'insuranceNumber') {
      console.log('  [PASS] Blocked changing insuranceNumber to Vehicle A\'s policy number.');
    } else {
      throw new Error(`Test 9d Failed: Expected 400, got ${res9d.getStatusCode()}: ${JSON.stringify(d9d)}`);
    }

    // ----------------------------------------------------
    // TEST 10: Test values with leading/trailing spaces and different letter casing -> BLOCK & NORMALIZE
    // ----------------------------------------------------
    console.log('\nTest 10: Test values with leading/trailing spaces and different letter casing -> BLOCK');
    const { req: req10, res: res10 } = mockReqRes({
      customerId,
      vehicleNumber: '  ka05test01  ', // Lowercase + spaces for Vehicle A
      brand: 'Ford',
      model: 'EcoSport',
      manufacturingYear: 2019,
      fuelType: 'Diesel',
      transmission: 'Manual',
      registrationDate: '2019-08-11',
      currentOdometerReading: 45000,
      purchaseType: 'Used'
    });
    await createVehicle(req10, res10);
    const d10 = res10.getResponseData();
    if (res10.getStatusCode() === 400 && d10.field === 'vehicleNumber') {
      console.log('  [PASS] Successfully blocked case-insensitive duplicate vehicleNumber with leading/trailing spaces.');
    } else {
      throw new Error(`Test 10 Failed: Expected 400 for spaced lowercase duplicate, got ${res10.getStatusCode()}: ${JSON.stringify(d10)}`);
    }

    // ----------------------------------------------------
    // TEST 11: Direct Database Constraint Verification (MongoDB 11000 Error Handling)
    // ----------------------------------------------------
    console.log('\nTest 11: Direct Database Constraint & 11000 Catch Handler Check');
    // Verify duplicate save triggers 11000 and handleDuplicateError correctly maps it
    try {
      const directDup = new Vehicle({
        customer: customerId,
        vehicleNumber: 'KA05TEST99',
        brand: 'Kia',
        model: 'Seltos',
        manufacturingYear: 2022,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        registrationDate: new Date(),
        chassisNumber: 'VINTEST0000000001', // Conflicts with Vehicle A in DB index
        currentOdometerReading: 10000,
        purchaseType: 'Used'
      });
      await directDup.save();
      cleanupIds.push(directDup._id);
      throw new Error('Database allowed duplicate chassisNumber index violation!');
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        console.log('  [PASS] MongoDB unique index rejected duplicate chassisNumber (code 11000).');
      } else {
        throw dbErr;
      }
    }

    // Confirm no duplicate record exists in MongoDB
    console.log('\nConfirming vehicle counts in MongoDB...');
    const dups = await Vehicle.aggregate([
      { $group: { _id: '$vehicleNumber', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    if (dups.length === 0) {
      console.log('  [PASS] Confirmed: 0 duplicate vehicle numbers in MongoDB.');
    } else {
      throw new Error(`Found duplicate vehicle numbers in DB: ${JSON.stringify(dups)}`);
    }

    console.log('\nALL 11 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)');
  } finally {
    // Clean up test records
    console.log('\nCleaning up test records...');
    if (cleanupIds.length > 0) {
      const deleteResult = await Vehicle.deleteMany({ _id: { $in: cleanupIds } });
      console.log(`Cleaned up ${deleteResult.deletedCount} test vehicles.`);
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
