import api from './api';

const API_URL = '/billing/';

// Generate Invoice
const generateInvoice = async (invoiceData) => {
  const response = await api.post(`${API_URL}generate`, invoiceData);
  return response.data;
};

// Get all Invoices (with pagination/search/filter)
const getInvoices = async (page = 1, limit = 10, keyword = '', status = '') => {
  let url = `${API_URL}?page=${page}&limit=${limit}`;
  if (keyword) url += `&keyword=${keyword}`;
  if (status) url += `&status=${status}`;
  const response = await api.get(url);
  return response.data;
};

// Get Invoice by ID
const getInvoiceById = async (id) => {
  const response = await api.get(`${API_URL}${id}`);
  return response.data;
};

// Get Invoice by JobCard ID
const getInvoiceByJobCard = async (jobCardId) => {
  const response = await api.get(`${API_URL}jobcard/${jobCardId}`);
  return response.data;
};

// Record Payment
const recordPayment = async (id, paymentData) => {
  const response = await api.post(`${API_URL}${id}/pay`, paymentData);
  return response.data;
};

// Get My Invoices (Customer)
const getMyInvoices = async () => {
  const response = await api.get(`${API_URL}my-invoices`);
  return response.data;
};

// Get billing configuration
const getBillingConfig = async () => {
  const response = await api.get(`${API_URL}config`);
  return response.data;
};

// Create payment order
const createPaymentOrder = async (id, payAmount) => {
  const response = await api.post(`${API_URL}${id}/create-payment-order`, { amount: payAmount });
  return response.data;
};

// Verify payment signature
const verifyPayment = async (id, paymentData) => {
  const response = await api.post(`${API_URL}${id}/verify-payment`, paymentData);
  return response.data;
};

const billingService = {
  generateInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceByJobCard,
  recordPayment,
  getMyInvoices,
  getBillingConfig,
  createPaymentOrder,
  verifyPayment
};

export default billingService;
