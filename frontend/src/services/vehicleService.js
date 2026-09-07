import api from './api';

export const getVehicles = async (page = 1, limit = 10, keyword = '', fuelType = '', transmission = '') => {
  const params = new URLSearchParams({ page, limit, keyword });
  if (fuelType) params.append('fuelType', fuelType);
  if (transmission) params.append('transmission', transmission);
  const { data } = await api.get(`/vehicles?${params.toString()}`);
  return data;
};

export const getVehicleById = async (id) => {
  const { data } = await api.get(`/vehicles/${id}`);
  return data;
};

export const createVehicle = async (vehicleData) => {
  const { data } = await api.post('/vehicles', vehicleData);
  return data;
};

export const updateVehicle = async (id, vehicleData) => {
  const { data } = await api.put(`/vehicles/${id}`, vehicleData);
  return data;
};

export const deleteVehicle = async (id) => {
  const { data } = await api.delete(`/vehicles/${id}`);
  return data;
};
