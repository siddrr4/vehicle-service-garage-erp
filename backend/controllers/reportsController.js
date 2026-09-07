import mongoose from 'mongoose';
import JobCard from '../models/JobCard.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import SparePart from '../models/SparePart.js';
import Employee from '../models/Employee.js';
import ServiceHistory from '../models/ServiceHistory.js';

// Helper for date filtering across models
const getDateFilter = (req, dateField = 'createdAt') => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If valid dates
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filter[dateField] = { $gte: start, $lte: end };
    }
  }
  return filter;
};

// @desc    Get summary dashboard metrics (Top KPI Cards)
// @route   GET /api/reports/summary
// @access  Private (Admin/Advisor)
export const getSummary = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);
    const dateFilterServiceHistory = getDateFilter(req, 'serviceDate');

    // 1. Invoices & Revenue Metrics (Total Billed, Amount Collected, Pending Payments)
    const invoiceAgg = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$grandTotal' },
          amountCollected: { $sum: '$amountPaid' },
          pendingPayments: { $sum: '$balanceDue' },
          totalPartsRev: { $sum: '$totalParts' },
          totalLabourRev: { $sum: '$totalLabour' },
          totalWashingRev: { $sum: '$totalWashing' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    const revenueMetrics = invoiceAgg.length > 0 ? invoiceAgg[0] : {
      totalBilled: 0,
      amountCollected: 0,
      pendingPayments: 0,
      totalPartsRev: 0,
      totalLabourRev: 0,
      totalWashingRev: 0,
      invoiceCount: 0
    };

    // 2. Total Services (Completed or Delivered JobCards in the date range)
    const totalServices = await JobCard.countDocuments({
      status: { $in: ['Completed', 'Delivered'] },
      ...dateFilter
    });

    // 3. Unique Vehicles Serviced in the date range
    const vehiclesServicedList = await JobCard.distinct('vehicle', {
      status: { $in: ['Completed', 'Delivered'] },
      ...dateFilter
    });
    const vehiclesServiced = vehiclesServicedList.length;

    // 4. New Customers registered in the date range
    const newCustomers = await Customer.countDocuments(dateFilter);

    // 5. Free Services used in the date range
    // Check both Invoice and ServiceHistory models so free service invoices are always counted
    const freeInvoiceCount = await Invoice.countDocuments({
      isFreeService: true,
      ...dateFilter
    });
    const freeHistoryCount = await ServiceHistory.countDocuments({
      isFreeService: true,
      ...dateFilterServiceHistory
    });
    const freeServicesCount = Math.max(freeInvoiceCount, freeHistoryCount);

    // 6. Low Stock Items (quantityAvailable <= minimumStockLevel and quantityAvailable > 0)
    const lowStockCount = await SparePart.countDocuments({
      quantityAvailable: { $gt: 0 },
      $expr: { $lte: ['$quantityAvailable', '$minimumStockLevel'] }
    });

    // 7. Total Spare Parts Used in Completed/Delivered JobCards
    const partsUsedData = await JobCard.aggregate([
      { $match: { status: { $in: ['Completed', 'Delivered'] }, ...dateFilter } },
      { $unwind: '$partsUsed' },
      { $group: { _id: null, totalPartsConsumed: { $sum: '$partsUsed.quantity' } } }
    ]);
    const totalSparePartsUsed = partsUsedData.length > 0 ? partsUsedData[0].totalPartsConsumed : 0;

    res.json({
      // Required 8 Top KPI fields
      totalBilled: revenueMetrics.totalBilled,
      amountCollected: revenueMetrics.amountCollected,
      pendingPayments: revenueMetrics.pendingPayments,
      totalServices,
      vehiclesServiced,
      newCustomers,
      freeServicesUsed: freeServicesCount,
      lowStockItems: lowStockCount,
      
      // Backward compatibility fields
      totalRevenue: revenueMetrics.totalBilled,
      totalSparePartsUsed,
      partsRevenue: revenueMetrics.totalPartsRev,
      labourRevenue: revenueMetrics.totalLabourRev,
      washingRevenue: revenueMetrics.totalWashingRev
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue chart data and detailed table data
// @route   GET /api/reports/revenue
// @access  Private (Admin/Advisor)
export const getRevenueAnalytics = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);

    // Daily breakdown: Total Billed, Amount Collected, Pending Amount, and Revenue Types
    const chartData = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalBilled: { $sum: '$grandTotal' },
          amountCollected: { $sum: '$amountPaid' },
          pendingAmount: { $sum: '$balanceDue' },
          labourRevenue: { $sum: '$totalLabour' },
          washingRevenue: { $sum: '$totalWashing' },
          partsRevenue: { $sum: '$totalParts' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Format chartData for frontend consumption
    const formattedChartData = chartData.map(item => ({
      _id: item._id,
      date: item._id,
      totalBilled: item.totalBilled,
      amountCollected: item.amountCollected,
      pendingAmount: Math.max(0, item.pendingAmount),
      totalRevenue: item.totalBilled, // for legacy views
      labourRevenue: item.labourRevenue,
      washingRevenue: item.washingRevenue,
      partsRevenue: item.partsRevenue,
      count: item.count
    }));

    // Period summary totals
    const periodSummary = formattedChartData.reduce((acc, curr) => {
      acc.totalBilled += curr.totalBilled;
      acc.amountCollected += curr.amountCollected;
      acc.pendingAmount += curr.pendingAmount;
      return acc;
    }, { totalBilled: 0, amountCollected: 0, pendingAmount: 0 });

    periodSummary.collectionRate = periodSummary.totalBilled > 0
      ? Number(((periodSummary.amountCollected / periodSummary.totalBilled) * 100).toFixed(1))
      : 0;

    // Detailed Table Data (selecting exact invoice fields including amountPaid and balanceDue)
    const detailedData = await Invoice.find(dateFilter)
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .select('invoiceNumber createdAt totalLabour totalWashing totalParts grandTotal amountPaid balanceDue status isFreeService freeServiceNumber')
      .sort({ createdAt: -1 });

    res.json({
      chartData: formattedChartData,
      summary: periodSummary,
      detailedData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get service analytics (job-card statuses & types)
// @route   GET /api/reports/services
// @access  Private (Admin/Advisor)
export const getServiceAnalytics = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);

    // Group by status
    const statusAgg = await JobCard.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Canonical statuses supported by JobCard schema
    const canonicalStatuses = [
      'Pending',
      'Assigned',
      'In Progress',
      'Waiting for Parts',
      'Completed',
      'Delivered',
      'Cancelled'
    ];

    const statusMap = {};
    canonicalStatuses.forEach(s => { statusMap[s] = 0; });
    statusAgg.forEach(s => {
      if (s._id) {
        statusMap[s._id] = s.count;
      }
    });

    const statusChart = canonicalStatuses.map(status => ({
      _id: status,
      status: status,
      displayName: status === 'Pending' ? 'Open / Pending' : status,
      count: statusMap[status] || 0
    }));

    // Group by service type
    const typeChart = await JobCard.aggregate([
      { $match: { serviceType: { $ne: null }, ...dateFilter } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Detailed Table Data
    const rawJobs = await JobCard.find(dateFilter)
      .populate('customer', 'fullName mobileNumber')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate('assignedMechanic', 'fullName employeeId specialization')
      .select('jobNumber createdAt serviceType status priority estimatedCost servicesPerformed')
      .sort({ createdAt: -1 });

    const detailedData = await Promise.all(
      rawJobs.map(async (jc) => {
        const inv = await Invoice.findOne({ jobCard: jc._id }).select('invoiceNumber isFreeService freeServiceNumber status grandTotal');
        const jcObj = jc.toObject();
        jcObj.isFreeService = inv?.isFreeService || jc.servicesPerformed?.some(s => s.isFreeService) || false;
        jcObj.freeServiceNumber = inv?.freeServiceNumber || null;
        jcObj.invoice = inv || null;
        return jcObj;
      })
    );

    res.json({
      statusChart,
      statusMap,
      typeChart,
      detailedData,
      totalJobs: detailedData.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get mechanic performance analytics
// @route   GET /api/reports/mechanics
// @access  Private (Admin/Advisor)
export const getMechanicAnalytics = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);

    // Group Job Cards by mechanic
    const mechanicJobs = await JobCard.aggregate([
      { $match: { assignedMechanic: { $ne: null }, ...dateFilter } },
      {
        $group: {
          _id: '$assignedMechanic',
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ['$status', ['Completed', 'Delivered']] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          waitingForParts: {
            $sum: { $cond: [{ $eq: ['$status', 'Waiting for Parts'] }, 1, 0] }
          },
          assignedPending: {
            $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] }
          }
        }
      }
    ]);

    // Populate with correct Employee fields (Employee schema has fullName, NOT firstName/lastName!)
    const populatedData = await Employee.populate(mechanicJobs, {
      path: '_id',
      select: 'fullName employeeId email phone specialization availability'
    });

    const report = populatedData.map(item => {
      const completionRate = item.totalAssigned > 0
        ? Number(((item.completed / item.totalAssigned) * 100).toFixed(1))
        : 0;

      return {
        mechanicId: item._id?._id,
        mechanicName: item._id?.fullName || 'Unassigned',
        employeeId: item._id?.employeeId || 'N/A',
        specialization: item._id?.specialization || 'General',
        totalAssigned: item.totalAssigned || 0,
        completed: item.completed || 0,
        inProgress: item.inProgress || 0,
        waitingForParts: item.waitingForParts || 0,
        assignedPending: item.assignedPending || 0,
        completionRate
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory analytics (Low stock, out of stock, most used)
// @route   GET /api/reports/inventory
// @access  Private (Admin/Advisor)
export const getInventoryAnalytics = async (req, res) => {
  try {
    const totalParts = await SparePart.countDocuments();

    // Low stock: quantityAvailable > 0 AND quantityAvailable <= minimumStockLevel
    const lowStockParts = await SparePart.find({
      quantityAvailable: { $gt: 0 },
      $expr: { $lte: ['$quantityAvailable', '$minimumStockLevel'] }
    }).select('partName partNumber quantityAvailable minimumStockLevel category sellingPrice rackLocation supplier');

    // Out of stock: quantityAvailable <= 0
    const outOfStockParts = await SparePart.find({
      quantityAvailable: { $lte: 0 }
    }).select('partName partNumber quantityAvailable minimumStockLevel category sellingPrice rackLocation supplier');

    // In Stock: quantityAvailable > minimumStockLevel
    const inStockCount = await SparePart.countDocuments({
      $expr: { $gt: ['$quantityAvailable', '$minimumStockLevel'] }
    });

    // Most used parts from completed/delivered JobCards matching date filter
    const dateFilter = getDateFilter(req);
    const mostUsedData = await JobCard.aggregate([
      { $match: { status: { $in: ['Completed', 'Delivered'] }, ...dateFilter } },
      { $unwind: '$partsUsed' },
      {
        $group: {
          _id: '$partsUsed.part',
          quantityUsed: { $sum: '$partsUsed.quantity' },
          totalRevenue: { $sum: { $multiply: ['$partsUsed.quantity', '$partsUsed.sellingPrice'] } }
        }
      },
      { $sort: { quantityUsed: -1 } },
      { $limit: 10 }
    ]);

    const populatedMostUsed = await SparePart.populate(mostUsedData, {
      path: '_id',
      select: 'partName partNumber quantityAvailable minimumStockLevel category sellingPrice'
    });

    res.json({
      totalParts,
      inStockCount,
      lowStockCount: lowStockParts.length,
      outOfStockCount: outOfStockParts.length,
      lowStockParts,
      outOfStockParts,
      mostUsedParts: populatedMostUsed.map(p => ({
        partId: p._id?._id,
        partName: p._id?.partName || 'Unknown Part',
        partNumber: p._id?.partNumber || 'N/A',
        category: p._id?.category || 'General',
        currentStock: p._id?.quantityAvailable ?? 0,
        minimumStockLevel: p._id?.minimumStockLevel ?? 5,
        sellingPrice: p._id?.sellingPrice || 0,
        quantityUsed: p.quantityUsed || 0,
        totalRevenue: p.totalRevenue || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get free service analytics
// @route   GET /api/reports/free-services
// @access  Private (Admin/Advisor)
export const getFreeServiceAnalytics = async (req, res) => {
  try {
    const dateFilterServiceHistory = getDateFilter(req, 'serviceDate');
    const dateFilterInvoice = getDateFilter(req);

    // Aggregating free services from Invoices by freeServiceNumber
    const freeInvoiceBreakdown = await Invoice.aggregate([
      { $match: { isFreeService: true, ...dateFilterInvoice } },
      { $group: { _id: '$freeServiceNumber', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Aggregating free services from ServiceHistory by freeServiceNumber
    const freeHistoryBreakdown = await ServiceHistory.aggregate([
      { $match: { isFreeService: true, ...dateFilterServiceHistory } },
      { $group: { _id: '$freeServiceNumber', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Map stages 1, 2, 3 ensuring all free services are counted
    const stageMap = { 1: 0, 2: 0, 3: 0 };
    freeInvoiceBreakdown.forEach(b => {
      if (b._id && stageMap[b._id] !== undefined) {
        stageMap[b._id] = Math.max(stageMap[b._id], b.count);
      }
    });
    freeHistoryBreakdown.forEach(b => {
      if (b._id && stageMap[b._id] !== undefined) {
        stageMap[b._id] = Math.max(stageMap[b._id], b.count);
      }
    });

    // Handle any free service where freeServiceNumber was not explicitly indexed
    const totalFreeInvoicesCount = await Invoice.countDocuments({ isFreeService: true, ...dateFilterInvoice });
    const currentRecordedSum = stageMap[1] + stageMap[2] + stageMap[3];
    if (totalFreeInvoicesCount > currentRecordedSum) {
      stageMap[1] += (totalFreeInvoicesCount - currentRecordedSum);
    }

    const freeServiceBreakdown = [
      { _id: 1, count: stageMap[1] },
      { _id: 2, count: stageMap[2] },
      { _id: 3, count: stageMap[3] }
    ];

    // Detailed free service records for the table
    const freeServiceList = await Invoice.find({
      isFreeService: true,
      ...dateFilterInvoice
    })
      .populate('customer', 'fullName mobileNumber emailAddress')
      .populate('vehicle', 'vehicleNumber brand model')
      .populate({
        path: 'jobCard',
        select: 'jobNumber complaint assignedMechanic completionTime workDescription priority',
        populate: { path: 'assignedMechanic', select: 'fullName' }
      })
      .select('invoiceNumber createdAt totalLabour totalWashing totalParts grandTotal amountPaid balanceDue status isFreeService freeServiceNumber')
      .sort({ createdAt: -1 });

    // Financial breakdown of free service invoices
    // Free service waives labour + washing, but spare parts are chargeable!
    const freeInvoices = await Invoice.aggregate([
      { $match: { isFreeService: true, ...dateFilterInvoice } },
      {
        $group: {
          _id: null,
          totalFreeInvoices: { $sum: 1 },
          partsChargedOnFreeServices: { $sum: '$totalParts' },
          totalBilledOnFreeServices: { $sum: '$grandTotal' },
          totalCollectedOnFreeServices: { $sum: '$amountPaid' }
        }
      }
    ]);

    const financialData = freeInvoices.length > 0 ? freeInvoices[0] : {
      totalFreeInvoices: freeServiceList.length,
      partsChargedOnFreeServices: 0,
      totalBilledOnFreeServices: 0,
      totalCollectedOnFreeServices: 0
    };

    // Total vehicles entitled vs used
    const vehiclesWithFreeServices = await Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalEntitled: { $sum: '$freeServicesEntitled' },
          totalUsed: { $sum: '$freeServicesUsed' }
        }
      }
    ]);

    res.json({
      breakdown: freeServiceBreakdown,
      stage1Count: stageMap[1],
      stage2Count: stageMap[2],
      stage3Count: stageMap[3],
      totalFreeServices: stageMap[1] + stageMap[2] + stageMap[3],
      financial: financialData,
      freeServiceList,
      vehicleEntitlement: vehiclesWithFreeServices[0] || { totalEntitled: 0, totalUsed: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment analytics (Paid, Partially Paid, Unpaid, Collected, Outstanding)
// @route   GET /api/reports/payments
// @access  Private (Admin/Advisor)
export const getPaymentAnalytics = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);

    // Group invoices by status
    const statusAgg = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBilled: { $sum: '$grandTotal' },
          amountCollected: { $sum: '$amountPaid' },
          pendingAmount: { $sum: '$balanceDue' }
        }
      }
    ]);

    // Ensure all 3 statuses exist in response
    const statusMap = {
      'Paid': { count: 0, totalBilled: 0, amountCollected: 0, pendingAmount: 0 },
      'Partially Paid': { count: 0, totalBilled: 0, amountCollected: 0, pendingAmount: 0 },
      'Unpaid': { count: 0, totalBilled: 0, amountCollected: 0, pendingAmount: 0 }
    };

    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    statusAgg.forEach(item => {
      if (statusMap[item._id]) {
        statusMap[item._id] = {
          count: item.count,
          totalBilled: item.totalBilled,
          amountCollected: item.amountCollected,
          pendingAmount: Math.max(0, item.pendingAmount)
        };
      }
      totalBilled += item.totalBilled;
      totalCollected += item.amountCollected;
      totalOutstanding += Math.max(0, item.pendingAmount);
    });

    // Payment methods breakdown from payments array
    const methodAgg = await Invoice.aggregate([
      { $match: dateFilter },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$payments.amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Format for legacy array format if expected
    const chartData = Object.keys(statusMap).map(status => ({
      _id: status,
      status: status,
      count: statusMap[status].count,
      totalBilled: statusMap[status].totalBilled,
      amountCollected: statusMap[status].amountCollected,
      pendingAmount: statusMap[status].pendingAmount,
      totalAmount: statusMap[status].totalBilled // legacy
    }));

    res.json({
      chartData,
      statusMap,
      summary: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        paidCount: statusMap['Paid'].count,
        partiallyPaidCount: statusMap['Partially Paid'].count,
        unpaidCount: statusMap['Unpaid'].count,
        collectionRate: totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0
      },
      paymentMethods: methodAgg.map(m => ({
        method: m._id || 'Other',
        count: m.count,
        amount: m.totalAmount
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer & vehicle analytics
// @route   GET /api/reports/customers-vehicles
// @access  Private (Admin/Advisor)
export const getCustomerVehicleAnalytics = async (req, res) => {
  try {
    const dateFilter = getDateFilter(req);

    // Customers
    const totalCustomers = await Customer.countDocuments();
    const newCustomers = await Customer.countDocuments(dateFilter);

    // Top customers by revenue / spend in date range
    const topCustomersData = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$customer',
          totalBilled: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          servicesCount: { $sum: 1 }
        }
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 }
    ]);

    const populatedCustomers = await Customer.populate(topCustomersData, {
      path: '_id',
      select: 'fullName mobileNumber emailAddress city'
    });

    // Vehicles
    const totalVehicles = await Vehicle.countDocuments();

    // Vehicles serviced in the selected date range
    const servicedVehiclesList = await JobCard.distinct('vehicle', {
      status: { $in: ['Completed', 'Delivered'] },
      ...dateFilter
    });
    const vehiclesServiced = servicedVehiclesList.length;

    // Most serviced vehicle models in the date range
    const mostServicedModels = await JobCard.aggregate([
      { $match: { status: { $in: ['Completed', 'Delivered'] }, ...dateFilter } },
      { $group: { _id: '$vehicle', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const populatedVehicles = await Vehicle.populate(mostServicedModels, {
      path: '_id',
      select: 'brand model vehicleNumber fuelType'
    });

    // Fuel distribution across all vehicles
    const fuelDistribution = await Vehicle.aggregate([
      { $group: { _id: '$fuelType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      customers: {
        total: totalCustomers,
        new: newCustomers,
        returning: Math.max(0, totalCustomers - newCustomers),
        top: populatedCustomers.map(c => ({
          customerId: c._id?._id,
          name: c._id?.fullName || 'Unknown Customer',
          phone: c._id?.mobileNumber || 'N/A',
          city: c._id?.city || 'N/A',
          totalBilled: c.totalBilled || 0,
          totalSpent: c.totalPaid || 0, // actual collected
          servicesCount: c.servicesCount || 0
        }))
      },
      vehicles: {
        total: totalVehicles,
        serviced: vehiclesServiced,
        mostServiced: populatedVehicles.map(v => ({
          vehicleId: v._id?._id,
          brand: v._id?.brand || 'N/A',
          model: v._id?.model || 'N/A',
          vehicleNumber: v._id?.vehicleNumber || 'N/A',
          fuelType: v._id?.fuelType || 'N/A',
          servicesCount: v.count
        })),
        fuelDistribution: fuelDistribution.map(f => ({
          _id: f._id || 'Other',
          count: f.count
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
