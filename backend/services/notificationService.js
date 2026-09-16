import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Employee from '../models/Employee.js';
import Vehicle from '../models/Vehicle.js';
import ServiceHistory from '../models/ServiceHistory.js';
import SparePart from '../models/SparePart.js';
import { getIndiaDateStr, getIndiaStartOfDay, formatDateIST } from '../utils/dateUtils.js';

/**
 * Creates a single notification record.
 * Scoped to a specific recipient user and role.
 */
export const createNotification = async ({
  recipient,
  recipientRole,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
  metadata = {},
}) => {
  if (!recipient || !recipientRole || !type || !title || !message) {
    return null;
  }

  try {
    const notification = new Notification({
      recipient,
      recipientRole,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata,
    });

    return await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return null;
  }
};

/**
 * Bulk insert notifications.
 */
export const createNotifications = async (notifications = []) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  try {
    return await Notification.insertMany(notifications, { ordered: false });
  } catch (error) {
    console.error('Error in bulk notification insert:', error.message);
    return [];
  }
};

/**
 * Broadcast notification to all active Administrators and Service Advisors.
 */
export const notifyAdminsAndAdvisors = async ({
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
  metadata = {},
}) => {
  try {
    const users = await User.find({
      role: { $in: ['admin', 'advisor'] },
      isActive: true,
    }).select('_id role');

    if (!users || users.length === 0) return [];

    const notifications = users.map((u) => ({
      recipient: u._id,
      recipientRole: u.role,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata,
    }));

    return await Notification.insertMany(notifications, { ordered: false });
  } catch (error) {
    console.error('Error notifying admins and advisors:', error.message);
    return [];
  }
};

/**
 * Resolves customer User account and creates notification for the Customer.
 */
export const notifyCustomer = async (
  customerId,
  { type, title, message, relatedEntityType, relatedEntityId, metadata = {} }
) => {
  if (!customerId) return null;

  try {
    // 1. Check if user has customerRef pointing to customerId
    let user = await User.findOne({ customerRef: customerId });

    // 2. Check if customer document has direct userId
    if (!user) {
      const customer = await Customer.findById(customerId);
      if (customer && customer.userId) {
        user = await User.findById(customer.userId);
      }
    }

    // 3. Fallback: customerId might already be a User ObjectId
    if (!user) {
      user = await User.findById(customerId);
    }

    if (!user) {
      return null;
    }

    return await createNotification({
      recipient: user._id,
      recipientRole: 'customer',
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata,
    });
  } catch (error) {
    console.error('Error notifying customer:', error.message);
    return null;
  }
};

/**
 * Resolves mechanic User account and creates notification for the Mechanic.
 */
export const notifyMechanic = async (
  employeeId,
  { type, title, message, relatedEntityType, relatedEntityId, metadata = {} }
) => {
  if (!employeeId) return null;

  try {
    let user = null;
    const emp = await Employee.findById(employeeId);

    if (emp) {
      if (emp.userRef) {
        user = await User.findById(emp.userRef);
      }
      if (!user && emp.email) {
        user = await User.findOne({ email: emp.email });
      }
    }

    // Fallback: employeeId could be the User's ObjectId
    if (!user) {
      user = await User.findById(employeeId);
    }

    if (!user) {
      return null;
    }

    return await createNotification({
      recipient: user._id,
      recipientRole: 'mechanic',
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata,
    });
  } catch (error) {
    console.error('Error notifying mechanic:', error.message);
    return null;
  }
};

/**
 * Marks a notification as read.
 */
export const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { returnDocument: 'after' }
  );
};

/**
 * Marks all notifications for a user as read.
 */
export const markAllAsRead = async (userId) => {
  return await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * HOD Requirement: Check Insurance Expiry Reminders with Duplicate Prevention.
 * Stages: 30 days, 7 days, 1 day, expired.
 * Notifies Customer and Service Advisor/Admin.
 */
export const checkInsuranceExpiryReminders = async () => {
  try {
    const todayIST = getIndiaStartOfDay();
    const vehicles = await Vehicle.find({ insuranceExpiryDate: { $ne: null } })
      .populate('customer', 'fullName mobileNumber emailAddress userId');

    for (const vehicle of vehicles) {
      if (!vehicle.insuranceExpiryDate) continue;

      const expiryIST = getIndiaStartOfDay(vehicle.insuranceExpiryDate);
      const diffMs = expiryIST.getTime() - todayIST.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const expiryDateStr = getIndiaDateStr(vehicle.insuranceExpiryDate);

      let stage = null;
      let title = '';
      let message = '';

      if (days < 0) {
        stage = 'EXPIRED';
        title = `Insurance Expired: ${vehicle.vehicleNumber}`;
        message = `The insurance for vehicle ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model}) expired on ${formatDateIST(vehicle.insuranceExpiryDate)}. Please renew immediately.`;
      } else if (days <= 1) {
        stage = '1_DAY';
        title = `Insurance Expiring Soon: ${vehicle.vehicleNumber}`;
        message = `URGENT: Insurance for vehicle ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model}) expires ${days === 0 ? 'today' : 'in 1 day'} (${formatDateIST(vehicle.insuranceExpiryDate)}).`;
      } else if (days <= 7) {
        stage = '7_DAYS';
        title = `Insurance Renewal Reminder: ${vehicle.vehicleNumber}`;
        message = `Insurance for vehicle ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model}) expires in ${days} days on ${formatDateIST(vehicle.insuranceExpiryDate)}.`;
      } else if (days <= 30) {
        stage = '30_DAYS';
        title = `Insurance Renewal Notice: ${vehicle.vehicleNumber}`;
        message = `Insurance for vehicle ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model}) is due for renewal in ${days} days (${formatDateIST(vehicle.insuranceExpiryDate)}).`;
      }

      if (!stage) continue;

      // Duplicate prevention: check if notification already exists for this vehicle, stage, and expiry date
      const alreadyNotified = await Notification.findOne({
        relatedEntityType: 'Vehicle',
        relatedEntityId: vehicle._id,
        type: 'INSURANCE_EXPIRY',
        'metadata.stage': stage,
        'metadata.expiryDate': expiryDateStr,
      });

      if (alreadyNotified) {
        continue;
      }

      const meta = {
        stage,
        expiryDate: expiryDateStr,
        daysRemaining: days,
        vehicleNumber: vehicle.vehicleNumber,
      };

      // Notify customer
      if (vehicle.customer) {
        await notifyCustomer(vehicle.customer._id, {
          type: 'INSURANCE_EXPIRY',
          title,
          message,
          relatedEntityType: 'Vehicle',
          relatedEntityId: vehicle._id,
          metadata: meta,
        });
      }

      // Notify Advisors & Admins
      await notifyAdminsAndAdvisors({
        type: 'INSURANCE_EXPIRY',
        title: `[Garage Alert] ${title}`,
        message,
        relatedEntityType: 'Vehicle',
        relatedEntityId: vehicle._id,
        metadata: meta,
      });
    }
  } catch (error) {
    console.error('Error in checkInsuranceExpiryReminders:', error.message);
  }
};

/**
 * Service Due Reminder Logic with Duplicate Prevention.
 * Rules: 180 days (6 months) or 10,000 km since last service / registration date.
 */
export const checkServiceDueReminders = async () => {
  try {
    const todayIST = getIndiaStartOfDay();
    const vehicles = await Vehicle.find().populate('customer', 'fullName mobileNumber userId');

    for (const vehicle of vehicles) {
      // Find latest service history record for this vehicle
      const lastService = await ServiceHistory.findOne({ vehicle: vehicle._id }).sort({ serviceDate: -1 });

      let baseDate = vehicle.registrationDate || vehicle.createdAt;
      let baseOdometer = vehicle.initialOdometer || 0;

      if (lastService) {
        baseDate = lastService.serviceDate;
        baseOdometer = lastService.odometerReading || 0;
      }

      if (!baseDate) continue;

      const baseDateIST = getIndiaStartOfDay(baseDate);
      const daysSinceLastService = Math.round((todayIST.getTime() - baseDateIST.getTime()) / (1000 * 60 * 60 * 24));
      const kmSinceLastService = Math.max(0, (vehicle.currentOdometerReading || 0) - baseOdometer);

      const isDue = daysSinceLastService >= 180 || kmSinceLastService >= 10000;

      if (!isDue) continue;

      const cycleKey = `${vehicle._id.toString()}_${getIndiaDateStr(baseDate)}`;

      // Duplicate prevention: check if customer already received service due notification for this cycle
      const alreadyNotified = await Notification.findOne({
        relatedEntityType: 'Vehicle',
        relatedEntityId: vehicle._id,
        type: 'SERVICE_DUE',
        'metadata.serviceCycle': cycleKey,
      });

      if (alreadyNotified) {
        continue;
      }

      const meta = {
        serviceCycle: cycleKey,
        daysSinceLastService,
        kmSinceLastService,
        vehicleNumber: vehicle.vehicleNumber,
      };

      if (vehicle.customer) {
        await notifyCustomer(vehicle.customer._id, {
          type: 'SERVICE_DUE',
          title: `Vehicle Service Due: ${vehicle.vehicleNumber}`,
          message: `Your vehicle ${vehicle.vehicleNumber} (${vehicle.brand} ${vehicle.model}) is due for regular maintenance (${daysSinceLastService} days / ${kmSinceLastService} km since previous service). Book an appointment today.`,
          relatedEntityType: 'Vehicle',
          relatedEntityId: vehicle._id,
          metadata: meta,
        });
      }
    }
  } catch (error) {
    console.error('Error in checkServiceDueReminders:', error.message);
  }
};

/**
 * Low-stock condition detector with duplicate prevention.
 * Called when stock changes or during inventory review.
 */
export const checkLowStockCondition = async (sparePartId) => {
  try {
    const part = await SparePart.findById(sparePartId);
    if (!part) return;

    if (part.quantityAvailable <= part.minimumStockLevel) {
      // Check if an unresolved low stock notification already exists for this part
      const existingAlert = await Notification.findOne({
        relatedEntityType: 'SparePart',
        relatedEntityId: part._id,
        type: 'LOW_STOCK',
        'metadata.reorderAlertActive': true,
      });

      if (!existingAlert) {
        await notifyAdminsAndAdvisors({
          type: 'LOW_STOCK',
          title: `Low Stock Alert: ${part.partName}`,
          message: `Stock level for "${part.partName}" (${part.partNumber}) has fallen to ${part.quantityAvailable} (Minimum: ${part.minimumStockLevel}). Please reorder promptly.`,
          relatedEntityType: 'SparePart',
          relatedEntityId: part._id,
          metadata: {
            partName: part.partName,
            partNumber: part.partNumber,
            quantityAvailable: part.quantityAvailable,
            minimumStockLevel: part.minimumStockLevel,
            reorderAlertActive: true,
          },
        });
      }
    } else {
      // If replenished above minimum, deactivate the active alert flag
      await Notification.updateMany(
        {
          relatedEntityType: 'SparePart',
          relatedEntityId: part._id,
          type: 'LOW_STOCK',
          'metadata.reorderAlertActive': true,
        },
        {
          $set: { 'metadata.reorderAlertActive': false },
        }
      );
    }
  } catch (error) {
    console.error('Error checking low stock condition:', error.message);
  }
};
