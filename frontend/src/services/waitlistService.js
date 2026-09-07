import api from './api';

const waitlistService = {
  addToWaitlist: async (data) => {
    const response = await api.post('/waitlist', data);
    return response.data;
  },

  getTodayWaitlist: async () => {
    const response = await api.get('/waitlist/today');
    return response.data;
  },

  assignWaitlist: async (id, data) => {
    const response = await api.put(`/waitlist/${id}/assign`, data);
    return response.data;
  },

  cancelWaitlist: async (id) => {
    const response = await api.put(`/waitlist/${id}/cancel`);
    return response.data;
  }
};

export default waitlistService;
