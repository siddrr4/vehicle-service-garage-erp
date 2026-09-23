import api from './api';

export const getCustomers = async (page = 1, limit = 10, keyword = '') => {
  const { data } = await api.get(`/customers?page=${page}&limit=${limit}&keyword=${keyword}`);
  return data;
};

export const getCustomerById = async (id) => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};

export const updateCustomer = async (id, customerData) => {
  const { data } = await api.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};
