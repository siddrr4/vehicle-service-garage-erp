import api from './api';

export const getPayrolls = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.month) query.append('month', params.month);
  if (params.year) query.append('year', params.year);
  if (params.employeeId) query.append('employeeId', params.employeeId);
  if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);

  const { data } = await api.get(`/payroll?${query.toString()}`);
  return data;
};

export const generateMonthlyPayroll = async (payload) => {
  const { data } = await api.post('/payroll/generate', payload);
  return data;
};

export const getPayrollById = async (id) => {
  const { data } = await api.get(`/payroll/${id}`);
  return data;
};

export const updatePaymentStatus = async (id, paymentData) => {
  const { data } = await api.put(`/payroll/${id}/payment`, paymentData);
  return data;
};

export const getMyPayslips = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.year) query.append('year', params.year);

  const { data } = await api.get(`/payroll/my-payslips?${query.toString()}`);
  return data;
};

const payrollService = {
  getPayrolls,
  generateMonthlyPayroll,
  getPayrollById,
  updatePaymentStatus,
  getMyPayslips,
};

export default payrollService;
