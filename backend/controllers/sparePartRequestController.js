import SparePartRequest from '../models/SparePartRequest.js';
import SparePart from '../models/SparePart.js';
import JobCard from '../models/JobCard.js';
import Employee from '../models/Employee.js';

// @desc    Create a new spare part request by mechanic
// @route   POST /api/spare-parts-requests
// @access  Private (Mechanic/Admin/Advisor)
export const createRequest = async (req, res) => {
  try {
    const { jobCardId, partId, requestedQuantity, reason } = req.body;

    if (!jobCardId || !partId || !requestedQuantity) {
      return res.status(400).json({ message: 'Job Card, Part, and Quantity are required' });
    }

    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const part = await SparePart.findById(partId);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    // Resolve mechanic profile
    let mechanicId = jobCard.assignedMechanic;
    const employee = await Employee.findOne({
      $or: [{ userRef: req.user._id }, { email: req.user.email.toLowerCase() }]
    });
    if (employee) {
      mechanicId = employee._id;
    }

    if (!mechanicId) {
      return res.status(400).json({ message: 'No mechanic assigned or associated with this request' });
    }

    const request = new SparePartRequest({
      jobCardId,
      partId,
      requestedQuantity: parseInt(requestedQuantity, 10),
      reason,
      mechanicId,
      customerId: jobCard.customer,
      vehicleId: jobCard.vehicle,
      status: 'Pending'
    });

    const createdRequest = await request.save();
    res.status(201).json(createdRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all spare part requests with search, filter, and pagination
// @route   GET /api/spare-parts-requests
// @access  Private (Admin/Advisor/Mechanic)
export const getRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by Job Card ID
    if (req.query.jobCardId) {
      query.jobCardId = req.query.jobCardId;
    }

    // Filter by Mechanic user
    if (req.user.role === 'mechanic') {
      const employee = await Employee.findOne({
        $or: [{ userRef: req.user._id }, { email: req.user.email.toLowerCase() }]
      });
      if (employee) {
        query.mechanicId = employee._id;
      } else {
        return res.json({ requests: [], page, pages: 0, total: 0 });
      }
    }

    // Keyword Search (cross-reference fields)
    if (req.query.keyword) {
      const keyword = req.query.keyword;

      const jobCards = await JobCard.find({ jobNumber: { $regex: keyword, $options: 'i' } });
      const jobCardIds = jobCards.map(jc => jc._id);

      const parts = await SparePart.find({ partName: { $regex: keyword, $options: 'i' } });
      const partIds = parts.map(p => p._id);

      const employees = await Employee.find({ fullName: { $regex: keyword, $options: 'i' } });
      const employeeIds = employees.map(e => e._id);

      query.$or = [
        { jobCardId: { $in: jobCardIds } },
        { partId: { $in: partIds } },
        { mechanicId: { $in: employeeIds } }
      ];
    }

    const count = await SparePartRequest.countDocuments(query);
    const requests = await SparePartRequest.find(query)
      .populate('jobCardId', 'jobNumber')
      .populate('mechanicId', 'fullName')
      .populate('customerId', 'fullName')
      .populate('vehicleId', 'vehicleNumber brand model')
      .populate('partId', 'partName partNumber quantityAvailable status minimumStockLevel unitPrice sellingPrice gstPercent')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      requests,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Issue spare parts for a request
// @route   PUT /api/spare-parts-requests/:id/issue
// @access  Private (Admin/Advisor)
export const issueRequest = async (req, res) => {
  try {
    const { issuedQuantity } = req.body;
    const request = await SparePartRequest.findById(req.params.id)
      .populate('mechanicId', 'fullName')
      .populate('jobCardId', 'jobNumber');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending requests can be issued' });
    }

    const qtyToIssue = parseInt(issuedQuantity, 10) || request.requestedQuantity;
    const part = await SparePart.findById(request.partId);

    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    if (part.quantityAvailable < qtyToIssue) {
      return res.status(400).json({ message: 'Insufficient Stock' });
    }

    // 1. Deduct Stock and update Stock History
    part.quantityAvailable = Math.max(0, part.quantityAvailable - qtyToIssue);
    part.stockLastUpdated = new Date();
    part.stockHistory.push({
      action: 'Issued',
      quantity: qtyToIssue,
      mechanicName: request.mechanicId?.fullName || 'Mechanic',
      jobCardNumber: request.jobCardId?.jobNumber || 'N/A',
      performedBy: req.user.email || req.user.firstName || 'Admin',
      date: new Date()
    });
    await part.save();

    // 2. Update Job Card Parts Snapshot for Billing
    const jobCard = await JobCard.findById(request.jobCardId);
    if (jobCard) {
      const existingPartIndex = jobCard.partsUsed.findIndex(
        (p) => p.part.toString() === request.partId.toString()
      );

      if (existingPartIndex > -1) {
        jobCard.partsUsed[existingPartIndex].quantity += qtyToIssue;
      } else {
        jobCard.partsUsed.push({
          part: request.partId,
          quantity: qtyToIssue,
          unitPrice: part.unitPrice,
          sellingPrice: part.sellingPrice,
          gstPercent: part.gstPercent,
          fromRequest: true // Skip automatic Job Card completed deduction
        });
      }
      await jobCard.save();
    }

    // 3. Update request status
    request.status = 'Issued';
    request.issuedQuantity = qtyToIssue;
    request.issuedAt = new Date();
    request.issuedBy = req.user._id;
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a spare part request
// @route   PUT /api/spare-parts-requests/:id/reject
// @access  Private (Admin/Advisor)
export const rejectRequest = async (req, res) => {
  try {
    const request = await SparePartRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending requests can be rejected' });
    }

    request.status = 'Rejected';
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a return parts request by mechanic
// @route   PUT /api/spare-parts-requests/:id/return-request
// @access  Private (Mechanic/Admin/Advisor)
export const requestReturn = async (req, res) => {
  try {
    const { quantityToReturn } = req.body;
    const request = await SparePartRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Issued') {
      return res.status(400).json({ message: 'Only Issued parts can be returned' });
    }

    const qtyToReturn = parseInt(quantityToReturn, 10);
    const maxReturnable = request.issuedQuantity - request.returnedQuantity;

    if (qtyToReturn <= 0 || qtyToReturn > maxReturnable) {
      return res.status(400).json({ message: `Invalid return quantity. Max returnable: ${maxReturnable}` });
    }

    request.status = 'Pending Return';
    request.returnPendingQuantity = qtyToReturn;
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve returned spare parts
// @route   PUT /api/spare-parts-requests/:id/return-approve
// @access  Private (Admin/Advisor)
export const approveReturn = async (req, res) => {
  try {
    const request = await SparePartRequest.findById(req.params.id)
      .populate('mechanicId', 'fullName')
      .populate('jobCardId', 'jobNumber');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending Return') {
      return res.status(400).json({ message: 'No pending return found for this request' });
    }

    const part = await SparePart.findById(request.partId);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    const returnQty = request.returnPendingQuantity;

    // 1. Add back to inventory & record stock history
    part.quantityAvailable += returnQty;
    part.stockLastUpdated = new Date();
    part.stockHistory.push({
      action: 'Returned',
      quantity: returnQty,
      mechanicName: request.mechanicId?.fullName || 'Mechanic',
      jobCardNumber: request.jobCardId?.jobNumber || 'N/A',
      performedBy: req.user.email || req.user.firstName || 'Admin',
      date: new Date()
    });
    await part.save();

    // 2. Update Job Card Parts Snapshot for Billing (reduce partsUsed count)
    const jobCard = await JobCard.findById(request.jobCardId);
    if (jobCard) {
      const existingPartIndex = jobCard.partsUsed.findIndex(
        (p) => p.part.toString() === request.partId.toString()
      );

      if (existingPartIndex > -1) {
        jobCard.partsUsed[existingPartIndex].quantity = Math.max(
          0,
          jobCard.partsUsed[existingPartIndex].quantity - returnQty
        );
        
        // Remove if net quantity drops to 0
        if (jobCard.partsUsed[existingPartIndex].quantity <= 0) {
          jobCard.partsUsed.splice(existingPartIndex, 1);
        }
        await jobCard.save();
      }
    }

    // 3. Update Request Status & Totals
    request.returnedQuantity += returnQty;
    request.returnPendingQuantity = 0;
    request.status = 'Returned';
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject returned spare parts request (revert status back to Issued)
// @route   PUT /api/spare-parts-requests/:id/return-reject
// @access  Private (Admin/Advisor)
export const rejectReturn = async (req, res) => {
  try {
    const request = await SparePartRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending Return') {
      return res.status(400).json({ message: 'No pending return found for this request' });
    }

    request.status = 'Issued';
    request.returnPendingQuantity = 0;
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
