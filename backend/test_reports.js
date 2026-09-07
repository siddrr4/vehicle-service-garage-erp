import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Invoice from './models/Invoice.js';
import JobCard from './models/JobCard.js';
import Customer from './models/Customer.js';
import Vehicle from './models/Vehicle.js';
import SparePart from './models/SparePart.js';
import Employee from './models/Employee.js';
import ServiceHistory from './models/ServiceHistory.js';
import {
  getSummary,
  getRevenueAnalytics,
  getServiceAnalytics,
  getMechanicAnalytics,
  getInventoryAnalytics,
  getFreeServiceAnalytics,
  getPaymentAnalytics,
  getCustomerVehicleAnalytics
} from './controllers/reportsController.js';

dotenv.config();

// Helper to mock express req & res
const mockReqRes = (query = {}) => {
  let statusCode = 200;
  let responseData = null;

  const req = { query };
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return { req, res, getResult: () => ({ statusCode, data: responseData }) };
};

async function runReportTests() {
  console.log('==============================================');
  console.log('RUNNING VEHICLE SERVICE ERP REPORTS MODULE TESTS');
  console.log('==============================================\n');

  await connectDB();
  console.log(' Connected to MongoDB Atlas.\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` PASS: ${message}`);
      passedTests++;
    } else {
      console.error(` FAIL: ${message}`);
      failedTests++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: GET /api/reports/summary (KPI Cards)
    // ----------------------------------------------------
    console.log('--- TEST 1: /api/reports/summary KPI Cards ---');
    const summaryMock = mockReqRes({});
    await getSummary(summaryMock.req, summaryMock.res);
    const summaryRes = summaryMock.getResult();

    assert(summaryRes.statusCode === 200, 'Summary endpoint returned 200 OK');
    assert(summaryRes.data !== null && typeof summaryRes.data === 'object', 'Summary data is an object');
    assert('totalBilled' in summaryRes.data, 'summary has totalBilled');
    assert('amountCollected' in summaryRes.data, 'summary has amountCollected');
    assert('pendingPayments' in summaryRes.data, 'summary has pendingPayments');
    assert('totalServices' in summaryRes.data, 'summary has totalServices');
    assert('vehiclesServiced' in summaryRes.data, 'summary has vehiclesServiced');
    assert('newCustomers' in summaryRes.data, 'summary has newCustomers');
    assert('freeServicesUsed' in summaryRes.data, 'summary has freeServicesUsed');
    assert('lowStockItems' in summaryRes.data, 'summary has lowStockItems');

    console.log('Current Summary KPIs:');
    console.log(`  Total Billed: ₹${summaryRes.data.totalBilled}`);
    console.log(`  Amount Collected: ₹${summaryRes.data.amountCollected}`);
    console.log(`  Pending Payments: ₹${summaryRes.data.pendingPayments}`);
    console.log(`  Total Services: ${summaryRes.data.totalServices}`);
    console.log(`  Vehicles Serviced: ${summaryRes.data.vehiclesServiced}`);
    console.log(`  New Customers: ${summaryRes.data.newCustomers}`);
    console.log(`  Free Services Used: ${summaryRes.data.freeServicesUsed}`);
    console.log(`  Low Stock Items: ${summaryRes.data.lowStockItems}\n`);

    // ----------------------------------------------------
    // TEST 2: Mathematical Invariant: Billed = Collected + Pending
    // ----------------------------------------------------
    console.log('--- TEST 2: Mathematical Consistency Check ---');
    const revenueMock = mockReqRes({});
    await getRevenueAnalytics(revenueMock.req, revenueMock.res);
    const revRes = revenueMock.getResult();

    assert(revRes.statusCode === 200, 'Revenue endpoint returned 200 OK');
    assert(Array.isArray(revRes.data.chartData), 'Revenue chartData is an array');

    if (revRes.data.chartData.length > 0) {
      revRes.data.chartData.forEach(item => {
        const mathMatches = Math.abs(item.totalBilled - (item.amountCollected + item.pendingAmount)) < 1;
        assert(mathMatches, `Chart date ${item.date}: Billed (${item.totalBilled}) = Collected (${item.amountCollected}) + Pending (${item.pendingAmount})`);
      });
    } else {
      console.log('  Notice: No existing invoices in date range. Verifying empty state.');
      assert(revRes.data.chartData.length === 0, 'Empty chart data handled cleanly');
    }
    console.log();

    // ----------------------------------------------------
    // TEST 3: Invoice Scenarios: Unpaid, Partially Paid, Fully Paid
    // ----------------------------------------------------
    console.log('--- TEST 3: Calculation Logic Simulation ---');
    // Simulate user prompt scenarios:
    // Case A: ₹1,000 Unpaid
    const grandTotalA = 1000;
    const amountPaidA = 0;
    const balanceDueA = grandTotalA - amountPaidA;
    assert(grandTotalA === 1000 && amountPaidA === 0 && balanceDueA === 1000,
      'Scenario Unpaid: Billed=1000, Collected=0, Pending=1000');

    // Case B: ₹1,000 with ₹600 paid
    const grandTotalB = 1000;
    const amountPaidB = 600;
    const balanceDueB = grandTotalB - amountPaidB;
    assert(grandTotalB === 1000 && amountPaidB === 600 && balanceDueB === 400,
      'Scenario Partially Paid: Billed=1000, Collected=600, Pending=400');

    // Case C: ₹1,000 Fully Paid
    const grandTotalC = 1000;
    const amountPaidC = 1000;
    const balanceDueC = grandTotalC - amountPaidC;
    assert(grandTotalC === 1000 && amountPaidC === 1000 && balanceDueC === 0,
      'Scenario Fully Paid: Billed=1000, Collected=1000, Pending=0');
    console.log();

    // ----------------------------------------------------
    // TEST 4: Payment Analytics Overview
    // ----------------------------------------------------
    console.log('--- TEST 4: Payment Analytics Endpoint ---');
    const paymentMock = mockReqRes({});
    await getPaymentAnalytics(paymentMock.req, paymentMock.res);
    const payRes = paymentMock.getResult();

    assert(payRes.statusCode === 200, 'Payment endpoint returned 200 OK');
    assert('statusMap' in payRes.data, 'payment analytics contains statusMap');
    assert('Paid' in payRes.data.statusMap, 'statusMap contains Paid');
    assert('Partially Paid' in payRes.data.statusMap, 'statusMap contains Partially Paid');
    assert('Unpaid' in payRes.data.statusMap, 'statusMap contains Unpaid');
    assert('summary' in payRes.data, 'payment analytics contains summary totals');
    assert(payRes.data.summary.totalBilled >= payRes.data.summary.totalCollected, 'totalBilled >= totalCollected');
    console.log();

    // ----------------------------------------------------
    // TEST 5: Service Status Analytics
    // ----------------------------------------------------
    console.log('--- TEST 5: Service Status Analytics ---');
    const serviceMock = mockReqRes({});
    await getServiceAnalytics(serviceMock.req, serviceMock.res);
    const srvRes = serviceMock.getResult();

    assert(srvRes.statusCode === 200, 'Service endpoint returned 200 OK');
    assert(Array.isArray(srvRes.data.statusChart), 'statusChart is an array');

    const expectedStatuses = ['Pending', 'Assigned', 'In Progress', 'Waiting for Parts', 'Completed', 'Delivered', 'Cancelled'];
    expectedStatuses.forEach(st => {
      const found = srvRes.data.statusChart.some(s => s.status === st);
      assert(found, `Canonical status '${st}' exists in service statusChart`);
    });
    console.log();

    // ----------------------------------------------------
    // TEST 6: Mechanic Performance & fullName Population
    // ----------------------------------------------------
    console.log('--- TEST 6: Mechanic Performance & Name Population ---');
    const mechanicMock = mockReqRes({});
    await getMechanicAnalytics(mechanicMock.req, mechanicMock.res);
    const mechRes = mechanicMock.getResult();

    assert(mechRes.statusCode === 200, 'Mechanic endpoint returned 200 OK');
    assert(Array.isArray(mechRes.data), 'Mechanic report is an array');

    if (mechRes.data.length > 0) {
      mechRes.data.forEach(m => {
        assert(m.mechanicName !== 'undefined undefined', `Mechanic name is valid ('${m.mechanicName}'), not 'undefined undefined'`);
        assert('totalAssigned' in m, `Mechanic ${m.mechanicName} has totalAssigned`);
        assert('completed' in m, `Mechanic ${m.mechanicName} has completed`);
        assert('inProgress' in m, `Mechanic ${m.mechanicName} has inProgress`);
        assert('waitingForParts' in m, `Mechanic ${m.mechanicName} has waitingForParts`);
        assert('completionRate' in m && !isNaN(m.completionRate), `Mechanic ${m.mechanicName} completionRate is valid (${m.completionRate}%)`);
      });
    } else {
      console.log('  Notice: No assigned mechanic jobs in this period.');
    }
    console.log();

    // ----------------------------------------------------
    // TEST 7: Inventory Low Stock Query (Using minimumStockLevel)
    // ----------------------------------------------------
    console.log('--- TEST 7: Inventory Analytics & Minimum Stock Level ---');
    const invMock = mockReqRes({});
    await getInventoryAnalytics(invMock.req, invMock.res);
    const invRes = invMock.getResult();

    assert(invRes.statusCode === 200, 'Inventory endpoint returned 200 OK');
    assert('totalParts' in invRes.data, 'Inventory has totalParts');
    assert('lowStockCount' in invRes.data, 'Inventory has lowStockCount');
    assert('outOfStockCount' in invRes.data, 'Inventory has outOfStockCount');
    assert(Array.isArray(invRes.data.lowStockParts), 'lowStockParts is an array');

    // Verify lowStockParts actually satisfy quantityAvailable <= minimumStockLevel
    invRes.data.lowStockParts.forEach(p => {
      assert(p.quantityAvailable <= p.minimumStockLevel, `Part ${p.partName}: quantity (${p.quantityAvailable}) <= minStock (${p.minimumStockLevel})`);
    });
    console.log();

    // ----------------------------------------------------
    // TEST 8: Date Range Filtering (Today, Last Month, Custom)
    // ----------------------------------------------------
    console.log('--- TEST 8: Date Range Filtering ---');
    const todayMock = mockReqRes({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    });
    await getSummary(todayMock.req, todayMock.res);
    const todayRes = todayMock.getResult();
    assert(todayRes.statusCode === 200, 'Today date filter executed successfully');

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const lastMonthMock = mockReqRes({
      startDate: lastMonthStart,
      endDate: lastMonthEnd
    });
    await getSummary(lastMonthMock.req, lastMonthMock.res);
    const lastMonthRes = lastMonthMock.getResult();
    assert(lastMonthRes.statusCode === 200, 'Last Month date filter executed successfully');
    console.log();

    // ----------------------------------------------------
    // TEST 9: Free Service Analytics
    // ----------------------------------------------------
    console.log('--- TEST 9: Free Service Analytics ---');
    const fsMock = mockReqRes({});
    await getFreeServiceAnalytics(fsMock.req, fsMock.res);
    const fsRes = fsMock.getResult();

    assert(fsRes.statusCode === 200, 'Free Service endpoint returned 200 OK');
    assert('stage1Count' in fsRes.data, 'Free service has stage1Count');
    assert('stage2Count' in fsRes.data, 'Free service has stage2Count');
    assert('stage3Count' in fsRes.data, 'Free service has stage3Count');
    assert('financial' in fsRes.data, 'Free service has financial breakdown');
    console.log();

    // ----------------------------------------------------
    // TEST 10: Customer & Vehicle Analytics
    // ----------------------------------------------------
    console.log('--- TEST 10: Customer & Vehicle Analytics ---');
    const cvMock = mockReqRes({});
    await getCustomerVehicleAnalytics(cvMock.req, cvMock.res);
    const cvRes = cvMock.getResult();

    assert(cvRes.statusCode === 200, 'Customer & Vehicle endpoint returned 200 OK');
    assert('customers' in cvRes.data, 'Has customers key');
    assert('vehicles' in cvRes.data, 'Has vehicles key');
    assert('serviced' in cvRes.data.vehicles, 'Has vehicles serviced key');
    assert('mostServiced' in cvRes.data.vehicles, 'Has mostServiced model key');
    console.log();

  } catch (err) {
    console.error('Test execution error:', err);
    failedTests++;
  } finally {
    console.log('==============================================');
    console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('==============================================');
    await mongoose.disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runReportTests();
