import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaBell } from 'react-icons/fa';
import notificationService from '../../services/notificationService';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
    }
  }, []);

  // Fetch latest notifications for dropdown
  const fetchRecentNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications({ limit: 5 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch recent notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and periodic polling (every 30 seconds)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchRecentNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <div className="position-relative d-inline-block" ref={bellRef}>
      <button
        type="button"
        id="dropdown-notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <FaBell
          className={`bell-icon ${unreadCount > 0 ? 'has-unread' : ''}`}
        />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
