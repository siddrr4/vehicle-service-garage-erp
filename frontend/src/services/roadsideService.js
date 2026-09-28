import api from './api';

const roadsideService = {
  // Get garage location & 20 km radius config
  getConfig: async () => {
    const response = await api.get('/roadside-assistance/config');
    return response.data;
  },

  // Submit emergency roadside assistance request
  createRequest: async (requestData) => {
    const response = await api.post('/roadside-assistance', requestData);
    return response.data;
  },

  // Get logged-in customer's roadside requests
  getMyRequests: async () => {
    const response = await api.get('/roadside-assistance/my-requests');
    return response.data;
  },

  // Admin / Advisor: Get all roadside requests
  getAllRequests: async (params = {}) => {
    const response = await api.get('/roadside-assistance', { params });
    return response.data;
  },

  // Get single roadside request details
  getRequestById: async (id) => {
    const response = await api.get(`/roadside-assistance/${id}`);
    return response.data;
  },

  // Admin / Advisor: Update status or assign mechanic
  updateStatus: async (id, data) => {
    const response = await api.put(`/roadside-assistance/${id}/status`, data);
    return response.data;
  },

  // Record on-site repair diagnosis, work, parts/labour & customer confirmation
  recordOnSiteRepair: async (id, data) => {
    const response = await api.put(`/roadside-assistance/${id}/on-site-repair`, data);
    return response.data;
  },

  // Dispatch vehicle pickup / towing to showroom
  dispatchVehiclePickup: async (id, data) => {
    const response = await api.put(`/roadside-assistance/${id}/pickup-dispatch`, data);
    return response.data;
  },

  // Update pickup status (Vehicle Picked Up -> Arrived at Showroom)
  updatePickupStatus: async (id, data) => {
    const response = await api.put(`/roadside-assistance/${id}/pickup-status`, data);
    return response.data;
  }
};

export default roadsideService;
