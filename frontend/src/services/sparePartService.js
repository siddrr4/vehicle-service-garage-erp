import api from './api';

export const getSpareParts = async (page = 1, limit = 10, keyword = '', category = '', status = '', sortBy = '', sortOrder = '') => {
  const params = new URLSearchParams({ page, limit, keyword });
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  const { data } = await api.get(`/spare-parts?${params.toString()}`);
  return data;
};

export const getAllSpareParts = async () => {
  const { data } = await api.get('/spare-parts/all');
  return data;
};

export const getSparePartStats = async () => {
  const { data } = await api.get('/spare-parts/stats');
  return data;
};

export const getSparePartById = async (id) => {
  const { data } = await api.get(`/spare-parts/${id}`);
  return data;
};

export const createSparePart = async (partData) => {
  const { data } = await api.post('/spare-parts', partData);
  return data;
};

export const updateSparePart = async (id, partData) => {
  const { data } = await api.put(`/spare-parts/${id}`, partData);
  return data;
};

export const deleteSparePart = async (id) => {
  const { data } = await api.delete(`/spare-parts/${id}`);
  return data;
};

export default {
  getSpareParts,
  getAllSpareParts,
  getSparePartStats,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart
};
