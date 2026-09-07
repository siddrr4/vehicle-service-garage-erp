import api from './api';

export const getJobCards = async (page = 1, limit = 10, keyword = '', status = '') => {
  const params = new URLSearchParams({ page, limit, keyword });
  if (status) params.append('status', status);
  const { data } = await api.get(`/job-cards?${params.toString()}`);
  return data;
};

export const getMyJobCards = async () => {
  const { data } = await api.get('/job-cards/my-job-cards');
  return data;
};

export const getJobCardStats = async () => {
  const { data } = await api.get('/job-cards/stats');
  return data;
};

export const getMechanicJobCards = async () => {
  const { data } = await api.get('/job-cards/mechanic-jobs');
  return data;
};

export const getJobCardById = async (id) => {
  const { data } = await api.get(`/job-cards/${id}`);
  return data;
};

export const createJobCard = async (jobCardData) => {
  const { data } = await api.post('/job-cards', jobCardData);
  return data;
};

export const updateJobCard = async (id, jobCardData) => {
  const { data } = await api.put(`/job-cards/${id}`, jobCardData);
  return data;
};

export const updateMechanicStatus = async (id, statusData) => {
  const { data } = await api.put(`/job-cards/${id}/mechanic-update`, statusData);
  return data;
};

export const deleteJobCard = async (id) => {
  const { data } = await api.delete(`/job-cards/${id}`);
  return data;
};

export default {
  getJobCards,
  getMyJobCards,
  getMechanicJobCards,
  getJobCardById,
  createJobCard,
  updateJobCard,
  updateMechanicStatus,
  deleteJobCard,
  getJobCardStats
};
