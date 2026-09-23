import api from './api';

const API_URL = '/reports/';

// Helper to build query string for dates
const buildDateQuery = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  return `?startDate=${startDate}&endDate=${endDate}`;
};

const getSummary = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}summary${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getRevenueAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}revenue${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getServiceAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}services${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getMechanicAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}mechanics${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getInventoryAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}inventory${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getFreeServiceAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}free-services${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getPaymentAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}payments${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const getCustomerVehicleAnalytics = async (startDate, endDate) => {
  const response = await api.get(`${API_URL}customers-vehicles${buildDateQuery(startDate, endDate)}`);
  return response.data;
};

const reportService = {
  getSummary,
  getRevenueAnalytics,
  getServiceAnalytics,
  getMechanicAnalytics,
  getInventoryAnalytics,
  getFreeServiceAnalytics,
  getPaymentAnalytics,
  getCustomerVehicleAnalytics
};

export default reportService;
