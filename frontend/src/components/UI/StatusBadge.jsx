import React from 'react';
import { 
  FaCheckCircle, FaClock, FaTools, FaTimesCircle, 
  FaExclamationTriangle, FaBoxes, FaUserCheck 
} from 'react-icons/fa';

const StatusBadge = ({ status, className = '' }) => {
  if (!status) return null;

  const normalized = status.toString().trim().toLowerCase();

  let badgeClass = 'badge-status-default';
  let icon = null;

  if (['completed', 'delivered', 'paid', 'active', 'instock', 'present', 'confirmed', 'approved'].includes(normalized)) {
    badgeClass = 'badge-status-completed';
    icon = <FaCheckCircle size={11} className="me-1" />;
  } else if (['in progress', 'assigned', 'checked-in'].includes(normalized)) {
    badgeClass = 'badge-status-in-progress';
    icon = <FaTools size={11} className="me-1" />;
  } else if (['pending', 'waiting', 'waiting for parts', 'low stock', 'busy', 'half day', 'late', 'partially paid'].includes(normalized)) {
    badgeClass = 'badge-status-pending';
    icon = <FaClock size={11} className="me-1" />;
  } else if (['cancelled', 'rejected', 'out of stock', 'absent', 'expired', 'danger', 'unpaid', 'failed'].includes(normalized)) {
    badgeClass = 'badge-status-cancelled';
    icon = <FaTimesCircle size={11} className="me-1" />;
  } else if (['leave', 'on leave', 'leave (approved)'].includes(normalized)) {
    badgeClass = 'badge-status-in-progress';
    icon = <FaUserCheck size={11} className="me-1" />;
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {icon}
      {status}
    </span>
  );
};

export default StatusBadge;
