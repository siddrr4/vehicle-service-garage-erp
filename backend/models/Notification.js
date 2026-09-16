import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['admin', 'advisor', 'mechanic', 'customer'],
      required: [true, 'Recipient role is required'],
    },
    type: {
      type: String,
      enum: [
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_CONFIRMED',
        'APPOINTMENT_CANCELLED',
        'WAITING_QUEUE',
        'JOB_CARD_CREATED',
        'MECHANIC_ASSIGNED',
        'JOB_COMPLETED',
        'INVOICE_GENERATED',
        'PAYMENT_SUCCESS',
        'PAYMENT_PENDING',
        'SERVICE_DUE',
        'INSURANCE_EXPIRY',
        'INSURANCE_RENEWED',
        'LOW_STOCK',
        'PAYROLL_GENERATED',
        'RECOMMENDATION_ADDED',
        'RECOMMENDATION_APPROVED',
        'RECOMMENDATION_REJECTED',
      ],
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['Appointment', 'JobCard', 'Invoice', 'Vehicle', 'SparePart', 'Payroll', 'WaitingQueue', 'InsuranceRenewal'],
      required: false,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries of user inbox and unread items
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
