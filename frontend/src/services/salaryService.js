import api from './api';

export const getSalaryStructures = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.keyword) query.append('keyword', params.keyword);
  if (params.salaryType) query.append('salaryType', params.salaryType);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const { data } = await api.get(`/salary?${query.toString()}`);
  return data;
};

export const getSalaryStructureByEmployee = async (employeeId) => {
  const { data } = await api.get(`/salary/employee/${employeeId}`);
  return data;
};

export const createSalaryStructure = async (salaryData) => {
  const { data } = await api.post('/salary', salaryData);
  return data;
};

export const updateSalaryStructure = async (id, salaryData) => {
  const { data } = await api.put(`/salary/${id}`, salaryData);
  return data;
};

export const toggleSalaryStructureStatus = async (id) => {
  const { data } = await api.patch(`/salary/${id}/toggle-status`);
  return data;
};

export const deleteSalaryStructure = async (id) => {
  const { data } = await api.delete(`/salary/${id}`);
  return data;
};

export const getDuplicateSalaryStructures = async () => {
  const { data } = await api.get('/salary/duplicates');
  return data;
};

export const cleanupSalaryDuplicates = async () => {
  const { data } = await api.post('/salary/cleanup-duplicates');
  return data;
};

const salaryService = {
  getSalaryStructures,
  getSalaryStructureByEmployee,
  createSalaryStructure,
  updateSalaryStructure,
  toggleSalaryStructureStatus,
  deleteSalaryStructure,
  getDuplicateSalaryStructures,
  cleanupSalaryDuplicates,
};

export default salaryService;
