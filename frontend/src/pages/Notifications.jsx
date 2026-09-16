import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBell,
  FaCheckDouble,
  FaFilter,
  FaArrowLeft,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import notificationService from '../services/notificationService';
import NotificationItem from '../components/Notifications/NotificationItem';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unread', 'read'
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
      };

      if (filterStatus === 'unread') {
        params.isRead = 'false';
      } else if (filterStatus === 'read') {
        params.isRead = 'true';
      }

      if (selectedCategory !== 'All') {
        params.category = selectedCategory;
      }

      const data = await notificationService.getNotifications(params);
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, selectedCategory]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      toast.success('Notification removed');
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  return (
    <div className="container-fluid py-2">
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Notifications
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-navy rounded-3 p-3 text-orange d-flex align-items-center justify-content-center">
            <FaBell size={24} />
          </div>
          <div>
            <h2 className="text-navy fw-bold mb-0 d-flex align-items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="badge bg-danger rounded-pill fs-6 fw-normal">
                  {unreadCount} unread
                </span>
              )}
            </h2>
            <p className="text-muted mb-0 small">
              Stay up-to-date with your garage service requests, appointments, billing, and system reminders.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {unreadCount > 0 && (
            <button
              id="btn-mark-all-read"
              className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
              onClick={handleMarkAllAsRead}
            >
              <FaCheckDouble /> Mark All as Read
            </button>
          )}
          <Link to="/dashboard" className="btn btn-outline-secondary d-flex align-items-center gap-2">
            <FaArrowLeft /> Back
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow-sm border-0 rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center justify-content-between">
            {/* Filter Tabs */}
            <div className="col-auto">
              <div className="btn-group shadow-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${filterStatus === 'all' ? 'btn-navy text-white fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleStatusFilterChange('all')}
                >
                  All ({total})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterStatus === 'unread' ? 'btn-navy text-white fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleStatusFilterChange('unread')}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterStatus === 'read' ? 'btn-navy text-white fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleStatusFilterChange('read')}
                >
                  Read
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="col-auto d-flex align-items-center gap-2">
              <FaFilter className="text-muted small" />
              <label htmlFor="category-select" className="small fw-semibold text-muted mb-0">
                Category:
              </label>
              <select
                id="category-select"
                className="form-select form-select-sm shadow-sm"
                style={{ width: '190px' }}
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                <option value="All">All Categories</option>
                <option value="Appointments">Appointments</option>
                <option value="JobCards">Job Cards</option>
                <option value="Billing">Invoices & Payments</option>
                <option value="Reminders">Reminders (Due & Insurance)</option>
                <option value="Inventory">Inventory / Low Stock</option>
                <option value="Payroll">Payroll</option>
                <option value="Queue">Waiting Queue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notification List Card */}
      <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
        {loading ? (
          <div className="py-5">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-5">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 text-muted">
              <FaBell size={36} className="opacity-50" />
            </div>
            <h5 className="text-navy fw-bold mb-1">No notifications found</h5>
            <p className="text-muted mb-0 small">
              {filterStatus === 'unread'
                ? 'You have no unread notifications.'
                : 'There are no notifications matching the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pages > 1 && (
          <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="text-muted small">
              Showing page {page} of {pages} ({total} total)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`btn ${page === num ? 'btn-navy text-white fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-outline-secondary"
                disabled={page >= pages}
                onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
