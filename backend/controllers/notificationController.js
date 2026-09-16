import Notification from '../models/Notification.js';
import {
  markAsRead,
  markAllAsRead,
  checkInsuranceExpiryReminders,
  checkServiceDueReminders,
} from '../services/notificationService.js';

let lastReminderCheckTimestamp = 0;
const REMINDER_CHECK_COOLDOWN_MS = 60 * 1000; // Run scheduled reminder evaluations at most once per minute

/**
 * @desc    Get logged in user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Run scheduled reminder checks in background with cooldown to ensure fresh reminders without overhead
    const now = Date.now();
    if (now - lastReminderCheckTimestamp > REMINDER_CHECK_COOLDOWN_MS) {
      lastReminderCheckTimestamp = now;
      Promise.all([
        checkInsuranceExpiryReminders(),
        checkServiceDueReminders(),
      ]).catch((err) => console.error('Background reminder check error:', err.message));
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filterQuery = { recipient: userId };

    if (req.query.isRead !== undefined && req.query.isRead !== '') {
      filterQuery.isRead = req.query.isRead === 'true';
    }

    if (req.query.type && req.query.type !== 'All') {
      filterQuery.type = req.query.type;
    }

    if (req.query.category && req.query.category !== 'All') {
      switch (req.query.category) {
        case 'Appointments':
          filterQuery.type = { $in: ['APPOINTMENT_BOOKED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED'] };
          break;
        case 'JobCards':
          filterQuery.type = { $in: ['JOB_CARD_CREATED', 'MECHANIC_ASSIGNED', 'JOB_COMPLETED'] };
          break;
        case 'Billing':
          filterQuery.type = { $in: ['INVOICE_GENERATED', 'PAYMENT_SUCCESS', 'PAYMENT_PENDING'] };
          break;
        case 'Reminders':
          filterQuery.type = { $in: ['SERVICE_DUE', 'INSURANCE_EXPIRY', 'INSURANCE_RENEWED'] };
          break;
        case 'Inventory':
          filterQuery.type = 'LOW_STOCK';
          break;
        case 'Payroll':
          filterQuery.type = 'PAYROLL_GENERATED';
          break;
        case 'Queue':
          filterQuery.type = 'WAITING_QUEUE';
          break;
        default:
          break;
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filterQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filterQuery),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    res.json({
      notifications,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get unread notification count for current user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark all user's notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user._id);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
