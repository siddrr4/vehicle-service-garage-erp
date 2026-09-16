import api from './api';

const notificationService = {
  /**
   * Fetch paginated list of notifications for the logged in user
   * @param {Object} params - { page, limit, isRead, type, category }
   */
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  /**
   * Fetch unread notification count
   */
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data.unreadCount;
  },

  /**
   * Mark a single notification as read
   * @param {string} id - Notification ID
   */
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read for current user
   */
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default notificationService;
