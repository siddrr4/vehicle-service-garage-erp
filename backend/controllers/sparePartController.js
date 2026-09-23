import SparePart from '../models/SparePart.js';
import { checkLowStockCondition } from '../services/notificationService.js';

// @desc    Get all spare parts with search, filter, sort, and pagination
// @route   GET /api/spare-parts
// @access  Private
export const getSpareParts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Search query (by partName or partNumber)
    let query = {};
    if (req.query.keyword) {
      query.$or = [
        { partName: { $regex: req.query.keyword, $options: 'i' } },
        { partNumber: { $regex: req.query.keyword, $options: 'i' } }
      ];
    }

    // Filter by Category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by Stock Status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Sorting
    let sort = {};
    if (req.query.sortBy) {
      const order = req.query.sortOrder === 'desc' || req.query.sortOrder === '-1' ? -1 : 1;
      sort[req.query.sortBy] = order;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    const count = await SparePart.countDocuments(query);
    const spareParts = await SparePart.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      spareParts,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all spare parts (non-paginated) for dropdowns
// @route   GET /api/spare-parts/all
// @access  Private
export const getAllSpareParts = async (req, res) => {
  try {
    // Return all parts sorted alphabetically by name
    const spareParts = await SparePart.find({}).sort({ partName: 1 });
    res.json(spareParts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get spare part dashboard stats
// @route   GET /api/spare-parts/stats
// @access  Private
export const getSparePartStats = async (req, res) => {
  try {
    const totalParts = await SparePart.countDocuments({});
    const lowStockParts = await SparePart.countDocuments({ status: 'Low Stock' });
    const outOfStockParts = await SparePart.countDocuments({ status: 'Out of Stock' });

    // Calculate total inventory value: sum(unitPrice * quantityAvailable)
    const inventoryValueResult = await SparePart.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$unitPrice', '$quantityAvailable'] } }
        }
      }
    ]);
    const totalInventoryValue = inventoryValueResult.length > 0 ? inventoryValueResult[0].totalValue : 0;

    // Categories Count
    const categories = await SparePart.distinct('category');
    const categoriesCount = categories.length;

    res.json({
      totalParts,
      lowStockParts,
      outOfStockParts,
      totalInventoryValue,
      categoriesCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get spare part by ID
// @route   GET /api/spare-parts/:id
// @access  Private
export const getSparePartById = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);
    if (sparePart) {
      res.json(sparePart);
    } else {
      res.status(404).json({ message: 'Spare part not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new spare part
// @route   POST /api/spare-parts
// @access  Private (Admin/Advisor)
export const createSparePart = async (req, res) => {
  try {
    const sparePart = new SparePart(req.body);
    
    // Log initial stock addition
    if (sparePart.quantityAvailable > 0) {
      sparePart.stockHistory.push({
        action: 'Stock Added',
        quantity: sparePart.quantityAvailable,
        performedBy: req.user ? req.user.email : 'Admin',
        remarks: 'Initial Stock'
      });
    }

    const createdPart = await sparePart.save();
    res.status(201).json(createdPart);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Part Number or Part Name must be unique' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// @desc    Update spare part
// @route   PUT /api/spare-parts/:id
// @access  Private (Admin/Advisor)
export const updateSparePart = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);

    if (sparePart) {
      // Update fields
      const fields = [
        'partName',
        'category',
        'compatibleVehicleBrands',
        'manufacturer',
        'unitPrice',
        'sellingPrice',
        'quantityAvailable',
        'minimumStockLevel',
        'rackLocation',
        'supplier',
        'warranty',
        'gstPercent'
      ];

      let prevQuantity = sparePart.quantityAvailable;

      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          sparePart[field] = req.body[field];
        }
      });

      // Check if quantity changed
      if (sparePart.quantityAvailable > prevQuantity) {
        sparePart.stockLastUpdated = new Date();
        sparePart.stockHistory.push({
          action: 'Stock Added',
          quantity: sparePart.quantityAvailable - prevQuantity,
          performedBy: req.user ? req.user.email : 'Admin',
          remarks: 'Manual Stock Addition'
        });
      } else if (sparePart.quantityAvailable < prevQuantity) {
        sparePart.stockLastUpdated = new Date();
        sparePart.stockHistory.push({
          action: 'Stock Removed',
          quantity: prevQuantity - sparePart.quantityAvailable,
          performedBy: req.user ? req.user.email : 'Admin',
          remarks: 'Manual Stock Reduction'
        });
      }

      const updatedPart = await sparePart.save();
      await checkLowStockCondition(updatedPart._id);
      res.json(updatedPart);
    } else {
      res.status(404).json({ message: 'Spare part not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete spare part
// @route   DELETE /api/spare-parts/:id
// @access  Private (Admin/Advisor)
export const deleteSparePart = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);

    if (sparePart) {
      await SparePart.deleteOne({ _id: sparePart._id });
      res.json({ message: 'Spare part removed successfully' });
    } else {
      res.status(404).json({ message: 'Spare part not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
