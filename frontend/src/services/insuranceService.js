import api from './api';

const API_URL = '/insurance-renewals/';

/**
 * Get vehicle details, customer details, and current insurance status
 */
export const getVehicleInsurance = async (vehicleId) => {
  const response = await api.get(`${API_URL}vehicle/${vehicleId}`);
  return response.data;
};

/**
 * Create Razorpay Test Mode order for insurance renewal
 */
export const createRenewalOrder = async (orderData) => {
  const response = await api.post(`${API_URL}create-order`, orderData);
  return response.data;
};

/**
 * Verify Razorpay payment and commit vehicle insurance renewal
 */
export const verifyRenewalPayment = async (verificationData) => {
  const response = await api.post(`${API_URL}verify-payment`, verificationData);
  return response.data;
};

/**
 * Record payment failure / cancellation without modifying vehicle insurance
 */
export const recordRenewalFailure = async (failureData) => {
  const response = await api.post(`${API_URL}record-failure`, failureData);
  return response.data;
};

/**
 * Get past insurance renewal transactions for a vehicle
 */
export const getVehicleRenewalHistory = async (vehicleId) => {
  const response = await api.get(`${API_URL}vehicle/${vehicleId}/history`);
  return response.data;
};

export default {
  getVehicleInsurance,
  createRenewalOrder,
  verifyRenewalPayment,
  recordRenewalFailure,
  getVehicleRenewalHistory,
};
