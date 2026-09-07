import api from './api';

const appointmentService = {
  getAppointments: async (params) => {
    const { data } = await api.get('/appointments', { params });
    return data;
  },
  
  getAppointmentById: async (id) => {
    const { data } = await api.get(`/appointments/${id}`);
    return data;
  },
  
  createAppointment: async (appointmentData) => {
    const { data } = await api.post('/appointments', appointmentData);
    return data;
  },
  
  updateAppointment: async (id, appointmentData) => {
    const { data } = await api.put(`/appointments/${id}`, appointmentData);
    return data;
  },
  
  deleteAppointment: async (id) => {
    const { data } = await api.delete(`/appointments/${id}`);
    return data;
  },
  
  getServiceAdvisors: async () => {
    const { data } = await api.get('/appointments/advisors');
    return data;
  },

  getAvailableSlots: async (date) => {
    const response = await api.get(`/appointments/available-slots?date=${date}`);
    return response.data;
  },

  getNextAvailableSlot: async () => {
    const response = await api.get('/appointments/next-available-slot');
    return response.data;
  },

  getTodaySchedule: async () => {
    const { data } = await api.get('/appointments/today-schedule');
    return data;
  },

  addAdvisorRecommendation: async (id, recommendationText) => {
    const { data } = await api.put(`/appointments/${id}/recommendation`, { recommendationText });
    return data;
  }
};

export default appointmentService;
