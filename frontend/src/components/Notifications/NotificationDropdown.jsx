import React from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaCheckDouble, FaExternalLinkAlt } from 'react-icons/fa';
import NotificationItem from './NotificationItem';

const NotificationDropdown = ({
  notifications = [],
  unreadCount = 0,
  loading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}) => {
  return (
    <div
      className="notification-dropdown-menu dropdown-menu show p-0"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        left: 'auto',
        width: '380px',
        maxHeight: '480px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold text-dark small">Notifications</span>
          {unreadCount > 0 && (
            <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.7rem' }}>
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-link btn-sm text-primary p-0 text-decoration-none fw-semibold d-flex align-items-center gap-1 flex-shrink-0"
            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            onClick={onMarkAllAsRead}
          >
            <FaCheckDouble size={11} /> Mark all read
          </button>
        )}
      </div>

      {/* Body List */}
      <div
        className="overflow-auto flex-grow-1"
        style={{ maxHeight: '340px' }}
      >
        {loading ? (
          <div className="text-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div className="small">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-muted px-3">
            <div className="bg-light rounded-circle d-inline-flex p-3 mb-2 text-secondary">
              <FaBell size={24} className="opacity-50" />
            </div>
            <p className="mb-0 fw-medium small text-dark">No new notifications</p>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              You are all caught up!
            </small>
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onCloseDropdown={onClose}
              showActions={false}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-top bg-light text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="btn btn-sm btn-link text-primary text-decoration-none fw-bold small d-inline-flex align-items-center gap-1"
        >
          View all notifications <FaExternalLinkAlt size={10} />
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;
