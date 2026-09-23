import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import SparePart from './models/SparePart.js';
import { updateSparePart, createSparePart, getSpareParts } from './controllers/sparePartController.js';
import { formatStockLastUpdated, formatDateTimeIST } from './utils/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' TEST SUITE: STOCK LAST UPDATED TIMESTAMP & RUPEE FORMATTING   ');
  console.log('================================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, testNum, description, details = '') {
    if (condition) {
      console.log(`[PASS] Test ${testNum}: ${description}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${testNum}: ${description}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  let createdTestPartId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Create a spare part with initial stock -> stockLastUpdated is created
    // -------------------------------------------------------------------------
    const uniquePartName = `Test Stock Part ${Date.now()}`;
    const newPart = new SparePart({
      partName: uniquePartName,
      category: 'Brake System',
      compatibleVehicleBrands: ['Universal'],
      manufacturer: 'Bosch Test',
      unitPrice: 1500,
      sellingPrice: 2200,
      quantityAvailable: 10,
      minimumStockLevel: 3,
      rackLocation: 'Rack T-01',
      supplier: 'Test Supplier',
      warranty: '1 Year',
      gstPercent: 18,
    });

    const savedPart = await newPart.save();
    createdTestPartId = savedPart._id;

    assert(
      savedPart.stockLastUpdated instanceof Date && !isNaN(savedPart.stockLastUpdated.getTime()),
      1,
      'Create a spare part with initial stock -> stockLastUpdated is created',
      `Part ID: ${savedPart._id}, Initial stockLastUpdated: ${savedPart.stockLastUpdated.toISOString()}`
    );

    const initialTimestamp = new Date(savedPart.stockLastUpdated).getTime();

    // Small delay to ensure timestamp comparison advances
    await sleep(1100);

    // -------------------------------------------------------------------------
    // TEST 2: Increase stock -> timestamp changes
    // -------------------------------------------------------------------------
    let mockReq = {
      params: { id: createdTestPartId.toString() },
      body: { quantityAvailable: 15 },
      user: { email: 'admin@garage.com' },
    };
    let mockResData = null;
    let mockRes = {
      json: (data) => {
        mockResData = data;
      },
      status: () => mockRes,
    };

    await updateSparePart(mockReq, mockRes);
    const partAfterIncrease = await SparePart.findById(createdTestPartId);
    const increaseTimestamp = new Date(partAfterIncrease.stockLastUpdated).getTime();

    assert(
      partAfterIncrease.quantityAvailable === 15 && increaseTimestamp > initialTimestamp,
      2,
      'Increase stock (10 -> 15) -> stockLastUpdated timestamp changes',
      `Before: ${new Date(initialTimestamp).toISOString()} -> After: ${new Date(increaseTimestamp).toISOString()}`
    );

    await sleep(1100);

    // -------------------------------------------------------------------------
    // TEST 3: Decrease stock -> timestamp changes
    // -------------------------------------------------------------------------
    mockReq = {
      params: { id: createdTestPartId.toString() },
      body: { quantityAvailable: 12 },
      user: { email: 'admin@garage.com' },
    };
    await updateSparePart(mockReq, mockRes);
    const partAfterDecrease = await SparePart.findById(createdTestPartId);
    const decreaseTimestamp = new Date(partAfterDecrease.stockLastUpdated).getTime();

    assert(
      partAfterDecrease.quantityAvailable === 12 && decreaseTimestamp > increaseTimestamp,
      3,
      'Decrease stock (15 -> 12) -> stockLastUpdated timestamp changes',
      `Before: ${new Date(increaseTimestamp).toISOString()} -> After: ${new Date(decreaseTimestamp).toISOString()}`
    );

    await sleep(1100);

    // -------------------------------------------------------------------------
    // TEST 4: Stock reaches 0 -> timestamp changes & status updates
    // -------------------------------------------------------------------------
    mockReq = {
      params: { id: createdTestPartId.toString() },
      body: { quantityAvailable: 0 },
      user: { email: 'admin@garage.com' },
    };
    await updateSparePart(mockReq, mockRes);
    const partAtZero = await SparePart.findById(createdTestPartId);
    const zeroTimestamp = new Date(partAtZero.stockLastUpdated).getTime();

    assert(
      partAtZero.quantityAvailable === 0 &&
      partAtZero.status === 'Out of Stock' &&
      zeroTimestamp > decreaseTimestamp,
      4,
      'Stock reaches 0 -> timestamp changes and status updates to Out of Stock',
      `Quantity: ${partAtZero.quantityAvailable}, Status: ${partAtZero.status}, Timestamp: ${new Date(zeroTimestamp).toISOString()}`
    );

    await sleep(1100);

    // -------------------------------------------------------------------------
    // TEST 5: Edit only part name -> stockLastUpdated does NOT change
    // -------------------------------------------------------------------------
    const beforeEditTimestamp = new Date(partAtZero.stockLastUpdated).getTime();
    mockReq = {
      params: { id: createdTestPartId.toString() },
      body: {
        partName: `${uniquePartName} Renamed`,
        manufacturer: 'Bosch Premium',
        supplier: 'New Supplier LLC',
        warranty: '2 Years',
      },
      user: { email: 'admin@garage.com' },
    };
    await updateSparePart(mockReq, mockRes);
    const partAfterMetadataEdit = await SparePart.findById(createdTestPartId);
    const afterMetadataTimestamp = new Date(partAfterMetadataEdit.stockLastUpdated).getTime();

    assert(
      partAfterMetadataEdit.partName.includes('Renamed') &&
      afterMetadataTimestamp === beforeEditTimestamp,
      5,
      'Edit only metadata (part name, manufacturer, supplier, warranty) -> stockLastUpdated does NOT change',
      `Before: ${new Date(beforeEditTimestamp).toISOString()} == After: ${new Date(afterMetadataTimestamp).toISOString()}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Refresh Inventory page / API fetch -> timestamp remains actual stock-update time
    // -------------------------------------------------------------------------
    let apiFetchedParts = null;
    const reqQuery = {
      query: { keyword: uniquePartName },
    };
    const resQuery = {
      json: (data) => {
        apiFetchedParts = data;
      },
      status: () => resQuery,
    };
    await getSpareParts(reqQuery, resQuery);

    const fetchedItem = apiFetchedParts?.spareParts?.find((p) => p._id.toString() === createdTestPartId.toString());
    const fetchedTimestamp = new Date(fetchedItem?.stockLastUpdated).getTime();

    assert(
      fetchedItem && fetchedTimestamp === beforeEditTimestamp,
      6,
      'API fetch returns persisted stockLastUpdated timestamp without recalculating',
      `Persisted timestamp: ${new Date(fetchedTimestamp).toISOString()}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Display timestamp in IST
    // -------------------------------------------------------------------------
    const sampleDate = new Date('2026-09-23T10:35:00+05:30');
    const formattedIST = formatStockLastUpdated(sampleDate);

    // Format should contain "23", "Sep" or "Sept", "2026", "10:35", "AM"
    const hasDay = formattedIST.includes('23');
    const hasMonth = /Sep/i.test(formattedIST);
    const hasYear = formattedIST.includes('2026');
    const hasTime = formattedIST.includes('10:35');
    const hasAM = formattedIST.includes('AM');

    assert(
      hasDay && hasMonth && hasYear && hasTime && hasAM,
      7,
      'Display timestamp in IST with proper formatting',
      `Sample 2026-09-23T10:35:00+05:30 formatted to: "${formattedIST}"`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Inventory Value uses ₹ instead of $
    // -------------------------------------------------------------------------
    const inventoryListFile = path.resolve(__dirname, '../frontend/src/pages/Inventory/InventoryList.jsx');
    const inventoryListContent = fs.readFileSync(inventoryListFile, 'utf8');

    const hasFaRupeeSignImport = inventoryListContent.includes('FaRupeeSign');
    const hasNoFaDollarSign = !inventoryListContent.includes('FaDollarSign');
    const hasRupeeInventoryValue = inventoryListContent.includes('<FaRupeeSign');

    assert(
      hasFaRupeeSignImport && hasNoFaDollarSign && hasRupeeInventoryValue,
      8,
      'Inventory Value card uses ₹ icon (FaRupeeSign) instead of $ (FaDollarSign)',
      `FaRupeeSign imported: ${hasFaRupeeSignImport}, FaDollarSign eliminated: ${hasNoFaDollarSign}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Selling price uses ₹
    // -------------------------------------------------------------------------
    const hasRupeeSellingPrice = inventoryListContent.includes('₹{Number(part.sellingPrice') ||
      inventoryListContent.includes('₹${Number(part.sellingPrice');

    assert(
      hasRupeeSellingPrice,
      9,
      'Selling price uses ₹ and Indian comma formatting',
      `Found sellingPrice ₹ template in InventoryList.jsx: ${hasRupeeSellingPrice}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Cost price uses ₹
    // -------------------------------------------------------------------------
    const hasRupeeCostPrice = inventoryListContent.includes('Cost: ₹${Number(part.unitPrice') ||
      inventoryListContent.includes('Cost: ₹{Number(part.unitPrice');

    assert(
      hasRupeeCostPrice,
      10,
      'Cost price uses ₹ and Indian comma formatting',
      `Found unitPrice Cost: ₹ template in InventoryList.jsx: ${hasRupeeCostPrice}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Stock Levels column displays "Last Updated: <timestamp>"
    // -------------------------------------------------------------------------
    const hasLastUpdatedInTable = inventoryListContent.includes('Last Updated:') &&
      inventoryListContent.includes('formatStockLastUpdated');

    assert(
      hasLastUpdatedInTable,
      11,
      'Stock Levels column renders Last Updated timestamp beneath status badge',
      `Found Last Updated label and formatStockLastUpdated in Stock Levels column: ${hasLastUpdatedInTable}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Indian number formatting works correctly
    // -------------------------------------------------------------------------
    const val1 = Number(1000).toLocaleString('en-IN');
    const val2 = Number(10000).toLocaleString('en-IN');
    const val3 = Number(100000).toLocaleString('en-IN');
    const val4 = Number(745340).toLocaleString('en-IN');

    const fmtCorrect = val1 === '1,000' && val2 === '10,000' && val3 === '1,00,000' && val4 === '7,45,340';

    assert(
      fmtCorrect,
      12,
      'Indian number formatting conforms to en-IN standards (lakhs & crores)',
      `1000 -> ₹${val1}, 10000 -> ₹${val2}, 100000 -> ₹${val3}, 745340 -> ₹${val4}`
    );

  } catch (err) {
    console.error('Unexpected error in test suite:', err);
  } finally {
    // Clean up created test part
    if (createdTestPartId) {
      await SparePart.deleteOne({ _id: createdTestPartId });
    }
    await mongoose.disconnect();
    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
