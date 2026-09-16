import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarTimes,
  FaWrench,
  FaTools,
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaRupeeSign,
  FaShieldAlt,
  FaCar,
  FaBoxes,
  FaMoneyCheckAlt,
  FaClock,
  FaCheck,
  FaTrash,
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { formatDateTimeIST } from '../../utils/dateUtils';

/**
 * Format relative or localized IST timestamp
 */
const getRelativeTimeIST = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays <= 3) return `${diffDays}d ago`;

  return formatDateTimeIST(dateStr);
};

/**
 * Visual badge & icon selector based on notification type
 */
const getNotificationTypeConfig = (type) => {
  switch (type) {
    case 'APPOINTMENT_BOOKED':
      return { icon: <FaCalendarAlt />, bg: 'bg-primary bg-opacity-10 text-primary', label: 'Appointment' };
    case 'APPOINTMENT_CONFIRMED':
      return { icon: <FaCalendarCheck />, bg: 'bg-success bg-opacity-10 text-success', label: 'Confirmed' };
    case 'APPOINTMENT_CANCELLED':
      return { icon: <FaCalendarTimes />, bg: 'bg-danger bg-opacity-10 text-danger', label: 'Cancelled' };
    case 'WAITING_QUEUE':
      return { icon: <FaClock />, bg: 'bg-info bg-opacity-10 text-info', label: 'Queue' };
    case 'JOB_CARD_CREATED':
    case 'MECHANIC_ASSIGNED':
      return { icon: <FaTools />, bg: 'bg-warning bg-opacity-10 text-warning', label: 'Job Card' };
    case 'JOB_COMPLETED':
      return { icon: <FaCheckCircle />, bg: 'bg-success bg-opacity-10 text-success', label: 'Completed' };
    case 'INVOICE_GENERATED':
      return { icon: <FaFileInvoiceDollar />, bg: 'bg-info bg-opacity-10 text-info', label: 'Invoice' };
    case 'PAYMENT_SUCCESS':
      return { icon: <FaRupeeSign />, bg: 'bg-success bg-opacity-10 text-success', label: 'Payment' };
    case 'PAYMENT_PENDING':
      return { icon: <FaRupeeSign />, bg: 'bg-danger bg-opacity-10 text-danger', label: 'Due' };
    case 'SERVICE_DUE':
      return { icon: <FaCar />, bg: 'bg-primary bg-opacity-10 text-primary', label: 'Service Due' };
    case 'INSURANCE_EXPIRY':
      return { icon: <FaShieldAlt />, bg: 'bg-danger bg-opacity-10 text-danger', label: 'Insurance' };
    case 'INSURANCE_RENEWED':
      return { icon: <FaShieldAlt />, bg: 'bg-success bg-opacity-10 text-success', label: 'Renewed' };
    case 'LOW_STOCK':
      return { icon: <FaBoxes />, bg: 'bg-warning bg-opacity-10 text-dark', label: 'Low Stock' };
    case 'PAYROLL_GENERATED':
      return { icon: <FaMoneyCheckAlt />, bg: 'bg-success bg-opacity-10 text-success', label: 'Payroll' };
    default:
      return { icon: <FaWrench />, bg: 'bg-secondary bg-opacity-10 text-secondary', label: 'Alert' };
  }
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  onCloseDropdown,
  showActions = true,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const config = getNotificationTypeConfig(notification.type);

  const handleClick = (e) => {
    // If clicking action buttons, do not trigger navigation
    if (e.target.closest('button')) return;

    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }

    if (onCloseDropdown) {
      onCloseDropdown();
    }

    // Role-aware navigation based on relatedEntityType
    const { relatedEntityType, relatedEntityId } = notification;

    if (!relatedEntityType) return;

    switch (relatedEntityType) {
      case 'Appointment':
        if (user?.role === 'customer') {
          navigate('/my-requests');
        } else if (relatedEntityId) {
          navigate(`/appointments/${relatedEntityId}`);
        } else {
          navigate('/appointments');
        }
        break;

      case 'JobCard':
        if (user?.role === 'customer') {
          navigate('/my-job-cards');
        } else if (user?.role === 'mechanic') {
          navigate('/mechanic-dashboard');
        } else if (relatedEntityId) {
          navigate(`/job-cards/${relatedEntityId}`);
        } else {
          navigate('/job-cards');
        }
        break;

      case 'Invoice':
        if (relatedEntityId) {
          navigate(`/billing/invoice/${relatedEntityId}`);
        } else {
          navigate('/billing');
        }
        break;

      case 'Vehicle':
        if (notification.type === 'INSURANCE_EXPIRY' && !notification.metadata?.isRenewed && relatedEntityId) {
          navigate(`/insurance-renewal/${relatedEntityId}`);
          break;
        }
        if (user?.role === 'customer') {
          navigate('/my-vehicles');
        } else if (relatedEntityId) {
          navigate(`/vehicles/${relatedEntityId}`);
        } else {
          navigate('/vehicles');
        }
        break;

      case 'InsuranceRenewal':
        if (relatedEntityId) {
          navigate(`/insurance-renewal/${relatedEntityId}`);
        } else {
          navigate('/vehicles');
        }
        break;

      case 'SparePart':
        navigate('/inventory');
        break;

      case 'Payroll':
        if (user?.role === 'mechanic') {
          navigate('/my-payslips');
        } else if (relatedEntityId) {
          navigate(`/payslips/${relatedEntityId}`);
        } else {
          navigate('/payroll');
        }
        break;

      case 'WaitingQueue':
        if (user?.role === 'customer') {
          navigate('/my-requests');
        } else {
          navigate('/service-requests');
        }
        break;

      default:
        break;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 border-bottom position-relative cursor-pointer transition-all notification-item ${
        !notification.isRead ? 'bg-light bg-opacity-75 border-start border-3 border-primary' : 'bg-white'
      }`}
      style={{ cursor: 'pointer' }}
    >
      <div className="d-flex align-items-start gap-3">
        {/* Icon Avatar */}
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${config.bg}`}
          style={{ width: 38, height: 38, fontSize: '1rem' }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-start justify-content-between mb-1 gap-2">
            <h6 className={`mb-0 small lh-sm ${!notification.isRead ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`} style={{ fontSize: '0.85rem' }}>
              {notification.title}
            </h6>
            {!notification.isRead && (
              <span
                className="badge bg-primary rounded-circle p-1 flex-shrink-0"
                style={{ width: 8, height: 8, display: 'inline-block', marginTop: 4 }}
                title="Unread"
              />
            )}
          </div>

          <p className="mb-1 text-muted small lh-sm text-break" style={{ fontSize: '0.825rem' }}>
            {notification.message}
          </p>

          {/* Action Button for Insurance Expiry / Renewal */}
          {notification.type === 'INSURANCE_EXPIRY' && !notification.metadata?.isRenewed && (
            <div className="mt-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-orange text-white d-inline-flex align-items-center gap-1.5 px-3 py-1 fw-semibold shadow-sm rounded border-0"
                style={{ fontSize: '0.78rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCloseDropdown) onCloseDropdown();
                  const targetVehicleId = notification.relatedEntityId || notification.metadata?.vehicleId;
                  if (targetVehicleId) {
                    navigate(`/insurance-renewal/${targetVehicleId}`);
                  } else {
                    navigate('/vehicles');
                  }
                }}
              >
                <FaShieldAlt size={12} /> Renew Insurance & Pay
              </button>
            </div>
          )}

          {notification.type === 'INSURANCE_EXPIRY' && notification.metadata?.isRenewed && (
            <div className="mt-2 mb-1">
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 fw-medium small d-inline-flex align-items-center gap-1">
                <FaCheckCircle size={11} /> Insurance Renewed
              </span>
            </div>
          )}

          {notification.type === 'INSURANCE_RENEWED' && (
            <div className="mt-2 mb-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 px-2.5 py-0.5 fw-medium rounded"
                style={{ fontSize: '0.75rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCloseDropdown) onCloseDropdown();
                  const targetVehicleId = notification.relatedEntityId || notification.metadata?.vehicleId;
                  if (targetVehicleId) {
                    navigate(`/vehicles/${targetVehicleId}`);
                  } else {
                    navigate('/vehicles');
                  }
                }}
              >
                <FaCheckCircle size={11} /> View Vehicle
              </button>
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between mt-1">
            <small className="text-muted" style={{ fontSize: '0.75rem' }} title={formatDateTimeIST(notification.createdAt)}>
              {getRelativeTimeIST(notification.createdAt)}
            </small>

            {showActions && (
              <div className="d-flex align-items-center gap-1">
                {!notification.isRead && onMarkAsRead && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 text-primary text-decoration-none"
                    style={{ fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification._id);
                    }}
                    title="Mark as read"
                  >
                    <FaCheck className="me-1" /> Read
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 text-danger ms-2 text-decoration-none"
                    style={{ fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification._id);
                    }}
                    title="Delete notification"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
