import api from './api';

export const getRequests = async (page = 1, limit = 10, keyword = '', status = '', jobCardId = '') => {
  const params = new URLSearchParams({ page, limit, keyword });
  if (status) params.append('status', status);
  if (jobCardId) params.append('jobCardId', jobCardId);

  const { data } = await api.get(`/spare-parts-requests?${params.toString()}`);
  return data;
};

export const createRequest = async (requestData) => {
  const { data } = await api.post('/spare-parts-requests', requestData);
  return data;
};

export const issueRequest = async (id, issuedQuantity) => {
  const { data } = await api.put(`/spare-parts-requests/${id}/issue`, { issuedQuantity });
  return data;
};

export const rejectRequest = async (id) => {
  const { data } = await api.put(`/spare-parts-requests/${id}/reject`);
  return data;
};

export const requestReturn = async (id, quantityToReturn) => {
  const { data } = await api.put(`/spare-parts-requests/${id}/return-request`, { quantityToReturn });
  return data;
};

export const approveReturn = async (id) => {
  const { data } = await api.put(`/spare-parts-requests/${id}/return-approve`);
  return data;
};

export const rejectReturn = async (id) => {
  const { data } = await api.put(`/spare-parts-requests/${id}/return-reject`);
  return data;
};

export default {
  getRequests,
  createRequest,
  issueRequest,
  rejectRequest,
  requestReturn,
  approveReturn,
  rejectReturn
};
