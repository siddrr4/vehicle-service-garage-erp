import api from './api';

export const getEmployees = async (page = 1, limit = 10, keyword = '', role = '', availability = '', status = '') => {
  const params = new URLSearchParams({ page, limit, keyword });
  if (role) params.append('role', role);
  if (availability) params.append('availability', availability);
  if (status) params.append('status', status);

  const { data } = await api.get(`/employees?${params.toString()}`);
  return data;
};

export const getActiveMechanics = async () => {
  const { data } = await api.get('/employees/active-mechanics');
  return data;
};

export const getEmployeeStats = async () => {
  const { data } = await api.get('/employees/stats');
  return data;
};

export const getEmployeeById = async (id) => {
  const { data } = await api.get(`/employees/${id}`);
  return data;
};

export const createEmployee = async (employeeData) => {
  const { data } = await api.post('/employees', employeeData);
  return data;
};

export const updateEmployee = async (id, employeeData) => {
  const { data } = await api.put(`/employees/${id}`, employeeData);
  return data;
};

export const deleteEmployee = async (id) => {
  const { data } = await api.delete(`/employees/${id}`);
  return data;
};

export default {
  getEmployees,
  getActiveMechanics,
  getEmployeeStats,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
