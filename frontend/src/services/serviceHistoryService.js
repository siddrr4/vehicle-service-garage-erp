import api from './api';

const API_URL = '/service-history/';

// Get all service history
const getServiceHistory = async (page = 1, limit = 10, filters = {}) => {
  let url = `${API_URL}?page=${page}&limit=${limit}`;
  if (filters.customer) url += `&customer=${filters.customer}`;
  if (filters.vehicle) url += `&vehicle=${filters.vehicle}`;
  if (filters.startDate) url += `&startDate=${filters.startDate}`;
  if (filters.endDate) url += `&endDate=${filters.endDate}`;
  const response = await api.get(url);
  return response.data;
};

// Get history by ID
const getServiceHistoryById = async (id) => {
  const response = await api.get(`${API_URL}${id}`);
  return response.data;
};

// Get history for specific vehicle
const getVehicleServiceHistory = async (vehicleId) => {
  const response = await api.get(`${API_URL}vehicle/${vehicleId}`);
  return response.data;
};

// Get logged-in customer's history
const getMyServiceHistory = async (page = 1, limit = 10) => {
  const response = await api.get(`${API_URL}my-history?page=${page}&limit=${limit}`);
  return response.data;
};

const serviceHistoryService = {
  getServiceHistory,
  getServiceHistoryById,
  getVehicleServiceHistory,
  getMyServiceHistory
};

export default serviceHistoryService;
