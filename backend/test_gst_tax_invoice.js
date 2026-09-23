import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Invoice from './models/Invoice.js';
import JobCard from './models/JobCard.js';
import Customer from './models/Customer.js';
import Vehicle from './models/Vehicle.js';
import SparePart from './models/SparePart.js';
import Settings from './models/Settings.js';
import {
  convertNumberToWordsINR,
  computeInvoiceTaxBreakdown,
  STATE_GST_CODES,
  getStateCode
} from './controllers/billingController.js';

dotenv.config();

const runTests = async () => {
  console.log('=== STARTING AUTOMOTIVE GST TAX INVOICE TEST SUITE ===');
  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, desc) => {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
    }
  };

  // 1. UNIT TESTS: Number to Words INR
  console.log('\n--- Test Group 1: convertNumberToWordsINR ---');
  assert(convertNumberToWordsINR(0) === 'Rupees Zero Only', 'Zero amount returns "Rupees Zero Only"');
  assert(convertNumberToWordsINR(100) === 'Rupees One Hundred Only', '100 returns "Rupees One Hundred Only"');
  assert(convertNumberToWordsINR(1474.50) === 'Rupees One Thousand Four Hundred Seventy-Four and Fifty Paise Only', '1474.50 returns exact Rupee and Paise words');
  assert(convertNumberToWordsINR(100000) === 'Rupees One Lakh Only', '100,000 returns "Rupees One Lakh Only"');
  assert(convertNumberToWordsINR(2500000) === 'Rupees Twenty-Five Lakh Only', '25,00,000 returns "Rupees Twenty-Five Lakh Only"');

  // 2. UNIT TESTS: State GST Codes
  console.log('\n--- Test Group 2: getStateCode ---');
  assert(getStateCode('Karnataka') === '29', 'Karnataka returns state code 29');
  assert(getStateCode('Maharashtra') === '27', 'Maharashtra returns state code 27');
  assert(getStateCode('Delhi') === '07', 'Delhi returns state code 07');

  // 3. UNIT TESTS: Intra-State GST Breakdown
  console.log('\n--- Test Group 3: Intra-State GST Breakdown ---');
  const intraJobCard = {
    partsUsed: [
      { quantity: 2, sellingPrice: 500, gstPercent: 18 } // Gross = 1000, Taxable = 1000, CGST 9% = 90, SGST 9% = 90, Total = 1180
    ],
    servicesPerformed: [
      { labourCharge: 600, washingCharge: 200 } // Total Labour = 800, CGST 9% = 72, SGST 9% = 72, Total = 944
    ]
  };
  const garageSettings = { state: 'Karnataka', defaultTaxGst: 18 };
  const intraCustomer = { state: 'Karnataka' };

  const intraBreakdown = computeInvoiceTaxBreakdown({
    jobCard: intraJobCard,
    customer: intraCustomer,
    settings: garageSettings,
    discount: 0,
    isFreeService: false
  });

  assert(intraBreakdown.isInterState === false, 'Intra-state flag is false');
  assert(intraBreakdown.placeOfSupply.includes('Karnataka'), 'Place of supply is Karnataka');
  assert(intraBreakdown.taxBreakup.partsTaxable === 1000, 'Parts taxable is 1000');
  assert(intraBreakdown.taxBreakup.partsCgst === 90, 'Parts CGST is 90 (9%)');
  assert(intraBreakdown.taxBreakup.partsSgst === 90, 'Parts SGST is 90 (9%)');
  assert(intraBreakdown.taxBreakup.partsIgst === 0, 'Parts IGST is 0 for intra-state');
  assert(intraBreakdown.taxBreakup.servicesTaxable === 800, 'Services taxable is 800');
  assert(intraBreakdown.taxBreakup.servicesCgst === 72, 'Services CGST is 72 (9%)');
  assert(intraBreakdown.taxBreakup.servicesSgst === 72, 'Services SGST is 72 (9%)');
  assert(intraBreakdown.taxBreakup.servicesIgst === 0, 'Services IGST is 0 for intra-state');
  assert(intraBreakdown.grandTotal === 2124, 'Grand total is 2124 (1180 + 944)');
  assert(intraBreakdown.amountInWords === 'Rupees Two Thousand One Hundred Twenty-Four Only', 'Amount in words matches grand total');

  // 4. UNIT TESTS: Inter-State GST Breakdown (IGST 100%)
  console.log('\n--- Test Group 4: Inter-State GST Breakdown ---');
  const interCustomer = { state: 'Maharashtra' };
  const interBreakdown = computeInvoiceTaxBreakdown({
    jobCard: intraJobCard,
    customer: interCustomer,
    settings: garageSettings,
    discount: 0,
    isFreeService: false
  });

  assert(interBreakdown.isInterState === true, 'Inter-state flag is true');
  assert(interBreakdown.taxBreakup.partsCgst === 0, 'Parts CGST is 0 for inter-state');
  assert(interBreakdown.taxBreakup.partsSgst === 0, 'Parts SGST is 0 for inter-state');
  assert(interBreakdown.taxBreakup.partsIgst === 180, 'Parts IGST is 180 (18%)');
  assert(interBreakdown.taxBreakup.servicesCgst === 0, 'Services CGST is 0 for inter-state');
  assert(interBreakdown.taxBreakup.servicesSgst === 0, 'Services SGST is 0 for inter-state');
  assert(interBreakdown.taxBreakup.servicesIgst === 144, 'Services IGST is 144 (18%)');
  assert(interBreakdown.grandTotal === 2124, 'Inter-state grand total is 2124');

  // 5. UNIT TESTS: Free Service Rule (First 3 services)
  console.log('\n--- Test Group 5: Free Service Rule ---');
  const freeBreakdown = computeInvoiceTaxBreakdown({
    jobCard: intraJobCard,
    customer: intraCustomer,
    settings: garageSettings,
    discount: 0,
    isFreeService: true
  });

  assert(freeBreakdown.taxBreakup.servicesTaxable === 0, 'Free service has 0 services taxable');
  assert(freeBreakdown.taxBreakup.servicesCgst === 0, 'Free service has 0 services CGST');
  assert(freeBreakdown.taxBreakup.servicesSgst === 0, 'Free service has 0 services SGST');
  assert(freeBreakdown.taxBreakup.partsTaxable === 1000, 'Free service parts remain chargeable (1000)');
  assert(freeBreakdown.grandTotal === 1180, 'Grand total reflects only parts and parts tax (1180)');

  // 6. DATABASE INTEGRATION & POPULATION TEST
  console.log('\n--- Test Group 6: Database Model Integration ---');
  try {
    await connectDB();
    console.log('  Connected to MongoDB via connectDB()');

    // Verify SparePart schema has hsnCode
    assert(SparePart.schema.paths.hsnCode !== undefined, 'SparePart schema definition has hsnCode');

    // Verify Customer schema has gstin
    assert(Customer.schema.paths.gstin !== undefined, 'Customer schema definition has gstin');

    // Verify Invoice schema has placeOfSupply, isInterState, amountInWords, taxBreakup
    assert(Invoice.schema.paths.placeOfSupply !== undefined, 'Invoice schema has placeOfSupply');
    assert(Invoice.schema.paths.isInterState !== undefined, 'Invoice schema has isInterState');
    assert(Invoice.schema.paths.amountInWords !== undefined, 'Invoice schema has amountInWords');
    assert(Invoice.schema.paths['taxBreakup.partsTaxable'] !== undefined, 'Invoice schema has taxBreakup.partsTaxable');
    assert(Invoice.schema.paths['taxBreakup.totalTaxable'] !== undefined, 'Invoice schema has taxBreakup.totalTaxable');

    // Test invoice query with populate
    const sampleInvoice = await Invoice.findOne()
      .populate('customer', 'fullName mobileNumber emailAddress address city state pincode gstin')
      .populate('vehicle', 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission')
      .populate({
        path: 'jobCard',
        populate: [
          { path: 'partsUsed.part', select: 'partName partNumber manufacturer hsnCode unitPrice sellingPrice' },
          { path: 'assignedMechanic', select: 'fullName employeeId mobileNumber' },
          { path: 'customer', select: 'fullName mobileNumber emailAddress address city state pincode gstin' },
          { path: 'vehicle', select: 'vehicleNumber brand model fuelType currentOdometerReading manufacturingYear engineNumber chassisNumber transmission' }
        ]
      });

    if (sampleInvoice) {
      assert(sampleInvoice.invoiceNumber !== undefined, `Found existing invoice ${sampleInvoice.invoiceNumber}`);
      console.log(`  Sample invoice status: ${sampleInvoice.status}, grandTotal: ₹${sampleInvoice.grandTotal}`);
    } else {
      console.log('  No existing invoices found in DB (empty table)');
    }

    await mongoose.disconnect();
  } catch (dbErr) {
    console.error('DB test error:', dbErr.message);
  }

  console.log(`\n=== TEST SUITE COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
};

runTests();
